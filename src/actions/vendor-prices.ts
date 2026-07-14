'use server'

import { handleActionError } from '@/lib/handle-error'

import { updateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { VendorPriceService } from '@/services/VendorPriceService'
import { VendorPriceRepository } from '@/repositories/VendorPriceRepository'
import { BatchItemRepository } from '@/repositories/BatchItemRepository'
import type { VendorItemPrice, ActionResult } from '@/types'
import type { VendorPriceEntry } from '@/repositories/VendorPriceRepository'

async function getAuthedService() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Unauthorized')
  return { service: new VendorPriceService(supabase), userId: user.id }
}

export async function getVendorPrices(vendorId: string): Promise<ActionResult<VendorItemPrice[]>> {
  try {
    const { service, userId } = await getAuthedService()
    const prices = await service.getByVendor(vendorId, userId)
    return { success: true, data: prices }
  } catch (e) {
    return handleActionError(e)
  }
}

export async function saveVendorPrices(
  vendorId: string,
  prices: VendorPriceEntry[]
): Promise<ActionResult> {
  try {
    const { service, userId } = await getAuthedService()
    await service.save(vendorId, userId, prices)
    updateTag(`vendor-prices-${vendorId}`)
    updateTag('vendors')
    return { success: true, data: undefined }
  } catch (e) {
    return handleActionError(e)
  }
}

export async function setVendorCustomTypePrice(
  vendorId: string,
  batchId: string,
  entries: { customType: string; price: number; batchItemIds: string[] }[]
): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) throw new Error('Unauthorized')

    const priceRepo = new VendorPriceRepository(supabase)
    const itemRepo = new BatchItemRepository(supabase)

    await Promise.all(
      entries.flatMap(({ customType, price, batchItemIds }) => [
        priceRepo.upsertOne(vendorId, user.id, { item_type: 'other', custom_type: customType, unit_price: price }),
        itemRepo.bulkUpdateUnitPrice(batchItemIds, user.id, price),
      ])
    )

    updateTag(`vendor-prices-${vendorId}`)
    updateTag('vendors')
    updateTag(`batch-${batchId}`)
    return { success: true, data: undefined }
  } catch (e) {
    return handleActionError(e)
  }
}
