'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { recordBatchPayment } from '@/actions/batches'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, AlertTriangle } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

interface Props {
  batchId: string
  open: boolean
  onClose: () => void
  suggestedAmount: number | null
  calculatedCost: number | null
  currentActualCost: number | null
  existingNote: string | null
}

export function RecordPaymentSheet({
  batchId, open, onClose, suggestedAmount, calculatedCost, currentActualCost, existingNote,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [amount, setAmount] = useState(
    currentActualCost != null ? String(currentActualCost)
    : suggestedAmount != null ? String(suggestedAmount) : ''
  )
  const [note, setNote] = useState(existingNote ?? '')
  const [showNote, setShowNote] = useState(!!existingNote)

  const parsed = parseFloat(amount)
  const delta = !isNaN(parsed) && calculatedCost != null ? parsed - calculatedCost : null
  const hasSignificantDelta = delta != null && Math.abs(delta) >= 0.01

  function handleSave() {
    if (isNaN(parsed) || parsed < 0) {
      toast.error('Enter a valid amount')
      return
    }
    if (parsed === 0) {
      toast.error('Amount paid can\'t be ₹0 — use the ⋮ menu to delete the batch if it was free.')
      return
    }
    startTransition(async () => {
      const result = await recordBatchPayment(batchId, parsed, note.trim() || null)
      if (result.success) {
        toast.success('Payment recorded')
        router.refresh()
        onClose()
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl p-0">
        <SheetHeader className="px-4 pt-4 pb-2 border-b">
          <SheetTitle>{currentActualCost != null ? 'Edit payment' : 'Record payment'}</SheetTitle>
        </SheetHeader>

        <div className="px-4 py-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="actual-cost">Amount paid</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
              <Input
                id="actual-cost"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                className="pl-7"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                autoFocus
              />
            </div>
            {suggestedAmount != null && currentActualCost == null && (
              <p className="text-xs text-muted-foreground">
                Rate card estimate: {formatPrice(suggestedAmount)}
              </p>
            )}
          </div>

          {hasSignificantDelta && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-800 px-3 py-2.5">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1 text-xs text-amber-800 dark:text-amber-300">
                {delta! > 0
                  ? `₹${delta!.toFixed(2)} more than rate card`
                  : `₹${Math.abs(delta!).toFixed(2)} less than rate card`}
                {!showNote && (
                  <button
                    type="button"
                    onClick={() => setShowNote(true)}
                    className="ml-2 underline font-medium"
                  >
                    Add a note
                  </button>
                )}
              </div>
            </div>
          )}

          {showNote && (
            <div className="space-y-1.5">
              <Label htmlFor="delta-note">Note</Label>
              <Textarea
                id="delta-note"
                placeholder="e.g. Extra charge for suit lining"
                rows={2}
                value={note}
                onChange={e => setNote(e.target.value)}
              />
            </div>
          )}
        </div>

        <SheetFooter className="px-4 pb-8 pt-2">
          <Button onClick={handleSave} disabled={isPending} className="w-full gap-2">
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save payment
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
