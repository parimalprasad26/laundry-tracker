'use server'

import { handleActionError } from '@/lib/handle-error'
import * as Sentry from '@sentry/nextjs'
import { updateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { BatchService } from '@/services/BatchService'
import { DisputeService } from '@/services/DisputeService'
import { InspectionPolicyService } from '@/services/InspectionPolicyService'
import { notifyConnectedVendor } from '@/lib/vendor-notify'
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

    const { data: batchItem } = await supabase
      .from('batch_items')
      .select('quantity_returned')
      .eq('id', itemId)
      .eq('user_id', userId)
      .maybeSingle()
    if (!batchItem) throw new Error('Item not found')
    if (batchItem.quantity_returned === 0) throw new Error('Cannot open a dispute on an item that was not collected')
    if (damagedQty > batchItem.quantity_returned) {
      throw new Error(`Damaged quantity (${damagedQty}) cannot exceed returned quantity (${batchItem.quantity_returned})`)
    }

    const dispute = await new DisputeService(supabase).open(batchId, itemId, userId, {
      damaged_qty: damagedQty,
      description: description ?? null,
    })

    updateTag(`batch-${batchId}`)

    if (batch.vendor_id) {
      notifyConnectedVendor(createAdminClient(), batch.vendor_id, batchId, {
        title: 'Dispute opened',
        body: `${damagedQty} damaged item(s) disputed on "${batch.name}"`,
        tag: 'vendor-dispute-opened',
      }).catch(err => Sentry.captureException(err, { extra: { context: 'vendor-notify', batchId } }))
    }

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

    if (batch.vendor_id) {
      notifyConnectedVendor(createAdminClient(), batch.vendor_id, batchId, {
        title: 'Wrong item reported',
        body: `A swap dispute was opened on "${batch.name}"`,
        tag: 'vendor-dispute-opened',
      }).catch(err => Sentry.captureException(err, { extra: { context: 'vendor-notify', batchId } }))
    }

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

    const batch = await new BatchService(supabase).getById(batchId)
    if (!batch || batch.user_id !== userId) throw new Error('Batch not found')

    const dispute = await new DisputeService(supabase).resolve(disputeId, userId, resolution)

    updateTag(`batch-${batchId}`)

    if (batch.vendor_id) {
      notifyConnectedVendor(createAdminClient(), batch.vendor_id, batchId, {
        title: 'Dispute resolved',
        body: `The dispute on "${batch.name}" was ${dispute.status}`,
        tag: 'vendor-dispute-resolved',
      }).catch(err => Sentry.captureException(err, { extra: { context: 'vendor-notify', batchId } }))
    }

    return { success: true, data: dispute }
  } catch (e) {
    return handleActionError(e)
  }
}
