'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { collectBatch } from '@/actions/batch-items'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Loader2, Package, AlertTriangle, X } from 'lucide-react'
import type { BatchWithStatus } from '@/types'

interface Props {
  batch: BatchWithStatus
  open: boolean
  onClose: () => void
  onConfirmed: () => void
}

export function CollectionSheet({ batch, open, onClose, onConfirmed }: Props) {
  const [count, setCount] = useState(batch.total_items)
  const [hasWrongItem, setHasWrongItem] = useState(false)
  const [notes, setNotes] = useState('')
  const [isPending, startTransition] = useTransition()

  const shortfall = batch.total_items - count

  function handleOpenChange(v: boolean) {
    if (!v) onClose()
    else {
      setCount(batch.total_items)
      setHasWrongItem(false)
      setNotes('')
    }
  }

  function handleConfirm() {
    startTransition(async () => {
      const result = await collectBatch(batch.id, count, hasWrongItem, notes || undefined)
      if (result.success) {
        if (shortfall > 0) {
          toast.warning(
            `${shortfall} item${shortfall > 1 ? 's' : ''} unaccounted for — mark ${shortfall > 1 ? 'them' : 'it'} missing during inspection`
          )
        } else if (hasWrongItem) {
          toast.warning('Wrong item noted — check your items during inspection')
        }
        onConfirmed()
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-8">
        <SheetHeader className="mb-5">
          <div className="flex items-center justify-between">
            <SheetTitle>Collected from laundry?</SheetTitle>
            <button
              onClick={onClose}
              className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </SheetHeader>

        <div className="space-y-4 mb-6">
          <div className="flex items-center gap-3 rounded-xl bg-muted/60 px-3 py-2.5">
            <Package className="h-4 w-4 text-muted-foreground shrink-0" />
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{batch.total_items}</span>{' '}
              item{batch.total_items !== 1 ? 's' : ''} sent
              {batch.vendor_name ? ` to ${batch.vendor_name}` : ''}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Items collected</label>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setCount(c => Math.max(0, c - 1))}
                disabled={count <= 0 || isPending}
                className="h-10 w-10 rounded-xl border bg-background flex items-center justify-center text-xl font-medium disabled:opacity-40 hover:bg-muted transition-colors"
              >
                −
              </button>
              <span className="text-3xl font-bold tabular-nums w-12 text-center">{count}</span>
              <button
                onClick={() => setCount(c => Math.min(batch.total_items, c + 1))}
                disabled={count >= batch.total_items || isPending}
                className="h-10 w-10 rounded-xl border bg-background flex items-center justify-center text-xl font-medium disabled:opacity-40 hover:bg-muted transition-colors"
              >
                +
              </button>
            </div>
          </div>

          {shortfall > 0 && (
            <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 ring-1 ring-amber-200 dark:ring-amber-500/25 px-3 py-2.5">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                <strong>{shortfall} item{shortfall > 1 ? 's' : ''} unaccounted for</strong> — you can mark{' '}
                {shortfall > 1 ? 'them' : 'it'} missing during inspection.
              </p>
            </div>
          )}

          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hasWrongItem}
              onChange={e => setHasWrongItem(e.target.checked)}
              disabled={isPending}
              className="h-4 w-4 rounded"
            />
            <span className="text-sm">Received a wrong or unexpected item</span>
          </label>

          {hasWrongItem && (
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Describe what was received..."
              rows={2}
              disabled={isPending}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          )}
        </div>

        <div className="space-y-2">
          <Button
            onClick={handleConfirm}
            disabled={isPending || count < 0}
            className="w-full gap-2"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Confirm collection
          </Button>
          <Button variant="outline" onClick={onClose} disabled={isPending} className="w-full">
            Cancel
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
