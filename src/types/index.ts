export type ItemType =
  | 'shirt' | 'pants' | 'dress' | 'jacket' | 'shorts'
  | 'socks' | 'underwear' | 'sweater' | 'suit' | 'other'

export type PaymentStatus = 'unpaid' | 'paid'

export type BudgetPeriod = 'weekly' | 'monthly' | 'yearly'

export type BatchStatus = 'draft' | 'in_laundry' | 'returned' | 'closed'

export type BatchEventType =
  | 'batch.sent'
  | 'batch.collected'
  | 'batch.item_returned'
  | 'batch.all_returned'
  | 'batch.damage_reported'
  | 'batch.closed'
  | 'batch.auto_closed'
  | 'batch.dispute_opened'
  | 'batch.dispute_resolved'

export type DisputeStatus = 'open' | 'resolved' | 'dismissed'
export type DisputeType = 'damage' | 'swap'

export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface LaundryVendor {
  id: string
  user_id: string
  name: string
  phone: string | null
  address: string | null
  notes: string | null
  // Convenience pointer only — never authoritative for whether a connection
  // is active. Always check vendor_connections.status = 'active' live
  // (VendorConnectionRepository.findActiveByLaundryVendorId) before treating
  // this vendor as a connected platform vendor. See the vendor portal plan's
  // Finding 1 for why.
  vendor_account_id: string | null
  created_at: string
  updated_at: string
  created_by: string | null
  updated_by: string | null
}

export interface LaundryBatch {
  id: string
  user_id: string
  vendor_id: string | null
  name: string
  notes: string | null
  sent_at: string | null
  returned_at: string | null
  closed_at: string | null
  estimated_return: string | null
  estimated_cost: number | null
  actual_cost: number | null
  payment_status: PaymentStatus
  price_delta_note: string | null
  receipt_path: string | null
  version: number
  created_at: string
  updated_at: string
  created_by: string | null
  updated_by: string | null
}

export interface UserSettings {
  user_id: string
  budget_amount: number | null
  budget_period: BudgetPeriod
  reminder_threshold_days: number
  onboarding_completed: boolean
  created_at: string
  updated_at: string
}

export interface BatchWithStatus extends LaundryBatch {
  total_items: number
  returned_items: number
  calculated_cost: number | null
  status: BatchStatus
  vendor_name: string | null
}

export interface BatchEvent {
  id: string
  batch_id: string
  user_id: string
  event_type: BatchEventType
  payload: Record<string, unknown>
  created_at: string
}

export type DisputeRaisedByRole = 'customer' | 'vendor'

export interface BatchDispute {
  id: string
  batch_id: string
  batch_item_id: string
  user_id: string
  reported_at: string
  damaged_qty: number
  description: string | null
  dispute_type: DisputeType
  wrong_item_description: string | null
  status: DisputeStatus
  resolved_at: string | null
  resolution: string | null
  raised_by_role: DisputeRaisedByRole
  vendor_account_id: string | null
}

export interface BatchDisputeWithContext extends BatchDispute {
  batch_item: BatchItemWithClosetItem
  batch: { id: string; name: string }
}

export interface VendorDispute {
  dispute_id: string
  connection_id: string
  batch_id: string
  batch_name: string
  batch_item_id: string
  item_type: ItemType
  custom_type: string | null
  customer_name: string | null
  dispute_type: DisputeType
  damaged_qty: number
  description: string | null
  wrong_item_description: string | null
  raised_by_role: DisputeRaisedByRole
  status: DisputeStatus
  reported_at: string
  resolved_at: string | null
  resolution: string | null
}

export interface DisputeMessage {
  id: string
  dispute_id: string
  sender_role: DisputeRaisedByRole
  sender_user_id: string | null
  sender_vendor_account_id: string | null
  body: string
  created_at: string
  read_at: string | null
}

export interface InspectionPolicy {
  user_id: string
  inspection_window_days: number
  auto_close_days: number
  dispute_window_days: number
  updated_at: string
}

export interface VendorItemPrice {
  id: string
  vendor_id: string
  user_id: string
  item_type: ItemType
  custom_type: string | null
  unit_price: number
  created_at: string
  updated_at: string
  created_by: string | null
  updated_by: string | null
}

