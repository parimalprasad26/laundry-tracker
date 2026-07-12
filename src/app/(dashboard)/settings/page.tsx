import { getUserSettings } from '@/actions/user-settings'
import { BudgetForm } from '@/components/settings/BudgetForm'
import { ReminderSettings } from '@/components/settings/ReminderSettings'
import { Separator } from '@/components/ui/separator'

export const metadata = { title: 'Settings' }

export default async function SettingsPage() {
  const result = await getUserSettings()
  const settings = result.success ? result.data : null

  return (
    <div className="space-y-8 max-w-lg">
      <h1 className="text-xl font-semibold">Settings</h1>

      <BudgetForm
        initialAmount={settings?.budget_amount ?? null}
        initialPeriod={settings?.budget_period ?? 'monthly'}
      />

      <Separator />

      <ReminderSettings initialThreshold={settings?.reminder_threshold_days ?? 2} />
    </div>
  )
}
