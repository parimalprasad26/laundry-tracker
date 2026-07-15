'use server'

import { handleActionError } from '@/lib/handle-error'

import { createClient } from '@/lib/supabase/server'
import { PushSubscriptionRepository } from '@/repositories/PushSubscriptionRepository'
import { pushSubscriptionSchema } from '@/schemas/push-subscription.schema'
import type { ActionResult } from '@/types'

async function getAuthedRepo() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Unauthorized')
  return { repo: new PushSubscriptionRepository(supabase), userId: user.id }
}

const MAX_SUBSCRIPTIONS_PER_USER = 5

export async function subscribeToPush(
  endpoint: string,
  p256dh: string,
  authKey: string
): Promise<ActionResult> {
  try {
    const validated = pushSubscriptionSchema.parse({ endpoint, p256dh, authKey })
    const { repo, userId } = await getAuthedRepo()
    const count = await repo.countForUser(userId)
    if (count >= MAX_SUBSCRIPTIONS_PER_USER) {
      return { success: false, error: 'Too many push subscriptions. Unsubscribe on another device first.' }
    }
    await repo.save(userId, validated.endpoint, validated.p256dh, validated.authKey)
    return { success: true, data: undefined }
  } catch (e) {
    return handleActionError(e)
  }
}

export async function unsubscribeFromPush(endpoint: string): Promise<ActionResult> {
  try {
    const { repo, userId } = await getAuthedRepo()
    await repo.delete(userId, endpoint)
    return { success: true, data: undefined }
  } catch (e) {
    return handleActionError(e)
  }
}

export async function getSubscriptionStatus(): Promise<ActionResult<boolean>> {
  try {
    const { repo, userId } = await getAuthedRepo()
    const subs = await repo.findAllForUser(userId)
    return { success: true, data: subs.length > 0 }
  } catch (e) {
    return handleActionError(e)
  }
}
