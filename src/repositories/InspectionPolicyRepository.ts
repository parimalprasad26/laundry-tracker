import type { SupabaseClient } from '@supabase/supabase-js'
import type { InspectionPolicy } from '@/types'

const DEFAULTS: Omit<InspectionPolicy, 'user_id' | 'updated_at'> = {
  inspection_window_days: 7,
  auto_close_days: 30,
  dispute_window_days: 30,
}

export class InspectionPolicyRepository {
  constructor(private supabase: SupabaseClient) {}

  async findByUser(userId: string): Promise<InspectionPolicy> {
    const { data } = await this.supabase
      .from('user_inspection_policies')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    return (data as InspectionPolicy | null) ?? {
      user_id: userId,
      updated_at: new Date().toISOString(),
      ...DEFAULTS,
    }
  }
}
