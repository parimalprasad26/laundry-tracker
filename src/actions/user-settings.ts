'use server'

import { handleActionError } from '@/lib/handle-error'

import { updateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { UserSettingsService } from '@/services/UserSettingsService'
import type { ActionResult, UserSettings, BudgetPeriod } from '@/types'

async function getAuthedService() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Unauthorized')
  return { supabase, service: new UserSettingsService(supabase), userId: user.id }
}

export async function getUserSettings(): Promise<ActionResult<UserSettings>> {
  try {
    const { service, userId } = await getAuthedService()
    const settings = await service.get(userId)
    return { success: true, data: settings }
  } catch (e) {
    return handleActionError(e)
  }
}

export async function saveUserSettings(
  budgetAmount: number | null,
  budgetPeriod: BudgetPeriod
): Promise<ActionResult<UserSettings>> {
  try {
    const { service, userId } = await getAuthedService()
    const settings = await service.saveBudget(userId, budgetAmount, budgetPeriod)
    updateTag(`user-settings-${userId}`)
    return { success: true, data: settings }
  } catch (e) {
    return handleActionError(e)
  }
}

export async function saveReminderThreshold(days: number): Promise<ActionResult<UserSettings>> {
  try {
    const { service, userId } = await getAuthedService()
    const settings = await service.saveReminderThreshold(userId, days)
    updateTag(`user-settings-${userId}`)
    return { success: true, data: settings }
  } catch (e) {
    return handleActionError(e)
  }
}

export async function completeOnboarding(): Promise<ActionResult> {
  try {
    const { service, userId } = await getAuthedService()
    await service.completeOnboarding(userId)
    return { success: true, data: undefined }
  } catch (e) {
    return handleActionError(e)
  }
}

export async function getCurrentPeriodSpend(period: BudgetPeriod): Promise<ActionResult<number>> {
  try {
    const { supabase, userId } = await getAuthedService()

    const now = new Date()
    let periodStart: Date

    if (period === 'weekly') {
      periodStart = new Date(now)
      const day = now.getDay()
      const diff = day === 0 ? 6 : day - 1 // Monday = start of week
      periodStart.setDate(now.getDate() - diff)
      periodStart.setHours(0, 0, 0, 0)
    } else if (period === 'yearly') {
      periodStart = new Date(now.getFullYear(), 0, 1)
    } else {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
    }

    const { data, error } = await supabase
      .from('laundry_batches')
      .select('actual_cost')
      .eq('user_id', userId)
      .gte('sent_at', periodStart.toISOString())
      .is('deleted_at', null)
      .not('actual_cost', 'is', null)

    if (error) throw error

    const total = (data ?? []).reduce((sum, b) => sum + (b.actual_cost ?? 0), 0)
    return { success: true, data: total }
  } catch (e) {
    return handleActionError(e)
  }
}
