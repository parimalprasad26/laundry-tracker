'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { saveVendorPrices } from '@/actions/vendor-prices'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2 } from 'lucide-react'
import type { VendorItemPrice, ItemType } from '@/types'

const ITEM_TYPES: Array<{ value: ItemType; label: string }> = [
  { value: 'shirt',     label: 'Shirt' },
  { value: 'pants',     label: 'Pants' },
  { value: 'dress',     label: 'Dress' },
  { value: 'jacket',    label: 'Jacket' },
  { value: 'shorts',    label: 'Shorts' },
  { value: 'socks',     label: 'Socks' },
  { value: 'underwear', label: 'Underwear' },
  { value: 'sweater',   label: 'Sweater' },
  { value: 'suit',      label: 'Suit' },
  { value: 'other',     label: 'Other' },
]

interface Props {
  vendorId: string
  initialPrices: VendorItemPrice[]
}

export function VendorPriceForm({ vendorId, initialPrices }: Props) {
  const [isPending, startTransition] = useTransition()

  const [prices, setPrices] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    for (const p of initialPrices) {
      map[p.item_type] = String(p.unit_price)
    }
    return map
  })

  function handleChange(type: ItemType, value: string) {
    setPrices(prev => ({ ...prev, [type]: value }))
  }

  function handleSave() {
    const entries = ITEM_TYPES
      .filter(({ value }) => prices[value] !== undefined && prices[value] !== '')
      .map(({ value }) => {
        const parsed = parseFloat(prices[value])
        return { item_type: value, unit_price: parsed }
      })
      .filter(e => !isNaN(e.unit_price) && e.unit_price >= 0)

    startTransition(async () => {
      const result = await saveVendorPrices(vendorId, entries)
      if (result.success) {
        toast.success('Price list saved')
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5">
        {ITEM_TYPES.map(({ value, label }) => (
          <div key={value} className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground w-24 shrink-0">{label}</span>
            <div className="relative flex-1">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                ₹
              </span>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="—"
                value={prices[value] ?? ''}
                onChange={e => handleChange(value, e.target.value)}
                className="pl-6 h-8 text-sm"
              />
            </div>
          </div>
        ))}
      </div>

      <Button onClick={handleSave} disabled={isPending} size="sm" className="gap-2">
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        Save price list
      </Button>
    </div>
  )
}
