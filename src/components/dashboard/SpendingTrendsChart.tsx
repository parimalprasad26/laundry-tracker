'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { SpendPeriodData, BudgetPeriod } from '@/types'

interface Props {
  weekly: SpendPeriodData[]
  monthly: SpendPeriodData[]
  yearly: SpendPeriodData[]
  defaultPeriod: BudgetPeriod
}

const PERIODS: { key: BudgetPeriod; label: string }[] = [
  { key: 'weekly', label: 'Week' },
  { key: 'monthly', label: 'Month' },
  { key: 'yearly', label: 'Year' },
]

function formatSpend(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}k`
  return `₹${n}`
}

export function SpendingTrendsChart({ weekly, monthly, yearly, defaultPeriod }: Props) {
  const [period, setPeriod] = useState<BudgetPeriod>(defaultPeriod)

  const data = period === 'weekly' ? weekly : period === 'monthly' ? monthly : yearly
  const maxSpend = Math.max(...data.map(d => d.spend), 1)
  const totalSpend = data.reduce((s, d) => s + d.spend, 0)
  const hasAnySpend = data.some(d => d.spend > 0)

  return (
    <div className="rounded-2xl bg-card ring-1 ring-border shadow-sm p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-base">Spending trends</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {hasAnySpend
              ? <>Total this view: <span className="font-medium text-foreground">{formatSpend(totalSpend)}</span></>
              : 'No spend recorded in this range'}
          </p>
        </div>
        {/* Period toggle */}
        <div className="flex items-center bg-muted rounded-lg p-0.5 shrink-0">
          {PERIODS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              className={cn(
                'px-3 py-1 rounded-md text-xs font-medium transition-all',
                period === key
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Bars */}
      <div className="flex items-end gap-1 sm:gap-1.5 h-32">
        {data.map((d, i) => {
          const heightPct = d.spend > 0 ? Math.max((d.spend / maxSpend) * 100, 4) : 0
          return (
            <div key={i} className="flex-1 h-full flex flex-col justify-end group relative">
              {/* Hover tooltip */}
              {d.spend > 0 && (
                <div className={cn(
                  'absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-10',
                  'bg-foreground text-background text-[10px] font-medium rounded-lg px-2 py-1 whitespace-nowrap',
                  'opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none',
                  'shadow-lg'
                )}>
                  {formatSpend(d.spend)}
                  <span className="text-background/60 ml-1">· {d.batchCount}×</span>
                  {/* Arrow */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-foreground" />
                </div>
              )}
              {/* Bar */}
              <div
                className={cn(
                  'w-full rounded-t-md transition-all duration-500',
                  d.spend === 0
                    ? 'bg-border/40 rounded-sm'
                    : d.isCurrent
                      ? 'bg-primary hover:bg-primary/80'
                      : 'bg-primary/35 hover:bg-primary/55'
                )}
                style={{ height: d.spend > 0 ? `${heightPct}%` : '3px' }}
              />
            </div>
          )
        })}
      </div>

      {/* X-axis labels */}
      <div className="flex items-center gap-1 sm:gap-1.5">
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center overflow-hidden">
            <span className={cn(
              'text-[10px] leading-none block truncate',
              d.isCurrent ? 'text-foreground font-semibold' : 'text-muted-foreground'
            )}>
              {d.label}
            </span>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-muted-foreground">
        Current period highlighted. Hover bars for details.
      </p>
    </div>
  )
}
