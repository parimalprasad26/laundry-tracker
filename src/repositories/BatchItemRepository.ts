import { SupabaseClient } from '@supabase/supabase-js'
import type { BatchItem, BatchItemWithClosetItem } from '@/types'

export class BatchItemRepository {
  constructor(private supabase: SupabaseClient) {}

  async findByBatch(batchId: string): Promise<BatchItemWithClosetItem[]> {
    const { data, error } = await this.supabase
      .from('batch_items')
      .select('*, closet_item:closet_items(*)')
      .eq('batch_id', batchId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })

    if (error) throw error
    return (data ?? []) as BatchItemWithClosetItem[]
  }

  async findClosetItemIds(batchId: string): Promise<string[]> {
    const { data, error } = await this.supabase
      .from('batch_items')
      .select('closet_item_id')
      .eq('batch_id', batchId)
      .is('deleted_at', null)

    if (error) throw error
    return (data ?? []).map(r => r.closet_item_id)
  }

  async updateUnitPrice(id: string, userId: string, batchId: string, unitPrice: number | null): Promise<BatchItem> {
    const { data, error } = await this.supabase
      .from('batch_items')
      .update({ unit_price: unitPrice, updated_by: userId })
      .eq('id', id)
      .eq('user_id', userId)
      .eq('batch_id', batchId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async bulkCreate(
    batchId: string,
    userId: string,
    items: Array<{ closet_item_id: string; unit_price: number | null }>
  ): Promise<BatchItem[]> {
    const rows = items.map(({ closet_item_id, unit_price }) => ({
      batch_id: batchId,
      closet_item_id,
      unit_price,
      user_id: userId,
      created_by: userId,
      updated_by: userId,
    }))

    const { data, error } = await this.supabase
      .from('batch_items')
      .insert(rows)
      .select()

    if (error) throw error
    return data ?? []
  }

  async bulkUpdateUnitPrice(ids: string[], userId: string, batchId: string, price: number): Promise<void> {
    const { error } = await this.supabase
      .from('batch_items')
      .update({ unit_price: price, updated_by: userId })
      .in('id', ids)
      .eq('user_id', userId)
      .eq('batch_id', batchId)
    if (error) throw error
  }

  async updateIssues(
    id: string,
    userId: string,
    damagedQty: number,
    missingQty: number,
    issueStatus: 'post_return' | 'dispute'
  ): Promise<BatchItem> {
    const { data, error } = await this.supabase
      .from('batch_items')
      .update({
        damaged_qty: damagedQty,
        missing_qty: missingQty,
        issue_reported_at: new Date().toISOString(),
        issue_reported_status: issueStatus,
        updated_by: userId,
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateReturnQuantity(id: string, userId: string, batchId: string, quantityReturned: number): Promise<BatchItem> {
    const { data, error } = await this.supabase
      .from('batch_items')
      .update({
        quantity_returned: quantityReturned,
        returned_at: quantityReturned > 0 ? new Date().toISOString() : null,
        updated_by: userId,
      })
      .eq('id', id)
      .eq('user_id', userId)
      .eq('batch_id', batchId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async markAllReturned(batchId: string, userId: string): Promise<void> {
    const { error } = await this.supabase.rpc('mark_batch_items_returned', {
      p_batch_id: batchId,
      p_user_id: userId,
    })
    if (error) throw error
  }

  async markSelectivelyReturned(batchId: string, userId: string, missingItemIds: string[]): Promise<void> {
    const { error } = await this.supabase.rpc('mark_batch_items_returned', {
      p_batch_id: batchId,
      p_user_id: userId,
      p_excluded_ids: missingItemIds,
    })
    if (error) throw error
  }

  async softDelete(id: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('batch_items')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)

    if (error) throw error
  }

  // ── Vendor price-request lifecycle — service-role only, since
  // pending_price_request_id is column-locked away from `authenticated`
  // (see migration 0032/0034). ──

  async setPendingPriceRequestServiceRole(ids: string[], requestId: string): Promise<void> {
    const { error } = await this.supabase
      .from('batch_items')
      .update({ pending_price_request_id: requestId })
      .in('id', ids)
    if (error) throw error
  }

  async resolvePendingPriceRequestServiceRole(requestId: string, unitPrice: number): Promise<void> {
    const { error } = await this.supabase
      .from('batch_items')
      .update({ unit_price: unitPrice, pending_price_request_id: null })
      .eq('pending_price_request_id', requestId)
    if (error) throw error
  }

  // Disconnect must clear in-flight price requests, or the item is stuck
  // forever awaiting a vendor relationship that no longer exists (plan
  // Finding 5) — reverts to the ordinary "no price yet" state.
  async clearPendingPriceRequestsForUserServiceRole(userId: string, vendorAccountId: string): Promise<void> {
    const { data: requests, error: reqErr } = await this.supabase
      .from('vendor_price_requests')
      .select('id')
      .eq('vendor_account_id', vendorAccountId)
      .eq('status', 'pending')
    if (reqErr) throw reqErr
    const requestIds = (requests ?? []).map(r => r.id)
    if (!requestIds.length) return

    const { error } = await this.supabase
      .from('batch_items')
      .update({ pending_price_request_id: null })
      .eq('user_id', userId)
      .in('pending_price_request_id', requestIds)
    if (error) throw error
  }
}
