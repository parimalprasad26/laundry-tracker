'use server'

import { handleActionError } from '@/lib/handle-error'

import { updateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { BatchItemService } from '@/services/BatchItemService'
import { BatchService } from '@/services/BatchService'
import { InspectionPolicyService } from '@/services/InspectionPolicyService'
import { BatchStateMachineService } from '@/services/BatchStateMachineService'
import { VendorPriceRepository } from '@/repositories/VendorPriceRepository'
import type { ActionResult, BatchItem } from '@/types'

async function getAuthedService() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Unauthorized')
  return { supabase, service: new BatchItemService(supabase), userId: user.id }
}

export async function addItemsToBatch(
  batchId: string,
  closetItemIds: string[]
): Promise<ActionResult<BatchItem[]>> {
  try {
    const { supabase, service, userId } = await getAuthedService()

    const batch = await new BatchService(supabase).getById(batchId)
    let priceMap = new Map()
    if (batch?.vendor_id) {
      priceMap = await new VendorPriceRepository(supabase).getPriceMap(batch.vendor_id, userId)
    }

    const items = await service.addItems(batchId, userId, closetItemIds, priceMap)
    updateTag(`batch-${batchId}`)
    updateTag('batches')
    return { success: true, data: items }
  } catch (e) {
    return handleActionError(e)
  }
}

export async function updateBatchItemPrice(
  itemId: string,
  batchId: string,
  unitPrice: number | null
): Promise<ActionResult<BatchItem>> {
  try {
    const { service, userId } = await getAuthedService()
    const item = await service.updateUnitPrice(itemId, userId, unitPrice)
    updateTag(`batch-${batchId}`)
    return { success: true, data: item }
  } catch (e) {
    return handleActionError(e)
  }
}

export async function setBatchItemReturned(
  itemId: string,
  batchId: string,
  quantity: number
): Promise<ActionResult<BatchItem>> {
  try {
    const { supabase, service, userId } = await getAuthedService()
    const item = await service.setReturnedQuantity(itemId, userId, quantity)
    const batchService = new BatchService(supabase)

    if (quantity < item.quantity_sent) {
      // Item not fully returned — clear batch-level returned_at if it was set
      const batch = await batchService.getById(batchId)
      if (batch?.returned_at) {
        await batchService.update(batchId, userId, { returned_at: null })
      }
    } else {
      // Item fully returned — if all items are now returned, anchor returned_at
      const batch = await batchService.getById(batchId)
      if (batch && batch.status === 'returned' && !batch.returned_at) {
        await batchService.update(batchId, userId, { returned_at: new Date().toISOString() })
        await new BatchStateMachineService(supabase).logEvent(batchId, userId, 'batch.all_returned')
      }
    }

    updateTag(`batch-${batchId}`)
    updateTag('batches')
    return { success: true, data: item }
  } catch (e) {
    return handleActionError(e)
  }
}

export async function markAllBatchItemsReturned(batchId: string): Promise<ActionResult> {
  try {
    const { supabase, service, userId } = await getAuthedService()
    await service.markAllReturned(batchId, userId)
    const now = new Date().toISOString()
    await new BatchService(supabase).update(batchId, userId, { returned_at: now })
    await new BatchStateMachineService(supabase).logEvent(batchId, userId, 'batch.all_returned', {
      returned_at: now,
    })
    updateTag(`batch-${batchId}`)
    updateTag('batches')
    return { success: true, data: undefined }
  } catch (e) {
    return handleActionError(e)
  }
}

export async function applyVendorPricesToBatch(batchId: string): Promise<ActionResult<{ applied: number }>> {
  try {
    const { supabase, service, userId } = await getAuthedService()
    const batch = await new BatchService(supabase).getById(batchId)
    if (!batch?.vendor_id) return { success: false, error: 'Batch has no vendor' }

    const priceMap = await new VendorPriceRepository(supabase).getPriceMap(batch.vendor_id, userId)
    if (!priceMap.size) return { success: false, error: 'Vendor has no prices set' }

    const applied = await service.applyVendorPrices(batchId, userId, priceMap)
    updateTag(`batch-${batchId}`)
    return { success: true, data: { applied } }
  } catch (e) {
    return handleActionError(e)
  }
}

export async function reportBatchItemIssues(
  itemId: string,
  batchId: string,
  damagedQty: number,
  missingQty: number
): Promise<ActionResult<BatchItem>> {
  try {
    const { supabase, service, userId } = await getAuthedService()

    const batch = await new BatchService(supabase).getById(batchId)
    if (!batch || batch.user_id !== userId) throw new Error('Batch not found')

    const reportability = await new InspectionPolicyService(supabase).isDamageReportable(batch, userId)
    if (!reportability.allowed) throw new Error(reportability.reason)

    const item = await service.reportIssues(itemId, userId, damagedQty, missingQty, 'post_return')

    await new BatchStateMachineService(supabase).logEvent(batchId, userId, 'batch.damage_reported', {
      item_id: itemId,
      damaged_qty: damagedQty,
      missing_qty: missingQty,
    })

    updateTag(`batch-${batchId}`)
    return { success: true, data: item }
  } catch (e) {
    return handleActionError(e)
  }
}

export async function collectBatch(
  batchId: string,
  collectedCount: number
): Promise<ActionResult> {
  try {
    const { supabase, service, userId } = await getAuthedService()

    const batchService = new BatchService(supabase)
    const batch = await batchService.getById(batchId)
    if (!batch || batch.user_id !== userId) throw new Error('Batch not found')
    if (batch.status !== 'in_laundry') throw new Error('Batch is not in laundry')

    const totalExpected = batch.total_items
    const shortfall = totalExpected - collectedCount

    await service.markAllReturned(batchId, userId)
    const now = new Date().toISOString()
    await batchService.update(batchId, userId, { returned_at: now })

    const stateMachine = new BatchStateMachineService(supabase)
    await stateMachine.logEvent(batchId, userId, 'batch.collected', {
      collected: collectedCount,
      expected: totalExpected,
      shortfall,
    })
    await stateMachine.logEvent(batchId, userId, 'batch.all_returned', { returned_at: now })

    updateTag(`batch-${batchId}`)
    updateTag('batches')
    return { success: true, data: undefined }
  } catch (e) {
    return handleActionError(e)
  }
}

export async function removeBatchItem(id: string, batchId: string): Promise<ActionResult> {
  try {
    const { service, userId } = await getAuthedService()
    await service.remove(id, userId)
    updateTag(`batch-${batchId}`)
    return { success: true, data: undefined }
  } catch (e) {
    return handleActionError(e)
  }
}
