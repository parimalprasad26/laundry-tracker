import Link from 'next/link'
import { Progress } from '@/components/ui/progress'
import { formatPrice, cn } from '@/lib/utils'
import type { UserSettings } from '@/types'

const PERIOD_LABELS: Record<string, string> = {
  weekly: 'this week',
  monthly: 'this month',
  yearly: 'this year',
}

export function BudgetWidget({ settings, spent }: {
  settings: UserSettings | null
  spent: number
}) {
  if (spent === 0 && (settings == null || settings.budget_amount == null)) return null

  const budget = settings?.budget_amount ?? null
  const period = settings?.budget_period ?? 'monthly'
  const label = PERIOD_LABELS[period]

  if (budget == null) {
    return (
      <div className="rounded-2xl bg-card p-5 ring-1 ring-border shadow-sm">
        <p className="text-sm text-muted-foreground">Spent {label}</p>
        <p className="text-3xl font-bold mt-1">{formatPrice(spent)}</p>
        <Link href="/settings" className="text-xs text-muted-foreground hover:text-foreground mt-2 inline-block transition-colors">
          Set a budget →
        </Link>
      </div>
    )
  }

  const pct = Math.min((spent / budget) * 100, 100)
  const isOver = spent > budget
  const delta = Math.abs(spent - budget)

  return (
    <div className="rounded-2xl bg-card p-5 ring-1 ring-border shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-muted-foreground capitalize">Budget {label}</p>
        <Link href="/settings" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Edit</Link>
      </div>
      <p className="text-2xl font-bold">
        {formatPrice(spent)}{' '}
        <span className="text-base font-normal text-muted-foreground">of {formatPrice(budget)}</span>
      </p>
      <Progress
        value={pct}
        className={cn('h-2 mt-3', isOver && '[&>div]:bg-destructive')}
      />
      <p className={cn('text-xs mt-2 font-medium', isOver ? 'text-destructive' : 'text-muted-foreground')}>
        {isOver ? `${formatPrice(delta)} over budget` : `${formatPrice(delta)} remaining`}
      </p>
    </div>
  )
}
