'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { DisputeMessage } from '@/types'

// First Realtime usage in the app. Subscriber authorization is enforced by
// dispute_messages' own RLS SELECT policies (migration 0041) — this can't
// be routed through a SECURITY DEFINER function the way every other
// vendor read in this codebase is, since Realtime's postgres_changes
// authorizes each subscriber against RLS on the table directly.
export function useDisputeMessages(disputeId: string, initialMessages: DisputeMessage[]): DisputeMessage[] {
  const [messages, setMessages] = useState<DisputeMessage[]>(initialMessages)

  useEffect(() => {
    setMessages(initialMessages)
  }, [disputeId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`dispute-messages-${disputeId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'dispute_messages', filter: `dispute_id=eq.${disputeId}` },
        payload => {
          const incoming = payload.new as DisputeMessage
          setMessages(prev => (prev.some(m => m.id === incoming.id) ? prev : [...prev, incoming]))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [disputeId])

  return messages
}
