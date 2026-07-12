import Link from 'next/link'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { BatchWithStatus } from '@/types'

export function OverdueBatchesWidget({ batches, thresholdDays }: {
  batches: BatchWithStatus[]
  thresholdDays: number
}) {
  if (batches.length === 0) return null

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-500/10 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
          {batches.length === 1
            ? '1 batch has been at the laundry'
            : `${batches.length} batches have been at the laundry`}{' '}
          for over {thresholdDays} {thresholdDays === 1 ? 'day' : 'days'}
        </p>
      </div>

      <div className="space-y-2">
        {batches.map(batch => (
          <Link
            key={batch.id}
            href={`/batches/${batch.id}`}
            className="flex items-center justify-between rounded-xl bg-white/70 dark:bg-white/5 px-3 py-2.5 hover:bg-white dark:hover:bg-white/10 transition-colors"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium truncate text-amber-900 dark:text-amber-100">{batch.name}</p>
              <p className="text-xs text-amber-700/70 dark:text-amber-400/70 mt-0.5">
                Sent {formatDistanceToNow(new Date(batch.sent_at!), { addSuffix: true })}
                {batch.vendor_name ? ` · ${batch.vendor_name}` : ''}
              </p>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0 ml-2" />
          </Link>
        ))}
      </div>
    </div>
  )
}
