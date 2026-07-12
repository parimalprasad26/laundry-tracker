import { Clock } from 'lucide-react'

interface Props {
  avgDays: number | null
  minDays: number | null
  maxDays: number | null
  count: number
}

export function VendorTurnaroundStats({ avgDays, minDays, maxDays, count }: Props) {
  if (count === 0 || avgDays === null) {
    return (
      <div className="rounded-xl bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
        No completed batches yet — turnaround time will appear here once items are returned.
      </div>
    )
  }

  const rangeText = minDays !== null && maxDays !== null && minDays !== maxDays
    ? `${minDays}d – ${maxDays}d`
    : null

  return (
    <div className="rounded-xl bg-muted/40 px-4 py-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Clock className="h-4 w-4 text-muted-foreground" />
        Turnaround time
      </div>

      <div className="flex items-end gap-1.5">
        <span className="text-3xl font-bold tabular-nums">{avgDays}</span>
        <span className="text-sm text-muted-foreground mb-1">days avg</span>
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>Based on {count} completed batch{count !== 1 ? 'es' : ''}</span>
        {rangeText && (
          <>
            <span>·</span>
            <span>Range: {rangeText}</span>
          </>
        )}
      </div>
    </div>
  )
}
