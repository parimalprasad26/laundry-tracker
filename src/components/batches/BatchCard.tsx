import Link from 'next/link'
import { BatchStatusBadge } from './BatchStatusBadge'
import { formatDate, formatPrice } from '@/lib/utils'
import type { BatchWithStatus } from '@/types'
import { Store, Calendar, MessageSquare, Truck, ClipboardCheck } from 'lucide-react'

export function BatchCard({ batch }: { batch: BatchWithStatus }) {
  return (
    <Link href={`/batches/${batch.id}`}>
      <div className="group rounded-2xl bg-card p-4 ring-1 ring-border hover:ring-foreground/20 hover:shadow-md shadow-sm transition-all duration-150 cursor-pointer h-full flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm leading-snug line-clamp-2 flex-1">{batch.name}</h3>
          <BatchStatusBadge status={batch.status} />
        </div>

        {/* Meta */}
        <div className="flex flex-col gap-1.5 flex-1">
          {batch.vendor_name && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Store className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{batch.vendor_name}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            {formatDate(batch.sent_at ?? batch.created_at)}
          </div>
          {batch.actual_cost != null && (
            <p className="text-xs font-medium text-foreground/80">{formatPrice(batch.actual_cost)}</p>
          )}
          {batch.price_delta_note && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MessageSquare className="h-3 w-3 shrink-0" />
              <span className="truncate">{batch.price_delta_note}</span>
            </div>
          )}
        </div>

        {/* Status footer */}
        {batch.status === 'in_laundry' && batch.total_items > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Truck className="h-3.5 w-3.5 shrink-0" />
            <span>{batch.total_items} item{batch.total_items !== 1 ? 's' : ''} in transit</span>
          </div>
        )}

        {batch.status === 'returned' && (
          <div className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
            <ClipboardCheck className="h-3.5 w-3.5 shrink-0" />
            <span>Inspection pending</span>
          </div>
        )}
      </div>
    </Link>
  )
}
