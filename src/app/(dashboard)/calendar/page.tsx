import { createClient } from '@/lib/supabase/server'
import { BatchService } from '@/services/BatchService'
import { BatchCalendar } from '@/components/calendar/BatchCalendar'

export const metadata = { title: 'Calendar' }

export default async function CalendarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const batches = await new BatchService(supabase).getForMonth(user.id, year, month)

  return (
    <div className="space-y-5 max-w-lg">
      <h1 className="text-xl font-semibold">Calendar</h1>
      <BatchCalendar
        initialBatches={batches}
        initialYear={year}
        initialMonth={month}
      />
    </div>
  )
}
