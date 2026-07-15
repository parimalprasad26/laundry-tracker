import { describe, it, expect, vi } from 'vitest'
import { BatchItemService } from '@/services/BatchItemService'
import type { BatchItem, BatchItemWithClosetItem, ClosetItem } from '@/types'

function makeBatchItem(overrides: Partial<BatchItemWithClosetItem> = {}): BatchItemWithClosetItem {
  const closetItem: ClosetItem = {
    id: 'closet-1',
    user_id: 'user-1',
    name: 'Shirt',
    type: 'shirt',
    custom_type: null,
    color: null,
    brand: null,
    notes: null,
    primary_image_path: null,
    photo_status: 'none',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: 'user-1',
    updated_by: 'user-1',
  }
  return {
    id: 'item-1',
    batch_id: 'batch-1',
    closet_item_id: 'closet-1',
    user_id: 'user-1',
    quantity_sent: 1,
    quantity_returned: 0,
    damaged_qty: 0,
    missing_qty: 0,
    unit_price: null,
    notes: null,
    returned_at: null,
    issue_reported_at: null,
    issue_reported_status: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: 'user-1',
    updated_by: 'user-1',
    closet_item: closetItem,
    ...overrides,
  }
}

function makeService() {
  const service = new BatchItemService({} as ConstructorParameters<typeof BatchItemService>[0])
  return service
}

describe('BatchItemService.updateUnitPrice', () => {
  it('passes batchId through to the repository so the update is scoped to that batch', async () => {
    const service = makeService()
    const repoUpdate = vi.fn().mockResolvedValue({} as BatchItem)
    // @ts-expect-error — patching private repo for test
    service.repo.updateUnitPrice = repoUpdate

    await service.updateUnitPrice('item-1', 'user-1', 'batch-1', 100)

    expect(repoUpdate).toHaveBeenCalledWith('item-1', 'user-1', 'batch-1', 100)
  })
})

describe('BatchItemService.applyVendorPrices', () => {
  it('scopes every bulk price update to the batch it was called with', async () => {
    const service = makeService()
    const items = [
      makeBatchItem({ id: 'item-1', unit_price: null }),
      makeBatchItem({ id: 'item-2', unit_price: null, closet_item_id: 'closet-2' }),
    ]
    // @ts-expect-error — patching private repo for test
    service.repo.findByBatch = vi.fn().mockResolvedValue(items)
    const repoUpdate = vi.fn().mockResolvedValue({} as BatchItem)
    // @ts-expect-error
    service.repo.updateUnitPrice = repoUpdate

    const priceMap = new Map([['shirt', 50]])
    const applied = await service.applyVendorPrices('batch-1', 'user-1', priceMap)

    expect(applied).toBe(2)
    expect(repoUpdate).toHaveBeenCalledWith('item-1', 'user-1', 'batch-1', 50)
    expect(repoUpdate).toHaveBeenCalledWith('item-2', 'user-1', 'batch-1', 50)
  })
})
