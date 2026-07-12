import type { SupabaseClient } from '@supabase/supabase-js'
import type { UserSettings, BudgetPeriod } from '@/types'

export class UserSettingsRepository {
  constructor(private supabase: SupabaseClient) {}

  async get(userId: string): Promise<UserSettings> {
    const { data, error } = await this.supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) throw error

    return data ?? {
      user_id: userId,
      budget_amount: null,
      budget_period: 'monthly' as BudgetPeriod,
      reminder_threshold_days: 2,
      onboarding_completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }

  async save(
    userId: string,
    fields: { budget_amount?: number | null; budget_period?: BudgetPeriod; reminder_threshold_days?: number; onboarding_completed?: boolean }
  ): Promise<UserSettings> {
    const { data, error } = await this.supabase
      .from('user_settings')
      .upsert({ user_id: userId, ...fields }, { onConflict: 'user_id' })
      .select()
      .single()

    if (error) throw error
    return data
  }
}
