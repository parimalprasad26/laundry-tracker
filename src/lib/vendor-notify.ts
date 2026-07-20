import type { SupabaseClient } from '@supabase/supabase-js'
import { VendorConnectionRepository } from '@/repositories/VendorConnectionRepository'
import { VendorAccountRepository } from '@/repositories/VendorAccountRepository'
import { sendPushToUser } from '@/lib/push-notify'

export interface VendorNotification {
  title: string
  body: string
  tag: string
}

// Connection status is re-derived live, never read off
// laundry_vendors.vendor_account_id alone (that column is a convenience
// pointer only, not authoritative — see the vendor portal plan's Finding 1).
// Silently no-ops when there's no active connection — a private,
// unconnected vendor has nothing to notify, and that's not an error.
//
// vendor_accounts.id (used everywhere in the connections code) is NOT the
// same id as a vendor's auth.uid() — push_subscriptions is keyed by
// auth.uid(), so this resolves through vendor_accounts.auth_user_id before
// looking anything up. Easy to get wrong; this is the one place that hop
// needs to happen.
export async function notifyConnectedVendor(
  admin: SupabaseClient,
  laundryVendorId: string,
  batchId: string,
  notification: VendorNotification,
  urlOverride?: string
): Promise<void> {
  const connectionRepo = new VendorConnectionRepository(admin)
  const connection = await connectionRepo.findActiveByLaundryVendorId(laundryVendorId)
  if (!connection) return

  const vendorAccount = await new VendorAccountRepository(admin).findById(connection.vendor_account_id)
  if (!vendorAccount) return

  await sendPushToUser(admin, vendorAccount.auth_user_id, {
    ...notification,
    url: urlOverride ?? `/vendor/customers/${connection.id}/${batchId}`,
  })
}

// For connection-request and price-request events, which don't have a
// laundry_vendor_id to resolve through (a request isn't tied to a batch —
// see notifyConnectedVendor above for that case). Resolves vendor_account_id
// -> auth_user_id the same way, since push_subscriptions is keyed by the
// latter, not the former.
export async function notifyVendorAccount(
  admin: SupabaseClient,
  vendorAccountId: string,
  notification: VendorNotification & { url: string }
): Promise<void> {
  const vendorAccount = await new VendorAccountRepository(admin).findById(vendorAccountId)
  if (!vendorAccount) return
  await sendPushToUser(admin, vendorAccount.auth_user_id, notification)
}
