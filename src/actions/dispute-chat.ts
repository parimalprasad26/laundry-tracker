'use server'

import { handleActionError } from '@/lib/handle-error'
import * as Sentry from '@sentry/nextjs'
import { updateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { DisputeChatService } from '@/services/DisputeChatService'
import { VendorAccountService } from '@/services/VendorAccountService'
import { BatchService } from '@/services/BatchService'
import { notifyConnectedVendor } from '@/lib/vendor-notify'
import { sendPushToUser } from '@/lib/push-notify'
import { checkRateLimit } from '@/lib/rate-limit'
import type { ActionResult, DisputeMessage } from '@/types'

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

function truncateForPush(body: string): string {
  return body.length > 80 ? `${body.slice(0, 80)}…` : body
}

export async function sendDisputeMessage(disputeId: string, body: string): Promise<ActionResult<DisputeMessage>> {
  try {
    const { supabase, userId } = await getAuthed()

    // Sustained back-and-forth, not a one-shot action — the highest
    // abuse-potential surface built so far.
    const { allowed } = await checkRateLimit(`chat:${userId}`)
    if (!allowed) throw new Error('Too many messages — try again in a minute')

    const message = await new DisputeChatService(supabase).send(disputeId, userId, body)

    const { data: dispute } = await supabase
      .from('batch_disputes')
      .select('batch_id')
      .eq('id', disputeId)
      .maybeSingle()

    updateTag(`dispute-${disputeId}`)
    if (dispute) {
      updateTag(`batch-${dispute.batch_id}`)
      const batch = await new BatchService(supabase).getById(dispute.batch_id)
      if (batch?.vendor_id) {
        notifyConnectedVendor(
          createAdminClient(),
          batch.vendor_id,
          dispute.batch_id,
          { title: `New message on "${batch.name}"`, body: truncateForPush(body), tag: 'vendor-dispute-message' },
          `/vendor/issues/${disputeId}`
        ).catch(err => Sentry.captureException(err, { extra: { context: 'vendor-notify', disputeId } }))
      }
    }

    return { success: true, data: message }
  } catch (e) {
    return handleActionError(e)
  }
}

export async function sendVendorDisputeMessage(disputeId: string, body: string): Promise<ActionResult<DisputeMessage>> {
  try {
    const { supabase, userId } = await getAuthedVendor()

    const { allowed } = await checkRateLimit(`chat:${userId}`)
    if (!allowed) throw new Error('Too many messages — try again in a minute')

    const message = await new DisputeChatService(supabase).sendAsVendor(disputeId, userId, body)

    // The vendor's own session can't read batch_disputes.user_id (no RLS
    // access — see migration 0041's comment on vendor_dispute_context) so
    // this lookup, purely for the notification, goes through the admin
    // client, matching how every other vendor-notify path already does.
    const admin = createAdminClient()
    const { data: dispute } = await admin
      .from('batch_disputes')
      .select('batch_id, user_id')
      .eq('id', disputeId)
      .maybeSingle()

    updateTag(`dispute-${disputeId}`)
    if (dispute) {
      updateTag(`batch-${dispute.batch_id}`)
      sendPushToUser(admin, dispute.user_id, {
        title: 'New message',
        body: truncateForPush(body),
        tag: 'customer-dispute-message',
        url: `/issues/${disputeId}`,
      }).catch(err => Sentry.captureException(err, { extra: { context: 'customer-notify', disputeId } }))
    }

    return { success: true, data: message }
  } catch (e) {
    return handleActionError(e)
  }
}

export async function markDisputeMessagesRead(disputeId: string): Promise<ActionResult> {
  try {
    const { supabase } = await getAuthed()
    await new DisputeChatService(supabase).markRead(disputeId)
    return { success: true, data: undefined }
  } catch (e) {
    return handleActionError(e)
  }
}

export async function markVendorDisputeMessagesRead(disputeId: string): Promise<ActionResult> {
  try {
    const { supabase } = await getAuthedVendor()
    await new DisputeChatService(supabase).markRead(disputeId)
    return { success: true, data: undefined }
  } catch (e) {
    return handleActionError(e)
  }
}
