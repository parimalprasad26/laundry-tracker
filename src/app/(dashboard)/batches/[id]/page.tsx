import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { BatchService } from '@/services/BatchService'
import { BatchItemService } from '@/services/BatchItemService'
import { InspectionPolicyService } from '@/services/InspectionPolicyService'
import { DisputeService } from '@/services/DisputeService'
import { VendorPriceRepository } from '@/repositories/VendorPriceRepository'
import { BatchStatusBadge } from '@/components/batches/BatchStatusBadge'
import { BatchItemCard } from '@/components/batch-items/BatchItemCard'
import { AddFromClosetButton } from '@/components/batch-items/AddFromClosetButton'
import { ApplyVendorPricesBanner } from '@/components/batch-items/ApplyVendorPricesBanner'
import { InspectionWindowBanner } from '@/components/batch/InspectionWindowBanner'
import { BatchIssuesPanel } from '@/components/batch/BatchIssuesPanel'
import { Separator } from '@/components/ui/separator'
import { BatchActions } from '@/components/batches/BatchActions'
import { ChevronLeft, Store, Calendar, CalendarCheck, Info, MessageSquare, Lock, Truck } from 'lucide-react'
import { formatDate, formatPrice, cn } from '@/lib/utils'
import type { BatchStatus, InspectionPolicy } from '@/types'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const batch = await new BatchService(supabase).getById(id)
  return { title: batch?.name ?? 'Batch' }
}

export default async function BatchDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const batchService = new BatchService(supabase)
  const batchItemService = new BatchItemService(supabase)

  const [batch, batchItems, existingClosetItemIds] = await Promise.all([
    batchService.getById(id),
    batchItemService.getByBatch(id),
    batchItemService.getExistingClosetItemIds(id),
  ])

  if (!batch || batch.user_id !== user.id) notFound()

  const isPostCollection = batch.status === 'returned' || batch.status === 'closed'

  const [disputes, rawPolicy] = await Promise.all([
    isPostCollection ? new DisputeService(supabase).getByBatch(id, user.id) : Promise.resolve([]),
    isPostCollection ? new InspectionPolicyService(supabase).getPolicy(user.id) : Promise.resolve(null),
  ])

  const policy: Pick<InspectionPolicy, 'inspection_window_days' | 'dispute_window_days'> = rawPolicy
    ? { inspection_window_days: rawPolicy.inspection_window_days, dispute_window_days: rawPolicy.dispute_window_days }
    : { inspection_window_days: 7, dispute_window_days: 30 }

  const swapDisputeItemIds = new Set(
    disputes.filter(d => d.dispute_type === 'swap' && d.status === 'open').map(d => d.batch_item_id)
  )

  const pricedItems = batchItems.filter(i => i.unit_price != null).length
  const hasUnpricedItems = pricedItems < batchItems.length

  let showApplyPricesBanner = false
  if (batch.vendor_id && hasUnpricedItems && batchItems.length > 0 && batch.status === 'in_laundry') {
    const priceMap = await new VendorPriceRepository(supabase).getPriceMap(batch.vendor_id, user.id)
    showApplyPricesBanner = priceMap.size > 0
  }

  const isFinalized = batch.status === 'returned' || batch.status === 'closed'

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Header */}
      <div className="flex items-start gap-2">
        <Link href="/batches" className="text-muted-foreground hover:text-foreground mt-0.5">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-semibold truncate">{batch.name}</h1>
            <BatchStatusBadge status={batch.status} />
          </div>
          <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-muted-foreground">
            {batch.vendor_name && (
              <span className="flex items-center gap-1">
                <Store className="h-3.5 w-3.5" />{batch.vendor_name}
              </span>
            )}
            {batch.sent_at ? (
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />Sent {formatDate(batch.sent_at)}
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />{formatDate(batch.created_at)}
              </span>
            )}
            {batch.returned_at && (
              <span className="flex items-center gap-1">
                <CalendarCheck className="h-3.5 w-3.5" />Back {formatDate(batch.returned_at)}
              </span>
            )}
            {batch.closed_at && (
              <span className="flex items-center gap-1">
                <Lock className="h-3.5 w-3.5" />Closed {formatDate(batch.closed_at)}
              </span>
            )}
          </div>
        </div>
        <BatchActions batch={batch} batchItems={batchItems} />
      </div>

      {/* In transit indicator */}
      {batch.status === 'in_laundry' && batch.sent_at && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-xl px-3 py-2.5">
          <Truck className="h-3.5 w-3.5 shrink-0" />
          <span>
            {batch.total_items} item{batch.total_items !== 1 ? 's' : ''} at the laundry
            {' · '}sent {formatDate(batch.sent_at)}
          </span>
        </div>
      )}

      {batch.notes && (
        <p className="text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2">{batch.notes}</p>
      )}

      {/* Inspection window banner — shown when items are back but not yet closed */}
      {batch.status === 'returned' && batch.returned_at && (
        <InspectionWindowBanner
          returnedAt={batch.returned_at}
          inspectionWindowDays={policy.inspection_window_days}
        />
      )}

      <Separator />

      {/* Return hint */}
      {batch.status === 'in_laundry' && batchItems.length > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded-xl px-3 py-2.5">
          <Info className="h-3.5 w-3.5 shrink-0" />
          Tap &ldquo;Collected&rdquo; above when you pick up from the laundry. You&apos;ll inspect items afterwards.
        </div>
      )}

      {/* Items header */}
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Items ({batchItems.length})</h2>
        <AddFromClosetButton batchId={id} existingClosetItemIds={existingClosetItemIds} batchStatus={batch.status} />
      </div>

      {batchItems.length === 0 ? (
        <div className="text-center py-12 space-y-2">
          <p className="text-sm text-muted-foreground">No items yet.</p>
          <p className="text-xs text-muted-foreground">Add items from your closet to track them in this batch.</p>
        </div>
      ) : (
        <>
          {showApplyPricesBanner && <ApplyVendorPricesBanner batchId={id} />}

          <div className="space-y-3">
            {batchItems.map(item => (
              <BatchItemCard
                key={item.id}
                item={item}
                batchStatus={batch.status}
                batch={batch}
                policy={policy}
                swapReported={swapDisputeItemIds.has(item.id)}
              />
            ))}
          </div>

          <BatchIssuesPanel
            batchId={id}
            batchItems={batchItems}
            disputes={disputes}
          />

          <CostSummary
            calculatedCost={batch.calculated_cost}
            actualCost={batch.actual_cost}
            priceDeltaNote={batch.price_delta_note}
            totalItems={batchItems.length}
            pricedItems={pricedItems}
            status={batch.status}
          />
        </>
      )}
    </div>
  )
}

