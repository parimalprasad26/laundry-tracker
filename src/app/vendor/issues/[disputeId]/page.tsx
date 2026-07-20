import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { DisputeService } from '@/services/DisputeService'
import { DisputeChatService } from '@/services/DisputeChatService'
import { DisputeChatThread } from '@/components/dispute-chat/DisputeChatThread'
import { ChevronLeft } from 'lucide-react'
import { formatItemType } from '@/lib/item-type'

export const metadata = { title: 'Dispute' }

export default async function VendorDisputeChatPage({ params }: { params: Promise<{ disputeId: string }> }) {
  const { disputeId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const disputes = await new DisputeService(supabase).listForVendor()
  const dispute = disputes.find(d => d.dispute_id === disputeId)
  if (!dispute) notFound()

  const messages = await new DisputeChatService(supabase).getMessages(disputeId)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Link href="/vendor/issues" className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-lg font-semibold truncate">
            {formatItemType(dispute.item_type, dispute.custom_type)}
          </h1>
          <p className="text-xs text-muted-foreground truncate">
            {dispute.customer_name ?? 'A customer'} · {dispute.batch_name}
          </p>
        </div>
      </div>

      <DisputeChatThread
        disputeId={disputeId}
        viewerRole="vendor"
        initialMessages={messages}
        isOpen={dispute.status === 'open'}
      />
    </div>
  )
}
