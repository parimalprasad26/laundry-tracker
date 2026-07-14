import type { SupabaseClient } from '@supabase/supabase-js'
import { BatchRepository } from '@/repositories/BatchRepository'
import { batchSchema, type BatchFormValues } from '@/schemas/batch.schema'
import type { BatchWithStatus, CursorPage } from '@/types'

export class BatchService {
  private repo: BatchRepository

  constructor(supabase: SupabaseClient) {
    this.repo = new BatchRepository(supabase)
  }

  async getById(id: string): Promise<BatchWithStatus | null> {
    return this.repo.findById(id)
  }

  // Server-side enforcement of the "prices locked on returned/closed batches" rule (see CLAUDE.md)
  async getEditable(id: string, userId: string): Promise<BatchWithStatus> {
    const batch = await this.repo.findById(id)
    if (!batch || batch.user_id !== userId) throw new Error('Batch not found')
    if (batch.status === 'returned' || batch.status === 'closed') {
      throw new Error(`Cannot modify a batch with status '${batch.status}'`)
    }
    return batch
  }

  async listPage(params: {
    userId: string
    cursor?: string
    status?: string
    vendorId?: string
    search?: string
  }): Promise<CursorPage<BatchWithStatus>> {
    return this.repo.findPage(params)
  }

  async create(userId: string, input: BatchFormValues): Promise<BatchWithStatus> {
    const validated = batchSchema.parse(input)
    return this.repo.create(userId, validated)
  }

  async update(id: string, userId: string, input: Partial<BatchFormValues>): Promise<BatchWithStatus> {
    const validated = batchSchema.partial().parse(input)
    return this.repo.update(id, userId, validated)
  }

  async markSent(id: string, userId: string): Promise<BatchWithStatus> {
    return this.repo.update(id, userId, { sent_at: new Date().toISOString() })
  }

  async getWithNotesByVendor(vendorId: string, userId: string): Promise<BatchWithStatus[]> {
    return this.repo.findWithNotesByVendor(vendorId, userId)
  }

  async getForMonth(userId: string, year: number, month: number): Promise<BatchWithStatus[]> {
    return this.repo.findForMonth(userId, year, month)
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.repo.softDelete(id, userId)
  }
}
