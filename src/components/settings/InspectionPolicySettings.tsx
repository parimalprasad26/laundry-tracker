'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Separator } from '@/components/ui/separator'
import { saveInspectionPolicy } from '@/actions/inspection-policies'
import { cn } from '@/lib/utils'
import type { InspectionPolicy } from '@/types'

const INSPECTION_OPTIONS = [3, 5, 7, 14]
const AUTO_CLOSE_OPTIONS = [7, 14, 30, 60]
const DISPUTE_OPTIONS = [7, 14, 30, 60]

interface Props {
  initialPolicy: Pick<InspectionPolicy, 'inspection_window_days' | 'auto_close_days' | 'dispute_window_days'>
}

function PillGroup({
  options,
  value,
  onChange,
  disabled,
}: {
  options: number[]
  value: number
  onChange: (v: number) => void
  disabled: boolean
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map(d => (
        <button
          key={d}
          type="button"
          onClick={() => onChange(d)}
          disabled={disabled}
          className={cn(
            'rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50',
            value === d
              ? 'bg-foreground text-background border-foreground'
              : 'bg-background text-foreground border-border hover:bg-muted'
          )}
        >
          {d} {d === 1 ? 'day' : 'days'}
        </button>
      ))}
    </div>
  )
}

export function InspectionPolicySettings({ initialPolicy }: Props) {
  const [inspectionDays, setInspectionDays] = useState(initialPolicy.inspection_window_days)
  const [autoCloseDays, setAutoCloseDays] = useState(initialPolicy.auto_close_days)
  const [disputeDays, setDisputeDays] = useState(initialPolicy.dispute_window_days)
  const [isPending, startTransition] = useTransition()

  function handleChange(field: keyof Omit<InspectionPolicy, 'user_id' | 'updated_at'>, value: number) {
    if (field === 'inspection_window_days') setInspectionDays(value)
    if (field === 'auto_close_days') setAutoCloseDays(value)
    if (field === 'dispute_window_days') setDisputeDays(value)

    startTransition(async () => {
      const result = await saveInspectionPolicy({ [field]: value })
      if (!result.success) toast.error(result.error)
    })
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-medium">Inspection policy</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Control how long you have to inspect returned items and file disputes.
        </p>
      </div>
      <Separator />

      <div className="space-y-1.5">
        <p className="text-sm font-medium">Inspection window</p>
        <PillGroup
          options={INSPECTION_OPTIONS}
          value={inspectionDays}
          onChange={v => handleChange('inspection_window_days', v)}
          disabled={isPending}
        />
        <p className="text-xs text-muted-foreground">
          Days after return to report damage during inspection. After this window you&apos;ll need to open a dispute.
        </p>
      </div>

      <div className="space-y-1.5">
        <p className="text-sm font-medium">Auto-close after</p>
        <PillGroup
          options={AUTO_CLOSE_OPTIONS}
          value={autoCloseDays}
          onChange={v => handleChange('auto_close_days', v)}
          disabled={isPending}
        />
        <p className="text-xs text-muted-foreground">
          Returned batches are automatically closed after this many days if you haven&apos;t closed them manually.
        </p>
      </div>

      <div className="space-y-1.5">
        <p className="text-sm font-medium">Dispute window</p>
        <PillGroup
          options={DISPUTE_OPTIONS}
          value={disputeDays}
          onChange={v => handleChange('dispute_window_days', v)}
          disabled={isPending}
        />
        <p className="text-xs text-muted-foreground">
          Days after a batch is closed to open a damage dispute.
        </p>
      </div>
    </div>
  )
}
