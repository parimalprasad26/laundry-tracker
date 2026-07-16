'use server'

import { handleActionError } from '@/lib/handle-error'
import { updateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { VendorAccountService } from '@/services/VendorAccountService'
import { VendorConnectionService } from '@/services/VendorConnectionService'
import { vendorSearchQuerySchema } from '@/schemas/vendor-account.schema'
import type { ActionResult, VendorSearchResult, VendorConnection } from '@/types'

export type MyVendorConnection = VendorConnection & { vendor_business_name: string }

async function getAuthed() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Unauthorized')
  return {
    accountService: new VendorAccountService(supabase),
    connectionService: new VendorConnectionService(supabase),
    userId: user.id,
  }
}

export async function searchPlatformVendors(query: string): Promise<ActionResult<VendorSearchResult[]>> {
  try {
    const { accountService } = await getAuthed()
    const validated = vendorSearchQuerySchema.parse(query)
    const results = await accountService.search(validated)
    return { success: true, data: results }
  } catch (e) {
    return handleActionError(e)
  }
}

export async function listMyVendorConnections(): Promise<ActionResult<MyVendorConnection[]>> {
  try {
    const { connectionService, userId } = await getAuthed()
    const connections = await connectionService.listMyConnections(userId)
    return { success: true, data: connections }
  } catch (e) {
    return handleActionError(e)
  }
}

export async function requestVendorConnection(vendorAccountId: string): Promise<ActionResult<VendorConnection>> {
  try {
    const { connectionService, userId } = await getAuthed()
    const connection = await connectionService.requestConnection(userId, vendorAccountId)
    updateTag('vendor-connections')
    return { success: true, data: connection }
  } catch (e) {
    return handleActionError(e)
  }
}

export async function cancelVendorConnectionRequest(connectionId: string): Promise<ActionResult> {
  try {
    const { connectionService, userId } = await getAuthed()
    await connectionService.cancelRequest(connectionId, userId)
    updateTag('vendor-connections')
    return { success: true, data: undefined }
  } catch (e) {
    return handleActionError(e)
  }
}

export async function disconnectFromVendor(connectionId: string): Promise<ActionResult> {
  try {
    const { connectionService, userId } = await getAuthed()
    await connectionService.disconnect(connectionId, userId)
    updateTag('vendor-connections')
    updateTag('vendors')
    return { success: true, data: undefined }
  } catch (e) {
    return handleActionError(e)
  }
}
