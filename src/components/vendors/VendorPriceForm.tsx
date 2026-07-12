'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { saveVendorPrices } from '@/actions/vendor-prices'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2 } from 'lucide-react'
import type { VendorItemPrice, ItemType } from '@/types'

const STANDARD_TYPES: Array<{ value: ItemType; label: string }> = [
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
  customTypes: string[]
}

function stateKey(itemType: ItemType, customType?: string | null): string {
  return customType ? `custom:${customType}` : itemType
}

export function VendorPriceForm({ vendorId, initialPrices, customTypes }: Props) {
  const [isPending, startTransition] = useTransition()

  const [prices, setPrices] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    for (const p of initialPrices) {
      map[stateKey(p.item_type, p.custom_type)] = String(p.unit_price)
    }
    return map
  })

  function handleChange(key: string, value: string) {
    setPrices(prev => ({ ...prev, [key]: value }))
  }

  function handleSave() {
    const entries: Array<{ item_type: ItemType; custom_type?: string | null; unit_price: number }> = []

    for (const { value } of STANDARD_TYPES) {
      const key = stateKey(value)
      const raw = prices[key]
      if (!raw && raw !== '0') continue
      const parsed = parseFloat(raw)
      if (!isNaN(parsed) && parsed >= 0) {
        entries.push({ item_type: value, custom_type: null, unit_price: parsed })
      }
    }

    for (const ct of customTypes) {
      const key = stateKey('other', ct)
      const raw = prices[key]
      if (!raw && raw !== '0') continue
      const parsed = parseFloat(raw)
      if (!isNaN(parsed) && parsed >= 0) {
        entries.push({ item_type: 'other', custom_type: ct, unit_price: parsed })
      }
    }

    startTransition(async () => {
      const result = await saveVendorPrices(vendorId, entries)
      if (result.success) {
        toast.success('Price list saved')
      } else {
        toast.error(result.error)
      }
    })
  }

  const allRows = [
    ...STANDARD_TYPES.map(t => ({ key: stateKey(t.value), label: t.label })),
    ...customTypes.map(ct => ({ key: stateKey('other', ct), label: ct })),
  ]

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5">
        {allRows.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground w-24 shrink-0 capitalize">{label}</span>
            <div className="relative flex-1">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="—"
                value={prices[key] ?? ''}
                onChange={e => handleChange(key, e.target.value)}
                className="pl-6 h-8 text-sm"
              />
            </div>
          </div>
        ))}
      </div>

      {customTypes.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Add custom item types in your closet to set prices for them here.
        </p>
      )}

      <Button onClick={handleSave} disabled={isPending} size="sm" className="gap-2">
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        Save price list
      </Button>
    </div>
  )
}
