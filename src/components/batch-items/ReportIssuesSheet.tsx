'use client'

import { useState, useEffect, useTransition } from 'react'
import { toast } from 'sonner'
import { reportBatchItemIssues } from '@/actions/batch-items'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Minus, Plus, Loader2, AlertTriangle, PackageX } from 'lucide-react'
import type { BatchItemWithClosetItem } from '@/types'
import { cn } from '@/lib/utils'

interface CounterProps {
  value: number
  max: number
  onChange: (v: number) => void
  color: 'amber' | 'red'
}

function Counter({ value, max, onChange, color }: CounterProps) {
  const active = value > 0
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        disabled={value === 0}
        className="h-10 w-10 rounded-xl border border-border bg-background flex items-center justify-center hover:bg-accent transition-colors disabled:opacity-30"
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className={cn(
        'text-2xl font-bold tabular-nums w-8 text-center',
        active && color === 'amber' && 'text-amber-600 dark:text-amber-400',
        active && color === 'red' && 'text-red-600 dark:text-red-400',
        !active && 'text-muted-foreground'
      )}>
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="h-10 w-10 rounded-xl border border-border bg-background flex items-center justify-center hover:bg-accent transition-colors disabled:opacity-30"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  )
}

interface Props {
  item: BatchItemWithClosetItem
  open: boolean
  onClose: () => void
  onSaved: () => void
}

export function ReportIssuesSheet({ item, open, onClose, onSaved }: Props) {
  const [damaged, setDamaged] = useState(item.damaged_qty)
  const [missing, setMissing] = useState(item.missing_qty)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (open) {
      setDamaged(item.damaged_qty)
      setMissing(item.missing_qty)
    }
  }, [open, item.damaged_qty, item.missing_qty])

  const maxDamaged = item.quantity_returned
  const maxMissing = item.quantity_sent

  function handleSave() {
    startTransition(async () => {
      const result = await reportBatchItemIssues(item.id, item.batch_id, damaged, missing)
      if (result.success) {
        toast.success('Issues saved')
        onSaved()
        onClose()
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose() }}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-8">
        <SheetHeader className="mb-6">
          <SheetTitle>Report issues</SheetTitle>
          <SheetDescription className="font-medium text-foreground/70">
            {item.closet_item.name}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-3">
          {/* Damaged */}
          <div className={cn(
            'rounded-2xl p-4 transition-colors',
            damaged > 0
              ? 'bg-amber-50 dark:bg-amber-500/10 ring-1 ring-amber-200 dark:ring-amber-500/25'
              : 'bg-muted/50 ring-1 ring-border'
          )}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'h-9 w-9 rounded-xl flex items-center justify-center shrink-0',
                  damaged > 0 ? 'bg-amber-100 dark:bg-amber-500/20' : 'bg-background'
                )}>
                  <AlertTriangle className={cn('h-4 w-4', damaged > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground')} />
                </div>
                <div>
                  <p className={cn('text-sm font-semibold', damaged > 0 && 'text-amber-700 dark:text-amber-300')}>
                    Damaged
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {maxDamaged === 0 ? 'Mark items returned first' : `Returned but in bad condition · max ${maxDamaged}`}
                  </p>
                </div>
              </div>
              {maxDamaged > 0
                ? <Counter value={damaged} max={maxDamaged} onChange={setDamaged} color="amber" />
                : <span className="text-xs text-muted-foreground self-center">—</span>
              }
            </div>
          </div>

          {/* Missing */}
          <div className={cn(
            'rounded-2xl p-4 transition-colors',
            missing > 0
              ? 'bg-red-50 dark:bg-red-500/10 ring-1 ring-red-200 dark:ring-red-500/25'
              : 'bg-muted/50 ring-1 ring-border'
          )}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'h-9 w-9 rounded-xl flex items-center justify-center shrink-0',
                  missing > 0 ? 'bg-red-100 dark:bg-red-500/20' : 'bg-background'
                )}>
                  <PackageX className={cn('h-4 w-4', missing > 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground')} />
                </div>
                <div>
                  <p className={cn('text-sm font-semibold', missing > 0 && 'text-red-700 dark:text-red-300')}>
                    Missing
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Not returned · max {maxMissing} sent
                  </p>
                </div>
              </div>
              <Counter value={missing} max={maxMissing} onChange={setMissing} color="red" />
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleSave} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
