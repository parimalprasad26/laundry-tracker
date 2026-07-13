import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createAdminClient } from '@/lib/supabase/admin'
import { BatchRepository } from '@/repositories/BatchRepository'
import { BatchStateMachineService } from '@/services/BatchStateMachineService'

export async function GET(request: Request) {
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

  let closed = 0
  let errors = 0

  try {
    const batches = await batchRepo.findReadyToAutoClose()

    for (const batch of batches) {
      if (dryRun) {
        closed++
        continue
      }
      try {
        await stateMachine.autoCloseBatch(batch.id, batch.user_id)
        closed++
      } catch (err) {
        errors++
        Sentry.captureException(err, { extra: { batchId: batch.id, userId: batch.user_id } })
      }
    }
  } catch (err) {
    Sentry.captureException(err)
    return NextResponse.json({ error: 'Failed to query batches' }, { status: 500 })
  }

  const duration_ms = Date.now() - startedAt

  try {
    await admin.from('cron_logs').insert({ sent: closed, skipped: 0, errors, duration_ms, dry_run: dryRun })
  } catch (err) {
    Sentry.captureException(err, { extra: { context: 'cron_log_write' } })
  }

  return NextResponse.json({ closed, errors, duration_ms, dry_run: dryRun })
}
