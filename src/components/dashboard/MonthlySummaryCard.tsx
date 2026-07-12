'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Share2, Copy, Check, WashingMachine, Trophy, Clock, Shirt, AlertTriangle, PackageX, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { MonthlySummary } from '@/types'

interface Props {
  summary: MonthlySummary
}

function Stat({ value, label, accent }: { value: string; label: string; accent?: string }) {
  return (
    <div className="text-center">
      <p className={cn('text-3xl font-bold tabular-nums tracking-tight', accent)}>{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  )
}

export function MonthlySummaryCard({ summary }: Props) {
  const [copied, setCopied] = useState(false)

  const monthLabel = new Date(summary.year, summary.month - 1, 1)
    .toLocaleString('default', { month: 'long', year: 'numeric' })

  const isEmpty = summary.batchCount === 0

  function buildShareText() {
    const lines = [
      `📊 Laundry Summary — ${monthLabel}`,
      '',
      `🧺 ${summary.batchCount} batch${summary.batchCount !== 1 ? 'es' : ''} sent`,
      `👕 ${summary.totalItemsSent} item${summary.totalItemsSent !== 1 ? 's' : ''}`,
      summary.totalSpend > 0 ? `💰 Spent ₹${summary.totalSpend.toLocaleString('en-IN')}` : null,
      summary.topVendor ? `🏆 Top vendor: ${summary.topVendor.name} (${summary.topVendor.batchCount}×)` : null,
      summary.avgTurnaroundDays != null ? `⏱ Avg turnaround: ${summary.avgTurnaroundDays} days` : null,
      summary.damagedCount > 0 ? `⚠️ ${summary.damagedCount} item${summary.damagedCount !== 1 ? 's' : ''} damaged` : null,
      summary.missingCount > 0 ? `❌ ${summary.missingCount} item${summary.missingCount !== 1 ? 's' : ''} missing` : null,
      '',
      'Tracked with LaundryTracker',
    ].filter(l => l !== null).join('\n')
    return lines
  }

  async function handleShare() {
    const text = buildShareText()
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ text, title: `Laundry Summary — ${monthLabel}` })
        return
      } catch {
        // fallthrough to copy
      }
    }
    await navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Summary copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-2xl bg-card ring-1 ring-border shadow-sm overflow-hidden">
      {/* Card header stripe */}
      <div className="bg-foreground px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-background/15 flex items-center justify-center">
            <WashingMachine className="h-4 w-4 text-background" />
          </div>
          <div>
            <p className="text-xs font-medium text-background/60 uppercase tracking-widest">LaundryTracker</p>
            <p className="text-sm font-bold text-background leading-tight">{monthLabel}</p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {isEmpty ? (
          <div className="py-8 text-center space-y-2">
            <WashingMachine className="h-10 w-10 text-muted-foreground/30 mx-auto" />
            <p className="text-sm font-medium text-muted-foreground">No batches this month</p>
            <p className="text-xs text-muted-foreground">Navigate to a month with activity to see your summary.</p>
          </div>
        ) : (
          <>
            {/* Primary stats */}
            <div className="grid grid-cols-3 gap-3 py-2">
              <Stat value={String(summary.batchCount)} label="Batches" />
              <Stat
                value={summary.totalSpend > 0 ? `₹${summary.totalSpend.toLocaleString('en-IN')}` : '—'}
                label="Spent"
                accent={summary.totalSpend > 0 ? 'text-primary' : undefined}
              />
              <Stat value={String(summary.totalItemsSent)} label="Items sent" />
            </div>

            <div className="h-px bg-border" />

            {/* Secondary stats */}
            <div className="space-y-3">
              {/* Items returned */}
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1 flex items-center justify-between">
                  <span className="text-sm">Items returned</span>
                  <span className={cn(
                    'text-sm font-semibold tabular-nums',
                    summary.totalItemsReturned === summary.totalItemsSent
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-muted-foreground'
                  )}>
                    {summary.totalItemsReturned}/{summary.totalItemsSent}
                  </span>
                </div>
              </div>

              {/* Top vendor */}
              {summary.topVendor && (
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-amber-50 dark:bg-amber-500/15 flex items-center justify-center shrink-0">
                    <Trophy className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1 flex items-center justify-between">
                    <span className="text-sm">Top vendor</span>
                    <span className="text-sm font-semibold">
                      {summary.topVendor.name}
                      <span className="text-muted-foreground font-normal ml-1">({summary.topVendor.batchCount}×)</span>
                    </span>
                  </div>
                </div>
              )}

              {/* Avg turnaround */}
              {summary.avgTurnaroundDays != null && (
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 flex items-center justify-center shrink-0">
                    <Clock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="flex-1 flex items-center justify-between">
                    <span className="text-sm">Avg turnaround</span>
                    <span className="text-sm font-semibold tabular-nums">{summary.avgTurnaroundDays} days</span>
                  </div>
                </div>
              )}

              {/* Damage/missing — only if any */}
              {(summary.damagedCount > 0 || summary.missingCount > 0) && (
                <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 ring-1 ring-amber-200 dark:ring-amber-500/20 px-3 py-2.5 flex items-center gap-3">
                  <div className="space-y-1 flex-1">
                    {summary.damagedCount > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5" />Damaged
                        </span>
                        <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">{summary.damagedCount}</span>
                      </div>
                    )}
                    {summary.missingCount > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-red-700 dark:text-red-300 flex items-center gap-1.5">
                          <PackageX className="h-3.5 w-3.5" />Missing
                        </span>
                        <span className="text-xs font-semibold text-red-700 dark:text-red-300">{summary.missingCount}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Share button */}
        {!isEmpty && (
          <Button onClick={handleShare} variant="outline" className="w-full gap-2">
            {copied
              ? <><Check className="h-4 w-4 text-emerald-500" />Copied!</>
              : <><Share2 className="h-4 w-4" />Share summary</>
            }
          </Button>
        )}
      </div>
    </div>
  )
}
