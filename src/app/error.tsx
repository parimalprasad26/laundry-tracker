'use client'

import { useEffect } from 'react'
import { WashingMachine, RotateCcw } from 'lucide-react'
import * as Sentry from '@sentry/nextjs'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-sm">
        <div className="flex justify-center mb-6">
          <div className="h-20 w-20 rounded-3xl bg-foreground flex items-center justify-center">
            <WashingMachine className="h-10 w-10 text-background" />
          </div>
        </div>
        <h1 className="text-xl font-bold mb-2">Something got tangled up</h1>
        <p className="text-sm text-muted-foreground leading-relaxed mb-8">
          An unexpected error occurred. The team has been notified — try again and it should clear up.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={reset}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-foreground px-6 text-sm font-semibold text-background hover:opacity-90 transition-opacity"
          >
            <RotateCcw className="h-4 w-4" />
            Try again
          </button>
          <a
            href="/dashboard"
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-border px-6 text-sm font-semibold hover:bg-muted transition-colors"
          >
            Go to dashboard
          </a>
        </div>
      </div>
    </div>
  )
}
