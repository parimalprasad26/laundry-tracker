import type { SupabaseClient } from '@supabase/supabase-js'
import type { BatchDispute, BatchDisputeWithContext, DisputeStatus, DisputeType, VendorDispute } from '@/types'

export class BatchDisputeRepository {
  constructor(private supabase: SupabaseClient) {}

  // Vendor's Issues tab — mirrors VendorConnectionRepository.findConnectedCustomers:
  // called with the vendor's own session (not admin) so auth.uid() resolves
  // correctly inside the SECURITY DEFINER function, which does its own
  // authorization internally (see migration 0039).
  async findAllForVendor(): Promise<VendorDispute[]> {
    const { data, error } = await this.supabase.rpc('vendor_all_disputes')
    if (error) throw error
    return (data ?? []) as VendorDispute[]
  }

  // Disconnect must clear any open vendor-raised dispute, or it's stuck
  // forever — the customer sees "awaiting the vendor" with no way to
  // resolve it (only the raising vendor can, per the symmetric-resolution
  // design), and the vendor loses visibility into it the moment the
  // connection drops (vendor_all_disputes() requires status = 'active').
  // Mirrors BatchItemRepository.clearPendingPriceRequestsForUserServiceRole.
  async dismissOpenVendorRaisedServiceRole(userId: string, vendorAccountId: string): Promise<void> {
    const { error } = await this.supabase
      .from('batch_disputes')
      .update({
        status: 'dismissed',
        resolution: 'Vendor disconnected before resolving',
        resolved_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('vendor_account_id', vendorAccountId)
      .eq('raised_by_role', 'vendor')
      .eq('status', 'open')
    if (error) throw error
  }

  async create(dispute: {
    batch_id: string
    batch_item_id: string
    user_id: string
    damaged_qty: number
    description?: string | null
    dispute_type?: DisputeType
    wrong_item_description?: string | null
    raised_by_role?: 'customer' | 'vendor'
    vendor_account_id?: string | null
  }): Promise<BatchDispute> {
    const { data, error } = await this.supabase
      .from('batch_disputes')
      .insert(dispute)
      .select()
      .single()
    if (error) throw error
    return data as BatchDispute
  }

  // No ownership scoping — used only by DisputeService.resolveAsVendor,
  // which verifies dispute.vendor_account_id against the caller itself
  // before acting on the result (mirrors BatchItemRepository.findByIdServiceRole).
  async findById(id: string): Promise<BatchDispute | null> {
    const { data, error } = await this.supabase
      .from('batch_disputes')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return data as BatchDispute | null
  }

  async findByBatch(batchId: string, userId: string): Promise<BatchDispute[]> {
    const { data, error } = await this.supabase
      .from('batch_disputes')
      .select('*')
      .eq('batch_id', batchId)
      .eq('user_id', userId)
      .order('reported_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as BatchDispute[]
  }

  // Cross-batch aggregation for the Issues tab — batch_disputes is already
  // directly user_id-scoped (indexed on (user_id, reported_at DESC)), so no
  // batch-id-list indirection is needed. Embeds enough item/batch context
  // to render the list without a separate lookup per row.
  async findAllForUser(userId: string): Promise<BatchDisputeWithContext[]> {
    const { data, error } = await this.supabase
      .from('batch_disputes')
      .select('*, batch_item:batch_items(*, closet_item:closet_items(*)), batch:laundry_batches(id, name)')
      .eq('user_id', userId)
      .order('reported_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as unknown as BatchDisputeWithContext[]
  }

  async resolve(
    id: string,
    userId: string,
    resolution: string,
    status: DisputeStatus
  ): Promise<BatchDispute> {
    const { data, error } = await this.supabase
      .from('batch_disputes')
      .update({ status, resolution, resolved_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()
    if (error) throw error
    return data as BatchDispute
  }

  // Vendor-side resolution — ownership (dispute.vendor_account_id belongs to
  // the calling vendor, raised_by_role === 'vendor') is verified in
  // DisputeService.resolveAsVendor before this is called, since the row's
  // user_id is the customer's, not the vendor's — .eq('user_id', ...) can't
  // scope this the way the customer-side resolve() above does.
  async resolveServiceRole(id: string, resolution: string, status: DisputeStatus): Promise<BatchDispute> {
    const { data, error } = await this.supabase
      .from('batch_disputes')
      .update({ status, resolution, resolved_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as BatchDispute
  }

  async countOpenByBatchIds(batchIds: string[], userId: string): Promise<number> {
    if (!batchIds.length) return 0
    const { count, error } = await this.supabase
      .from('batch_disputes')
      .select('*', { count: 'exact', head: true })
      .in('batch_id', batchIds)
      .eq('user_id', userId)
      .eq('status', 'open')
    if (error) throw error
    return count ?? 0
  }

  async countOpenSwapsByBatchIds(batchIds: string[], userId: string): Promise<number> {
    if (!batchIds.length) return 0
    const { count, error } = await this.supabase
      .from('batch_disputes')
      .select('*', { count: 'exact', head: true })
      .in('batch_id', batchIds)
      .eq('user_id', userId)
      .eq('status', 'open')
      .eq('dispute_type', 'swap')
    if (error) throw error
    return count ?? 0
  }

  // At most one open issue per item at a time, regardless of type or who
  // raised it — a damage claim and a swap ("wrong item") claim are mutually
  // exclusive (a wrong item isn't the customer's, so a damage claim against
  // it doesn't make sense, and vice versa), and the same now applies across
  // customer-raised vs vendor-raised rows (Phase 3) — a vendor flagging an
  // item shouldn't be silently duplicated by the customer also reporting it,
  // or vice versa. Used to block a new report while one is already open.
  async findOpenByItem(batchItemId: string, userId: string): Promise<BatchDispute | null> {
    const { data, error } = await this.supabase
      .from('batch_disputes')
      .select('*')
      .eq('batch_item_id', batchItemId)
      .eq('user_id', userId)
      .eq('status', 'open')
      .maybeSingle()
    if (error) throw error
    return data as BatchDispute | null
  }

  async countOpenByBatch(batchId: string, userId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('batch_disputes')
      .select('*', { count: 'exact', head: true })
      .eq('batch_id', batchId)
      .eq('user_id', userId)
      .eq('status', 'open')
    if (error) throw error
    return count ?? 0
  }
}
