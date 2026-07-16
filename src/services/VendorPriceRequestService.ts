import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { VendorPriceRequestRepository } from '@/repositories/VendorPriceRequestRepository'
import { VendorAccountRepository } from '@/repositories/VendorAccountRepository'
import { VendorAccountPriceRepository } from '@/repositories/VendorAccountPriceRepository'
import { BatchItemRepository } from '@/repositories/BatchItemRepository'
import { vendorAccountPriceResolutionSchema } from '@/schemas/vendor-account.schema'
import { notifyVendorAccount } from '@/lib/vendor-notify'
import { sendPushToUser } from '@/lib/push-notify'
import * as Sentry from '@sentry/nextjs'
import type { VendorPriceRequest } from '@/types'

// Customer-side request creation is a safe, self-scoped write RLS already
// permits directly (requires an active connection — see migration 0032),
// so it goes through the caller's own session. Resolution touches
// batch_items (column-locked away from `authenticated`) and
// vendor_price_requests' status (no authenticated UPDATE policy at all),
// so it always goes through an internally-held admin client, after
// verifying the caller owns the target vendor account. Deliberately does
// NOT go through BatchService.getEditable — the batch may legitimately
// already be closed by the time the vendor responds (plan Finding 3).
export class VendorPriceRequestService {
  private repo: VendorPriceRequestRepository
  private vendorAccountRepo: VendorAccountRepository
  private _adminRepo?: VendorPriceRequestRepository
  private _adminVendorAccountRepo?: VendorAccountRepository
  private _adminPriceRepo?: VendorAccountPriceRepository
  private _adminBatchItemRepo?: BatchItemRepository

  constructor(supabase: SupabaseClient) {
    this.repo = new VendorPriceRequestRepository(supabase)
    this.vendorAccountRepo = new VendorAccountRepository(supabase)
  }

  // Lazy — see VendorConnectionService for why (testability without
  // service-role env vars present).
  private get adminRepo(): VendorPriceRequestRepository {
    return (this._adminRepo ??= new VendorPriceRequestRepository(createAdminClient()))
  }
  private get adminVendorAccountRepo(): VendorAccountRepository {
    return (this._adminVendorAccountRepo ??= new VendorAccountRepository(createAdminClient()))
  }
  private get adminPriceRepo(): VendorAccountPriceRepository {
    return (this._adminPriceRepo ??= new VendorAccountPriceRepository(createAdminClient()))
  }
  private get adminBatchItemRepo(): BatchItemRepository {
    return (this._adminBatchItemRepo ??= new BatchItemRepository(createAdminClient()))
  }

  // Called from addItemsToBatch when a connected vendor has no price on file
  // for a custom type. Returns the request id whose batch_items should be
  // marked pending, or null if the vendor already has a price (an instant
  // lookup should be used instead — no request needed at all).
  async createIfNeeded(vendorAccountId: string, customType: string, requestedByUserId: string): Promise<string | null> {
    const priceMap = await this.adminPriceRepo.getPriceMap(vendorAccountId)
    if (priceMap.has(customType)) return null

    const existing = await this.repo.findPendingForVendorAndType(vendorAccountId, customType)
    if (existing) return existing.id

    const created = await this.repo.create(vendorAccountId, customType, requestedByUserId)

    // Only notify on a genuinely new request — a second customer hitting the
    // same missing custom type while one's already pending would otherwise
    // re-notify the vendor for something they've already seen.
    notifyVendorAccount(createAdminClient(), vendorAccountId, {
      title: 'New price request',
      body: `A customer needs a price for "${customType}"`,
      tag: 'vendor-price-request',
      url: '/vendor/requests',
    }).catch(err => Sentry.captureException(err, { extra: { context: 'vendor-notify', requestId: created.id } }))

    return created.id
  }

  async listPending(authUserId: string, vendorAccountId: string): Promise<VendorPriceRequest[]> {
    const vendorAccount = await this.vendorAccountRepo.findById(vendorAccountId)
    if (!vendorAccount || vendorAccount.auth_user_id !== authUserId) throw new Error('Vendor account not found')
    return this.repo.findPendingForVendorAccount(vendorAccountId)
  }

  async resolve(requestId: string, authUserId: string, unitPrice: number): Promise<void> {
    const validated = vendorAccountPriceResolutionSchema.parse({ requestId, unitPrice })

    const request = await this.adminRepo.findById(validated.requestId)
    if (!request || request.status !== 'pending') throw new Error('Price request not found')

    const vendorAccount = await this.adminVendorAccountRepo.findById(request.vendor_account_id)
    if (!vendorAccount || vendorAccount.auth_user_id !== authUserId) throw new Error('Price request not found')

    // Added to the vendor's shared list permanently — instantly available
    // for every other connected customer from then on, not just whoever
    // asked first (decision #6).
    await this.adminPriceRepo.upsertCustomPriceServiceRole(vendorAccount.id, request.custom_type, validated.unitPrice)
    await this.adminRepo.resolveServiceRole(validated.requestId, validated.unitPrice)
    await this.adminBatchItemRepo.resolvePendingPriceRequestServiceRole(validated.requestId, validated.unitPrice)

    // Notifies whoever originally triggered the request — the price now
    // applies to every connected customer (decision #6), but this one is
    // the one we know was actually blocked waiting on it.
    const admin = createAdminClient()
    sendPushToUser(admin, request.requested_by_user_id, {
      title: 'Price set',
      body: `${vendorAccount.business_name} set a price for "${request.custom_type}"`,
      tag: 'customer-price-resolved',
      url: '/vendors',
    }).catch(err => Sentry.captureException(err, { extra: { context: 'customer-notify', requestId: request.id } }))
  }
}
