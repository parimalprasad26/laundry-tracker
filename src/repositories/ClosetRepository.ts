import { SupabaseClient } from '@supabase/supabase-js'
import type { ClosetItem } from '@/types'
import type { ClosetItemFormValues } from '@/schemas/closet.schema'

export class ClosetRepository {
  constructor(private supabase: SupabaseClient) {}

  async findAll(userId: string): Promise<ClosetItem[]> {
    const { data, error } = await this.supabase
      .from('closet_items')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data ?? []
  }

  async findById(id: string): Promise<ClosetItem | null> {
    const { data, error } = await this.supabase
      .from('closet_items')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle()

    if (error) throw error
    return data
  }

  async create(userId: string, input: ClosetItemFormValues): Promise<ClosetItem> {
    const { data, error } = await this.supabase
      .from('closet_items')
      .insert({ ...input, user_id: userId, created_by: userId, updated_by: userId })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async update(id: string, userId: string, input: Partial<ClosetItemFormValues>): Promise<ClosetItem> {
    const { data, error } = await this.supabase
      .from('closet_items')
      .update({ ...input, updated_by: userId })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async softDelete(id: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('closet_items')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)

    if (error) throw error
  }

  async findManyByIds(ids: string[]): Promise<ClosetItem[]> {
    if (!ids.length) return []
    const { data, error } = await this.supabase
      .from('closet_items')
      .select('id, type')
      .in('id', ids)

    if (error) throw error
    return (data ?? []) as ClosetItem[]
  }

  async countWashed(id: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('batch_items')
      .select('id', { count: 'exact', head: true })
      .eq('closet_item_id', id)
      .is('deleted_at', null)

    if (error) throw error
    return count ?? 0
  }

  async hasActiveBatchItems(closetItemId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('batch_items')
      .select('batch_id')
      .eq('closet_item_id', closetItemId)
      .is('deleted_at', null)

    if (error) throw error
    if (!data?.length) return false

    const batchIds = data.map(i => i.batch_id)
    const { count, error: err2 } = await this.supabase
      .from('batch_with_status')
      .select('id', { count: 'exact', head: true })
      .in('id', batchIds)
      .in('status', ['draft', 'in_laundry'])

    if (err2) throw err2
    return (count ?? 0) > 0
  }
}
