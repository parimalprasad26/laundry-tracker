'use server'

import { handleActionError } from '@/lib/handle-error'
import * as Sentry from '@sentry/nextjs'
import { updateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { BatchService } from '@/services/BatchService'
import { DisputeService, type VendorClaim } from '@/services/DisputeService'
import { VendorAccountService } from '@/services/VendorAccountService'
import { InspectionPolicyService } from '@/services/InspectionPolicyService'
import { notifyConnectedVendor } from '@/lib/vendor-notify'
import { sendPushToUser } from '@/lib/push-notify'
import { checkRateLimit } from '@/lib/rate-limit'
import type { ActionResult, BatchDispute } from '@/types'

async function getAuthed() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Unauthorized')
  return { supabase, userId: user.id }
}

async function getAuthedVendor() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Unauthorized')
  const vendorAccount = await new VendorAccountService(supabase).getByAuthUserId(user.id)
  if (!vendorAccount) throw new Error('Not a vendor account')
  return { supabase, userId: user.id, vendorAccount }
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

    const disputeService = new DisputeService(supabase)

    // An open issue of any kind — a swap ("wrong item") report, or an issue
    // the vendor already flagged — is contradictory with a new damage claim
    // and would otherwise sit as a second, conflicting open issue on the
    // same item.
    const existingOpen = await disputeService.findOpenByItem(itemId, userId)
    if (existingOpen) throw new Error('This item already has an open issue — resolve it before opening a damage dispute')

    const dispute = await disputeService.open(batchId, itemId, userId, {
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

    const { data: batchItem } = await supabase
      .from('batch_items')
      .select('quantity_returned, damaged_qty, missing_qty')
      .eq('id', itemId)
      .eq('user_id', userId)
      .maybeSingle()
    if (!batchItem) throw new Error('Item not found')
    if (batchItem.quantity_returned === 0) throw new Error('Cannot report a swap on an item that was not collected')

    // Mirror of the check in openDispute above — a damage report already on
    // this item means it's actually the customer's item, contradicting a
    // "this isn't mine" swap claim.
    if (batchItem.damaged_qty > 0 || batchItem.missing_qty > 0) {
      throw new Error('This item already has a damage report — clear it before reporting a swap')
    }

    const disputeService = new DisputeService(supabase)

    // Also block if the vendor already flagged an issue on this item.
    const existingOpen = await disputeService.findOpenByItem(itemId, userId)
    if (existingOpen) throw new Error('This item already has an open issue reported')

    const dispute = await disputeService.openSwap(batchId, itemId, userId, {
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

// ── Vendor-raised issues (Phase 3) ──

export async function raiseVendorIssue(
  connectionId: string,
  batchItemId: string,
  claim: VendorClaim
): Promise<ActionResult<BatchDispute>> {
  try {
    const { supabase, userId, vendorAccount } = await getAuthedVendor()

    // First-ever vendor write into a customer-owned table — rate limited
    // from day one (see migration 0039's plan notes).
    const { allowed } = await checkRateLimit(`vendor-issue:${userId}`)
    if (!allowed) throw new Error('Too many issues reported — try again in a minute')

    const dispute = await new DisputeService(supabase).raiseAsVendor(userId, connectionId, batchItemId, claim)

    updateTag(`batch-${dispute.batch_id}`)
    updateTag('batches')

    sendPushToUser(createAdminClient(), dispute.user_id, {
      title: claim.dispute_type === 'swap' ? 'Vendor reported a wrong item' : 'Vendor reported an issue',
      body: `"${vendorAccount.business_name}" flagged an item on one of your batches`,
      tag: 'customer-vendor-issue',
      url: '/issues',
    }).catch(err => Sentry.captureException(err, { extra: { context: 'customer-notify', disputeId: dispute.id } }))

    return { success: true, data: dispute }
  } catch (e) {
    return handleActionError(e)
  }
}

export async function resolveVendorIssue(disputeId: string, resolution: string): Promise<ActionResult<BatchDispute>> {
  try {
    const { supabase, userId, vendorAccount } = await getAuthedVendor()

    const dispute = await new DisputeService(supabase).resolveAsVendor(disputeId, userId, resolution)

    updateTag(`batch-${dispute.batch_id}`)
    updateTag('batches')

    sendPushToUser(createAdminClient(), dispute.user_id, {
      title: 'Issue resolved',
      body: `"${vendorAccount.business_name}" resolved an issue they flagged`,
      tag: 'customer-vendor-issue-resolved',
      url: '/issues',
    }).catch(err => Sentry.captureException(err, { extra: { context: 'customer-notify', disputeId } }))

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
