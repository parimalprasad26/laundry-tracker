import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { listVendorIssues, listVendorDisputeUnreadCounts } from '@/actions/vendor-portal'
import { ResolveVendorIssueButton } from '@/components/vendor-portal/ResolveVendorIssueButton'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, ArrowLeftRight, MessageSquare, CheckCircle2 } from 'lucide-react'
import { formatItemType } from '@/lib/item-type'
import { cn } from '@/lib/utils'

export const metadata = { title: 'Issues' }

export default async function VendorIssuesPage() {
  const result = await listVendorIssues()
  const disputes = result.success ? result.data : []

  const unreadResult = disputes.length
    ? await listVendorDisputeUnreadCounts(disputes.map(d => d.dispute_id))
    : null
  const unreadByDispute = unreadResult?.success ? unreadResult.data : {}

  const open = disputes.filter(d => d.status === 'open')
  const closed = disputes.filter(d => d.status !== 'open')

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Issues</h1>
        {open.length > 0 && (
          <span className="inline-flex items-center rounded-full bg-red-100 dark:bg-red-500/15 px-2 py-0.5 text-[10px] font-medium text-red-700 dark:text-red-400">
            {open.length} open
          </span>
        )}
      </div>

      {!result.success && <p className="text-sm text-destructive">{result.error}</p>}

      {disputes.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">No issues across your connected customers.</p>
      ) : (
        <div className="space-y-2">
          {[...open, ...closed].map(dispute => {
            const isSwap = dispute.dispute_type === 'swap'
            const isVendorRaised = dispute.raised_by_role === 'vendor'
            const isOpen = dispute.status === 'open'
            return (
              <Card key={dispute.dispute_id} className={cn(!isOpen && 'opacity-60')}>
                <CardContent className="py-3 space-y-2">
                  <Link
                    href={`/vendor/issues/${dispute.dispute_id}`}
                    className="flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-medium truncate">
                          {formatItemType(dispute.item_type, dispute.custom_type)}
                        </p>
                        <Badge variant={isSwap ? 'secondary' : 'outline'} className="text-[10px] gap-1">
                          {isSwap ? <ArrowLeftRight className="h-2.5 w-2.5" /> : <AlertTriangle className="h-2.5 w-2.5" />}
                          {isSwap ? 'Wrong item' : 'Damage'}
                        </Badge>
                        {!isVendorRaised && (
                          <Badge variant="outline" className="text-[10px]">Reported by customer</Badge>
                        )}
                        {!isOpen && (
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground capitalize">
                            <CheckCircle2 className="h-2.5 w-2.5" />{dispute.status}
                          </span>
                        )}
                        {(unreadByDispute[dispute.dispute_id] ?? 0) > 0 && (
                          <span className="shrink-0 flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">
                            <MessageSquare className="h-2.5 w-2.5" />{unreadByDispute[dispute.dispute_id]}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {dispute.customer_name ?? 'A customer'} · {dispute.batch_name}
                      </p>
                      {(dispute.description || dispute.wrong_item_description) && (
                        <p className="flex items-start gap-1 text-xs text-muted-foreground">
                          <MessageSquare className="h-3 w-3 shrink-0 mt-0.5" />
                          {dispute.description ?? dispute.wrong_item_description}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground">
                        Reported {formatDistanceToNow(new Date(dispute.reported_at), { addSuffix: true })}
                      </p>
                    </div>
                  </Link>
                  {/* Symmetric resolution — only issues the vendor raised
                      get a resolve action here; customer-raised issues are
                      resolved from the customer's own Issues tab. */}
                  {isOpen && isVendorRaised && (
                    <ResolveVendorIssueButton disputeId={dispute.dispute_id} />
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
