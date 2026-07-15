'use client'

import './globals.css'
import { WashingMachine, RotateCcw } from 'lucide-react'
import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body>
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
            <button
              onClick={unstable_retry}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-foreground px-6 text-sm font-semibold text-background hover:opacity-90 transition-opacity"
            >
              <RotateCcw className="h-4 w-4" />
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
