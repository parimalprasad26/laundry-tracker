import type { SupabaseClient } from '@supabase/supabase-js'
import { ClosetRepository } from '@/repositories/ClosetRepository'
import { closetItemSchema, type ClosetItemFormValues } from '@/schemas/closet.schema'
import type { ClosetItem } from '@/types'

export class ClosetService {
  private repo: ClosetRepository

  constructor(supabase: SupabaseClient) {
    this.repo = new ClosetRepository(supabase)
  }

  async list(userId: string): Promise<ClosetItem[]> {
    return this.repo.findAll(userId)
  }

  async getById(id: string): Promise<ClosetItem | null> {
    return this.repo.findById(id)
  }

  async create(userId: string, input: ClosetItemFormValues): Promise<ClosetItem> {
    const validated = closetItemSchema.parse(input)
    return this.repo.create(userId, validated)
  }

  async update(id: string, userId: string, input: Partial<ClosetItemFormValues>): Promise<ClosetItem> {
    const validated = closetItemSchema.partial().parse(input)
    return this.repo.update(id, userId, validated)
  }

  async bulkCreate(userId: string, inputs: ClosetItemFormValues[]): Promise<ClosetItem[]> {
    const validated = inputs.map(input => closetItemSchema.parse(input))
    return this.repo.bulkCreate(userId, validated)
  }

  async setPhotoStatus(
    id: string,
    userId: string,
    status: 'uploaded' | 'failed',
    primaryImagePath?: string
  ): Promise<ClosetItem> {
    return this.repo.updatePhotoStatus(id, userId, status, primaryImagePath)
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.repo.softDelete(id, userId)
  }

  async countWashed(id: string): Promise<number> {
    return this.repo.countWashed(id)
  }

  async hasActiveBatchItems(id: string): Promise<boolean> {
    return this.repo.hasActiveBatchItems(id)
  }
}
