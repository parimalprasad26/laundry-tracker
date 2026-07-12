'use client'

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Banknote, Clock } from 'lucide-react'

interface Props {
  open: boolean
  onPayNow: () => void
  onPayLater: () => void
}

export function PayNowPromptSheet({ open, onPayNow, onPayLater }: Props) {
  return (
    <Sheet open={open} onOpenChange={v => !v && onPayLater()}>
      <SheetContent side="bottom" className="rounded-t-2xl p-0">
        <SheetHeader className="px-4 pt-4 pb-2 border-b">
          <SheetTitle>Did you pay upfront?</SheetTitle>
        </SheetHeader>
        <div className="px-4 py-5 space-y-3">
          <Button onClick={onPayNow} className="w-full gap-2" size="lg">
            <Banknote className="h-4 w-4" />
            Yes, record payment
          </Button>
          <Button onClick={onPayLater} variant="outline" className="w-full gap-2" size="lg">
            <Clock className="h-4 w-4" />
            I&apos;ll pay on pickup
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
