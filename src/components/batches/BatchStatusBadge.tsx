import { cn } from '@/lib/utils'
import type { BatchStatus } from '@/types'

const STATUS_CONFIG: Record<BatchStatus, { label: string; className: string }> = {
  draft: {
    label: 'Draft',
    className: 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400',
  },
  in_laundry: {
    label: 'In Laundry',
    className: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
  },
  completed: {
    label: 'Completed',
    className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  },
}

export function BatchStatusBadge({ status }: { status: BatchStatus }) {
  const { label, className } = STATUS_CONFIG[status]
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0',
      className
    )}>
      {label}
    </span>
  )
}
