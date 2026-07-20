'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Flag, MessageCircle } from 'lucide-react'
import { formatItemType } from '@/lib/item-type'
import { VendorFlagIssueForm } from './VendorFlagIssueForm'
import type { VendorCustomerBatchItem } from '@/types'

interface Props {
  connectionId: string
  item: VendorCustomerBatchItem
}

export function VendorBatchItemCard({ connectionId, item }: Props) {
  const [flagOpen, setFlagOpen] = useState(false)
  // open_dispute_id also covers a dispute the vendor already raised on this
  // item (which never touches damaged_qty/missing_qty — only a
  // customer-reported flag does), so it's a separate check from those
  // columns, not redundant with them.
  const hasIssue = item.damaged_qty > 0 || item.missing_qty > 0 || item.open_dispute_id != null
  const itemName = formatItemType(item.item_type, item.custom_type)

  return (
    <>
      <Card>
        <CardContent className="flex items-center justify-between gap-3 py-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-medium">{itemName}</p>
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
              {item.open_dispute_id != null && item.damaged_qty === 0 && item.missing_qty === 0 && (
                <Badge variant="outline" className="text-[10px] gap-1">
                  <AlertTriangle className="h-2.5 w-2.5" />Dispute open
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {item.quantity_returned}/{item.quantity_sent} returned
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {item.pending_price_request_id ? (
              <Badge variant="secondary" className="text-[10px]">Awaiting your price</Badge>
            ) : item.unit_price != null ? (
              <span className="text-sm font-medium tabular-nums">₹{item.unit_price}</span>
            ) : (
              <Badge variant="outline" className="text-[10px]">No price</Badge>
            )}
            {item.open_dispute_id != null && (
              <Link
                href={`/vendor/issues/${item.open_dispute_id}`}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 rounded-lg px-2 py-1 hover:bg-muted transition-colors"
              >
                <MessageCircle className="h-3 w-3" />Chat
              </Link>
            )}
            {!hasIssue && (
              <button
                onClick={() => setFlagOpen(true)}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 rounded-lg px-2 py-1 hover:bg-muted transition-colors"
              >
                <Flag className="h-3 w-3" />Flag
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      <VendorFlagIssueForm
        connectionId={connectionId}
        batchItemId={item.batch_item_id}
        itemName={itemName}
        maxQty={item.quantity_returned > 0 ? item.quantity_returned : item.quantity_sent}
        open={flagOpen}
        onClose={() => setFlagOpen(false)}
        onSaved={() => {}}
      />
    </>
  )
}
