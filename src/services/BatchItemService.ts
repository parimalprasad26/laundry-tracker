import type { SupabaseClient } from '@supabase/supabase-js'
import { BatchItemRepository } from '@/repositories/BatchItemRepository'
import { ClosetRepository } from '@/repositories/ClosetRepository'
import { priceKey } from '@/lib/item-type'
import type { BatchItem, BatchItemWithClosetItem, ItemType } from '@/types'

export class BatchItemService {
  private repo: BatchItemRepository
  private closetRepo: ClosetRepository

  constructor(supabase: SupabaseClient) {
    this.repo = new BatchItemRepository(supabase)
    this.closetRepo = new ClosetRepository(supabase)
  }

  async getByBatch(batchId: string): Promise<BatchItemWithClosetItem[]> {
    return this.repo.findByBatch(batchId)
  }

  async getExistingClosetItemIds(batchId: string): Promise<string[]> {
    return this.repo.findClosetItemIds(batchId)
  }

  async addItems(
    batchId: string,
    userId: string,
    closetItemIds: string[],
    priceMap?: Map<string, number>
  ): Promise<BatchItem[]> {
    if (!closetItemIds.length) return []

    let items: Array<{ closet_item_id: string; unit_price: number | null }>

    if (priceMap && priceMap.size > 0) {
      const closetItems = await this.closetRepo.findManyByIds(closetItemIds)
      const byId = new Map(closetItems.map(ci => [ci.id, ci]))
      items = closetItemIds.map(id => {
        const ci = byId.get(id)
        return {
          closet_item_id: id,
          unit_price: ci ? (priceMap.get(priceKey(ci.type, ci.custom_type)) ?? null) : null,
        }
      })
    } else {
      items = closetItemIds.map(id => ({ closet_item_id: id, unit_price: null }))
    }

    return this.repo.bulkCreate(batchId, userId, items)
  }

  async updateUnitPrice(id: string, userId: string, unitPrice: number | null): Promise<BatchItem> {
    return this.repo.updateUnitPrice(id, userId, unitPrice)
  }

  async applyVendorPrices(batchId: string, userId: string, priceMap: Map<string, number>): Promise<number> {
    const items = await this.repo.findByBatch(batchId)
    const toUpdate = items.filter(i => {
      const key = priceKey(i.closet_item.type, i.closet_item.custom_type)
      return i.unit_price == null && priceMap.has(key)
    })
    await Promise.all(
      toUpdate.map(i => {
        const key = priceKey(i.closet_item.type, i.closet_item.custom_type)
        return this.repo.updateUnitPrice(i.id, userId, priceMap.get(key)!)
      })
    )
    return toUpdate.length
  }

  async reportIssues(id: string, userId: string, damagedQty: number, missingQty: number): Promise<BatchItem> {
    return this.repo.updateIssues(id, userId, damagedQty, missingQty)
  }

  async setReturnedQuantity(id: string, userId: string, quantity: number): Promise<BatchItem> {
    return this.repo.updateReturnQuantity(id, userId, quantity)
  }

  async markAllReturned(batchId: string, userId: string): Promise<void> {
    await this.repo.markAllReturned(batchId, userId)
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.repo.softDelete(id, userId)
  }
}
