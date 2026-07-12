'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { applyVendorPricesToBatch } from '@/actions/batch-items'
import { Zap, Loader2 } from 'lucide-react'

export function ApplyVendorPricesBanner({ batchId }: { batchId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleApply() {
    startTransition(async () => {
      const result = await applyVendorPricesToBatch(batchId)
      if (result.success) {
        const n = result.data.applied
        toast.success(n > 0 ? `${n} item${n !== 1 ? 's' : ''} priced` : 'No matching prices found')
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <div className="flex items-center justify-between rounded-xl bg-primary/5 border border-primary/20 px-3 py-2.5">
      <div className="flex items-center gap-2">
        <Zap className="h-3.5 w-3.5 text-primary shrink-0" />
        <p className="text-xs text-foreground">Vendor prices available — apply to unpriced items</p>
      </div>
      <button
        onClick={handleApply}
        disabled={isPending}
        className="text-xs font-semibold text-primary hover:underline shrink-0 ml-3 disabled:opacity-60"
      >
        {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Apply'}
      </button>
    </div>
  )
}
