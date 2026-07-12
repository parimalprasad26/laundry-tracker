export type ItemType =
  | 'shirt' | 'pants' | 'dress' | 'jacket' | 'shorts'
  | 'socks' | 'underwear' | 'sweater' | 'suit' | 'other'

export type PaymentStatus = 'unpaid' | 'paid'

export type BudgetPeriod = 'weekly' | 'monthly' | 'yearly'

export type BatchStatus = 'draft' | 'in_laundry' | 'completed'

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
  estimated_return: string | null
  estimated_cost: number | null
  actual_cost: number | null
  payment_status: PaymentStatus
  price_delta_note: string | null
  receipt_path: string | null
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

export interface VendorItemPrice {
  id: string
  vendor_id: string
  user_id: string
  item_type: ItemType
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
  color: string | null
  brand: string | null
  notes: string | null
  primary_image_path: string | null
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
  created_at: string
  updated_at: string
  created_by: string | null
  updated_by: string | null
}

export interface BatchItemWithClosetItem extends BatchItem {
  closet_item: ClosetItem
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

// ── Shared ────────────────────────────────────────────────────────────
export interface CursorPage<T> {
  data: T[]
  nextCursor: string | null
  hasMore: boolean
}

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }
