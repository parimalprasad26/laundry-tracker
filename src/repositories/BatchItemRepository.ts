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

  async updateUnitPrice(id: string, userId: string, unitPrice: number | null): Promise<BatchItem> {
    const { data, error } = await this.supabase
      .from('batch_items')
      .update({ unit_price: unitPrice, updated_by: userId })
      .eq('id', id)
      .eq('user_id', userId)
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

  async bulkUpdateUnitPrice(ids: string[], userId: string, price: number): Promise<void> {
    const { error } = await this.supabase
      .from('batch_items')
      .update({ unit_price: price, updated_by: userId })
      .in('id', ids)
      .eq('user_id', userId)
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

  async updateReturnQuantity(id: string, userId: string, quantityReturned: number): Promise<BatchItem> {
    const { data, error } = await this.supabase
      .from('batch_items')
      .update({
        quantity_returned: quantityReturned,
        returned_at: quantityReturned > 0 ? new Date().toISOString() : null,
        updated_by: userId,
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async markAllReturned(batchId: string, userId: string): Promise<void> {
    const items = await this.findByBatch(batchId)
    const now = new Date().toISOString()
    await Promise.all(
      items
        .filter(i => i.quantity_returned < i.quantity_sent)
        .map(i =>
          this.supabase
            .from('batch_items')
            .update({ quantity_returned: i.quantity_sent, returned_at: now, updated_by: userId })
            .eq('id', i.id)
            .eq('user_id', userId)
        )
    )
  }

  async markSelectivelyReturned(batchId: string, userId: string, missingItemIds: string[]): Promise<void> {
    const items = await this.findByBatch(batchId)
    const missingSet = new Set(missingItemIds)
    const now = new Date().toISOString()
    await Promise.all(
      items
        .filter(i => !missingSet.has(i.id))
        .map(i =>
          this.supabase
            .from('batch_items')
            .update({ quantity_returned: i.quantity_sent, returned_at: now, updated_by: userId })
            .eq('id', i.id)
            .eq('user_id', userId)
        )
    )
  }

  async softDelete(id: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('batch_items')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)

    if (error) throw error
  }
}
