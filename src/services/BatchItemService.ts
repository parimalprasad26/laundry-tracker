import type { SupabaseClient } from '@supabase/supabase-js'
import { BatchItemRepository } from '@/repositories/BatchItemRepository'
import { ClosetRepository } from '@/repositories/ClosetRepository'
import { priceKey } from '@/lib/item-type'
import type { BatchItem, BatchItemWithClosetItem, ClosetItem, MissingCustomPrice } from '@/types'

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
    priceMap?: Map<string, number>  // undefined = no vendor; empty Map = vendor with no prices
  ): Promise<{ items: BatchItem[]; missingCustomPrices: MissingCustomPrice[] }> {
    if (!closetItemIds.length) return { items: [], missingCustomPrices: [] }

    let itemInputs: Array<{ closet_item_id: string; unit_price: number | null }>
    let closetItemsById = new Map<string, ClosetItem>()

    if (priceMap !== undefined) {
      // Vendor exists — fetch closet items to resolve types and detect missing custom prices
      const closetItems = await this.closetRepo.findManyByIds(closetItemIds, userId)
      closetItemsById = new Map(closetItems.map(ci => [ci.id, ci]))
      itemInputs = closetItemIds.map(id => {
        const ci = closetItemsById.get(id)
        return {
          closet_item_id: id,
          unit_price: ci ? (priceMap.get(priceKey(ci.type, ci.custom_type)) ?? null) : null,
        }
      })
    } else {
      itemInputs = closetItemIds.map(id => ({ closet_item_id: id, unit_price: null }))
    }

    const items = await this.repo.bulkCreate(batchId, userId, itemInputs)

    // Detect custom-type items that got no vendor price
    const missingCustomPrices: MissingCustomPrice[] = []
    if (priceMap !== undefined && closetItemsById.size > 0) {
      const missingMap = new Map<string, string[]>()
      for (const item of items) {
        if (item.unit_price !== null) continue
        const ci = closetItemsById.get(item.closet_item_id)
        if (!ci || ci.type !== 'other' || !ci.custom_type) continue
        const ids = missingMap.get(ci.custom_type) ?? []
        ids.push(item.id)
        missingMap.set(ci.custom_type, ids)
      }
      for (const [customType, batchItemIds] of missingMap) {
        missingCustomPrices.push({ customType, batchItemIds })
      }
    }

    return { items, missingCustomPrices }
  }

  async updateUnitPrice(id: string, userId: string, batchId: string, unitPrice: number | null): Promise<BatchItem> {
    return this.repo.updateUnitPrice(id, userId, batchId, unitPrice)
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
        return this.repo.updateUnitPrice(i.id, userId, batchId, priceMap.get(key)!)
      })
    )
    return toUpdate.length
  }

  async reportIssues(
    id: string,
    userId: string,
    damagedQty: number,
    missingQty: number,
    issueStatus: 'post_return' | 'dispute' = 'post_return'
  ): Promise<BatchItem> {
    return this.repo.updateIssues(id, userId, damagedQty, missingQty, issueStatus)
  }

  async setReturnedQuantity(id: string, userId: string, quantity: number): Promise<BatchItem> {
    return this.repo.updateReturnQuantity(id, userId, quantity)
  }

  async markAllReturned(batchId: string, userId: string): Promise<void> {
    await this.repo.markAllReturned(batchId, userId)
  }

  async markSelectivelyReturned(batchId: string, userId: string, missingItemIds: string[]): Promise<void> {
    if (missingItemIds.length === 0) {
      await this.repo.markAllReturned(batchId, userId)
    } else {
      await this.repo.markSelectivelyReturned(batchId, userId, missingItemIds)
    }
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.repo.softDelete(id, userId)
  }
}
