import type { SupabaseClient } from '@supabase/supabase-js'
import { UserSettingsRepository } from '@/repositories/UserSettingsRepository'
import { budgetSchema, reminderThresholdSchema } from '@/schemas/user-settings.schema'
import type { UserSettings, BudgetPeriod } from '@/types'

export class UserSettingsService {
  private repo: UserSettingsRepository

  constructor(supabase: SupabaseClient) {
    this.repo = new UserSettingsRepository(supabase)
  }

  async get(userId: string): Promise<UserSettings> {
    return this.repo.get(userId)
  }

  async saveBudget(userId: string, budgetAmount: number | null, budgetPeriod: BudgetPeriod): Promise<UserSettings> {
    const validated = budgetSchema.parse({ budgetAmount, budgetPeriod })
    return this.repo.save(userId, { budget_amount: validated.budgetAmount, budget_period: validated.budgetPeriod })
  }

  async saveReminderThreshold(userId: string, days: number): Promise<UserSettings> {
    const validated = reminderThresholdSchema.parse({ days })
    return this.repo.save(userId, { reminder_threshold_days: validated.days })
  }

  async completeOnboarding(userId: string): Promise<UserSettings> {
    return this.repo.save(userId, { onboarding_completed: true })
  }
}
