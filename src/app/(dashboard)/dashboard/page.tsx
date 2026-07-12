import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { BatchService } from '@/services/BatchService'
import { BatchCard } from '@/components/batches/BatchCard'
import { BudgetWidget } from '@/components/dashboard/BudgetWidget'
import { OverdueBatchesWidget } from '@/components/dashboard/OverdueBatchesWidget'
import { SpendingTrendsChart } from '@/components/dashboard/SpendingTrendsChart'
import { getUserSettings, getCurrentPeriodSpend } from '@/actions/user-settings'
import { BatchRepository } from '@/repositories/BatchRepository'
import { buttonVariants } from '@/components/ui/button'
import { Plus, WashingMachine, CheckCircle2, Clock, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export const metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const service = new BatchService(supabase)

  const [allPage, inLaundryPage, completedPage, settingsResult] = await Promise.all([
    service.listPage({ userId: user.id }),
    service.listPage({ userId: user.id, status: 'in_laundry' }),
    service.listPage({ userId: user.id, status: 'completed' }),
    getUserSettings(),
  ])

  const settings = settingsResult.success ? settingsResult.data : null
  const period = settings?.budget_period ?? 'monthly'
  const thresholdDays = settings?.reminder_threshold_days ?? 2

  const batchRepo = new BatchRepository(supabase)
  const [spendResult, overdueBatches, weeklyTrends, monthlyTrends, yearlyTrends] = await Promise.all([
    getCurrentPeriodSpend(period),
    batchRepo.findOverdue(user.id, thresholdDays),
    batchRepo.getSpendByPeriod(user.id, 'weekly', 8),
    batchRepo.getSpendByPeriod(user.id, 'monthly', 6),
    batchRepo.getSpendByPeriod(user.id, 'yearly', 5),
  ])
  const spent = spendResult.success ? spendResult.data : 0
  const firstName = profile?.full_name?.split(' ')[0] ?? null

  return (
    <div className="space-y-7 max-w-5xl">
      {/* Page heading */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {firstName ? `Hey, ${firstName} 👋` : 'Dashboard'}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Here&apos;s what&apos;s happening with your laundry.</p>
        </div>
        <Link href="/batches/new" className={cn(buttonVariants({ size: 'sm' }), 'gap-1.5')}>
          <Plus className="h-4 w-4" />New batch
        </Link>
      </div>

      {/* Overdue alert */}
      <OverdueBatchesWidget batches={overdueBatches} thresholdDays={thresholdDays} />

      {/* Budget widget */}
      <BudgetWidget settings={settings} spent={spent} />

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-card p-5 ring-1 ring-border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="h-10 w-10 rounded-xl bg-foreground/8 flex items-center justify-center">
              <WashingMachine className="h-5 w-5 text-foreground/70" />
            </div>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-3xl font-bold">{allPage.data.length}</p>
          <p className="text-sm text-muted-foreground mt-1">Total batches</p>
        </div>

        <div className="rounded-2xl bg-card p-5 ring-1 ring-border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 flex items-center justify-center">
              <Clock className="h-5 w-5 text-indigo-500" />
            </div>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{inLaundryPage.data.length}</p>
          <p className="text-sm text-muted-foreground mt-1">In laundry</p>
        </div>

        <div className="rounded-2xl bg-card p-5 ring-1 ring-border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </div>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{completedPage.data.length}</p>
          <p className="text-sm text-muted-foreground mt-1">Completed</p>
        </div>
      </div>

      {/* Spending trends */}
      <SpendingTrendsChart
        weekly={weeklyTrends}
        monthly={monthlyTrends}
        yearly={yearlyTrends}
        defaultPeriod={period}
      />

      {/* Recent batches */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-base">Recent batches</h2>
          <Link href="/batches" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            View all →
          </Link>
        </div>

        {allPage.data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-4 rounded-2xl border-2 border-dashed border-border">
            <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
              <WashingMachine className="h-7 w-7 text-muted-foreground/50" />
            </div>
            <div>
              <p className="font-semibold text-sm">No batches yet</p>
              <p className="text-xs text-muted-foreground mt-1">Create your first laundry batch to get started.</p>
            </div>
            <Link href="/batches/new" className={cn(buttonVariants({ size: 'sm' }), 'gap-1.5')}>
              <Plus className="h-4 w-4" />New batch
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {allPage.data.slice(0, 6).map((batch) => (
              <BatchCard key={batch.id} batch={batch} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
