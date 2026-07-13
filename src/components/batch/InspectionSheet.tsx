'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { closeBatch } from '@/actions/close-batch'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Loader2, AlertTriangle, X } from 'lucide-react'

interface Props {
  batchId: string
  open: boolean
  onClose: () => void
  onClosed: () => void
}

export function InspectionSheet({ batchId, open, onClose, onClosed }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleCloseNow() {
    startTransition(async () => {
      const result = await closeBatch(batchId)
      if (result.success) {
        toast.success('Batch closed')
        router.refresh()
        onClosed()
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose() }}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-8">
        <SheetHeader className="mb-5">
          <div className="flex items-center justify-between">
            <SheetTitle>Inspect your items</SheetTitle>
            <button
              onClick={onClose}
              className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </SheetHeader>

        <div className="space-y-3 mb-6">
          <div className="flex items-start gap-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 ring-1 ring-emerald-200 dark:ring-emerald-900/40 px-3 py-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-xs text-emerald-700 dark:text-emerald-300">All items marked returned</p>
          </div>

          <div className="flex items-start gap-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 ring-1 ring-amber-200 dark:ring-amber-500/25 px-3 py-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Check each item for damage, stains, or missing pieces before closing the batch. You have{' '}
              <strong>7 days</strong> after closing to raise a dispute.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Button
            onClick={handleCloseNow}
            disabled={isPending}
            className="w-full gap-2"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Close &amp; finish — all good
          </Button>

          <Button
            variant="outline"
            onClick={onClose}
            disabled={isPending}
            className="w-full"
          >
            Inspect items first
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-3">
          You can close the batch later from the ⋮ menu
        </p>
      </SheetContent>
    </Sheet>
  )
}
