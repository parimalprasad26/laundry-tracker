'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { useDisputeMessages } from '@/hooks/useDisputeMessages'
import { sendDisputeMessage, sendVendorDisputeMessage, markDisputeMessagesRead, markVendorDisputeMessagesRead } from '@/actions/dispute-chat'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Loader2, Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DisputeMessage, DisputeRaisedByRole } from '@/types'

interface Props {
  disputeId: string
  viewerRole: DisputeRaisedByRole
  initialMessages: DisputeMessage[]
  isOpen: boolean
}

export function DisputeChatThread({ disputeId, viewerRole, initialMessages, isOpen }: Props) {
  const messages = useDisputeMessages(disputeId, initialMessages)
  const [draft, setDraft] = useState('')
  const [isPending, startTransition] = useTransition()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  useEffect(() => {
    const markRead = viewerRole === 'customer' ? markDisputeMessagesRead : markVendorDisputeMessagesRead
    markRead(disputeId).catch(() => {}) // best-effort, not surfaced to the user
  }, [disputeId, viewerRole, messages.length])

  function handleSend() {
    const body = draft.trim()
    if (!body) return
    setDraft('')
    startTransition(async () => {
      const send = viewerRole === 'customer' ? sendDisputeMessage : sendVendorDisputeMessage
      const result = await send(disputeId, body)
      if (!result.success) {
        toast.error(result.error)
        setDraft(body)
      }
    })
  }

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)]">
      <div className="flex-1 overflow-y-auto space-y-2 py-2">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">
            No messages yet — say hello.
          </p>
        ) : (
          messages.map(message => {
            const isOwn = message.sender_role === viewerRole
            return (
              <div key={message.id} className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}>
                <div className={cn(
                  'max-w-[75%] rounded-2xl px-3.5 py-2 text-sm',
                  isOwn
                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                    : 'bg-muted text-foreground rounded-bl-sm'
                )}>
                  <p className="whitespace-pre-wrap break-words">{message.body}</p>
                  <p className={cn(
                    'text-[10px] mt-1',
                    isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                  )}>
                    {format(new Date(message.created_at), 'MMM d, h:mm a')}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {isOpen ? (
        <div className="flex items-end gap-2 pt-2 border-t border-border">
          <Textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="Type a message…"
            className="resize-none text-sm min-h-[2.5rem]"
            rows={1}
          />
          <Button size="icon" onClick={handleSend} disabled={isPending || !draft.trim()} className="shrink-0">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-3 border-t border-border">
          This dispute is closed — the conversation is read-only.
        </p>
      )}
    </div>
  )
}
