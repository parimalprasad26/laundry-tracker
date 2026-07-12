'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { deleteClosetItem } from '@/actions/closet'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { MoreVertical, Trash2, Loader2 } from 'lucide-react'

export function ClosetItemActions({ itemId }: { itemId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirm('Remove this item from your closet? This cannot be undone.')) return
    startTransition(async () => {
      const result = await deleteClosetItem(itemId)
      if (result.success) {
        toast.success('Item removed from closet')
        router.push('/closet')
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={isPending}
        className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreVertical className="h-4 w-4" />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleDelete} className="text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Remove from closet
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
