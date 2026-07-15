'use server'

import { handleActionError } from '@/lib/handle-error'

import { updateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { ClosetService } from '@/services/ClosetService'
import type { ClosetItemFormValues } from '@/schemas/closet.schema'
import type { ActionResult, ClosetItem } from '@/types'

async function getAuthedService() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Unauthorized')
  return { service: new ClosetService(supabase), userId: user.id }
}

export async function createClosetItem(input: ClosetItemFormValues): Promise<ActionResult<ClosetItem>> {
  try {
    const { service, userId } = await getAuthedService()
    const item = await service.create(userId, input)
    updateTag('closet')
    return { success: true, data: item }
  } catch (e) {
    return handleActionError(e)
  }
}

export async function bulkCreateClosetItems(inputs: ClosetItemFormValues[]): Promise<ActionResult<ClosetItem[]>> {
  try {
    const { service, userId } = await getAuthedService()
    const items = await service.bulkCreate(userId, inputs)
    updateTag('closet')
    return { success: true, data: items }
  } catch (e) {
    return handleActionError(e)
  }
}

export async function updateClosetItem(id: string, input: Partial<ClosetItemFormValues>): Promise<ActionResult<ClosetItem>> {
  try {
    const { service, userId } = await getAuthedService()
    const item = await service.update(id, userId, input)
    updateTag('closet')
    updateTag(`closet-${id}`)
    return { success: true, data: item }
  } catch (e) {
    return handleActionError(e)
  }
}

export async function setClosetItemPhotoStatus(
  id: string,
  status: 'uploaded' | 'failed',
  primaryImagePath?: string
): Promise<ActionResult<ClosetItem>> {
  try {
    const { service, userId } = await getAuthedService()
    const item = await service.setPhotoStatus(id, userId, status, primaryImagePath)
    updateTag('closet')
    updateTag(`closet-${id}`)
    return { success: true, data: item }
  } catch (e) {
    return handleActionError(e)
  }
}

export async function deleteClosetItem(id: string): Promise<ActionResult> {
  try {
    const { service, userId } = await getAuthedService()
    const isActive = await service.hasActiveBatchItems(id)
    if (isActive) {
      return { success: false, error: 'This item is in an active batch. Remove it from the batch first.' }
    }
    await service.delete(id, userId)
    updateTag('closet')
    return { success: true, data: undefined }
  } catch (e) {
    return handleActionError(e)
  }
}
