'use client'

import { useState } from 'react'
import { buttonVariants } from '@/components/ui/button'
import { ClosetPicker } from '@/components/closet/ClosetPicker'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BatchStatus } from '@/types'

interface Props {
  batchId: string
  existingClosetItemIds: string[]
  batchStatus: BatchStatus
}

export function AddFromClosetButton({ batchId, existingClosetItemIds, batchStatus }: Props) {
  const [open, setOpen] = useState(false)

  if (batchStatus === 'completed') return null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
      >
        <Plus className="mr-1.5 h-4 w-4" />Add from closet
      </button>
      <ClosetPicker
        batchId={batchId}
        existingClosetItemIds={existingClosetItemIds}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  )
}
