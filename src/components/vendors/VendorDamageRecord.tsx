import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { AlertTriangle, PackageX, ShieldCheck, FileWarning, ArrowLeftRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DamagedBatch {
  batchId: string
  batchName: string
  totalDamaged: number
  totalMissing: number
  closedAt: string
}

interface Props {
  damagedBatches: DamagedBatch[]
  openDisputeCount: number
  openSwapCount: number
  totalBatchCount: number
}

export function VendorDamageRecord({ damagedBatches, openDisputeCount, openSwapCount, totalBatchCount }: Props) {
  const totalDamaged = damagedBatches.reduce((s, b) => s + b.totalDamaged, 0)
  const totalMissing = damagedBatches.reduce((s, b) => s + b.totalMissing, 0)
  const affectedBatches = damagedBatches.length
  const hasIssues = totalDamaged > 0 || totalMissing > 0 || openDisputeCount > 0 || openSwapCount > 0

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="font-medium text-sm">Damage record</h2>
        {openDisputeCount > 0 && (
          <span className="inline-flex items-center rounded-full bg-red-100 dark:bg-red-500/15 px-2 py-0.5 text-[10px] font-medium text-red-700 dark:text-red-400">
            {openDisputeCount} dispute{openDisputeCount > 1 ? 's' : ''} open
          </span>
        )}
      </div>

      {!hasIssues ? (
        <div className="flex items-center gap-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 ring-1 ring-emerald-200 dark:ring-emerald-900/40 px-3 py-2.5">
          <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
            No damage or missing items across {totalBatchCount} batch{totalBatchCount !== 1 ? 'es' : ''}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border divide-y overflow-hidden">
          {/* Summary row */}
          <div className="px-3 py-2.5 bg-muted/40 flex flex-wrap gap-4">
            {totalDamaged > 0 && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5" />
                {totalDamaged} item{totalDamaged !== 1 ? 's' : ''} damaged
              </span>
            )}
            {totalMissing > 0 && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-red-700 dark:text-red-400">
                <PackageX className="h-3.5 w-3.5" />
                {totalMissing} item{totalMissing !== 1 ? 's' : ''} missing
              </span>
            )}
            {openDisputeCount > 0 && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-orange-700 dark:text-orange-400">
                <FileWarning className="h-3.5 w-3.5" />
                {openDisputeCount} open dispute{openDisputeCount !== 1 ? 's' : ''}
              </span>
            )}
            {openSwapCount > 0 && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-blue-700 dark:text-blue-400">
                <ArrowLeftRight className="h-3.5 w-3.5" />
                {openSwapCount} swap{openSwapCount !== 1 ? 's' : ''} reported
              </span>
            )}
            <span className="text-xs text-muted-foreground ml-auto">
              across {affectedBatches} of {totalBatchCount} batch{totalBatchCount !== 1 ? 'es' : ''}
            </span>
          </div>

          {/* Per-batch rows */}
          {damagedBatches.map(b => (
            <Link
              key={b.batchId}
              href={`/batches/${b.batchId}`}
              className="flex items-center justify-between px-3 py-2.5 hover:bg-muted/40 transition-colors group"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate group-hover:text-foreground">{b.batchName}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {formatDistanceToNow(new Date(b.closedAt), { addSuffix: true })}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-3">
                {b.totalDamaged > 0 && (
                  <span className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400 font-medium">
                    <AlertTriangle className="h-3 w-3" />{b.totalDamaged}
                  </span>
                )}
                {b.totalMissing > 0 && (
                  <span className="flex items-center gap-1 text-xs text-red-700 dark:text-red-400 font-medium">
                    <PackageX className="h-3 w-3" />{b.totalMissing}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
