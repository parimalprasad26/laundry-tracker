'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { setStandardVendorPrice, completeVendorOnboarding } from '@/actions/vendor-portal'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { ITEM_TYPE_LABELS } from '@/lib/item-type'
import { Loader2 } from 'lucide-react'
import type { VendorAccountPrice, ItemType } from '@/types'

const STANDARD_TYPES = (Object.keys(ITEM_TYPE_LABELS) as ItemType[]).filter(t => t !== 'other')

interface Props {
  prices: VendorAccountPrice[]
  onboardingComplete: boolean
}

export function RateCardClient({ prices, onboardingComplete }: Props) {
  const router = useRouter()
  const priceMap = new Map(prices.map(p => [p.item_type, p.unit_price]))
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(STANDARD_TYPES.map(t => [t, priceMap.get(t)?.toString() ?? '']))
  )
  const [savingType, setSavingType] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSave(itemType: ItemType) {
    const raw = values[itemType]
    const price = Number(raw)
    if (!raw || Number.isNaN(price) || price < 0) {
      toast.error('Enter a valid price')
      return
    }
    setSavingType(itemType)
    startTransition(async () => {
      const result = await setStandardVendorPrice(itemType, price)
      setSavingType(null)
      if (!result.success) { toast.error(result.error); return }
      toast.success(`${ITEM_TYPE_LABELS[itemType]} price saved`)
      router.refresh()
    })
  }

  function handleCompleteOnboarding() {
    startTransition(async () => {
      const result = await completeVendorOnboarding()
      if (!result.success) { toast.error(result.error); return }
      toast.success("You're live — customers can now find you")
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {STANDARD_TYPES.map(type => (
          <div key={type} className="space-y-1.5">
            <Label htmlFor={`price-${type}`}>{ITEM_TYPE_LABELS[type]}</Label>
            <div className="flex gap-2">
              <Input
                id={`price-${type}`}
                type="number"
                min={0}
                step="0.01"
                value={values[type]}
                onChange={e => setValues(v => ({ ...v, [type]: e.target.value }))}
                placeholder="₹0.00"
              />
              <Button size="sm" variant="outline" disabled={isPending} onClick={() => handleSave(type)}>
                {savingType === type ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save'}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {!onboardingComplete && (
        <Button disabled={isPending || prices.length === 0} onClick={handleCompleteOnboarding} className="w-full sm:w-auto">
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Go live — appear in customer search
        </Button>
      )}
    </div>
  )
}
