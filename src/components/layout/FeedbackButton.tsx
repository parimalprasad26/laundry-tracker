'use client'

import { useState, useTransition } from 'react'
import { MessageSquarePlus, X, Send, CheckCircle2 } from 'lucide-react'
import { submitFeedback } from '@/actions/feedback'
import { cn } from '@/lib/utils'

export function FeedbackButton() {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleOpen() {
    setSent(false)
    setMessage('')
    setOpen(true)
  }

  function handleClose() {
    setOpen(false)
  }

  function handleSubmit() {
    if (!message.trim()) return
    startTransition(async () => {
      const result = await submitFeedback(message)
      if (result.success) {
        setSent(true)
        setMessage('')
        setTimeout(() => setOpen(false), 1800)
      }
    })
  }

  return (
    <>
      {/* Trigger — fixed bottom-right, above mobile nav */}
      <button
        onClick={handleOpen}
        aria-label="Send feedback"
        className="fixed bottom-20 right-4 z-[99999] md:bottom-6 md:right-6 h-11 w-11 rounded-full bg-foreground text-background shadow-lg flex items-center justify-center hover:opacity-90 active:scale-95 transition-all"
      >
        <MessageSquarePlus className="h-5 w-5" />
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          onClick={handleClose}
        />
      )}

      {/* Panel — slides up from bottom on mobile, appears as card on desktop */}
      <div
        className={cn(
          'fixed z-50 transition-all duration-300 ease-out',
          'bottom-0 left-0 right-0 md:bottom-6 md:right-6 md:left-auto md:w-80',
          open ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'
        )}
      >
        <div className="bg-card rounded-t-3xl md:rounded-3xl shadow-2xl ring-1 ring-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm">Share feedback</h3>
            <button
              onClick={handleClose}
              className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {sent ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              <p className="text-sm font-medium">Thanks for the feedback!</p>
              <p className="text-xs text-muted-foreground">It goes straight to the team.</p>
            </div>
          ) : (
            <>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="What's working? What's broken? What do you wish it did?"
                rows={4}
                maxLength={2000}
                className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
              />
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-muted-foreground">{message.length}/2000</span>
                <button
                  onClick={handleSubmit}
                  disabled={!message.trim() || isPending}
                  className="h-9 px-4 rounded-xl bg-foreground text-background text-sm font-medium flex items-center gap-1.5 hover:opacity-90 active:scale-95 transition-all disabled:opacity-40"
                >
                  <Send className="h-3.5 w-3.5" />
                  {isPending ? 'Sending…' : 'Send'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
