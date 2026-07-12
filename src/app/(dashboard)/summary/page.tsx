import { createClient } from '@/lib/supabase/server'
import { BatchRepository } from '@/repositories/BatchRepository'
import { MonthlySummaryCard } from '@/components/dashboard/MonthlySummaryCard'
import { MonthNav } from '@/components/dashboard/MonthNav'

export const metadata = { title: 'Monthly Summary' }

interface Props {
  searchParams: Promise<{ m?: string }>
}

export default async function SummaryPage({ searchParams }: Props) {
  const { m } = await searchParams
  const now = new Date()

  let year = now.getFullYear()
  let month = now.getMonth() + 1

  if (m && /^\d{4}-\d{2}$/.test(m)) {
    const [y, mo] = m.split('-').map(Number)
    if (y >= 2020 && y <= 2100 && mo >= 1 && mo <= 12) {
      year = y
      month = mo
    }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const summary = await new BatchRepository(supabase).getMonthlySummary(user.id, year, month)

  const monthLabel = new Date(year, month - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-5 max-w-lg">
      <div>
        <h1 className="text-xl font-semibold">Monthly summary</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{monthLabel}</p>
      </div>

      <MonthNav year={year} month={month} />
      <MonthlySummaryCard summary={summary} />
    </div>
  )
}
