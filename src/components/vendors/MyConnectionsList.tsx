'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { cancelVendorConnectionRequest, disconnectFromVendor, type MyVendorConnection } from '@/actions/vendor-directory'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

const STATUS_LABEL: Record<MyVendorConnection['status'], { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  pending: { label: "Hasn't accepted yet", variant: 'secondary' },
  active: { label: 'Connected', variant: 'default' },
  rejected: { label: 'Declined your request', variant: 'destructive' },
  cancelled: { label: 'Cancelled', variant: 'outline' },
  disconnected: { label: 'Disconnected', variant: 'outline' },
}

export function MyConnectionsList({ connections }: { connections: MyVendorConnection[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleCancel(id: string) {
    startTransition(async () => {
      const result = await cancelVendorConnectionRequest(id)
      if (!result.success) { toast.error(result.error); return }
      toast.success('Request cancelled')
      router.refresh()
    })
  }

  function handleDisconnect(id: string) {
    startTransition(async () => {
      const result = await disconnectFromVendor(id)
      if (!result.success) { toast.error(result.error); return }
      toast.success('Disconnected')
      router.refresh()
    })
  }

  if (connections.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-10">No connection requests yet.</p>
  }

  return (
    <div className="space-y-2.5">
      {connections.map(c => {
        const status = STATUS_LABEL[c.status]
        return (
          <Card key={c.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">{c.vendor_business_name}</CardTitle>
                <Badge variant={status.variant} className="text-[10px]">{status.label}</Badge>
              </div>
            </CardHeader>
            {(c.status === 'pending' || c.status === 'active') && (
              <CardContent>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => c.status === 'pending' ? handleCancel(c.id) : handleDisconnect(c.id)}
                >
                  {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  {c.status === 'pending' ? 'Cancel request' : 'Disconnect'}
                </Button>
              </CardContent>
            )}
          </Card>
        )
      })}
    </div>
  )
}
