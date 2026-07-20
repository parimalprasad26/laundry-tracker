import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { DisputeService } from '@/services/DisputeService'
import { DisputeChatService } from '@/services/DisputeChatService'
import { DisputeChatThread } from '@/components/dispute-chat/DisputeChatThread'
import { ChevronLeft } from 'lucide-react'
import { formatItemType } from '@/lib/item-type'

export const metadata = { title: 'Dispute' }

export default async function DisputeChatPage({ params }: { params: Promise<{ disputeId: string }> }) {
  const { disputeId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const dispute = await new DisputeService(supabase).findByIdForUser(disputeId, user.id)
  if (!dispute) notFound()

  const messages = await new DisputeChatService(supabase).getMessages(disputeId)

  return (
    <div className="max-w-2xl space-y-3">
      <div className="flex items-center gap-2">
        <Link href="/issues" className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-lg font-semibold truncate">
            {formatItemType(dispute.batch_item.closet_item.type, dispute.batch_item.closet_item.custom_type)}
          </h1>
          <p className="text-xs text-muted-foreground truncate">{dispute.batch.name}</p>
        </div>
      </div>

      <DisputeChatThread
        disputeId={disputeId}
        viewerRole="customer"
        initialMessages={messages}
        isOpen={dispute.status === 'open'}
      />
    </div>
  )
}
