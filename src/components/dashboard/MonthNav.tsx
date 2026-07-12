'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  year: number
  month: number
}

function toParam(y: number, m: number) {
  return `${y}-${String(m).padStart(2, '0')}`
}

export function MonthNav({ year, month }: Props) {
  const router = useRouter()
  const now = new Date()
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1

  function go(delta: number) {
    let m = month + delta
    let y = year
    if (m < 1) { m = 12; y-- }
    if (m > 12) { m = 1; y++ }
    router.push(`/summary?m=${toParam(y, m)}`)
  }

  const label = new Date(year, month - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' })

  return (
    <div className="flex items-center justify-between rounded-2xl bg-muted/40 px-4 py-3">
      <button
        onClick={() => go(-1)}
        className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-background transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div className="text-center">
        <p className="text-sm font-semibold">{label}</p>
        {isCurrentMonth && (
          <p className="text-[10px] text-muted-foreground mt-0.5">Current month</p>
        )}
      </div>

      <button
        onClick={() => go(1)}
        disabled={isCurrentMonth}
        className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-background transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}
