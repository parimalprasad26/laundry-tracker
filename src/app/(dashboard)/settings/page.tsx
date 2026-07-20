import Link from 'next/link'
import { getUserSettings } from '@/actions/user-settings'
import { getInspectionPolicy } from '@/actions/inspection-policies'
import { BudgetForm } from '@/components/settings/BudgetForm'
import { ReminderSettings } from '@/components/settings/ReminderSettings'
import { InspectionPolicySettings } from '@/components/settings/InspectionPolicySettings'
import { Separator } from '@/components/ui/separator'

export const metadata = { title: 'Settings' }

export default async function SettingsPage() {
  const [settingsResult, policyResult] = await Promise.all([
    getUserSettings(),
    getInspectionPolicy(),
  ])
  const settings = settingsResult.success ? settingsResult.data : null
  const policy = policyResult.success ? policyResult.data : null

  return (
    <div className="space-y-8 max-w-lg">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          New here? <Link href="/guide" className="text-primary hover:underline">View the visual guide</Link>.
        </p>
      </div>

      <BudgetForm
        initialAmount={settings?.budget_amount ?? null}
        initialPeriod={settings?.budget_period ?? 'monthly'}
      />

      <Separator />

      <ReminderSettings initialThreshold={settings?.reminder_threshold_days ?? 2} />

      <Separator />

      <InspectionPolicySettings
        initialPolicy={{
          inspection_window_days: policy?.inspection_window_days ?? 7,
          auto_close_days: policy?.auto_close_days ?? 30,
          dispute_window_days: policy?.dispute_window_days ?? 30,
        }}
      />
    </div>
  )
}
