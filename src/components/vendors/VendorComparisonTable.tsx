'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowUpDown, ArrowUp, ArrowDown, Trophy, AlertTriangle, PackageX, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LaundryVendor, VendorComparisonStats } from '@/types'

type SortKey = 'batchCount' | 'avgCost' | 'avgTurnaroundDays' | 'damageRate' | 'missingRate'

interface ComparisonRow {
  vendor: LaundryVendor
  stats: VendorComparisonStats | null
}

function getBestValue(rows: ComparisonRow[], key: SortKey): number | null {
  const vals = rows
    .map(r => r.stats?.[key] as number | null | undefined)
    .filter((v): v is number => v != null)
  if (vals.length < 2) return null
  if (key === 'batchCount') return Math.max(...vals)
  const min = Math.min(...vals)
  if ((key === 'damageRate' || key === 'missingRate') && min === 0) return null
  return min
}

function SortIcon({ col, active, dir }: { col: SortKey; active: SortKey; dir: 'asc' | 'desc' }) {
  if (col !== active) return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />
  return dir === 'asc'
    ? <ArrowUp className="h-3.5 w-3.5 text-foreground" />
    : <ArrowDown className="h-3.5 w-3.5 text-foreground" />
}

function BestBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/15 rounded px-1 py-0.5 ml-1.5">
      <Trophy className="h-2.5 w-2.5" />Best
    </span>
  )
}

function RateCell({ value, bestValue, color }: { value: number | null; bestValue: number | null; color: 'amber' | 'red' }) {
  if (value == null) return <span className="text-muted-foreground">—</span>
  const isBest = bestValue != null && value === bestValue
  const isHigh = value > 10
  return (
    <span className={cn(
      'inline-flex items-center gap-1',
      !isBest && isHigh && color === 'amber' && 'text-amber-600 dark:text-amber-400',
      !isBest && isHigh && color === 'red' && 'text-red-600 dark:text-red-400',
    )}>
      {value === 0 ? (
        <span className="text-emerald-600 dark:text-emerald-400">0%</span>
      ) : (
        <>{value}%{!isBest && isHigh && <AlertTriangle className="h-3 w-3" />}</>
      )}
      {isBest && <BestBadge />}
    </span>
  )
}

