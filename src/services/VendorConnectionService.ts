import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { VendorConnectionRepository } from '@/repositories/VendorConnectionRepository'
import { VendorAccountRepository } from '@/repositories/VendorAccountRepository'
import { BatchItemRepository } from '@/repositories/BatchItemRepository'
import { BatchDisputeRepository } from '@/repositories/BatchDisputeRepository'
import { notifyVendorAccount } from '@/lib/vendor-notify'
import { sendPushToUser } from '@/lib/push-notify'
import * as Sentry from '@sentry/nextjs'
import type { VendorConnection, VendorConnectedCustomer, VendorCustomerBatch, VendorCustomerBatchItem } from '@/types'

// Constructed with the caller's own authenticated (RLS-scoped) client — this
// matters, not just for RLS, because the read methods below call SECURITY
// DEFINER SQL functions (vendor_connected_customers etc.) that internally
// derive auth.uid(). Calling those via the service-role admin client would
// resolve auth.uid() to NULL (no session), silently returning zero rows —
// not a security hole (fails closed), but a real functional bug. The
// accept/reject/create-linked-vendor-row writes are the highest-value
// target in this feature (plan Finding 2) and are NOT trusted to RLS alone
// — those specific writes go through a separate, internally-held admin
// client, only after re-verifying auth.uid() === the target vendor
// account's auth_user_id.
export class VendorConnectionService {
  private repo: VendorConnectionRepository
  private vendorAccountRepo: VendorAccountRepository
  private _adminClient?: SupabaseClient
  private _adminRepo?: VendorConnectionRepository
  private _adminVendorAccountRepo?: VendorAccountRepository
  private _adminBatchItemRepo?: BatchItemRepository
  private _adminDisputeRepo?: BatchDisputeRepository

  constructor(supabase: SupabaseClient) {
    this.repo = new VendorConnectionRepository(supabase)
    this.vendorAccountRepo = new VendorAccountRepository(supabase)
  }

  // Lazy — only touches env vars / constructs the admin client when a write
  // (or notify) method actually needs it, not on every instantiation (keeps
  // this service constructible in tests without service-role env vars
  // present). Every admin-backed repo AND every notify call in this class
  // shares this one instance rather than calling createAdminClient() inline
  // at each call site — an earlier version did that for the notify calls
  // specifically, which broke the exact testability this pattern exists for
  // (createAdminClient() throws synchronously without env vars, so an inline
  // call inside a plain method body isn't deferred the way a getter is).
  private get adminClient(): SupabaseClient {
    return (this._adminClient ??= createAdminClient())
  }
  private get adminRepo(): VendorConnectionRepository {
    return (this._adminRepo ??= new VendorConnectionRepository(this.adminClient))
  }
  private get adminVendorAccountRepo(): VendorAccountRepository {
    return (this._adminVendorAccountRepo ??= new VendorAccountRepository(this.adminClient))
  }
  private get adminBatchItemRepo(): BatchItemRepository {
    return (this._adminBatchItemRepo ??= new BatchItemRepository(this.adminClient))
  }
  private get adminDisputeRepo(): BatchDisputeRepository {
    return (this._adminDisputeRepo ??= new BatchDisputeRepository(this.adminClient))
  }

  async requestConnection(userId: string, vendorAccountId: string): Promise<VendorConnection> {
    const vendorAccount = await this.vendorAccountRepo.findById(vendorAccountId)
    if (!vendorAccount || vendorAccount.onboarding_completed_at == null) {
      throw new Error('Vendor is not accepting connections')
    }

    const existing = await this.repo.findByUserAndVendorAccount(userId, vendorAccountId)
    let connection: VendorConnection
    if (!existing) connection = await this.repo.createRequest(userId, vendorAccountId)
    else if (existing.status === 'pending' || existing.status === 'active') return existing
    else if (existing.status === 'rejected' || existing.status === 'cancelled' || existing.status === 'disconnected') connection = await this.repo.reRequest(userId, vendorAccountId)
    else throw new Error(`Cannot re-request a ${existing.status} connection`)

    notifyVendorAccount(this.adminClient, vendorAccountId, {
      title: 'New connection request',
      body: 'A customer wants to connect with you',
      tag: 'vendor-connection-request',
      url: '/vendor/dashboard',
    }).catch(err => Sentry.captureException(err, { extra: { context: 'vendor-notify', connectionId: connection.id } }))

    return connection
  }

  async cancelRequest(id: string, userId: string): Promise<void> {
    const connection = await this.repo.findById(id)
    await this.repo.cancel(id, userId)
    if (connection) {
      notifyVendorAccount(this.adminClient, connection.vendor_account_id, {
        title: 'Connection request cancelled',
        body: 'A customer cancelled their connection request',
        tag: 'vendor-connection-cancelled',
        url: '/vendor/dashboard',
      }).catch(err => Sentry.captureException(err, { extra: { context: 'vendor-notify', connectionId: id } }))
    }
  }

  async listMyConnections(userId: string): Promise<Array<VendorConnection & { vendor_business_name: string }>> {
    const connections = await this.repo.findAllForUser(userId)
    const results = await Promise.all(
      connections.map(async c => {
        const vendorAccount = await this.vendorAccountRepo.findById(c.vendor_account_id)
        return { ...c, vendor_business_name: vendorAccount?.business_name ?? 'Unknown vendor' }
      })
    )
    return results
  }

