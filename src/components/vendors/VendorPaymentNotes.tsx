import Link from 'next/link'
import { formatDate, formatPrice, cn } from '@/lib/utils'
import { MessageSquare, TrendingUp } from 'lucide-react'
import type { BatchWithStatus } from '@/types'

export function VendorPaymentNotes({ batches, vendorId }: { batches: BatchWithStatus[]; vendorId: string }) {
  if (!batches.length) return null

  const batchesWithDelta = batches.filter(b => b.actual_cost != null && b.calculated_cost != null)
  const avgDelta = batchesWithDelta.length > 0
    ? batchesWithDelta.reduce((sum, b) => sum + (b.actual_cost! - b.calculated_cost!), 0) / batchesWithDelta.length
    : null

  return (
    <div className="space-y-3">
      <div>
        <h2 className="font-medium text-sm">Payment notes</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Notes recorded when payment differed from your rate card.
        </p>
      </div>

      {avgDelta != null && Math.abs(avgDelta) >= 0.01 && (
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-800 px-3 py-2.5">
          <TrendingUp className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 dark:text-amber-300">
            Average {avgDelta > 0 ? 'overpayment' : 'saving'} vs rate card:{' '}
            <span className="font-semibold">
              {avgDelta > 0 ? '+' : ''}{formatPrice(avgDelta)}
            </span>
            {avgDelta > 0 && (
              <> — your rate card may be lower than actual prices. <span className="underline font-medium">Update it above.</span></>
            )}
          </p>
        </div>
      )}

      <div className="rounded-xl border divide-y text-sm">
        {batches.map(batch => {
          const delta = batch.actual_cost != null && batch.calculated_cost != null
            ? batch.actual_cost - batch.calculated_cost : null

          return (
            <Link
              key={batch.id}
              href={`/batches/${batch.id}`}
              className="flex flex-col gap-1.5 px-4 py-3 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-sm truncate">{batch.name}</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {formatDate(batch.returned_at ?? batch.created_at)}
                </span>
              </div>
              <div className="flex items-start gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">{batch.price_delta_note}</p>
              </div>
              {delta != null && (
                <p className={cn(
                  'text-xs font-medium',
                  delta > 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'
                )}>
                  {delta > 0 ? '+' : ''}{formatPrice(delta)} vs rate card
                </p>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
