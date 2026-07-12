import type { SupabaseClient } from '@supabase/supabase-js'
import { UserSettingsRepository } from '@/repositories/UserSettingsRepository'
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
    return this.repo.save(userId, { budget_amount: budgetAmount, budget_period: budgetPeriod })
  }

  async saveReminderThreshold(userId: string, days: number): Promise<UserSettings> {
    return this.repo.save(userId, { reminder_threshold_days: days })
  }

  async completeOnboarding(userId: string): Promise<UserSettings> {
    return this.repo.save(userId, { onboarding_completed: true })
  }
}
