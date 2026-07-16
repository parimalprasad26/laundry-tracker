import { SupabaseClient } from '@supabase/supabase-js'
import type { VendorAccount, VendorSearchResult } from '@/types'

export class VendorAccountRepository {
  constructor(private supabase: SupabaseClient) {}

  async findByAuthUserId(authUserId: string): Promise<VendorAccount | null> {
    const { data, error } = await this.supabase
      .from('vendor_accounts')
      .select('*')
      .eq('auth_user_id', authUserId)
      .is('deleted_at', null)
      .maybeSingle()

    if (error) throw error
    return data
  }

  async findById(id: string): Promise<VendorAccount | null> {
    const { data, error } = await this.supabase
      .from('vendor_accounts')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle()

    if (error) throw error
    return data
  }

  async search(query: string): Promise<VendorSearchResult[]> {
    const { data, error } = await this.supabase.rpc('search_vendor_accounts', { p_query: query })
    if (error) throw error
    return (data ?? []).map((r: { vendor_account_id: string; business_name: string; address: string | null; similarity: number }) => ({
      vendor_account_id: r.vendor_account_id,
      business_name: r.business_name,
      address: r.address,
      similarity: r.similarity,
    }))
  }

  // Service-role only — vendor account creation is invite-only (see AdminService)
  // and onboarding_completed_at/business_name edits go through VendorAccountService
  // using the service-role client so a customer can never self-grant vendor status.
  async createServiceRole(authUserId: string, businessName: string): Promise<VendorAccount> {
    const { data, error } = await this.supabase
      .from('vendor_accounts')
      .insert({ auth_user_id: authUserId, business_name: businessName })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateOwnProfile(id: string, authUserId: string, input: { business_name?: string; phone?: string | null; address?: string | null }): Promise<VendorAccount> {
    const { data, error } = await this.supabase
      .from('vendor_accounts')
      .update(input)
      .eq('id', id)
      .eq('auth_user_id', authUserId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Service-role only — derived discoverability gate, never customer/vendor-writable directly.
  async markOnboardingCompleteServiceRole(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('vendor_accounts')
      .update({ onboarding_completed_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error
  }
}
