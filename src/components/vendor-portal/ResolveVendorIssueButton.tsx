'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { resolveVendorIssue } from '@/actions/disputes'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

interface Props {
  disputeId: string
}

export function ResolveVendorIssueButton({ disputeId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handle() {
    startTransition(async () => {
      const result = await resolveVendorIssue(disputeId, 'Resolved by vendor')
      if (result.success) {
        toast.success('Issue resolved')
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <Button size="sm" variant="outline" onClick={handle} disabled={isPending} className="h-7 text-xs gap-1.5">
      {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
      Mark resolved
    </Button>
  )
}
