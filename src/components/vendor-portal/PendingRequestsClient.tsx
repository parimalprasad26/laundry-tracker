'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { acceptConnectionRequest, rejectConnectionRequest } from '@/actions/vendor-portal'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Check, X, Loader2 } from 'lucide-react'
import type { PendingConnectionRequest } from '@/actions/vendor-portal'

export function PendingRequestsClient({ requests }: { requests: PendingConnectionRequest[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleAccept(id: string) {
    startTransition(async () => {
      const result = await acceptConnectionRequest(id)
      if (!result.success) { toast.error(result.error); return }
      toast.success('Connected')
      router.refresh()
    })
  }

  function handleReject(id: string) {
    startTransition(async () => {
      const result = await rejectConnectionRequest(id)
      if (!result.success) { toast.error(result.error); return }
      toast.success('Request declined')
      router.refresh()
    })
  }

  if (requests.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">No pending requests.</p>
  }

  return (
    <div className="space-y-2.5">
      {requests.map(r => (
        <Card key={r.connection_id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{r.customer_name ?? 'A customer'}</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button size="sm" disabled={isPending} onClick={() => handleAccept(r.connection_id)}>
              {isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1.5 h-3.5 w-3.5" />}
              Accept
            </Button>
            <Button size="sm" variant="outline" disabled={isPending} onClick={() => handleReject(r.connection_id)}>
              <X className="mr-1.5 h-3.5 w-3.5" />Decline
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
