'use server'

import { handleActionError } from '@/lib/handle-error'

import { updateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { BatchService } from '@/services/BatchService'
import { BatchItemService } from '@/services/BatchItemService'
import { BatchItemRepository } from '@/repositories/BatchItemRepository'
import type { BatchFormValues } from '@/schemas/batch.schema'
import type { ActionResult, BatchWithStatus } from '@/types'

async function getAuthedService() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Unauthorized')
  return { service: new BatchService(supabase), userId: user.id }
}

export async function createBatch(input: BatchFormValues): Promise<ActionResult<BatchWithStatus>> {
  try {
    const { service, userId } = await getAuthedService()
    const batch = await service.create(userId, input)
    updateTag('batches')
    return { success: true, data: batch }
  } catch (e) {
    return handleActionError(e)
  }
}

export async function updateBatch(id: string, input: Partial<BatchFormValues>): Promise<ActionResult<BatchWithStatus>> {
  try {
    const { service, userId } = await getAuthedService()
    const batch = await service.update(id, userId, input)
    updateTag('batches')
    updateTag(`batch-${id}`)
    return { success: true, data: batch }
  } catch (e) {
    return handleActionError(e)
  }
}

export async function markBatchSent(id: string): Promise<ActionResult<BatchWithStatus>> {
  try {
    const { service, userId } = await getAuthedService()
    const batch = await service.markSent(id, userId)
    updateTag('batches')
    updateTag(`batch-${id}`)
    return { success: true, data: batch }
  } catch (e) {
    return handleActionError(e)
  }
}

export async function recordBatchPayment(
  id: string,
  actualCost: number,
  priceDeltaNote?: string | null
): Promise<ActionResult<BatchWithStatus>> {
  try {
    const { service, userId } = await getAuthedService()
    const batch = await service.update(id, userId, {
      actual_cost: actualCost,
      payment_status: 'paid',
      price_delta_note: priceDeltaNote ?? null,
    })
    updateTag('batches')
    updateTag(`batch-${id}`)
    return { success: true, data: batch }
  } catch (e) {
    return handleActionError(e)
  }
}

export async function getBatchesForMonth(
  year: number,
  month: number
): Promise<ActionResult<BatchWithStatus[]>> {
  try {
    const { service, userId } = await getAuthedService()
    const batches = await service.getForMonth(userId, year, month)
    return { success: true, data: batches }
  } catch (e) {
    return handleActionError(e)
  }
}

export async function deleteBatch(id: string): Promise<ActionResult> {
  try {
    const { service, userId } = await getAuthedService()
    await service.delete(id, userId)
    updateTag('batches')
    return { success: true, data: undefined }
  } catch (e) {
    return handleActionError(e)
  }
}

export async function reBatch(originalBatchId: string): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) throw new Error('Unauthorized')

    const batchService = new BatchService(supabase)
    const itemService = new BatchItemService(supabase)

    const original = await batchService.getById(originalBatchId)
    if (!original || original.user_id !== user.id) throw new Error('Batch not found')

    const originalItems = await itemService.getByBatch(originalBatchId)

    const newBatch = await batchService.create(user.id, {
      name: original.name,
      vendor_id: original.vendor_id ?? undefined,
      notes: null,
      payment_status: 'unpaid',
    })

    if (originalItems.length > 0) {
      const itemRepo = new BatchItemRepository(supabase)
      await itemRepo.bulkCreate(
        newBatch.id,
        user.id,
        originalItems.map(i => ({ closet_item_id: i.closet_item_id, unit_price: i.unit_price }))
      )
    }

    updateTag('batches')
    return { success: true, data: { id: newBatch.id } }
  } catch (e) {
    return handleActionError(e)
  }
}
