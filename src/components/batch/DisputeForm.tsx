'use client'

import { useState, useEffect, useTransition } from 'react'
import { toast } from 'sonner'
import { openDispute } from '@/actions/disputes'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Minus, Plus, Loader2, AlertTriangle, PackageX } from 'lucide-react'
import type { BatchItemWithClosetItem } from '@/types'
import { cn } from '@/lib/utils'

function Counter({ value, max, onChange, color }: {
  value: number
  max: number
  onChange: (v: number) => void
  color: 'amber' | 'red'
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        disabled={value === 0}
        className="h-9 w-9 rounded-xl border border-border bg-background flex items-center justify-center hover:bg-accent disabled:opacity-30"
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className={cn(
        'text-2xl font-bold tabular-nums w-8 text-center',
        value > 0 && color === 'amber' && 'text-amber-600 dark:text-amber-400',
        value > 0 && color === 'red'   && 'text-red-600 dark:text-red-400',
        value === 0 && 'text-muted-foreground'
      )}>
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="h-9 w-9 rounded-xl border border-border bg-background flex items-center justify-center hover:bg-accent disabled:opacity-30"
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

export function DisputeForm({ item, open, onClose, onSaved }: Props) {
  const [damaged, setDamaged] = useState(0)
  const [missing, setMissing] = useState(0)
  const [description, setDescription] = useState('')
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (open) {
      setDamaged(0)
      setMissing(0)
      setDescription('')
    }
  }, [open])

  function handleSave() {
    if (damaged === 0 && missing === 0) {
      toast.error('Specify at least one damaged or missing item')
      return
    }
    startTransition(async () => {
      const result = await openDispute(
        item.batch_id,
        item.id,
        damaged,
        missing,
        description.trim() || undefined
      )
      if (result.success) {
        toast.success('Dispute opened')
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
        <SheetHeader className="mb-5">
          <SheetTitle>Open a dispute</SheetTitle>
          <SheetDescription className="font-medium text-foreground/70">
            {item.closet_item.name}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-3">
          <div className={cn(
            'rounded-2xl p-4',
            damaged > 0
              ? 'bg-amber-50 dark:bg-amber-500/10 ring-1 ring-amber-200 dark:ring-amber-500/25'
              : 'bg-muted/50 ring-1 ring-border'
          )}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={cn('h-9 w-9 rounded-xl flex items-center justify-center shrink-0',
                  damaged > 0 ? 'bg-amber-100 dark:bg-amber-500/20' : 'bg-background'
                )}>
                  <AlertTriangle className={cn('h-4 w-4', damaged > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground')} />
                </div>
                <div>
                  <p className={cn('text-sm font-semibold', damaged > 0 && 'text-amber-700 dark:text-amber-300')}>
                    Damaged
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">max {item.quantity_sent}</p>
                </div>
              </div>
              <Counter value={damaged} max={item.quantity_sent} onChange={setDamaged} color="amber" />
            </div>
          </div>

          <div className={cn(
            'rounded-2xl p-4',
            missing > 0
              ? 'bg-red-50 dark:bg-red-500/10 ring-1 ring-red-200 dark:ring-red-500/25'
              : 'bg-muted/50 ring-1 ring-border'
          )}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={cn('h-9 w-9 rounded-xl flex items-center justify-center shrink-0',
                  missing > 0 ? 'bg-red-100 dark:bg-red-500/20' : 'bg-background'
                )}>
                  <PackageX className={cn('h-4 w-4', missing > 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground')} />
                </div>
                <div>
                  <p className={cn('text-sm font-semibold', missing > 0 && 'text-red-700 dark:text-red-300')}>
                    Missing
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">max {item.quantity_sent} sent</p>
                </div>
              </div>
              <Counter value={missing} max={item.quantity_sent} onChange={setMissing} color="red" />
            </div>
          </div>

          <Textarea
            placeholder="What happened? (optional)"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="resize-none text-sm"
            rows={2}
          />
        </div>

        <div className="mt-5 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleSave} disabled={isPending || (damaged === 0 && missing === 0)}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Open dispute
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
