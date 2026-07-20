'use server'

import { handleActionError } from '@/lib/handle-error'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminService } from '@/services/AdminService'
import { z } from 'zod'
import type { ActionResult, VendorAccount, AdminUserSearchResult } from '@/types'

const promoteSchema = z.object({
  targetAuthUserId: z.string().uuid(),
  businessName: z.string().min(2).max(80),
})

const searchSchema = z.string().min(2).max(100)

// auth.uid() is read from the caller's own verified session — never a
// client-supplied id — for every action below. AdminService.requireAdmin
// checks it against ADMIN_USER_ID independently in each method; these
// actions don't shortcut that by checking once here, since the /admin
// layout gate and this action layer are two of the three places this
// codebase deliberately re-verifies the same boundary (defense in depth,
// see AdminService's class comment).

// Single invite-only trust root for vendor onboarding (plan Finding 7).
export async function promoteUserToVendor(targetAuthUserId: string, businessName: string): Promise<ActionResult<VendorAccount>> {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) throw new Error('Unauthorized')

    const validated = promoteSchema.parse({ targetAuthUserId, businessName })
    const service = new AdminService(createAdminClient())
    const account = await service.promoteUserToVendor(user.id, validated.targetAuthUserId, validated.businessName)
    return { success: true, data: account }
  } catch (e) {
    return handleActionError(e)
  }
}

export async function listVendorAccountsAdmin(): Promise<ActionResult<VendorAccount[]>> {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) throw new Error('Unauthorized')

    const service = new AdminService(createAdminClient())
    const accounts = await service.listVendorAccounts(user.id)
    return { success: true, data: accounts }
  } catch (e) {
    return handleActionError(e)
  }
}

export async function searchUsers(query: string): Promise<ActionResult<AdminUserSearchResult[]>> {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) throw new Error('Unauthorized')

    const validated = searchSchema.parse(query)
    const service = new AdminService(createAdminClient())
    const results = await service.searchUsers(user.id, validated)
    return { success: true, data: results }
  } catch (e) {
    return handleActionError(e)
  }
}
