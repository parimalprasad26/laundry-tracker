'use server'

import { handleActionError } from '@/lib/handle-error'
import { updateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { VendorAccountService } from '@/services/VendorAccountService'
import { VendorConnectionService } from '@/services/VendorConnectionService'
import { VendorPriceRequestService } from '@/services/VendorPriceRequestService'
import { DisputeService } from '@/services/DisputeService'
import type { VendorAccountProfileValues } from '@/schemas/vendor-account.schema'
import type {
  ActionResult, VendorAccount, VendorAccountPrice, VendorConnection,
  VendorConnectedCustomer, VendorCustomerBatch, VendorCustomerBatchItem,
  VendorPriceRequest, VendorDispute, ItemType,
} from '@/types'

// Every action here requires the caller to have a vendor_accounts row —
// mirrors the getAuthedService() pattern used everywhere else, plus that
// one extra check. Read/connection-accept services are constructed with the
// caller's own session (see VendorConnectionService's class comment on why
// that matters for auth.uid()); the admin-only writes (profile edits,
// onboarding completion) get a second, admin-backed service instance.
async function getAuthedVendor() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Unauthorized')

  const accountService = new VendorAccountService(supabase)
  const vendorAccount = await accountService.getByAuthUserId(user.id)
  if (!vendorAccount) throw new Error('Not a vendor account')

  return {
    userId: user.id,
    vendorAccount,
    accountService,
    adminAccountService: new VendorAccountService(createAdminClient()),
    connectionService: new VendorConnectionService(supabase),
    priceRequestService: new VendorPriceRequestService(supabase),
    disputeService: new DisputeService(supabase),
  }
}

export async function getMyVendorAccount(): Promise<ActionResult<VendorAccount>> {
  try {
    const { vendorAccount } = await getAuthedVendor()
    return { success: true, data: vendorAccount }
  } catch (e) {
    return handleActionError(e)
  }
}

export async function updateVendorAccountProfile(input: VendorAccountProfileValues): Promise<ActionResult<VendorAccount>> {
  try {
    const { userId, vendorAccount, adminAccountService } = await getAuthedVendor()
    const updated = await adminAccountService.updateOwnProfile(vendorAccount.id, userId, input)
    updateTag('vendor-account')
    return { success: true, data: updated }
  } catch (e) {
    return handleActionError(e)
  }
}

export async function listMyRatecard(): Promise<ActionResult<VendorAccountPrice[]>> {
  try {
    const { vendorAccount, accountService } = await getAuthedVendor()
    const prices = await accountService.listStandardPrices(vendorAccount.id)
    return { success: true, data: prices }
  } catch (e) {
    return handleActionError(e)
  }
}

export async function setStandardVendorPrice(itemType: ItemType, unitPrice: number): Promise<ActionResult> {
  try {
    const { userId, vendorAccount, accountService } = await getAuthedVendor()
    await accountService.setStandardPrice(vendorAccount.id, userId, { item_type: itemType, unit_price: unitPrice })
    updateTag('vendor-account')
    return { success: true, data: undefined }
  } catch (e) {
    return handleActionError(e)
  }
}

export async function completeVendorOnboarding(): Promise<ActionResult> {
  try {
    const { userId, vendorAccount, adminAccountService } = await getAuthedVendor()
    await adminAccountService.completeOnboarding(vendorAccount.id, userId)
    updateTag('vendor-account')
    return { success: true, data: undefined }
  } catch (e) {
    return handleActionError(e)
  }
}

export type PendingConnectionRequest = { connection_id: string; customer_name: string | null; requested_at: string }

export async function listIncomingConnectionRequests(): Promise<ActionResult<PendingConnectionRequest[]>> {
  try {
    const { userId, vendorAccount, connectionService } = await getAuthedVendor()
    const requests = await connectionService.listPendingRequests(userId, vendorAccount.id)
    return { success: true, data: requests }
  } catch (e) {
    return handleActionError(e)
  }
}

export async function acceptConnectionRequest(connectionId: string): Promise<ActionResult<VendorConnection>> {
  try {
    const { userId, connectionService } = await getAuthedVendor()
    const connection = await connectionService.accept(connectionId, userId)
    updateTag('vendor-connections')
    return { success: true, data: connection }
  } catch (e) {
    return handleActionError(e)
  }
}

export async function rejectConnectionRequest(connectionId: string): Promise<ActionResult> {
  try {
    const { userId, connectionService } = await getAuthedVendor()
    await connectionService.reject(connectionId, userId)
    updateTag('vendor-connections')
    return { success: true, data: undefined }
  } catch (e) {
    return handleActionError(e)
  }
}

export async function listConnectedCustomers(): Promise<ActionResult<VendorConnectedCustomer[]>> {
  try {
    const { connectionService } = await getAuthedVendor()
    const customers = await connectionService.listConnectedCustomers()
    return { success: true, data: customers }
  } catch (e) {
    return handleActionError(e)
  }
}

export async function getCustomerBatches(connectionId: string): Promise<ActionResult<VendorCustomerBatch[]>> {
  try {
    const { userId, connectionService } = await getAuthedVendor()
    const batches = await connectionService.getCustomerBatches(userId, connectionId)
    return { success: true, data: batches }
  } catch (e) {
    return handleActionError(e)
  }
}

export async function getCustomerBatchItems(batchId: string): Promise<ActionResult<VendorCustomerBatchItem[]>> {
  try {
    const { connectionService } = await getAuthedVendor()
    const items = await connectionService.getCustomerBatchItems(batchId)
    return { success: true, data: items }
  } catch (e) {
    return handleActionError(e)
  }
}

export async function listPendingPriceRequests(): Promise<ActionResult<VendorPriceRequest[]>> {
  try {
    const { userId, vendorAccount, priceRequestService } = await getAuthedVendor()
    const requests = await priceRequestService.listPending(userId, vendorAccount.id)
    return { success: true, data: requests }
  } catch (e) {
    return handleActionError(e)
  }
}

export async function resolvePriceRequest(requestId: string, unitPrice: number): Promise<ActionResult> {
  try {
    const { userId, priceRequestService } = await getAuthedVendor()
    await priceRequestService.resolve(requestId, userId, unitPrice)
    updateTag('vendor-account')
    updateTag('batches')
    return { success: true, data: undefined }
  } catch (e) {
    return handleActionError(e)
  }
}

export async function listVendorIssues(): Promise<ActionResult<VendorDispute[]>> {
  try {
    const { disputeService } = await getAuthedVendor()
    const disputes = await disputeService.listForVendor()
    return { success: true, data: disputes }
  } catch (e) {
    return handleActionError(e)
  }
}
