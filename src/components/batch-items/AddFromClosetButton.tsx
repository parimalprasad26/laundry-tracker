'use client'

import { useState } from 'react'
import { buttonVariants } from '@/components/ui/button'
import { ClosetPicker } from '@/components/closet/ClosetPicker'
import { VendorCustomPricePrompt } from '@/components/batch-items/VendorCustomPricePrompt'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BatchStatus, MissingCustomPrice } from '@/types'

interface Props {
  batchId: string
  existingClosetItemIds: string[]
  batchStatus: BatchStatus
  vendorId?: string | null
  vendorName?: string | null
}

export function AddFromClosetButton({ batchId, existingClosetItemIds, batchStatus, vendorId, vendorName }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [missingPrices, setMissingPrices] = useState<MissingCustomPrice[]>([])

  if (batchStatus === 'returned' || batchStatus === 'closed') return null

  function handleMissingPrices(missing: MissingCustomPrice[]) {
    setMissingPrices(missing)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
      >
        <Plus className="mr-1.5 h-4 w-4" />Add from closet
      </button>

      <ClosetPicker
        batchId={batchId}
        existingClosetItemIds={existingClosetItemIds}
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onMissingPrices={vendorId && vendorName ? handleMissingPrices : undefined}
      />

      {vendorId && vendorName && (
        <VendorCustomPricePrompt
          open={missingPrices.length > 0}
          onClose={() => setMissingPrices([])}
          vendorId={vendorId}
          vendorName={vendorName}
          batchId={batchId}
          missing={missingPrices}
        />
      )}
    </>
  )
}
