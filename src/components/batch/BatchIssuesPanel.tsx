import { formatDistanceToNow } from 'date-fns'
import { AlertTriangle, PackageX, MessageSquare, CheckCircle2 } from 'lucide-react'
import { ResolveDisputeButton } from './ResolveDisputeButton'
import { publicImageUrl } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { BatchItemWithClosetItem, BatchDispute } from '@/types'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

interface Props {
  batchId: string
  batchItems: BatchItemWithClosetItem[]
  disputes: BatchDispute[]
}

export function BatchIssuesPanel({ batchId, batchItems, disputes }: Props) {
  const damagedItems = batchItems.filter(i => i.damaged_qty > 0 || i.missing_qty > 0)
  const itemById = new Map(batchItems.map(i => [i.id, i]))

  const openDisputes = disputes.filter(d => d.status === 'open')
  const closedDisputes = disputes.filter(d => d.status !== 'open')

  if (damagedItems.length === 0 && disputes.length === 0) return null

  const totalOpenIssues = damagedItems.length + openDisputes.length

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="font-medium text-sm">Issues</h2>
        {totalOpenIssues > 0 && (
          <span className="inline-flex items-center rounded-full bg-red-100 dark:bg-red-500/15 px-2 py-0.5 text-[10px] font-medium text-red-700 dark:text-red-400">
            {totalOpenIssues} open
          </span>
        )}
      </div>

      <div className="rounded-xl border divide-y overflow-hidden">

        {/* ── Inspection damage ──────────────────────────────── */}
        {damagedItems.map(item => {
          const ci = item.closet_item
          const imageUrl = ci.primary_image_path
            ? publicImageUrl(SUPABASE_URL, ci.primary_image_path)
            : null
          return (
            <div key={item.id} className="flex items-start gap-3 px-3 py-3 bg-background">
              <div className="h-9 w-9 rounded-lg overflow-hidden bg-muted shrink-0 mt-0.5">
                {imageUrl
                  ? <img src={imageUrl} alt={ci.name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-muted" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{ci.name}</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {item.damaged_qty > 0 && (
                    <span className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400 font-medium">
                      <AlertTriangle className="h-3 w-3" />{item.damaged_qty} damaged
                    </span>
                  )}
                  {item.missing_qty > 0 && (
                    <span className="flex items-center gap-1 text-xs text-red-700 dark:text-red-400 font-medium">
                      <PackageX className="h-3 w-3" />{item.missing_qty} missing
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">Reported during inspection</p>
              </div>
            </div>
          )
        })}

        {/* ── Open disputes ─────────────────────────────────── */}
        {openDisputes.map(dispute => {
          const item = itemById.get(dispute.batch_item_id)
          const ci = item?.closet_item
          const imageUrl = ci?.primary_image_path
            ? publicImageUrl(SUPABASE_URL, ci.primary_image_path)
            : null
          return (
            <div key={dispute.id} className="px-3 py-3 bg-amber-50/50 dark:bg-amber-500/5 space-y-2.5">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg overflow-hidden bg-muted shrink-0 mt-0.5">
                  {imageUrl
                    ? <img src={imageUrl} alt={ci?.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full bg-muted" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{ci?.name ?? 'Unknown item'}</p>
                    <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400">
                      Dispute open
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {dispute.damaged_qty > 0 && (
                      <span className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400 font-medium">
                        <AlertTriangle className="h-3 w-3" />{dispute.damaged_qty} damaged
                      </span>
                    )}
                    {dispute.missing_qty > 0 && (
                      <span className="flex items-center gap-1 text-xs text-red-700 dark:text-red-400 font-medium">
                        <PackageX className="h-3 w-3" />{dispute.missing_qty} missing
                      </span>
                    )}
                  </div>
                  {dispute.description && (
                    <div className="flex items-start gap-1 mt-1">
                      <MessageSquare className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground">{dispute.description}</p>
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Opened {formatDistanceToNow(new Date(dispute.reported_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
              <ResolveDisputeButton disputeId={dispute.id} batchId={batchId} />
            </div>
          )
        })}

        {/* ── Resolved / dismissed disputes ─────────────────── */}
        {closedDisputes.map(dispute => {
          const item = itemById.get(dispute.batch_item_id)
          const ci = item?.closet_item
          return (
            <div key={dispute.id} className="flex items-start gap-3 px-3 py-3 opacity-60 bg-background">
              <CheckCircle2 className={cn(
                'h-4 w-4 shrink-0 mt-0.5',
                dispute.status === 'resolved' ? 'text-emerald-500' : 'text-muted-foreground'
              )} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{ci?.name ?? 'Unknown item'}</p>
                <p className="text-xs text-muted-foreground capitalize mt-0.5">{dispute.status}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
