'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { saveUserSettings } from '@/actions/user-settings'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BudgetPeriod } from '@/types'

const PERIODS: { value: BudgetPeriod; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
]

export function BudgetForm({ initialAmount, initialPeriod }: {
  initialAmount: number | null
  initialPeriod: BudgetPeriod
}) {
  const [amount, setAmount] = useState(initialAmount != null ? String(initialAmount) : '')
  const [period, setPeriod] = useState<BudgetPeriod>(initialPeriod)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    const parsed = amount.trim() === '' ? null : parseFloat(amount)
    if (parsed !== null && (isNaN(parsed) || parsed < 0)) {
      toast.error('Enter a valid budget amount')
      return
    }
    startTransition(async () => {
      const result = await saveUserSettings(parsed, period)
      if (result.success) {
        toast.success('Settings saved')
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-medium">Laundry budget</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Track your spend against a target.</p>
      </div>
      <Separator />

      <div className="space-y-1.5">
        <Label>Budget period</Label>
        <div className="flex gap-2">
          {PERIODS.map(p => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPeriod(p.value)}
              className={cn(
                'flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                period === p.value
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-background text-foreground border-border hover:bg-muted'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="budget">Budget amount</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
          <Input
            id="budget"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            className="pl-7"
            value={amount}
            onChange={e => setAmount(e.target.value)}
          />
        </div>
        <p className="text-xs text-muted-foreground">Leave empty to remove budget tracking.</p>
      </div>

      <Button onClick={handleSave} disabled={isPending}>
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save settings
      </Button>
    </div>
  )
}
