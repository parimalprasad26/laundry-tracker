import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createAdminClient } from '@/lib/supabase/admin'

// Both crons run daily (see vercel.json) — allow a generous buffer over 24h for
// scheduling jitter before considering a job's absence a real problem.
const CRON_JOBS = [
  { name: 'send-reminders', maxAgeHours: 30 },
  { name: 'auto-close', maxAgeHours: 30 },
] as const

export async function GET() {
  const checks: Record<string, { ok: boolean; detail?: string }> = {}
  const admin = createAdminClient()

  try {
    const { error } = await admin.from('cron_logs').select('id').limit(1)
    checks.database = { ok: !error, detail: error?.message }
  } catch (err) {
    checks.database = { ok: false, detail: (err as Error).message }
  }

  for (const job of CRON_JOBS) {
    try {
      const { data, error } = await admin
        .from('cron_logs')
        .select('ran_at')
        .eq('job_name', job.name)
        .order('ran_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        checks[job.name] = { ok: false, detail: error.message }
        continue
      }
      if (!data) {
        checks[job.name] = { ok: false, detail: 'never run' }
        continue
      }

      const ageHours = (Date.now() - new Date(data.ran_at).getTime()) / (1000 * 60 * 60)
      checks[job.name] = {
        ok: ageHours <= job.maxAgeHours,
        detail: `last ran ${ageHours.toFixed(1)}h ago`,
      }
    } catch (err) {
      checks[job.name] = { ok: false, detail: (err as Error).message }
    }
  }

  const healthy = Object.values(checks).every(c => c.ok)
  if (!healthy) {
    Sentry.captureMessage('Health check failed', { level: 'error', extra: { checks } })
  }

  return NextResponse.json(
    { status: healthy ? 'ok' : 'degraded', checks },
    { status: healthy ? 200 : 503 }
  )
}