  async disconnect(id: string, userId: string): Promise<void> {
    const connection = await this.repo.findById(id)
    if (!connection || connection.user_id !== userId) throw new Error('Connection not found')
    await this.repo.disconnect(id, userId)
    // Any custom item still awaiting this vendor's price decision would
    // otherwise be stuck forever, now hidden from the vendor too (plan
    // Finding 5) — revert those items to the ordinary unpriced state.
    // Uses the admin repo since pending_price_request_id is column-locked
    // away from `authenticated`.
    await this.adminBatchItemRepo.clearPendingPriceRequestsForUserServiceRole(userId, connection.vendor_account_id)

    // Same reasoning — an open vendor-raised issue would otherwise be stuck
    // forever: only the raising vendor can resolve it, but the moment the
    // connection drops, vendor_all_disputes() no longer surfaces it to them.
    await this.adminDisputeRepo.dismissOpenVendorRaisedServiceRole(userId, connection.vendor_account_id)

    notifyVendorAccount(this.adminClient, connection.vendor_account_id, {
      title: 'Customer disconnected',
      body: 'A customer disconnected from your portal',
      tag: 'vendor-connection-disconnected',
      url: '/vendor/dashboard',
    }).catch(err => Sentry.captureException(err, { extra: { context: 'vendor-notify', connectionId: id } }))
  }

  // ── Vendor-side reads (via the caller's own session, so auth.uid()
  // resolves correctly inside the SECURITY DEFINER functions) ──

  async requireVendorOwnsConnection(connectionId: string, authUserId: string): Promise<VendorConnection> {
    const connection = await this.repo.findById(connectionId)
    if (!connection) throw new Error('Connection not found')
    const vendorAccount = await this.vendorAccountRepo.findById(connection.vendor_account_id)
    if (!vendorAccount || vendorAccount.auth_user_id !== authUserId) throw new Error('Connection not found')
    return connection
  }

  async listPendingRequests(authUserId: string, vendorAccountId: string): Promise<Array<{ connection_id: string; customer_name: string | null; requested_at: string }>> {
    const vendorAccount = await this.vendorAccountRepo.findById(vendorAccountId)
    if (!vendorAccount || vendorAccount.auth_user_id !== authUserId) throw new Error('Vendor account not found')
    return this.repo.findPendingRequestsWithCustomerName()
  }

  async listConnectedCustomers(): Promise<VendorConnectedCustomer[]> {
    return this.repo.findConnectedCustomers()
  }

  async getCustomerBatches(authUserId: string, connectionId: string): Promise<VendorCustomerBatch[]> {
    await this.requireVendorOwnsConnection(connectionId, authUserId)
    return this.repo.findCustomerBatches(connectionId)
  }

  async getCustomerBatchItems(batchId: string): Promise<VendorCustomerBatchItem[]> {
    // Authorization is enforced inside the vendor_customer_batch_items SQL
    // function itself (SECURITY DEFINER, re-derives auth.uid() and checks
    // the connection is active) — the function returns zero rows for a
    // batch the caller isn't entitled to.
    return this.repo.findCustomerBatchItems(batchId)
  }

  // ── Vendor-side writes (identity-checked against authUserId, executed via
  // the internally-held admin client — see class comment) ──

  async accept(connectionId: string, authUserId: string): Promise<VendorConnection> {
    const connection = await this.requireVendorOwnsConnection(connectionId, authUserId)
    if (connection.status !== 'pending') throw new Error(`Cannot accept a ${connection.status} connection`)
    const vendorAccount = await this.adminVendorAccountRepo.findById(connection.vendor_account_id)
    if (!vendorAccount) throw new Error('Vendor account not found')
    const accepted = await this.adminRepo.acceptServiceRole(connectionId, connection.user_id, vendorAccount.id, vendorAccount.business_name)

    sendPushToUser(this.adminClient, connection.user_id, {
      title: 'Connection accepted',
      body: `"${vendorAccount.business_name}" accepted your request`,
      tag: 'customer-connection-accepted',
      url: '/vendors/connections',
    }).catch(err => Sentry.captureException(err, { extra: { context: 'customer-notify', connectionId } }))

    return accepted
  }

  async reject(connectionId: string, authUserId: string): Promise<void> {
    const connection = await this.requireVendorOwnsConnection(connectionId, authUserId)
    if (connection.status !== 'pending') throw new Error(`Cannot reject a ${connection.status} connection`)
    const vendorAccount = await this.adminVendorAccountRepo.findById(connection.vendor_account_id)
    await this.adminRepo.rejectServiceRole(connectionId)

    sendPushToUser(this.adminClient, connection.user_id, {
      title: 'Connection declined',
      body: `"${vendorAccount?.business_name ?? 'A vendor'}" declined your request`,
      tag: 'customer-connection-rejected',
      url: '/vendors/connections',
    }).catch(err => Sentry.captureException(err, { extra: { context: 'customer-notify', connectionId } }))
  }
}
