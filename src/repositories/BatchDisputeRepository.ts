import type { SupabaseClient } from '@supabase/supabase-js'
import type { BatchDispute, DisputeStatus, DisputeType } from '@/types'

export class BatchDisputeRepository {
  constructor(private supabase: SupabaseClient) {}

  async create(dispute: {
    batch_id: string
    batch_item_id: string
    user_id: string
    damaged_qty: number
    description?: string | null
    dispute_type?: DisputeType
    wrong_item_description?: string | null
  }): Promise<BatchDispute> {
    const { data, error } = await this.supabase
      .from('batch_disputes')
      .insert(dispute)
      .select()
      .single()
    if (error) throw error
    return data as BatchDispute
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
