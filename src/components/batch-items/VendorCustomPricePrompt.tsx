'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Store, Tag } from 'lucide-react'
import { setVendorCustomTypePrice } from '@/actions/vendor-prices'
import type { MissingCustomPrice } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  vendorId: string
  vendorName: string
  batchId: string
  missing: MissingCustomPrice[]
}

export function VendorCustomPricePrompt({ open, onClose, vendorId, vendorName, batchId, missing }: Props) {
  const router = useRouter()
  const [prices, setPrices] = useState<Record<string, string>>({})
  const [isPending, startTransition] = useTransition()

  function handleChange(customType: string, value: string) {
    setPrices(prev => ({ ...prev, [customType]: value }))
  }

  function handleSkip() {
    router.refresh()
    onClose()
  }

  function handleSave() {
    const entries = missing
      .map(({ customType, batchItemIds }) => {
        const raw = prices[customType] ?? ''
        const price = parseFloat(raw)
        if (!raw || isNaN(price) || price < 0) return null
        return { customType, price, batchItemIds }
      })
      .filter((e): e is NonNullable<typeof e> => e !== null)

    if (!entries.length) {
      handleSkip()
      return
    }

    startTransition(async () => {
      const result = await setVendorCustomTypePrice(vendorId, batchId, entries)
      if (result.success) {
        toast.success(`Prices saved for ${vendorName}`)
        router.refresh()
        onClose()
      } else {
        toast.error(result.error)
      }
    })
  }

  const filledCount = missing.filter(({ customType }) => {
    const v = prices[customType] ?? ''
    const n = parseFloat(v)
    return v !== '' && !isNaN(n) && n >= 0
  }).length

  return (
    <Sheet open={open} onOpenChange={v => !v && handleSkip()}>
      <SheetContent side="bottom" showCloseButton className="rounded-t-2xl p-0 flex flex-col">
        <SheetHeader className="px-4 pt-4 pb-3 border-b">
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4 text-muted-foreground" />
            <SheetTitle className="text-base">Set prices at {vendorName}</SheetTitle>
          </div>
          <p className="text-xs text-muted-foreground text-left">
            {missing.length === 1
              ? `"${missing[0].customType}" isn't priced here yet.`
              : `${missing.length} item types aren't priced here yet.`}{' '}
            Set rates now so future batches calculate automatically.
          </p>
        </SheetHeader>

        <div className="px-4 py-3 space-y-3">
          {missing.map(({ customType }) => (
            <div key={customType} className="flex items-center gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Tag className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium capitalize">{customType}</span>
              </div>
              <div className="relative w-28">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">₹</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={prices[customType] ?? ''}
                  onChange={e => handleChange(customType, e.target.value)}
                  className="pl-7 text-right"
                />
              </div>
            </div>
          ))}
        </div>

        <SheetFooter className="px-4 pb-6 pt-3 border-t flex gap-2">
          <Button variant="ghost" onClick={handleSkip} disabled={isPending} className="flex-1">
            Skip
          </Button>
          <Button onClick={handleSave} disabled={isPending || filledCount === 0} className="flex-1 gap-2">
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save{filledCount > 0 && filledCount < missing.length ? ` (${filledCount})` : ''}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
