'use client'

import { useState, useTransition } from 'react'
import { format, eachDayOfInterval, getDay, isSameDay } from 'date-fns'
import { getBatchesForMonth } from '@/actions/batches'
import { DateBatchSheet } from './DateBatchSheet'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BatchWithStatus } from '@/types'

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

export function BatchCalendar({ initialBatches, initialYear, initialMonth }: {
  initialBatches: BatchWithStatus[]
  initialYear: number
  initialMonth: number
}) {
  const [year, setYear] = useState(initialYear)
  const [month, setMonth] = useState(initialMonth)
  const [batches, setBatches] = useState(initialBatches)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isPending, startTransition] = useTransition()

  function navigate(delta: number) {
    let newMonth = month + delta
    let newYear = year
    if (newMonth > 12) { newMonth = 1; newYear++ }
    if (newMonth < 1) { newMonth = 12; newYear-- }

    startTransition(async () => {
      const result = await getBatchesForMonth(newYear, newMonth)
      if (result.success) {
        setBatches(result.data)
        setMonth(newMonth)
        setYear(newYear)
      }
    })
  }

  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)
  const days = eachDayOfInterval({ start: firstDay, end: lastDay })
  const startPad = getDay(firstDay)

  const cells: (Date | null)[] = [...Array(startPad).fill(null), ...days]
  while (cells.length % 7 !== 0) cells.push(null)

  const today = new Date()

  const selectedBatches = selectedDate
    ? batches.filter(b =>
        (b.sent_at && isSameDay(new Date(b.sent_at), selectedDate)) ||
        (b.returned_at && isSameDay(new Date(b.returned_at), selectedDate))
      )
    : []

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          disabled={isPending}
          className="p-2 rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <h2 className="font-semibold">{format(firstDay, 'MMMM yyyy')}</h2>
        <button
          onClick={() => navigate(1)}
          disabled={isPending}
          className="p-2 rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 gap-1">
        {DAY_LABELS.map(d => (
          <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, i) => {
          if (!date) return <div key={i} className="h-9 sm:h-10" />

          const hasSent = batches.some(b => b.sent_at && isSameDay(new Date(b.sent_at), date))
          const hasReturned = batches.some(b => b.returned_at && isSameDay(new Date(b.returned_at), date))
          const isToday = isSameDay(date, today)
          const isSelected = selectedDate != null && isSameDay(date, selectedDate)

          return (
            <button
              key={i}
              onClick={() => setSelectedDate(date)}
              className={cn(
                'relative flex flex-col items-center py-1 sm:py-1.5 rounded-lg transition-colors h-9 sm:h-10',
                isSelected ? 'bg-foreground text-background' :
                isToday ? 'bg-muted' : 'hover:bg-muted/50'
              )}
            >
              <span className={cn('text-sm', isToday && !isSelected && 'font-semibold')}>
                {format(date, 'd')}
              </span>
              {(hasSent || hasReturned) && (
                <div className="flex gap-0.5 mt-0.5">
                  {hasSent && (
                    <span className={cn(
                      'h-1 w-1 rounded-full',
                      isSelected ? 'bg-background' : 'bg-indigo-500'
                    )} />
                  )}
                  {hasReturned && (
                    <span className={cn(
                      'h-1 w-1 rounded-full',
                      isSelected ? 'bg-background' : 'bg-emerald-500'
                    )} />
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-muted-foreground pt-1">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-indigo-500 inline-block" />Sent
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />Returned
        </span>
      </div>

      <DateBatchSheet
        date={selectedDate}
        batches={selectedBatches}
        onClose={() => setSelectedDate(null)}
      />
    </div>
  )
}