function CostSummary({
  calculatedCost, actualCost, priceDeltaNote, totalItems, pricedItems, status,
}: {
  calculatedCost: number | null
  actualCost: number | null
  priceDeltaNote: string | null
  totalItems: number
  pricedItems: number
  status: BatchStatus
}) {
  const unpricedCount = totalItems - pricedItems
  const isFinalized = status === 'returned' || status === 'closed'

  const deltaVsRateCard = calculatedCost != null && actualCost != null
    ? actualCost - calculatedCost : null

  const hasAnything = calculatedCost != null || actualCost != null
  if (!hasAnything) return null

  return (
    <div className="space-y-2">
      <div className={cn(
        'rounded-xl border divide-y text-sm',
        isFinalized
          ? 'bg-emerald-50 border-emerald-200 divide-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-900/60 dark:divide-emerald-900/60'
          : 'bg-muted/50 border-border divide-border'
      )}>
        {calculatedCost != null && (
          <Row label="Rate card estimate" value={formatPrice(calculatedCost)} />
        )}

        {unpricedCount > 0 && calculatedCost != null && !isFinalized && (
          <div className="px-4 py-2 text-xs text-muted-foreground">
            {unpricedCount} item{unpricedCount > 1 ? 's' : ''} unpriced — tap &ldquo;—&rdquo; on a card to set manually
          </div>
        )}

        {actualCost != null && (
          <Row label="Amount paid" value={formatPrice(actualCost)} bold />
        )}

        {actualCost == null && status !== 'draft' && (
          <div className="px-4 py-2 text-xs text-muted-foreground">
            Payment not recorded — use the ⋮ menu to add it.
          </div>
        )}

        {deltaVsRateCard != null && (
          <DeltaRow
            label="vs rate card"
            delta={deltaVsRateCard}
            positiveLabel="overpaid"
            negativeLabel="saved"
          />
        )}
      </div>

      {priceDeltaNote && (
        <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
          <MessageSquare className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          {priceDeltaNote}
        </div>
      )}
    </div>
  )
}

function Row({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('tabular-nums', bold ? 'font-bold' : 'font-semibold')}>{value}</span>
    </div>
  )
}

function DeltaRow({ label, delta, positiveLabel, negativeLabel }: {
  label: string; delta: number; positiveLabel: string; negativeLabel: string
}) {
  const isOver = delta > 0
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn(
        'font-semibold tabular-nums flex items-center gap-1.5',
        isOver ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'
      )}>
        {isOver ? '+' : ''}{formatPrice(delta)}
        <span className="font-normal text-xs text-muted-foreground">
          {isOver ? positiveLabel : negativeLabel}
        </span>
      </span>
    </div>
  )
}
