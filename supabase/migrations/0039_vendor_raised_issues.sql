-- Migration 0039: vendor-raised issues (Phase 3)
--
-- batch_disputes previously assumed every row was customer-raised (user_id
-- was always the reporting customer, no way to represent "the vendor
-- flagged this"). Adds raised_by_role + vendor_account_id so a vendor can
-- raise an issue against a connected customer's item, while user_id keeps
-- pointing at the customer (preserves the existing "own batch disputes" RLS
-- policy and every existing customer-facing query unchanged).
--
-- Vendor-raised rows are always inserted via DisputeService.raiseAsVendor
-- through the service-role admin client (mirrors VendorConnectionService /
-- VendorPriceRequestService — vendor writes into customer-owned tables
-- never go through the vendor's own RLS-scoped session). Customer-session
-- inserts/updates never reference these two columns, and per 0034's lesson
-- (a column-level REVOKE alone does nothing against a pre-existing
-- table-level grant — batch_disputes predates 0030's blanket grant),
-- authenticated's table-level INSERT/UPDATE on batch_disputes is narrowed
-- to exactly the columns the customer session actually writes.

ALTER TABLE batch_disputes
  ADD COLUMN raised_by_role text NOT NULL DEFAULT 'customer'
    CHECK (raised_by_role IN ('customer', 'vendor')),
  ADD COLUMN vendor_account_id uuid REFERENCES vendor_accounts(id),
  ADD CONSTRAINT batch_disputes_vendor_account_matches_role
    CHECK ((raised_by_role = 'vendor') = (vendor_account_id IS NOT NULL));

REVOKE INSERT, UPDATE ON batch_disputes FROM authenticated;

GRANT INSERT (
  batch_id, batch_item_id, user_id, damaged_qty, description,
  dispute_type, wrong_item_description
) ON batch_disputes TO authenticated;

GRANT UPDATE (status, resolution, resolved_at) ON batch_disputes TO authenticated;

-- raised_by_role and vendor_account_id are deliberately absent from both
-- column lists above — vendor-raised rows are written and resolved only by
-- service_role, via DisputeService.raiseAsVendor/resolveAsVendor.

-- ─────────────────────────────────────────────
-- Vendor read access — vendor_all_disputes()
-- Mirrors vendor_connected_customers()/vendor_customer_batch_items() (0033):
-- derives vendor identity from auth.uid() internally, never trusts a
-- caller-supplied id, returns only the narrow shape the Issues tab needs.
-- ─────────────────────────────────────────────
CREATE FUNCTION vendor_all_disputes()
RETURNS TABLE (
  dispute_id              UUID,
  connection_id           UUID,
  batch_id                UUID,
  batch_name              TEXT,
  batch_item_id           UUID,
  item_type                item_type,
  custom_type              TEXT,
  customer_name            TEXT,
  dispute_type             TEXT,
  damaged_qty              INT,
  description              TEXT,
  wrong_item_description   TEXT,
  raised_by_role           TEXT,
  status                   TEXT,
  reported_at              TIMESTAMPTZ,
  resolved_at              TIMESTAMPTZ,
  resolution               TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    bd.id,
    vc.id,
    b.id,
    b.name,
    bd.batch_item_id,
    ci.type,
    ci.custom_type,
    p.full_name,
    bd.dispute_type,
    bd.damaged_qty,
    bd.description,
    bd.wrong_item_description,
    bd.raised_by_role,
    bd.status,
    bd.reported_at,
    bd.resolved_at,
    bd.resolution
  FROM batch_disputes bd
  JOIN laundry_batches b ON b.id = bd.batch_id
  JOIN vendor_connections vc ON vc.laundry_vendor_id = b.vendor_id
  JOIN vendor_accounts va ON va.id = vc.vendor_account_id
  JOIN batch_items bi ON bi.id = bd.batch_item_id
  JOIN closet_items ci ON ci.id = bi.closet_item_id
  JOIN profiles p ON p.id = bd.user_id
  WHERE va.auth_user_id = auth.uid()
    AND vc.status = 'active'
    AND b.deleted_at IS NULL
  ORDER BY bd.reported_at DESC;
$$;

REVOKE ALL ON FUNCTION vendor_all_disputes() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION vendor_all_disputes() TO authenticated;
