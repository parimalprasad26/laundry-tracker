import type { SupabaseClient } from '@supabase/supabase-js'
import type { BatchEvent, BatchEventType } from '@/types'

export class BatchEventRepository {
  constructor(private supabase: SupabaseClient) {}

  async append(event: {
    batch_id: string
    user_id: string
    event_type: BatchEventType
    payload?: Record<string, unknown>
  }): Promise<BatchEvent> {
    const { data, error } = await this.supabase
      .from('batch_events')
      .insert({ ...event, payload: event.payload ?? {} })
      .select()
      .single()
    if (error) throw error
    return data as BatchEvent
  }

  async findByBatch(batchId: string): Promise<BatchEvent[]> {
    const { data, error } = await this.supabase
      .from('batch_events')
      .select('*')
      .eq('batch_id', batchId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return (data ?? []) as BatchEvent[]
  }
}
