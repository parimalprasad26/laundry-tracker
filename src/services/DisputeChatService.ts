import type { SupabaseClient } from '@supabase/supabase-js'
import { DisputeMessageRepository } from '@/repositories/DisputeMessageRepository'
import { BatchDisputeRepository } from '@/repositories/BatchDisputeRepository'
import { disputeMessageSchema } from '@/schemas/dispute.schema'
import type { DisputeMessage, DisputeRaisedByRole } from '@/types'

// Unlike VendorConnectionService/VendorPriceRequestService/DisputeService's
// vendor-facing methods, this needs no internally-held admin client —
// dispute_messages has genuine RLS policies for both customer and vendor
// sessions (migration 0041), which both the app's writes AND Realtime's
// subscriber authorization depend on being real. Always constructed with
// the caller's own session.
export class DisputeChatService {
  private messageRepo: DisputeMessageRepository
  private disputeRepo: BatchDisputeRepository

  constructor(supabase: SupabaseClient) {
    this.messageRepo = new DisputeMessageRepository(supabase)
    this.disputeRepo = new BatchDisputeRepository(supabase)
  }

  async send(disputeId: string, userId: string, body: string): Promise<DisputeMessage> {
    const validated = disputeMessageSchema.parse({ body })
    return this.messageRepo.create({
      dispute_id: disputeId,
      sender_role: 'customer',
      sender_user_id: userId,
      body: validated.body,
    })
  }

  async sendAsVendor(disputeId: string, vendorAuthUserId: string, body: string): Promise<DisputeMessage> {
    const validated = disputeMessageSchema.parse({ body })

    // RLS is the real enforcement (INSERT policy re-checks all of this at
    // the database level) — this pre-check only exists to fail with a
    // clean message instead of a raw Postgres RLS rejection, same shape as
    // DisputeService.raiseAsVendor's pre-checks.
    const context = await this.disputeRepo.getVendorContext(disputeId)
    if (!context) throw new Error('Dispute not found')
    if (context.disputeStatus !== 'open') throw new Error('This dispute is no longer open')
    if (!context.connectionActive) throw new Error('You are no longer connected to this customer')

    return this.messageRepo.create({
      dispute_id: disputeId,
      sender_role: 'vendor',
      sender_vendor_account_id: context.vendorAccountId,
      body: validated.body,
    })
  }

  async getMessages(disputeId: string): Promise<DisputeMessage[]> {
    return this.messageRepo.findByDispute(disputeId)
  }

  async markRead(disputeId: string): Promise<void> {
    return this.messageRepo.markRead(disputeId)
  }

  async countUnread(disputeIds: string[], myRole: DisputeRaisedByRole): Promise<Map<string, number>> {
    return this.messageRepo.countUnreadFromOtherParty(disputeIds, myRole)
  }
}
