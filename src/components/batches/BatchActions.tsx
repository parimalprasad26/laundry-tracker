'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { markBatchSent, deleteBatch, reBatch } from '@/actions/batches'
import { closeBatch } from '@/actions/close-batch'
import { RecordPaymentSheet } from './RecordPaymentSheet'
import { PayNowPromptSheet } from './PayNowPromptSheet'
import { InspectionSheet } from '@/components/batch/InspectionSheet'
import { CollectionSheet } from '@/components/batch/CollectionSheet'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { MoreVertical, Send, Trash2, Loader2, PackageCheck, ReceiptText, RotateCcw, ClipboardCheck } from 'lucide-react'
import type { BatchWithStatus } from '@/types'

export function BatchActions({ batch }: { batch: BatchWithStatus }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [payNowSheetOpen, setPayNowSheetOpen] = useState(false)
  const [paymentSheetOpen, setPaymentSheetOpen] = useState(false)
  const [inspectionSheetOpen, setInspectionSheetOpen] = useState(false)
  const [collectionSheetOpen, setCollectionSheetOpen] = useState(false)

  function handleMarkSent() {
    if (batch.total_items === 0) {
      toast.error('Add items to this batch before sending it to laundry.')
      return
    }
    startTransition(async () => {
      const result = await markBatchSent(batch.id)
      if (result.success) {
        router.refresh()
        setPayNowSheetOpen(true)
      } else {
        toast.error(result.error)
      }
    })
  }

  function handleCollectionConfirmed() {
    setCollectionSheetOpen(false)
    router.refresh()
    if (batch.actual_cost == null) {
      setPaymentSheetOpen(true)
    } else {
      setInspectionSheetOpen(true)
    }
  }

  function handleCloseInspection() {
    startTransition(async () => {
      const result = await closeBatch(batch.id)
      if (result.success) {
        toast.success('Batch closed')
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  function handleReBatch() {
    startTransition(async () => {
      const result = await reBatch(batch.id)
      if (result.success) {
        router.push(`/batches/${result.data.id}`)
      } else {
        toast.error(result.error)
      }
    })
  }

  function handleDelete() {
    if (!confirm('Delete this batch? This cannot be undone.')) return
    startTransition(async () => {
      const result = await deleteBatch(batch.id)
      if (result.success) {
        toast.success('Batch deleted')
        router.push('/batches')
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <>
      <div className="flex items-center gap-2 shrink-0">
        {batch.status === 'draft' && (
          <Button onClick={handleMarkSent} disabled={isPending} size="sm" className="gap-1.5">
            {isPending
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Send className="h-4 w-4" />}
            Send to laundry
          </Button>
        )}

        {(batch.status === 'closed') && (
          <Button onClick={handleReBatch} disabled={isPending} size="sm" variant="outline" className="gap-1.5">
            {isPending
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <RotateCcw className="h-4 w-4" />}
            Send again
          </Button>
        )}

        {batch.status === 'in_laundry' && (
          <Button onClick={() => setCollectionSheetOpen(true)} disabled={isPending} size="sm" variant="outline" className="gap-1.5">
            <PackageCheck className="h-4 w-4" />
            Collected
          </Button>
        )}

        {batch.status === 'returned' && (
          <Button onClick={handleCloseInspection} disabled={isPending} size="sm" className="gap-1.5">
            {isPending
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <ClipboardCheck className="h-4 w-4" />}
            Close inspection
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={isPending}
            className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}
          >
            <MoreVertical className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {batch.status !== 'draft' && (
              <>
                <DropdownMenuItem onClick={() => setPaymentSheetOpen(true)}>
                  <ReceiptText className="mr-2 h-4 w-4" />
                  {batch.actual_cost != null ? 'Edit payment' : 'Record payment'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            {batch.status === 'returned' && (
              <>
                <DropdownMenuItem onClick={() => setInspectionSheetOpen(true)}>
                  <ClipboardCheck className="mr-2 h-4 w-4" />
                  Inspection details
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={handleDelete} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete batch
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <PayNowPromptSheet
        open={payNowSheetOpen}
        onPayNow={() => {
          setPayNowSheetOpen(false)
          setPaymentSheetOpen(true)
        }}
        onPayLater={() => {
          setPayNowSheetOpen(false)
          toast.success('Batch sent to laundry')
        }}
      />

      <RecordPaymentSheet
        batchId={batch.id}
        open={paymentSheetOpen}
        onClose={() => {
          setPaymentSheetOpen(false)
          // After recording payment on a returned-but-not-closed batch, prompt inspection
          if (batch.status === 'returned') {
            setInspectionSheetOpen(true)
          }
        }}
        suggestedAmount={batch.calculated_cost}
        calculatedCost={batch.calculated_cost}
        currentActualCost={batch.actual_cost}
        existingNote={batch.price_delta_note}
      />

      <InspectionSheet
        batchId={batch.id}
        open={inspectionSheetOpen}
        onClose={() => setInspectionSheetOpen(false)}
        onClosed={() => {
          setInspectionSheetOpen(false)
          router.refresh()
        }}
      />

      <CollectionSheet
        batch={batch}
        open={collectionSheetOpen}
        onClose={() => setCollectionSheetOpen(false)}
        onConfirmed={handleCollectionConfirmed}
      />
    </>
  )
}
