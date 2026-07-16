import type { SupabaseClient } from '@supabase/supabase-js'
import { VendorAccountRepository } from '@/repositories/VendorAccountRepository'
import type { VendorAccount } from '@/types'

// The single trust root for vendor onboarding in this personal-scale,
// invite-only phase (plan Finding 7) — proportionate scope, no roles table,
// no permission matrix. Always constructed with the admin client, since
// vendor_accounts has no authenticated write policy at all.
export class AdminService {
  private repo: VendorAccountRepository

  constructor(supabase: SupabaseClient) {
    this.repo = new VendorAccountRepository(supabase)
  }

  async promoteUserToVendor(callerAuthUserId: string, targetAuthUserId: string, businessName: string): Promise<VendorAccount> {
    const adminUserId = process.env.ADMIN_USER_ID
    if (!adminUserId || callerAuthUserId !== adminUserId) {
      throw new Error('Unauthorized')
    }

    const existing = await this.repo.findByAuthUserId(targetAuthUserId)
    if (existing) throw new Error('This account already has a vendor profile')

    const account = await this.repo.createServiceRole(targetAuthUserId, businessName)

    // Single trust root for vendor onboarding, no other audit trail exists
    // for this action — log every invocation.
    console.log(`[admin] vendor account created: ${account.id} for auth_user_id=${targetAuthUserId} by admin=${callerAuthUserId} at ${new Date().toISOString()}`)

    return account
  }
}
