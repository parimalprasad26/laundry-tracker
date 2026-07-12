'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { BatchStatusBadge } from '@/components/batches/BatchStatusBadge'
import { formatPrice } from '@/lib/utils'
import { ChevronRight } from 'lucide-react'
import type { BatchWithStatus } from '@/types'

interface Props {
  date: Date | null
  batches: BatchWithStatus[]
  onClose: () => void
}

export function DateBatchSheet({ date, batches, onClose }: Props) {
  return (
    <Sheet open={date != null} onOpenChange={v => !v && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl p-0">
        <SheetHeader className="px-4 pt-4 pb-2 border-b">
          <SheetTitle>{date ? format(date, 'MMMM d, yyyy') : ''}</SheetTitle>
        </SheetHeader>
        <div className="px-4 py-4 space-y-3 max-h-[50vh] overflow-y-auto">
          {batches.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No batches on this date.</p>
          ) : (
            batches.map(batch => (
              <Link
                key={batch.id}
                href={`/batches/${batch.id}`}
                onClick={onClose}
                className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{batch.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <BatchStatusBadge status={batch.status} />
                    {batch.actual_cost != null && (
                      <span className="text-xs text-muted-foreground">{formatPrice(batch.actual_cost)}</span>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
              </Link>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