// ── Closet ──────────────────────────────────────────────────────────
export interface ClosetItem {
  id: string
  user_id: string
  name: string
  type: ItemType
  custom_type: string | null
  color: string | null
  brand: string | null
  notes: string | null
  primary_image_path: string | null
  photo_status: 'none' | 'pending' | 'uploaded' | 'failed'
  created_at: string
  updated_at: string
  created_by: string | null
  updated_by: string | null
}

// ── Batch Items ──────────────────────────────────────────────────────
export interface BatchItem {
  id: string
  batch_id: string
  closet_item_id: string
  user_id: string
  quantity_sent: number
  quantity_returned: number
  damaged_qty: number
  missing_qty: number
  unit_price: number | null
  notes: string | null
  returned_at: string | null
  issue_reported_at: string | null
  issue_reported_status: 'post_return' | 'dispute' | null
  created_at: string
  updated_at: string
  created_by: string | null
  updated_by: string | null
}

export interface BatchItemWithClosetItem extends BatchItem {
  closet_item: ClosetItem
}

export interface BatchItemWithIssueContext extends BatchItemWithClosetItem {
  batch: { id: string; name: string }
}

// ── Monthly summary ───────────────────────────────────────────────────
export interface MonthlySummary {
  year: number
  month: number
  batchCount: number
  totalItemsSent: number
  totalItemsReturned: number
  totalSpend: number
  avgTurnaroundDays: number | null
  topVendor: { name: string; batchCount: number } | null
  damagedCount: number
  missingCount: number
  notReturnedCount: number
}

// ── Spending trends ───────────────────────────────────────────────────
export interface SpendPeriodData {
  label: string
  spend: number
  batchCount: number
  isCurrent: boolean
}

// ── Vendor comparison ─────────────────────────────────────────────────
export interface VendorComparisonStats {
  batchCount: number
  avgCost: number | null
  totalSpend: number
  avgTurnaroundDays: number | null
  totalItemsSent: number
  totalDamaged: number
  totalMissing: number
  damageRate: number | null
  missingRate: number | null
}

export interface MissingCustomPrice {
  customType: string
  batchItemIds: string[]
}

// ── Vendor Portal ───────────────────────────────────────────────────────
export type VendorConnectionStatus = 'pending' | 'active' | 'rejected' | 'cancelled' | 'disconnected'

export interface VendorAccount {
  id: string
  auth_user_id: string
  business_name: string
  phone: string | null
  address: string | null
  onboarding_completed_at: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface VendorAccountPrice {
  id: string
  vendor_account_id: string
  item_type: ItemType
  custom_type: string | null
  unit_price: number
  created_at: string
  updated_at: string
  created_by: string | null
  updated_by: string | null
}

export interface VendorConnection {
  id: string
  user_id: string
  vendor_account_id: string
  laundry_vendor_id: string | null
  status: VendorConnectionStatus
  requested_at: string
  responded_at: string | null
  disconnected_at: string | null
  created_at: string
  updated_at: string
}

export interface VendorPriceRequest {
  id: string
  vendor_account_id: string
  custom_type: string
  status: 'pending' | 'approved'
  requested_by_user_id: string
  resolved_unit_price: number | null
  resolved_at: string | null
  requested_at: string
}

export interface VendorSearchResult {
  vendor_account_id: string
  business_name: string
  address: string | null
  similarity: number
}

export interface VendorConnectedCustomer {
  connection_id: string
  customer_name: string | null
  customer_avatar: string | null
  laundry_vendor_id: string
  connected_since: string | null
}

export interface VendorCustomerBatch {
  batch_id: string
  name: string
  notes: string | null
  sent_at: string | null
  returned_at: string | null
  closed_at: string | null
  total_items: number
  returned_items: number
}

export interface VendorCustomerBatchItem {
  batch_item_id: string
  quantity_sent: number
  quantity_returned: number
  damaged_qty: number
  missing_qty: number
  unit_price: number | null
  pending_price_request_id: string | null
  item_type: ItemType
  custom_type: string | null
  open_dispute_id: string | null
}

// ── Shared ────────────────────────────────────────────────────────────
export interface CursorPage<T> {
  data: T[]
  nextCursor: string | null
  hasMore: boolean
}

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }
