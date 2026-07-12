import type { SupabaseClient } from '@supabase/supabase-js'

export interface PushSubscriptionRow {
  user_id: string
  endpoint: string
  p256dh: string
  auth_key: string
}

export class PushSubscriptionRepository {
  constructor(private supabase: SupabaseClient) {}

  async save(userId: string, endpoint: string, p256dh: string, authKey: string): Promise<void> {
    const { error } = await this.supabase
      .from('push_subscriptions')
      .upsert(
        { user_id: userId, endpoint, p256dh, auth_key: authKey },
        { onConflict: 'user_id,endpoint' }
      )
    if (error) throw error
  }

  async delete(userId: string, endpoint: string): Promise<void> {
    const { error } = await this.supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId)
      .eq('endpoint', endpoint)
    if (error) throw error
  }

  async findAllForUser(userId: string): Promise<PushSubscriptionRow[]> {
    const { data, error } = await this.supabase
      .from('push_subscriptions')
      .select('user_id, endpoint, p256dh, auth_key')
      .eq('user_id', userId)
    if (error) throw error
    return data ?? []
  }

  async countForUser(userId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('push_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
    if (error) throw error
    return count ?? 0
  }

  async findPage(limit: number, offset: number): Promise<PushSubscriptionRow[]> {
    const { data, error } = await this.supabase
      .from('push_subscriptions')
      .select('user_id, endpoint, p256dh, auth_key')
      .range(offset, offset + limit - 1)
    if (error) throw error
    return data ?? []
  }
}
