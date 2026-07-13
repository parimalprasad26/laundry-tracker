'use client'

import { useState, useEffect, useTransition } from 'react'
import { toast } from 'sonner'
import { openSwapDispute } from '@/actions/disputes'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, ArrowLeftRight } from 'lucide-react'
import type { BatchItemWithClosetItem } from '@/types'

interface Props {
  item: BatchItemWithClosetItem
  open: boolean
  onClose: () => void
  onSaved: () => void
}

export function SwapForm({ item, open, onClose, onSaved }: Props) {
  const [description, setDescription] = useState('')
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (open) setDescription('')
  }, [open])

  function handleSave() {
    if (!description.trim()) {
      toast.error('Describe the item you received instead')
      return
    }
    startTransition(async () => {
      const result = await openSwapDispute(item.batch_id, item.id, description.trim())
      if (result.success) {
        toast.success('Swap reported')
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
          <SheetTitle>Wrong item received</SheetTitle>
          <SheetDescription className="font-medium text-foreground/70">
            {item.closet_item.name}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4">
          <div className="flex items-start gap-2.5 rounded-xl bg-blue-50 dark:bg-blue-500/10 ring-1 ring-blue-200 dark:ring-blue-500/25 px-3 py-2.5">
            <ArrowLeftRight className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Describe the item you received instead. The vendor likely mixed up batches and has your item.
            </p>
          </div>

          <Textarea
            placeholder="e.g. White shirt with a collar logo — not mine"
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
            disabled={isPending || !description.trim()}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Report swap
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
