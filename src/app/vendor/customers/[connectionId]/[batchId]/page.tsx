import Link from 'next/link'
import { getCustomerBatchItems } from '@/actions/vendor-portal'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, AlertTriangle } from 'lucide-react'
import { formatItemType } from '@/lib/item-type'

export const metadata = { title: 'Batch Items' }

export default async function VendorCustomerBatchItemsPage({ params }: { params: Promise<{ connectionId: string; batchId: string }> }) {
  const { connectionId, batchId } = await params
  const result = await getCustomerBatchItems(batchId)
  const items = result.success ? result.data : []

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Link href={`/vendor/customers/${connectionId}`} className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-semibold">Items</h1>
      </div>

      {!result.success && <p className="text-sm text-destructive">{result.error}</p>}

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">No items on this batch.</p>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <Card key={item.batch_item_id}>
              <CardContent className="flex items-center justify-between gap-3 py-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium">{formatItemType(item.item_type, item.custom_type)}</p>
                    {item.damaged_qty > 0 && (
                      <Badge variant="destructive" className="text-[10px] gap-1">
                        <AlertTriangle className="h-2.5 w-2.5" />{item.damaged_qty} damaged
                      </Badge>
                    )}
                    {item.missing_qty > 0 && (
                      <Badge variant="destructive" className="text-[10px] gap-1">
                        <AlertTriangle className="h-2.5 w-2.5" />{item.missing_qty} missing
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {item.quantity_returned}/{item.quantity_sent} returned
                  </p>
                </div>
                {item.pending_price_request_id ? (
                  <Badge variant="secondary" className="text-[10px]">Awaiting your price</Badge>
                ) : item.unit_price != null ? (
                  <span className="text-sm font-medium tabular-nums">₹{item.unit_price}</span>
                ) : (
                  <Badge variant="outline" className="text-[10px]">No price</Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
