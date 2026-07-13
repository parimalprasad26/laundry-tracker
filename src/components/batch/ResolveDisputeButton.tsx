'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { resolveDispute } from '@/actions/disputes'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

interface Props {
  disputeId: string
  batchId: string
}

export function ResolveDisputeButton({ disputeId, batchId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handle(status: 'resolved' | 'dismissed') {
    startTransition(async () => {
      const result = await resolveDispute(
        disputeId,
        batchId,
        status === 'resolved' ? 'Resolved by user' : 'Dismissed'
      )
      if (result.success) {
        toast.success(status === 'resolved' ? 'Dispute resolved' : 'Dispute dismissed')
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <div className="flex items-center gap-3">
      <Button
        size="sm"
        variant="outline"
        onClick={() => handle('resolved')}
        disabled={isPending}
        className="h-7 text-xs gap-1.5"
      >
        {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
        Mark resolved
      </Button>
      <button
        onClick={() => handle('dismissed')}
        disabled={isPending}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        Dismiss
      </button>
    </div>
  )
}
