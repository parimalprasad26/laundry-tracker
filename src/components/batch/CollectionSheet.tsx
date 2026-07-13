'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { collectBatch } from '@/actions/batch-items'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Loader2, Package, AlertTriangle, X, Shirt, PackageX, CheckCircle2, ChevronLeft } from 'lucide-react'
import { publicImageUrl, cn } from '@/lib/utils'
import type { BatchWithStatus, BatchItemWithClosetItem } from '@/types'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

interface Props {
  batch: BatchWithStatus
  batchItems: BatchItemWithClosetItem[]
  open: boolean
  onClose: () => void
  onConfirmed: () => void
}

export function CollectionSheet({ batch, batchItems, open, onClose, onConfirmed }: Props) {
  const [step, setStep] = useState<1 | 2>(1)
  const [count, setCount] = useState(batch.total_items)
  const [missingIds, setMissingIds] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()

  const shortfall = batch.total_items - count

  function handleOpenChange(v: boolean) {
    if (!v) { onClose(); reset() }
  }

  function reset() {
    setStep(1)
    setCount(batch.total_items)
    setMissingIds(new Set())
  }

  function toggleMissing(id: string) {
    setMissingIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleNext() {
    if (shortfall === 0) {
      submit([])
    } else {
      setMissingIds(new Set())
      setStep(2)
    }
  }

  function submit(ids: string[]) {
    startTransition(async () => {
      const result = await collectBatch(batch.id, count, ids)
      if (result.success) {
        reset()
        onConfirmed()
      } else {
        toast.error(result.error)
      }
    })
  }

  const identifiedCount = missingIds.size
  const allIdentified = identifiedCount === shortfall

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-8 max-h-[90dvh] flex flex-col">

        {/* ── Step 1: count picker ─────────────────────────── */}
        {step === 1 && (
          <>
            <SheetHeader className="mb-5 shrink-0">
              <div className="flex items-center justify-between">
                <SheetTitle>Collected from laundry?</SheetTitle>
                <button
                  onClick={() => { onClose(); reset() }}
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
                    <strong>{shortfall} item{shortfall > 1 ? 's' : ''} unaccounted for</strong>
                    {' '}— next you&apos;ll identify which {shortfall > 1 ? 'ones' : 'one'} didn&apos;t come back.
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2 shrink-0">
              <Button
                onClick={handleNext}
                disabled={isPending || count < 0}
                className="w-full gap-2"
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {shortfall > 0 ? `Next — identify ${shortfall} missing item${shortfall > 1 ? 's' : ''}` : 'Confirm collection'}
              </Button>
              <Button variant="outline" onClick={() => { onClose(); reset() }} disabled={isPending} className="w-full">
                Cancel
              </Button>
            </div>
          </>
        )}

        {/* ── Step 2: identify which items didn't come back ── */}
        {step === 2 && (
          <>
            <SheetHeader className="mb-4 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setStep(1)}
                  className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <SheetTitle>Which items didn&apos;t come back?</SheetTitle>
              </div>
            </SheetHeader>

            <div className="flex items-center gap-2 mb-3 shrink-0">
              <span className={cn(
                'text-xs font-medium px-2 py-0.5 rounded-full',
                allIdentified
                  ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                  : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300'
              )}>
                {identifiedCount} of {shortfall} identified
              </span>
            </div>

            <div className="overflow-y-auto flex-1 -mx-6 px-6 space-y-2 mb-4">
              {batchItems.map(item => {
                const ci = item.closet_item
                const imageUrl = ci.primary_image_path
                  ? publicImageUrl(SUPABASE_URL, ci.primary_image_path)
                  : null
                const isMarkedMissing = missingIds.has(item.id)

                return (
                  <button
                    key={item.id}
                    onClick={() => toggleMissing(item.id)}
                    className={cn(
                      'w-full flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors text-left ring-1',
                      isMarkedMissing
                        ? 'bg-red-50 dark:bg-red-500/10 ring-red-200 dark:ring-red-500/25'
                        : 'bg-muted/40 ring-border hover:bg-muted/70'
                    )}
                  >
                    <div className="h-9 w-9 rounded-lg overflow-hidden bg-muted shrink-0">
                      {imageUrl
                        ? <img src={imageUrl} alt={ci.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center">
                            <Shirt className="h-4 w-4 text-muted-foreground/40" />
                          </div>
                      }
                    </div>
                    <span className={cn(
                      'flex-1 text-sm font-medium truncate',
                      isMarkedMissing && 'text-red-700 dark:text-red-300'
                    )}>
                      {ci.name}
                    </span>
                    {isMarkedMissing
                      ? <PackageX className="h-4 w-4 text-red-500 shrink-0" />
                      : <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    }
                  </button>
                )
              })}
            </div>

            <div className="shrink-0">
              <Button
                onClick={() => submit(Array.from(missingIds))}
                disabled={isPending || !allIdentified}
                className="w-full gap-2"
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm collection
              </Button>
            </div>
          </>
        )}

      </SheetContent>
    </Sheet>
  )
}
