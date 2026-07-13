import type { SupabaseClient } from '@supabase/supabase-js'
import { BatchEventRepository } from '@/repositories/BatchEventRepository'
import type { BatchEvent, BatchEventType } from '@/types'

export class BatchStateMachineService {
  private events: BatchEventRepository

  constructor(private supabase: SupabaseClient) {
    this.events = new BatchEventRepository(supabase)
  }

  async logEvent(
    batchId: string,
    userId: string,
    eventType: BatchEventType,
    payload: Record<string, unknown> = {}
  ): Promise<BatchEvent> {
    return this.events.append({ batch_id: batchId, user_id: userId, event_type: eventType, payload })
  }

  async closeBatch(batchId: string, userId: string): Promise<void> {
    const now = new Date().toISOString()
    const { error } = await this.supabase
      .from('laundry_batches')
      .update({ closed_at: now, updated_at: now, updated_by: userId })
      .eq('id', batchId)
      .eq('user_id', userId)
    if (error) throw error
    await this.logEvent(batchId, userId, 'batch.closed', { closed_at: now })
  }

  async autoCloseBatch(batchId: string, userId: string): Promise<void> {
    const now = new Date().toISOString()
    const { error } = await this.supabase
      .from('laundry_batches')
      .update({ closed_at: now, updated_at: now, updated_by: userId })
      .eq('id', batchId)
      .eq('user_id', userId)
    if (error) throw error
    await this.logEvent(batchId, userId, 'batch.auto_closed', { closed_at: now })
  }

  async getHistory(batchId: string): Promise<BatchEvent[]> {
    return this.events.findByBatch(batchId)
  }
}
