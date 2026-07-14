'use server'

import { handleActionError } from '@/lib/handle-error'
import { updateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { BatchService } from '@/services/BatchService'
import { DisputeService } from '@/services/DisputeService'
import { InspectionPolicyService } from '@/services/InspectionPolicyService'
import type { ActionResult, BatchDispute } from '@/types'

async function getAuthed() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Unauthorized')
  return { supabase, userId: user.id }
}

export async function openDispute(
  batchId: string,
  itemId: string,
  damagedQty: number,
  description?: string
): Promise<ActionResult<BatchDispute>> {
  try {
    const { supabase, userId } = await getAuthed()

    const batch = await new BatchService(supabase).getById(batchId)
    if (!batch || batch.user_id !== userId) throw new Error('Batch not found')

    const eligibility = await new InspectionPolicyService(supabase).isDisputeEligible(batch, userId)
    if (!eligibility.allowed) throw new Error(eligibility.reason)

    const dispute = await new DisputeService(supabase).open(batchId, itemId, userId, {
      damaged_qty: damagedQty,
      description: description ?? null,
    })

    updateTag(`batch-${batchId}`)
    return { success: true, data: dispute }
  } catch (e) {
    return handleActionError(e)
  }
}

export async function openSwapDispute(
  batchId: string,
  itemId: string,
  wrongItemDescription: string
): Promise<ActionResult<BatchDispute>> {
  try {
    const { supabase, userId } = await getAuthed()

    const batch = await new BatchService(supabase).getById(batchId)
    if (!batch || batch.user_id !== userId) throw new Error('Batch not found')

    const reportability = await new InspectionPolicyService(supabase).isDamageReportable(batch, userId)
    if (!reportability.allowed) throw new Error(reportability.reason)

    const dispute = await new DisputeService(supabase).openSwap(batchId, itemId, userId, {
      wrong_item_description: wrongItemDescription,
    })

    updateTag(`batch-${batchId}`)
    return { success: true, data: dispute }
  } catch (e) {
    return handleActionError(e)
  }
}

export async function resolveDispute(
  disputeId: string,
  batchId: string,
  resolution: string
): Promise<ActionResult<BatchDispute>> {
  try {
    const { supabase, userId } = await getAuthed()

    const dispute = await new DisputeService(supabase).resolve(disputeId, batchId, userId, resolution)

    updateTag(`batch-${batchId}`)
    return { success: true, data: dispute }
  } catch (e) {
    return handleActionError(e)
  }
}
