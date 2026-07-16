'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { resolvePriceRequest } from '@/actions/vendor-portal'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import type { VendorPriceRequest } from '@/types'

export function PriceRequestsClient({ requests }: { requests: VendorPriceRequest[] }) {
  const router = useRouter()
  const [values, setValues] = useState<Record<string, string>>({})
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleResolve(requestId: string) {
    const raw = values[requestId]
    const price = Number(raw)
    if (!raw || Number.isNaN(price) || price < 0) {
      toast.error('Enter a valid price')
      return
    }
    setResolvingId(requestId)
    startTransition(async () => {
      const result = await resolvePriceRequest(requestId, price)
      setResolvingId(null)
      if (!result.success) { toast.error(result.error); return }
      toast.success('Price set — applied to every connected customer')
      router.refresh()
    })
  }

  if (requests.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-10">No pending price requests.</p>
  }

  return (
    <div className="space-y-2.5">
      {requests.map(r => (
        <Card key={r.id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{r.custom_type}</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Input
              type="number"
              min={0}
              step="0.01"
              placeholder="₹0.00"
              value={values[r.id] ?? ''}
              onChange={e => setValues(v => ({ ...v, [r.id]: e.target.value }))}
            />
            <Button disabled={isPending} onClick={() => handleResolve(r.id)}>
              {resolvingId === r.id ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
              Set price
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
