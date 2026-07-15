import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'
import { BatchRepository } from '@/repositories/BatchRepository'
import { BatchStateMachineService } from '@/services/BatchStateMachineService'
import { PushSubscriptionRepository } from '@/repositories/PushSubscriptionRepository'
import type { BatchWithStatus } from '@/types'

export async function GET(request: Request) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )

  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const dryRun = url.searchParams.get('dryRun') === 'true'
  const startedAt = Date.now()

  const admin = createAdminClient()
  const batchRepo = new BatchRepository(admin)
  const stateMachine = new BatchStateMachineService(admin)
  const pushRepo = new PushSubscriptionRepository(admin)

  let closed = 0
  let errors = 0

  // Collect successfully closed batches grouped by user for notifications
  const closedByUser = new Map<string, BatchWithStatus[]>()

  try {
    const batches = await batchRepo.findReadyToAutoClose()

    if (dryRun) {
      closed = batches.length
    } else {
      // Bounded concurrency: process CHUNK_SIZE batches at a time instead of one at a
      // time, so a large backlog uses the function's time budget more efficiently
      // without opening one connection per batch simultaneously.
      const CHUNK_SIZE = 10
      for (let i = 0; i < batches.length; i += CHUNK_SIZE) {
        const chunk = batches.slice(i, i + CHUNK_SIZE)
        await Promise.all(
          chunk.map(async batch => {
            try {
              await stateMachine.autoCloseBatch(batch.id, batch.user_id)
              closed++
              const existing = closedByUser.get(batch.user_id) ?? []
              closedByUser.set(batch.user_id, [...existing, batch])
            } catch (err) {
              errors++
              Sentry.captureException(err, { extra: { batchId: batch.id, userId: batch.user_id } })
            }
          })
        )
      }
    }
  } catch (err) {
    Sentry.captureException(err)
    return NextResponse.json({ error: 'Failed to query batches' }, { status: 500 })
  }

  // Send one push notification per user (grouped if multiple batches closed)
  if (!dryRun && closedByUser.size > 0) {
    for (const [userId, batches] of closedByUser) {
      const subs = await pushRepo.findAllForUser(userId)
      if (subs.length === 0) continue

      const notification = batches.length === 1
        ? {
            title: `"${batches[0].name}" was auto-closed`,
            body: `It's been a while since your laundry was returned. The batch has been automatically closed.`,
            tag: 'laundry-auto-closed',
            url: `/batches/${batches[0].id}`,
          }
        : {
            title: `${batches.length} batches were auto-closed`,
            body: `Batches that have been returned for a while were automatically closed.`,
            tag: 'laundry-auto-closed',
            url: `/batches`,
          }

      for (const sub of subs) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
            JSON.stringify(notification)
          )
        } catch (err: unknown) {
          if ((err as { statusCode?: number }).statusCode === 410) {
            await pushRepo.delete(userId, sub.endpoint)
          } else {
            Sentry.captureException(err, { extra: { userId, endpoint: sub.endpoint } })
          }
        }
      }
    }
  }

  const duration_ms = Date.now() - startedAt

  try {
    await admin.from('cron_logs').insert({ sent: closed, skipped: 0, errors, duration_ms, dry_run: dryRun })
  } catch (err) {
    Sentry.captureException(err, { extra: { context: 'cron_log_write' } })
  }

  return NextResponse.json({ closed, errors, duration_ms, dry_run: dryRun })
}
