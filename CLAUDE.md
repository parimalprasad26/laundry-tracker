@AGENTS.md

# Laundry Tracker — Developer Guide

## Architecture

Every write operation flows through the same three-layer chain:

```
Client Component → Server Action → Service → Repository → Supabase DB
    (UI/form)       (auth gate)   (logic)    (SQL only)
```

- **Repository** — raw Supabase queries only. No business logic.
- **Service** — business rules, validation, composes repositories.
- **Server Action** — `'use server'`, authenticates the session, calls the service, calls `updateTag()` to bust cache.
- **Server Components (pages)** — call services directly, not actions (they already run server-side).

## Key Files

| Area | Files |
|------|-------|
| Batch CRUD | `actions/batches.ts` → `services/BatchService.ts` → `repositories/BatchRepository.ts` |
| Batch items | `actions/batch-items.ts` → `services/BatchItemService.ts` → `repositories/BatchItemRepository.ts` |
| Closet | `actions/closet.ts` → `services/ClosetService.ts` → `repositories/ClosetRepository.ts` |
| Vendors | `actions/vendors.ts` → `services/VendorService.ts` → `repositories/VendorRepository.ts` |
| Vendor pricing | `actions/vendor-prices.ts` → `services/VendorPriceService.ts` → `repositories/VendorPriceRepository.ts` |
| Payments | `actions/batches.ts#recordBatchPayment` |
| Budget | `actions/user-settings.ts` → `services/UserSettingsService.ts` → `repositories/UserSettingsRepository.ts` |
| Calendar | `actions/batches.ts#getBatchesForMonth` → `repositories/BatchRepository.ts#findForMonth` |

## Database

### Core tables

- `closet_items` — user's permanent wardrobe items
- `laundry_batches` — a single drop-off to the laundry
- `batch_items` — join between a batch and a closet item; holds `unit_price`, `quantity_sent`, `quantity_returned`
- `laundry_vendors` — laundry shops
- `vendor_item_prices` — per-type pricing for a vendor (shirt ₹30, pants ₹50, etc.)
- `user_settings` — `budget_amount`, `budget_period` (weekly/monthly/yearly)

All tables have: `user_id`, `created_at`, `updated_at`, `created_by`, `updated_by`, `deleted_at` (soft delete).

### `batch_with_status` view — critical invariant

Status is never stored. It is computed live by the view every query:

```sql
sent_at IS NULL                              → 'draft'
sent_at IS NOT NULL, total != returned       → 'in_laundry'
sent_at IS NOT NULL, total == returned       → 'completed'
```

The view also computes `total_items`, `returned_items`, `calculated_cost` (sum of `unit_price * quantity_sent`), and joins `vendor_name`.

**Important**: any migration that alters a column or enum used by this view must `DROP VIEW IF EXISTS batch_with_status` first and recreate it at the end. The enum `payment_status` is one such column.

### `returned_at` on `laundry_batches`

- Set to `now()` by `markAllBatchItemsReturned` action.
- Cleared to `null` by `setBatchItemReturned` if any item's `quantity_returned` drops below `quantity_sent`.
- Used to anchor budget spend — a batch counts toward the current period if `sent_at >= period_start` and `actual_cost IS NOT NULL`.

### `calculated_cost` vs `actual_cost`

- `calculated_cost` — live, computed by view from item `unit_price * quantity_sent`. Changes whenever a price is edited.
- `actual_cost` — recorded once when payment is made, stored permanently on `laundry_batches`. Anchors budget tracking.

**Prices are locked on completed batches** — `BatchItemCard` disables the price tap and hides the `⋮` menu when `batchStatus === 'completed'`. Do not remove this guard.

## Payment Flow

Two triggers for the payment sheet:

1. **Send to laundry** → `PayNowPromptSheet` appears ("Did you pay upfront?")
   - "Yes" → `RecordPaymentSheet` opens immediately → sets `actual_cost` + `payment_status = 'paid'`
   - "No" → batch goes `in_laundry` with `actual_cost = null`

2. **All returned** → if `actual_cost == null`, `RecordPaymentSheet` auto-opens
   - If already paid (upfront flow), just shows success toast

`RecordPaymentSheet` always sets `payment_status = 'paid'`. There is no `partial` status.

## Budget Spend Calculation

`getCurrentPeriodSpend(period)` in `actions/user-settings.ts`:

- Filters `laundry_batches` where `sent_at >= period_start` AND `actual_cost IS NOT NULL`
- **Anchored to `sent_at`**, not `returned_at` — this ensures upfront-paid batches (which have `actual_cost` set but `returned_at = null`) are counted immediately.
- Weekly period starts on **Monday** (not Sunday). `diff = day === 0 ? 6 : day - 1`.
- `period` is passed in from the dashboard (not re-fetched inside the action).

## Closet Delete Guard

`deleteClosetItem` checks `ClosetRepository.hasActiveBatchItems(id)` before deleting. An item is "active" if it appears in any batch with status `draft` or `in_laundry`. The check is a two-step query: get batch_ids for this item, then check `batch_with_status` for any in those statuses.

## Vendor Payment Notes

When `actual_cost` differs from `calculated_cost` by ≥ ₹0.01, `RecordPaymentSheet` shows a delta banner. The user can optionally add a `price_delta_note` which is saved on the batch. `VendorPaymentNotes` component shows all such notes for a vendor with average delta analysis.

## Cache Tags

`updateTag()` (Next.js 16 — not `revalidateTag`) is called after every mutation:

| Tag | When invalidated |
|-----|-----------------|
| `'batches'` | batch created, updated, deleted |
| `'batch-{id}'` | items added/priced/returned, payment recorded |
| `'vendors'` | vendor created, updated, deleted |
| `'user-settings-{userId}'` | budget saved |

## useState Sync Pattern

Client components that receive server data as props and mutate it optimistically need `useEffect` to sync after `router.refresh()`. Example from `BatchItemCard`:

```ts
useEffect(() => { setReturned(item.quantity_returned) }, [item.quantity_returned])
useEffect(() => {
  if (!editingPrice) {
    setUnitPrice(item.unit_price)
    setPriceInput(item.unit_price != null ? String(item.unit_price) : '')
  }
}, [item.unit_price])
```

Without this, `router.refresh()` updates the server data but the component's local state stays stale.

## maybeSingle() vs single()

All `findById` repository methods use `.maybeSingle()` (returns `null` when no row) not `.single()` (throws PGRST116 when no row). Never change this.

## Migrations

Migration files live in `supabase/migrations/`. Current files:

- `0001_schema.sql` — base tables, enums, triggers
- `0002_rls.sql` — Row Level Security
- `0003_search.sql` — full-text search
- `0004_views.sql` — `batch_with_status` view (original)
- `0005_closet.sql` — closet items, batch_items refactor
- `0006_vendor_pricing.sql` — vendor_item_prices, ApplyVendorPrices
- `0007_budget_and_dates.sql` — removes `partial` payment status, adds `returned_at` + `price_delta_note` to batches, adds `user_settings`
