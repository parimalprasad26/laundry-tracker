import type { SupabaseClient } from '@supabase/supabase-js'
import { VendorAccountRepository } from '@/repositories/VendorAccountRepository'
import type { VendorAccount, AdminUserSearchResult } from '@/types'

// The single trust root for vendor onboarding in this personal-scale,
// invite-only phase (plan Finding 7) — proportionate scope, no roles table,
// no permission matrix. Always constructed with the admin client, since
// vendor_accounts has no authenticated write policy at all, and
// searchUsers needs the service-role auth-admin API (auth.admin.listUsers)
// to look up users by email — a surface this codebase has never used
// elsewhere, since everything else only ever queries profiles/RLS-scoped
// tables.
//
// Every public method here independently re-checks ADMIN_USER_ID itself
// (requireAdmin, below) rather than trusting the /admin layout's gate alone
// — the same defense-in-depth convention already used throughout the
// vendor portal (e.g. every VendorConnectionService write re-verifies
// ownership even though a layout-level guard also exists for /vendor/*).
export class AdminService {
  private supabase: SupabaseClient
  private repo: VendorAccountRepository

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
    this.repo = new VendorAccountRepository(supabase)
  }

  private requireAdmin(callerAuthUserId: string): void {
    const adminUserId = process.env.ADMIN_USER_ID
    if (!adminUserId || callerAuthUserId !== adminUserId) {
      throw new Error('Unauthorized')
    }
  }

  async promoteUserToVendor(callerAuthUserId: string, targetAuthUserId: string, businessName: string): Promise<VendorAccount> {
    this.requireAdmin(callerAuthUserId)

    const existing = await this.repo.findByAuthUserId(targetAuthUserId)
    if (existing) throw new Error('This account already has a vendor profile')

    const account = await this.repo.createServiceRole(targetAuthUserId, businessName)

    // Single trust root for vendor onboarding, no other audit trail exists
    // for this action — log every invocation.
    console.log(`[admin] vendor account created: ${account.id} for auth_user_id=${targetAuthUserId} by admin=${callerAuthUserId} at ${new Date().toISOString()}`)

    return account
  }

  async listVendorAccounts(callerAuthUserId: string): Promise<VendorAccount[]> {
    this.requireAdmin(callerAuthUserId)
    return this.repo.findAllServiceRole()
  }

  // Email-substring search over auth.users, cross-referenced against
  // profiles (for a display name) and vendor_accounts (so the UI can grey
  // out/skip anyone already promoted). auth.admin.listUsers() doesn't
  // support a reliable server-side email filter across supabase-js
  // versions, so this pages through users and filters client-side — fine
  // at this app's personal-scale, invite-only user base (same scale
  // assumption the class comment already makes).
  async searchUsers(callerAuthUserId: string, query: string): Promise<AdminUserSearchResult[]> {
    this.requireAdmin(callerAuthUserId)

    const trimmed = query.trim().toLowerCase()
    if (trimmed.length < 2) return []

    const { data, error } = await this.supabase.auth.admin.listUsers({ page: 1, perPage: 200 })
    if (error) throw error

    const matches = data.users
      .filter(u => u.email?.toLowerCase().includes(trimmed))
      .slice(0, 20)
    if (!matches.length) return []

    const ids = matches.map(u => u.id)

    const [{ data: profiles, error: profileErr }, { data: vendorRows, error: vendorErr }] = await Promise.all([
      this.supabase.from('profiles').select('id, full_name').in('id', ids),
      this.supabase.from('vendor_accounts').select('auth_user_id').in('auth_user_id', ids).is('deleted_at', null),
    ])
    if (profileErr) throw profileErr
    if (vendorErr) throw vendorErr

    const nameById = new Map((profiles ?? []).map(p => [p.id, p.full_name as string | null]))
    const vendorIds = new Set((vendorRows ?? []).map(v => v.auth_user_id as string))

    return matches.map(u => ({
      authUserId: u.id,
      email: u.email ?? '',
      fullName: nameById.get(u.id) ?? null,
      isVendor: vendorIds.has(u.id),
    }))
  }
}
