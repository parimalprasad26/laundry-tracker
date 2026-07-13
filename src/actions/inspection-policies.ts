'use server'

import { updateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { InspectionPolicyService } from '@/services/InspectionPolicyService'
import { handleActionError } from '@/lib/handle-error'
import type { ActionResult, InspectionPolicy } from '@/types'

async function getAuthedService() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Unauthorized')
  return { service: new InspectionPolicyService(supabase), userId: user.id }
}

export async function getInspectionPolicy(): Promise<ActionResult<InspectionPolicy>> {
  try {
    const { service, userId } = await getAuthedService()
    const policy = await service.getPolicy(userId)
    return { success: true, data: policy }
  } catch (e) {
    return handleActionError(e)
  }
}

export async function saveInspectionPolicy(
  fields: Partial<Omit<InspectionPolicy, 'user_id' | 'updated_at'>>
): Promise<ActionResult<InspectionPolicy>> {
  try {
    const { service, userId } = await getAuthedService()
    const policy = await service.savePolicy(userId, fields)
    updateTag(`inspection-policy-${userId}`)
    return { success: true, data: policy }
  } catch (e) {
    return handleActionError(e)
  }
}
