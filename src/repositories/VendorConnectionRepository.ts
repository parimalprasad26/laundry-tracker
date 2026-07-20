import { SupabaseClient } from '@supabase/supabase-js'
import type { VendorConnection, VendorConnectedCustomer, VendorCustomerBatch, VendorCustomerBatchItem } from '@/types'

export class VendorConnectionRepository {
  constructor(private supabase: SupabaseClient) {}

  async findById(id: string): Promise<VendorConnection | null> {
    const { data, error } = await this.supabase
      .from('vendor_connections')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) throw error
    return data
  }

  async findByUserAndVendorAccount(userId: string, vendorAccountId: string): Promise<VendorConnection | null> {
    const { data, error } = await this.supabase
      .from('vendor_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('vendor_account_id', vendorAccountId)
      .maybeSingle()

    if (error) throw error
    return data
  }

  // Used by addItemsToBatch to decide whether a batch's vendor is a
  // connected platform vendor (shared price list) or a plain private
  // contact (today's per-customer vendor_item_prices flow, unchanged).
  async findActiveByLaundryVendorId(laundryVendorId: string): Promise<VendorConnection | null> {
    const { data, error } = await this.supabase
      .from('vendor_connections')
      .select('*')
      .eq('laundry_vendor_id', laundryVendorId)
      .eq('status', 'active')
      .maybeSingle()

    if (error) throw error
    return data
  }

  async findAllForUser(userId: string): Promise<VendorConnection[]> {
    const { data, error } = await this.supabase
      .from('vendor_connections')
      .select('*')
      .eq('user_id', userId)
      .order('requested_at', { ascending: false })

    if (error) throw error
    return data ?? []
  }

  async findPendingForVendorAccount(vendorAccountId: string): Promise<VendorConnection[]> {
    const { data, error } = await this.supabase
      .from('vendor_connections')
      .select('*')
      .eq('vendor_account_id', vendorAccountId)
      .eq('status', 'pending')
      .order('requested_at', { ascending: true })

    if (error) throw error
    return data ?? []
  }

  // Customer's own session, RLS-gated to their own pending rows only.
  async createRequest(userId: string, vendorAccountId: string): Promise<VendorConnection> {
    const { data, error } = await this.supabase
      .from('vendor_connections')
      .insert({ user_id: userId, vendor_account_id: vendorAccountId, status: 'pending' })
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Re-request after a rejection, cancellation, OR a prior disconnect —
  // upsert onto the existing unique (user_id, vendor_account_id) row rather
  // than a plain insert. Deliberately does NOT clear laundry_vendor_id: a
  // reconnect after disconnect reuses the same private vendor row rather
  // than creating a second one (see acceptServiceRole below).
  async reRequest(userId: string, vendorAccountId: string): Promise<VendorConnection> {
    const { data, error } = await this.supabase
      .from('vendor_connections')
      .update({ status: 'pending', requested_at: new Date().toISOString(), responded_at: null })
      .eq('user_id', userId)
      .eq('vendor_account_id', vendorAccountId)
      .in('status', ['rejected', 'cancelled', 'disconnected'])
      .select()
      .single()

    if (error) throw error
    return data
  }

  async cancel(id: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('vendor_connections')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .eq('user_id', userId)
      .eq('status', 'pending')

    if (error) throw error
  }

  async disconnect(id: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('vendor_connections')
      .update({ status: 'disconnected', disconnected_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .eq('status', 'active')

    if (error) throw error
  }

  // ── Service-role only writes — the trust boundary this whole table exists for ──

  async rejectServiceRole(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('vendor_connections')
      .update({ status: 'rejected', responded_at: new Date().toISOString() })
      .eq('id', id)
      .eq('status', 'pending')

    if (error) throw error
  }

  // Two-step, not a single DB transaction (matches this codebase's existing
  // multi-write convention, e.g. setVendorCustomTypePrice) — create the private
  // vendor row first, then link+activate the connection. A failure between the
  // two steps leaves an orphaned laundry_vendors row, recoverable by retrying
  // the accept action (idempotency isn't attempted here; invite-only, low
  // volume, acceptable for Phase 1).
  //
  // Reconnecting after an earlier disconnect: the connection row already has
  // a laundry_vendor_id from the first time it was accepted (disconnect
  // never clears it) — reuse that same private vendor row instead of
  // inserting a second one. A second insert would violate the (user_id,
  // vendor_account_id) uniqueness constraint on laundry_vendors and would
  // fragment the customer's batch history across two "different" entries
  // for what's actually the same real vendor.
  async acceptServiceRole(connectionId: string, userId: string, vendorAccountId: string, businessName: string): Promise<VendorConnection> {
    const { data: existingConnection, error: findErr } = await this.supabase
      .from('vendor_connections')
      .select('laundry_vendor_id')
      .eq('id', connectionId)
      .maybeSingle()
    if (findErr) throw findErr

    let laundryVendorId: string | null = existingConnection?.laundry_vendor_id ?? null

    if (!laundryVendorId) {
      const { data: vendorRow, error: vendorErr } = await this.supabase
        .from('laundry_vendors')
        .insert({ user_id: userId, name: businessName, vendor_account_id: vendorAccountId, created_by: userId, updated_by: userId })
        .select()
        .single()
      if (vendorErr) throw vendorErr
      laundryVendorId = vendorRow.id
    }

    const { data, error } = await this.supabase
      .from('vendor_connections')
      .update({ status: 'active', responded_at: new Date().toISOString(), laundry_vendor_id: laundryVendorId })
      .eq('id', connectionId)
      .eq('status', 'pending')
      .select()
      .single()
    if (error) throw error
    return data
  }

  // ── SECURITY DEFINER function calls (vendor's own read side) ──

  async findConnectedCustomers(): Promise<VendorConnectedCustomer[]> {
    const { data, error } = await this.supabase.rpc('vendor_connected_customers')
    if (error) throw error
    return data ?? []
  }

  async findPendingRequestsWithCustomerName(): Promise<Array<{ connection_id: string; customer_name: string | null; requested_at: string }>> {
    const { data, error } = await this.supabase.rpc('vendor_pending_requests')
    if (error) throw error
    return data ?? []
  }

  async findCustomerBatches(connectionId: string): Promise<VendorCustomerBatch[]> {
    const { data, error } = await this.supabase.rpc('vendor_customer_batches', { p_connection_id: connectionId })
    if (error) throw error
    return data ?? []
  }

  async findCustomerBatchItems(batchId: string): Promise<VendorCustomerBatchItem[]> {
    const { data, error } = await this.supabase.rpc('vendor_customer_batch_items', { p_batch_id: batchId })
    if (error) throw error
    return data ?? []
  }
}
