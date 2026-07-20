import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { createClient } from '@/lib/supabase/server'
import { DisputeService } from '@/services/DisputeService'
import { DisputeChatService } from '@/services/DisputeChatService'
import { BatchItemRepository } from '@/repositories/BatchItemRepository'
import { ResolveDisputeButton } from '@/components/batch/ResolveDisputeButton'
import { publicImageUrl, cn } from '@/lib/utils'
import { formatItemType } from '@/lib/item-type'
import { AlertTriangle, PackageX, MessageSquare, CheckCircle2, ArrowLeftRight, Store } from 'lucide-react'

export const metadata = { title: 'Issues' }

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

export default async function IssuesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [disputes, flaggedItems] = await Promise.all([
    new DisputeService(supabase).findAllForUser(user.id),
    new BatchItemRepository(supabase).findIssuesForUser(user.id),
  ])

  const unreadByDispute = await new DisputeChatService(supabase)
    .countUnread(disputes.map(d => d.id), 'customer')

  const openDisputes = disputes.filter(d => d.status === 'open')
  const closedDisputes = disputes.filter(d => d.status !== 'open')
  const totalOpen = flaggedItems.length + openDisputes.length

  const hasAnything = flaggedItems.length > 0 || disputes.length > 0

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Issues</h1>
        {totalOpen > 0 && (
          <span className="inline-flex items-center rounded-full bg-red-100 dark:bg-red-500/15 px-2 py-0.5 text-[10px] font-medium text-red-700 dark:text-red-400">
            {totalOpen} open
          </span>
        )}
      </div>
      <p className="text-sm text-muted-foreground">Everything wrong across every batch, in one place.</p>

      {!hasAnything ? (
        <p className="text-sm text-muted-foreground text-center py-12">No issues reported. Nice.</p>
      ) : (
        <div className="rounded-xl border divide-y overflow-hidden">
          {/* ── Reported during inspection (raw flags, no dispute row) ── */}
          {flaggedItems.map(item => {
            const ci = item.closet_item
            const imageUrl = ci.primary_image_path ? publicImageUrl(SUPABASE_URL, ci.primary_image_path) : null
            return (
              <Link
                key={item.id}
                href={`/batches/${item.batch.id}`}
                className="flex items-start gap-3 px-3 py-3 bg-background hover:bg-muted/50 transition-colors"
              >
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
                  <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Store className="h-2.5 w-2.5" />{item.batch.name}
                  </p>
                </div>
              </Link>
            )
          })}

          {/* ── Open disputes ── */}
          {openDisputes.map(dispute => {
            const ci = dispute.batch_item?.closet_item
            const imageUrl = ci?.primary_image_path ? publicImageUrl(SUPABASE_URL, ci.primary_image_path) : null
            const isVendorRaised = dispute.raised_by_role === 'vendor'
            const isSwap = dispute.dispute_type === 'swap'
            return (
              <div
                key={dispute.id}
                className={cn(
                  'px-3 py-3 space-y-2.5',
                  isSwap ? 'bg-blue-50/50 dark:bg-blue-500/5' : 'bg-amber-50/50 dark:bg-amber-500/5'
                )}
              >
                <Link href={`/issues/${dispute.id}`} className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg overflow-hidden bg-muted shrink-0 mt-0.5">
                    {imageUrl
                      ? <img src={imageUrl} alt={ci?.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full bg-muted" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium truncate">
                        {ci ? formatItemType(ci.type, ci.custom_type) : 'Unknown item'}
                      </p>
                      <span className={cn(
                        'shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full',
                        isSwap
                          ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400'
                          : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
                      )}>
                        {isSwap ? 'Wrong item' : 'Dispute open'}
                      </span>
                      {isVendorRaised && (
                        <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                          Flagged by vendor
                        </span>
                      )}
                      {(unreadByDispute.get(dispute.id) ?? 0) > 0 && (
                        <span className="shrink-0 flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">
                          <MessageSquare className="h-2.5 w-2.5" />{unreadByDispute.get(dispute.id)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      {isSwap
                        ? <ArrowLeftRight className="h-3 w-3 text-blue-500 shrink-0" />
                        : dispute.damaged_qty > 0 && <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />}
                      {(dispute.description || dispute.wrong_item_description) && (
                        <span className="flex items-start gap-1 text-xs text-muted-foreground">
                          <MessageSquare className="h-3 w-3 shrink-0 mt-0.5" />
                          {dispute.description ?? dispute.wrong_item_description}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Store className="h-2.5 w-2.5" />{dispute.batch.name}
                      {' · '}Reported {formatDistanceToNow(new Date(dispute.reported_at), { addSuffix: true })}
                    </p>
                  </div>
                </Link>
                {/* Symmetric resolution — whoever raised it resolves it. A
                    vendor-raised issue has no resolve action here; it's
                    resolved from the vendor's own Issues tab. */}
                {!isVendorRaised && (
                  <ResolveDisputeButton disputeId={dispute.id} batchId={dispute.batch_id} />
                )}
              </div>
            )
          })}

          {/* ── Resolved / dismissed ── */}
          {closedDisputes.map(dispute => (
            <Link
              key={dispute.id}
              href={`/issues/${dispute.id}`}
              className="flex items-start gap-3 px-3 py-3 opacity-60 bg-background hover:opacity-100 transition-opacity"
            >
              <CheckCircle2 className={cn(
                'h-4 w-4 shrink-0 mt-0.5',
                dispute.status === 'resolved' ? 'text-emerald-500' : 'text-muted-foreground'
              )} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {dispute.batch_item?.closet_item
                    ? formatItemType(dispute.batch_item.closet_item.type, dispute.batch_item.closet_item.custom_type)
                    : 'Unknown item'}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {dispute.batch.name} · <span className="capitalize">{dispute.status}</span>
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
