'use server'

import { handleActionError } from '@/lib/handle-error'

import { updateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { VendorService } from '@/services/VendorService'
import type { VendorFormValues } from '@/schemas/vendor.schema'
import type { ActionResult, LaundryVendor } from '@/types'

async function getAuthedService() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Unauthorized')
  return { service: new VendorService(supabase), userId: user.id }
}

export async function createVendor(input: VendorFormValues): Promise<ActionResult<LaundryVendor>> {
  try {
    const { service, userId } = await getAuthedService()
    const vendor = await service.create(userId, input)
    updateTag('vendors')
    return { success: true, data: vendor }
  } catch (e) {
    return handleActionError(e)
  }
}

export async function updateVendor(id: string, input: VendorFormValues): Promise<ActionResult<LaundryVendor>> {
  try {
    const { service, userId } = await getAuthedService()
    const vendor = await service.update(id, userId, input)
    updateTag('vendors')
    return { success: true, data: vendor }
  } catch (e) {
    return handleActionError(e)
  }
}

export async function deleteVendor(id: string): Promise<ActionResult> {
  try {
    const { service, userId } = await getAuthedService()
    await service.delete(id, userId)
    updateTag('vendors')
    return { success: true, data: undefined }
  } catch (e) {
    return handleActionError(e)
  }
}
