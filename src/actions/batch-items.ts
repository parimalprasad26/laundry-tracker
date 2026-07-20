'use server'

import { handleActionError } from '@/lib/handle-error'
import * as Sentry from '@sentry/nextjs'

import { updateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { BatchItemService } from '@/services/BatchItemService'
import { BatchService } from '@/services/BatchService'
import { InspectionPolicyService } from '@/services/InspectionPolicyService'
import { DisputeService } from '@/services/DisputeService'
import { BatchStateMachineService } from '@/services/BatchStateMachineService'
import { VendorPriceRequestService } from '@/services/VendorPriceRequestService'
import { VendorPriceRepository } from '@/repositories/VendorPriceRepository'
import { VendorAccountPriceRepository } from '@/repositories/VendorAccountPriceRepository'
import { VendorConnectionRepository } from '@/repositories/VendorConnectionRepository'
import { BatchItemRepository } from '@/repositories/BatchItemRepository'
import { notifyConnectedVendor } from '@/lib/vendor-notify'
import type { ActionResult, BatchItem, MissingCustomPrice } from '@/types'

async function getAuthedService() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Unauthorized')
  return { supabase, service: new BatchItemService(supabase), userId: user.id }
}

export async function addItemsToBatch(
  batchId: string,
  closetItemIds: string[]
): Promise<ActionResult<{ items: BatchItem[]; missingCustomPrices: MissingCustomPrice[] }>> {
  try {
    const { supabase, service, userId } = await getAuthedService()

    const batch = await new BatchService(supabase).getEditable(batchId, userId)

    // A batch's vendor is either a plain private contact (today's per-customer
    // vendor_item_prices flow, unchanged) or a connected platform vendor (the
    // vendor's single shared price list) — never both. Connection status is
    // re-derived live here, never read off laundry_vendors.vendor_account_id
    // directly (that column is a convenience pointer only, not authoritative —
    // see the vendor portal plan's Finding 1).
    let priceMap: Map<string, number> | undefined
    let connectedVendorAccountId: string | null = null

    if (batch.vendor_id) {
      const connection = await new VendorConnectionRepository(supabase).findActiveByLaundryVendorId(batch.vendor_id)
      if (connection) {
        connectedVendorAccountId = connection.vendor_account_id
        priceMap = await new VendorAccountPriceRepository(supabase).getPriceMap(connection.vendor_account_id)
      } else {
        priceMap = await new VendorPriceRepository(supabase).getPriceMap(batch.vendor_id, userId)
      }
    }

    const { items, missingCustomPrices } = await service.addItems(batchId, userId, closetItemIds, priceMap)

    if (connectedVendorAccountId && missingCustomPrices.length > 0) {
      // Connected vendor: a missing custom price becomes a pending request to
      // the vendor, not a prompt asking the customer to type a price
      // (decision #6) — the item shows "awaiting vendor price," the rest of
      // the batch is unaffected.
      const priceRequestService = new VendorPriceRequestService(supabase)
      const adminBatchItemRepo = new BatchItemRepository(createAdminClient())
      for (const missing of missingCustomPrices) {
        const requestId = await priceRequestService.createIfNeeded(connectedVendorAccountId, missing.customType, userId)
        if (requestId) {
          await adminBatchItemRepo.setPendingPriceRequestServiceRole(missing.batchItemIds, requestId)
        }
      }
      updateTag(`batch-${batchId}`)
      updateTag('batches')
      return { success: true, data: { items, missingCustomPrices: [] } }
    }

    updateTag(`batch-${batchId}`)
    updateTag('batches')
    return { success: true, data: { items, missingCustomPrices } }
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
    const { supabase, service, userId } = await getAuthedService()
    const batch = await new BatchService(supabase).getEditable(batchId, userId)

    // A connected vendor's price list is the source of truth for this
    // batch's items (see addItemsToBatch above) — the customer can't
    // silently override it, or their calculated_cost would drift from
    // what the vendor actually charges.
    if (batch.vendor_id) {
      const connection = await new VendorConnectionRepository(supabase).findActiveByLaundryVendorId(batch.vendor_id)
      if (connection) throw new Error('Price is set by the vendor and cannot be edited')
    }

    const item = await service.updateUnitPrice(itemId, userId, batchId, unitPrice)
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
    const item = await service.setReturnedQuantity(itemId, userId, batchId, quantity)
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
        const updated = await batchService.update(batchId, userId, { returned_at: new Date().toISOString() })
        await new BatchStateMachineService(supabase).logEvent(batchId, userId, 'batch.all_returned')

        if (updated.vendor_id) {
          notifyConnectedVendor(createAdminClient(), updated.vendor_id, batchId, {
            title: 'A batch was collected',
            body: `"${updated.name}" — all items returned`,
            tag: 'vendor-batch-collected',
          }).catch(err => Sentry.captureException(err, { extra: { context: 'vendor-notify', batchId } }))
        }
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
    const batch = await new BatchService(supabase).update(batchId, userId, { returned_at: now })
    await new BatchStateMachineService(supabase).logEvent(batchId, userId, 'batch.all_returned', {
      returned_at: now,
    })
    updateTag(`batch-${batchId}`)
    updateTag('batches')

    if (batch.vendor_id) {
      notifyConnectedVendor(createAdminClient(), batch.vendor_id, batchId, {
        title: 'A batch was collected',
        body: `"${batch.name}" — all items returned`,
        tag: 'vendor-batch-collected',
      }).catch(err => Sentry.captureException(err, { extra: { context: 'vendor-notify', batchId } }))
    }

    return { success: true, data: undefined }
  } catch (e) {
    return handleActionError(e)
  }
}

