import { differenceInDays } from 'date-fns'
import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  returnedAt: string
  inspectionWindowDays: number
}

export function InspectionWindowBanner({ returnedAt, inspectionWindowDays }: Props) {
  const anchor = new Date(returnedAt)
  const deadline = new Date(anchor)
  deadline.setDate(deadline.getDate() + inspectionWindowDays)

  const daysLeft = differenceInDays(deadline, new Date())
  if (daysLeft < 0) return null

  const urgent = daysLeft <= 2

  return (
    <div className={cn(
      'flex items-start gap-2.5 rounded-xl px-3 py-2.5 text-xs',
      urgent
        ? 'bg-amber-50 dark:bg-amber-500/10 ring-1 ring-amber-200 dark:ring-amber-500/25'
        : 'bg-blue-50 dark:bg-blue-500/10 ring-1 ring-blue-200 dark:ring-blue-500/25'
    )}>
      <Clock className={cn('h-3.5 w-3.5 shrink-0 mt-0.5', urgent ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400')} />
      <div>
        <span className={cn('font-semibold', urgent ? 'text-amber-700 dark:text-amber-300' : 'text-blue-700 dark:text-blue-300')}>
          {daysLeft === 0 ? 'Last day' : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`} to report damage.
        </span>{' '}
        <span className={cn(urgent ? 'text-amber-600/80 dark:text-amber-400/80' : 'text-blue-600/80 dark:text-blue-400/80')}>
          Inspect your items — tap an item below to mark damage or missing. Close the batch when done.
        </span>
      </div>
    </div>
  )
}
