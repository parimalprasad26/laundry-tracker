import * as Sentry from '@sentry/nextjs'
import webpush from 'web-push'
import type { SupabaseClient } from '@supabase/supabase-js'
import { PushSubscriptionRepository } from '@/repositories/PushSubscriptionRepository'

export interface PushNotification {
  title: string
  body: string
  tag: string
  url: string
}

// Extracted from the identical inline logic that used to live separately in
// both cron routes (send-reminders, auto-close) — sends to every one of a
// user's subscriptions, deleting stale ones on 410 Gone, reporting any
// other failure to Sentry without throwing (a push delivery failure is
// never treated as a failure of whatever triggered it). Returns counts so
// callers that log run stats (the cron routes) keep the same fidelity they
// had when this loop was inline.
export async function sendPushToUser(admin: SupabaseClient, userId: string, notification: PushNotification): Promise<{ sent: number; errors: number }> {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )

  const pushRepo = new PushSubscriptionRepository(admin)
  const subs = await pushRepo.findAllForUser(userId)

  let sent = 0
  let errors = 0

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
        JSON.stringify(notification)
      )
      sent++
    } catch (err: unknown) {
      if ((err as { statusCode?: number }).statusCode === 410) {
        await pushRepo.delete(userId, sub.endpoint)
      } else {
        errors++
        Sentry.captureException(err, { extra: { userId, endpoint: sub.endpoint } })
      }
    }
  }

  return { sent, errors }
}
