'use server'

import { handleActionError } from '@/lib/handle-error'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminService } from '@/services/AdminService'
import { z } from 'zod'
import type { ActionResult, VendorAccount } from '@/types'

const promoteSchema = z.object({
  targetAuthUserId: z.string().uuid(),
  businessName: z.string().min(2).max(80),
})

// Single invite-only trust root for vendor onboarding (plan Finding 7).
// auth.uid() is read from the caller's own verified session — never a
// client-supplied id — and checked against ADMIN_USER_ID before anything
// else happens.
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
