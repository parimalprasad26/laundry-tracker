import type { SupabaseClient } from '@supabase/supabase-js'
import type { DisputeMessage, DisputeRaisedByRole } from '@/types'

// Unlike every other vendor-write repository in this codebase, this one
// needs no admin-client variant — both customer and vendor sessions have
// genuine RLS SELECT/INSERT policies on dispute_messages (migration 0041).
// The service layer still re-verifies ownership before calling in here, to
// return a clean error instead of a raw Postgres RLS rejection, and because
// Realtime authorization depends on these policies being real regardless.
export class DisputeMessageRepository {
  constructor(private supabase: SupabaseClient) {}

  async create(message: {
    dispute_id: string
    sender_role: DisputeRaisedByRole
    sender_user_id?: string | null
    sender_vendor_account_id?: string | null
    body: string
  }): Promise<DisputeMessage> {
    const { data, error } = await this.supabase
      .from('dispute_messages')
      .insert(message)
      .select()
      .single()
    if (error) throw error
    return data as DisputeMessage
  }

  async findByDispute(disputeId: string): Promise<DisputeMessage[]> {
    const { data, error } = await this.supabase
      .from('dispute_messages')
      .select('*')
      .eq('dispute_id', disputeId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return (data ?? []) as DisputeMessage[]
  }

  // RLS's UPDATE policy already scopes this to only the other party's
  // messages (see 0041) — this simply marks everything on the dispute as
  // read; rows the caller isn't allowed to touch are silently left alone,
  // not errored.
  async markRead(disputeId: string): Promise<void> {
    const { error } = await this.supabase
      .from('dispute_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('dispute_id', disputeId)
      .is('read_at', null)
    if (error) throw error
  }

  // Badge counts for the Issues list pages — "messages from the other
  // party I haven't read yet", per dispute. Aggregated in JS rather than
  // SQL (mirrors BatchRepository.getMonthlySummary) since the row count per
  // user is small at this app's scale.
  async countUnreadFromOtherParty(disputeIds: string[], myRole: DisputeRaisedByRole): Promise<Map<string, number>> {
    if (!disputeIds.length) return new Map()
    const otherRole: DisputeRaisedByRole = myRole === 'customer' ? 'vendor' : 'customer'
    const { data, error } = await this.supabase
      .from('dispute_messages')
      .select('dispute_id')
      .in('dispute_id', disputeIds)
      .eq('sender_role', otherRole)
      .is('read_at', null)
    if (error) throw error
    const counts = new Map<string, number>()
    for (const row of data ?? []) {
      counts.set(row.dispute_id, (counts.get(row.dispute_id) ?? 0) + 1)
    }
    return counts
  }
}