export function VendorComparisonTable({ rows }: { rows: ComparisonRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('batchCount')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  function handleSort(key: SortKey) {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir(key === 'batchCount' ? 'desc' : 'asc') }
  }

  const sorted = [...rows].sort((a, b) => {
    const av = a.stats?.[sortKey] ?? null
    const bv = b.stats?.[sortKey] ?? null
    if (av == null && bv == null) return 0
    if (av == null) return 1
    if (bv == null) return -1
    return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number)
  })

  const best: Record<SortKey, number | null> = {
    batchCount: getBestValue(rows, 'batchCount'),
    avgCost: getBestValue(rows, 'avgCost'),
    avgTurnaroundDays: getBestValue(rows, 'avgTurnaroundDays'),
    damageRate: getBestValue(rows, 'damageRate'),
    missingRate: getBestValue(rows, 'missingRate'),
  }

  function isBest(key: SortKey, value: number | null) {
    return best[key] != null && value === best[key]
  }

  if (rows.length === 0) {
    return (
      <div className="text-center py-16 text-sm text-muted-foreground">
        No vendors yet. <Link href="/vendors/new" className="underline">Add one</Link> to get started.
      </div>
    )
  }

  const thClass = "px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap"
  const thBtn = "flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer select-none"

  return (
    <div className="space-y-4">
      {/* ── Desktop table ── */}
      <div className="hidden md:block rounded-2xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 border-b border-border">
            <tr>
              <th className={thClass}>Vendor</th>
              <th className={thClass}>
                <button className={thBtn} onClick={() => handleSort('batchCount')}>
                  Batches <SortIcon col="batchCount" active={sortKey} dir={sortDir} />
                </button>
              </th>
              <th className={thClass}>
                <button className={thBtn} onClick={() => handleSort('avgCost')}>
                  Avg cost <SortIcon col="avgCost" active={sortKey} dir={sortDir} />
                </button>
              </th>
              <th className={thClass}>
                <button className={thBtn} onClick={() => handleSort('avgTurnaroundDays')}>
                  Turnaround <SortIcon col="avgTurnaroundDays" active={sortKey} dir={sortDir} />
                </button>
              </th>
              <th className={thClass}>
                <button className={thBtn} onClick={() => handleSort('damageRate')}>
                  Damage rate <SortIcon col="damageRate" active={sortKey} dir={sortDir} />
                </button>
              </th>
              <th className={thClass}>
                <button className={thBtn} onClick={() => handleSort('missingRate')}>
                  Missing rate <SortIcon col="missingRate" active={sortKey} dir={sortDir} />
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sorted.map(({ vendor, stats }) => (
              <tr key={vendor.id} className="hover:bg-muted/30 transition-colors group">
                <td className="px-4 py-3.5">
                  <Link
                    href={`/vendors/${vendor.id}`}
                    className="font-medium hover:underline inline-flex items-center gap-1.5"
                  >
                    {vendor.name}
                    <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                  {!stats && (
                    <span className="ml-2 text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5">no data</span>
                  )}
                </td>
                <td className="px-4 py-3.5 tabular-nums">
                  {stats ? (
                    <span className={cn(isBest('batchCount', stats.batchCount) && 'font-semibold')}>
                      {stats.batchCount}
                      {isBest('batchCount', stats.batchCount) && <BestBadge />}
                    </span>
                  ) : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-3.5 tabular-nums">
                  {stats?.avgCost != null ? (
                    <span className={cn(isBest('avgCost', stats.avgCost) && 'font-semibold')}>
                      ₹{stats.avgCost}
                      {isBest('avgCost', stats.avgCost) && <BestBadge />}
                    </span>
                  ) : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-3.5 tabular-nums">
                  {stats?.avgTurnaroundDays != null ? (
                    <span className={cn(isBest('avgTurnaroundDays', stats.avgTurnaroundDays) && 'font-semibold')}>
                      {stats.avgTurnaroundDays}d
                      {isBest('avgTurnaroundDays', stats.avgTurnaroundDays) && <BestBadge />}
                    </span>
                  ) : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-3.5 tabular-nums">
                  <RateCell value={stats?.damageRate ?? null} bestValue={best.damageRate} color="amber" />
                </td>
                <td className="px-4 py-3.5 tabular-nums">
                  <RateCell value={stats?.missingRate ?? null} bestValue={best.missingRate} color="red" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Mobile: sort bar + cards ── */}
      <div className="md:hidden space-y-4">
        {/* Sort bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <span className="text-xs text-muted-foreground shrink-0">Sort:</span>
          {(
            [
              { key: 'batchCount', label: 'Batches' },
              { key: 'avgCost', label: 'Cost' },
              { key: 'avgTurnaroundDays', label: 'Speed' },
              { key: 'damageRate', label: 'Damage' },
              { key: 'missingRate', label: 'Missing' },
            ] as { key: SortKey; label: string }[]
          ).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleSort(key)}
              className={cn(
                'shrink-0 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors',
                sortKey === key
                  ? 'bg-foreground text-background'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              )}
            >
              {label}
              {sortKey === key && (
                sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
              )}
            </button>
          ))}
        </div>

        {/* Vendor cards */}
        {sorted.map(({ vendor, stats }) => (
          <div key={vendor.id} className="rounded-2xl border border-border bg-card overflow-hidden">
            {/* Card header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
              <Link href={`/vendors/${vendor.id}`} className="font-semibold text-sm flex items-center gap-1.5">
                {vendor.name}
                <ExternalLink className="h-3 w-3 text-muted-foreground" />
              </Link>
              {stats
                ? <span className="text-xs text-muted-foreground">{stats.batchCount} batch{stats.batchCount !== 1 ? 'es' : ''}</span>
                : <span className="text-xs text-muted-foreground bg-muted rounded px-1.5 py-0.5">no data</span>
              }
            </div>

            {/* Stats grid */}
            {stats ? (
              <div className="grid grid-cols-2 divide-x divide-y divide-border">
                {/* Avg cost */}
                <div className="px-4 py-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Avg cost</p>
                  {stats.avgCost != null ? (
                    <p className={cn('text-base font-semibold tabular-nums', isBest('avgCost', stats.avgCost) && 'text-emerald-600 dark:text-emerald-400')}>
                      ₹{stats.avgCost}
                      {isBest('avgCost', stats.avgCost) && <Trophy className="inline h-3 w-3 ml-1 mb-0.5" />}
                    </p>
                  ) : <p className="text-base text-muted-foreground">—</p>}
                </div>

                {/* Avg turnaround */}
                <div className="px-4 py-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Turnaround</p>
                  {stats.avgTurnaroundDays != null ? (
                    <p className={cn('text-base font-semibold tabular-nums', isBest('avgTurnaroundDays', stats.avgTurnaroundDays) && 'text-emerald-600 dark:text-emerald-400')}>
                      {stats.avgTurnaroundDays}d
                      {isBest('avgTurnaroundDays', stats.avgTurnaroundDays) && <Trophy className="inline h-3 w-3 ml-1 mb-0.5" />}
                    </p>
                  ) : <p className="text-base text-muted-foreground">—</p>}
                </div>

                {/* Damage rate */}
                <div className="px-4 py-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 text-amber-500" />Damage
                  </p>
                  {stats.damageRate != null ? (
                    <p className={cn(
                      'text-base font-semibold tabular-nums',
                      isBest('damageRate', stats.damageRate) ? 'text-emerald-600 dark:text-emerald-400'
                        : stats.damageRate > 10 ? 'text-amber-600 dark:text-amber-400' : ''
                    )}>
                      {stats.damageRate === 0 ? '0%' : `${stats.damageRate}%`}
                      {isBest('damageRate', stats.damageRate) && <Trophy className="inline h-3 w-3 ml-1 mb-0.5" />}
                    </p>
                  ) : <p className="text-base text-muted-foreground">—</p>}
                </div>

                {/* Missing rate */}
                <div className="px-4 py-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1">
                    <PackageX className="h-3 w-3 text-red-500" />Missing
                  </p>
                  {stats.missingRate != null ? (
                    <p className={cn(
                      'text-base font-semibold tabular-nums',
                      isBest('missingRate', stats.missingRate) ? 'text-emerald-600 dark:text-emerald-400'
                        : stats.missingRate > 10 ? 'text-red-600 dark:text-red-400' : ''
                    )}>
                      {stats.missingRate === 0 ? '0%' : `${stats.missingRate}%`}
                      {isBest('missingRate', stats.missingRate) && <Trophy className="inline h-3 w-3 ml-1 mb-0.5" />}
                    </p>
                  ) : <p className="text-base text-muted-foreground">—</p>}
                </div>
              </div>
            ) : (
              <p className="px-4 py-4 text-xs text-muted-foreground">
                No completed batches yet — stats will appear once items are returned.
              </p>
            )}
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        <Trophy className="inline h-3 w-3 text-emerald-500 mr-1 mb-0.5" />
        Best = lowest for cost, turnaround, damage & missing rates. Requires 2+ vendors with data.
      </p>
    </div>
  )
}
