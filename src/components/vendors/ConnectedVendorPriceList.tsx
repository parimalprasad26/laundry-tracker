import { Badge } from '@/components/ui/badge'
import { ITEM_TYPE_LABELS } from '@/lib/item-type'
import type { VendorAccountPrice, ItemType } from '@/types'

interface Props {
  prices: VendorAccountPrice[]
}

// Read-only — pricing for a connected platform vendor is managed by the
// vendor themselves (one shared rate card, applied to every connected
// customer). Nothing here is customer-editable; the old per-customer
// VendorPriceForm would silently save to a table addItemsToBatch never
// reads once a vendor is actively connected.
export function ConnectedVendorPriceList({ prices }: Props) {
  const standard = prices.filter(p => p.item_type !== 'other')
  const custom = prices.filter(p => p.item_type === 'other' && p.custom_type)

  if (prices.length === 0) {
    return <p className="text-sm text-muted-foreground">This vendor hasn&apos;t set any prices yet.</p>
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
        {standard.map(p => (
          <div key={p.item_type} className="flex items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">{ITEM_TYPE_LABELS[p.item_type as ItemType]}</span>
            <span className="font-medium tabular-nums">₹{p.unit_price}</span>
          </div>
        ))}
      </div>
      {custom.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 pt-1 border-t">
          {custom.map(p => (
            <div key={p.custom_type} className="flex items-center justify-between gap-2 text-sm">
              <span className="text-muted-foreground">{p.custom_type}</span>
              <span className="font-medium tabular-nums">₹{p.unit_price}</span>
            </div>
          ))}
        </div>
      )}
      <Badge variant="outline" className="text-[10px] mt-1">Managed by this vendor</Badge>
    </div>
  )
}
