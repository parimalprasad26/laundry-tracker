'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { raiseVendorIssue } from '@/actions/disputes'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, AlertTriangle, ArrowLeftRight, Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  connectionId: string
  batchItemId: string
  itemName: string
  maxQty: number
  open: boolean
  onClose: () => void
  onSaved: () => void
}

export function VendorFlagIssueForm({ connectionId, batchItemId, itemName, maxQty, open, onClose, onSaved }: Props) {
  const router = useRouter()
  const [kind, setKind] = useState<'damage' | 'swap'>('damage')
  const [damagedQty, setDamagedQty] = useState(1)
  const [description, setDescription] = useState('')
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (open) {
      setKind('damage')
      setDamagedQty(1)
      setDescription('')
    }
  }, [open])

  function handleSave() {
    if (kind === 'swap' && !description.trim()) {
      toast.error('Describe the mismatch you found')
      return
    }
    startTransition(async () => {
      const claim = kind === 'damage'
        ? { dispute_type: 'damage' as const, damaged_qty: damagedQty, description: description.trim() || null }
        : { dispute_type: 'swap' as const, wrong_item_description: description.trim() }
      const result = await raiseVendorIssue(connectionId, batchItemId, claim)
      if (result.success) {
        toast.success('Issue reported to the customer')
        onSaved()
        onClose()
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose() }}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-8">
        <SheetHeader className="mb-5">
          <SheetTitle>Flag an issue</SheetTitle>
          <SheetDescription className="font-medium text-foreground/70">{itemName}</SheetDescription>
        </SheetHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setKind('damage')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-medium transition-colors',
                kind === 'damage' ? 'border-amber-400 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400' : 'border-border text-muted-foreground'
              )}
            >
              <AlertTriangle className="h-3.5 w-3.5" />Damage
            </button>
            <button
              type="button"
              onClick={() => setKind('swap')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-medium transition-colors',
                kind === 'swap' ? 'border-blue-400 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400' : 'border-border text-muted-foreground'
              )}
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />Mismatch
            </button>
          </div>

          {kind === 'damage' && (
            <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
              <span className="text-sm text-muted-foreground">Damaged quantity</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setDamagedQty(q => Math.max(1, q - 1))}
                  disabled={damagedQty <= 1}
                  className="h-7 w-7 rounded-lg border border-border bg-background flex items-center justify-center hover:bg-accent disabled:opacity-30"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="text-base font-bold tabular-nums w-6 text-center">{damagedQty}</span>
                <button
                  type="button"
                  onClick={() => setDamagedQty(q => Math.min(maxQty, q + 1))}
                  disabled={damagedQty >= maxQty}
                  className="h-7 w-7 rounded-lg border border-border bg-background flex items-center justify-center hover:bg-accent disabled:opacity-30"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          <Textarea
            placeholder={kind === 'damage' ? 'What kind of damage? (optional)' : 'What did you receive instead of this item?'}
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="resize-none text-sm"
            rows={3}
            autoFocus={open}
          />
        </div>

        <div className="mt-5 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleSave}
            disabled={isPending || (kind === 'swap' && !description.trim())}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Report to customer
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