export async function applyVendorPricesToBatch(batchId: string): Promise<ActionResult<{ applied: number }>> {
  try {
    const { supabase, service, userId } = await getAuthedService()
    const batch = await new BatchService(supabase).getEditable(batchId, userId)
    if (!batch.vendor_id) return { success: false, error: 'Batch has no vendor' }

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

    const { data: batchItem } = await supabase
      .from('batch_items')
      .select('quantity_returned')
      .eq('id', itemId)
      .eq('user_id', userId)
      .maybeSingle()
    if (!batchItem) throw new Error('Item not found')
    if (damagedQty > batchItem.quantity_returned) {
      throw new Error(`Damaged quantity (${damagedQty}) cannot exceed returned quantity (${batchItem.quantity_returned})`)
    }

    // Mirror of the check in openSwapDispute — an open swap ("wrong item")
    // report means this item isn't the customer's, so a damage/missing
    // claim against it is contradictory.
    if (damagedQty > 0 || missingQty > 0) {
      const openSwap = await new DisputeService(supabase).findOpenSwapByItem(itemId, userId)
      if (openSwap) throw new Error('This item has an open swap report — resolve it before reporting damage')
    }

    const item = await service.reportIssues(itemId, userId, damagedQty, missingQty, 'post_return')

    await new BatchStateMachineService(supabase).logEvent(batchId, userId, 'batch.damage_reported', {
      item_id: itemId,
      damaged_qty: damagedQty,
      missing_qty: missingQty,
    })

    updateTag(`batch-${batchId}`)

    if (batch.vendor_id && (damagedQty > 0 || missingQty > 0)) {
      const parts = []
      if (damagedQty > 0) parts.push(`${damagedQty} damaged`)
      if (missingQty > 0) parts.push(`${missingQty} missing`)
      notifyConnectedVendor(createAdminClient(), batch.vendor_id, batchId, {
        title: 'Damage reported',
        body: `${parts.join(', ')} item(s) on "${batch.name}"`,
        tag: 'vendor-damage-reported',
      }).catch(err => Sentry.captureException(err, { extra: { context: 'vendor-notify', batchId } }))
    }

    return { success: true, data: item }
  } catch (e) {
    return handleActionError(e)
  }
}

export async function collectBatch(
  batchId: string,
  collectedCount: number,
  missingItemIds: string[] = []
): Promise<ActionResult> {
  try {
    const { supabase, service, userId } = await getAuthedService()

    const batchService = new BatchService(supabase)
    const batch = await batchService.getById(batchId)
    if (!batch || batch.user_id !== userId) throw new Error('Batch not found')
    if (batch.status !== 'in_laundry') throw new Error('Batch is not in laundry')

    const totalExpected = batch.total_items
    const shortfall = totalExpected - collectedCount

    await service.markSelectivelyReturned(batchId, userId, missingItemIds)
    const now = new Date().toISOString()
    await batchService.update(batchId, userId, { returned_at: now })

    const stateMachine = new BatchStateMachineService(supabase)
    await stateMachine.logEvent(batchId, userId, 'batch.collected', {
      collected: collectedCount,
      expected: totalExpected,
      shortfall,
      missing_item_ids: missingItemIds,
    })
    await stateMachine.logEvent(batchId, userId, 'batch.all_returned', { returned_at: now })

    updateTag(`batch-${batchId}`)
    updateTag('batches')

    if (batch.vendor_id) {
      const notification = shortfall > 0
        ? { title: 'Items missing from a collected batch', body: `${collectedCount}/${totalExpected} items collected from "${batch.name}"`, tag: 'vendor-batch-collected' }
        : { title: 'A batch was collected', body: `"${batch.name}" — ${collectedCount} item(s) collected`, tag: 'vendor-batch-collected' }
      notifyConnectedVendor(createAdminClient(), batch.vendor_id, batchId, notification)
        .catch(err => Sentry.captureException(err, { extra: { context: 'vendor-notify', batchId } }))
    }

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
