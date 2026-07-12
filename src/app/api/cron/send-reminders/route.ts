import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'
import { PushSubscriptionRepository } from '@/repositories/PushSubscriptionRepository'
import { BatchRepository } from '@/repositories/BatchRepository'
import { UserSettingsRepository } from '@/repositories/UserSettingsRepository'

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

const PAGE_SIZE = 500

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const dryRun = url.searchParams.get('dryRun') === 'true'
  const startedAt = Date.now()

  const admin = createAdminClient()
  const pushRepo = new PushSubscriptionRepository(admin)
  const batchRepo = new BatchRepository(admin)
  const settingsRepo = new UserSettingsRepository(admin)

  let sent = 0
  let skipped = 0
  let errors = 0
  let offset = 0
  const userSettingsCache = new Map<string, Awaited<ReturnType<typeof settingsRepo.get>>>()

  while (true) {
    const page = await pushRepo.findPage(PAGE_SIZE, offset)
    if (page.length === 0) break

    const userIds = [...new Set(page.map(s => s.user_id))]

    await Promise.all(
      userIds
        .filter(id => !userSettingsCache.has(id))
        .map(async id => {
          const settings = await settingsRepo.get(id)
          userSettingsCache.set(id, settings)
        })
    )

    for (const userId of userIds) {
      const settings = userSettingsCache.get(userId)!
      const overdue = await batchRepo.findOverdue(userId, settings.reminder_threshold_days)
      if (overdue.length === 0) {
        skipped++
        continue
      }

      const userSubs = page.filter(s => s.user_id === userId)
      const title = overdue.length === 1
        ? `"${overdue[0].name}" is still at the laundry`
        : `${overdue.length} batches are still at the laundry`
      const body = `They've been out for over ${settings.reminder_threshold_days} ${settings.reminder_threshold_days === 1 ? 'day' : 'days'}. Time to check in.`

      for (const sub of userSubs) {
        if (dryRun) {
          sent++
          continue
        }
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
            JSON.stringify({ title, body, url: '/batches', tag: 'laundry-overdue' })
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
    }

    if (page.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }

  const duration_ms = Date.now() - startedAt

  // Persist run log (best-effort — never fail the cron if logging fails)
  try {
    await admin.from('cron_logs').insert({ sent, skipped, errors, duration_ms, dry_run: dryRun })
  } catch (err) {
    Sentry.captureException(err, { extra: { context: 'cron_log_write' } })
  }

  return NextResponse.json({ sent, skipped, errors, duration_ms, dry_run: dryRun })
}
