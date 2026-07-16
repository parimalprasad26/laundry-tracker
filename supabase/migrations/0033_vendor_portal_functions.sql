-- Vendor Portal Phase 1 — cross-account read functions
--
-- The vendor's read access into a connected customer's batch data is the
-- single highest-risk piece of this feature. A vendor's own authenticated
-- session is granted NO new row-level policy on laundry_batches,
-- batch_items, or closet_items — RLS is row-level, not column-level, so a
-- policy that admits a row for the vendor case would let their session
-- query closet_items directly and see full rows (name, color, brand,
-- notes, primary_image_path), not just the item_type/custom_type the
-- feature actually needs. A "narrow view" on top of a row-level-open base
-- table doesn't prevent that — the client can just query the base table
-- instead of the view with the same session.
--
-- Every cross-account read a vendor needs is instead exposed through a
-- small number of SECURITY DEFINER functions, following the exact pattern
-- already established in this codebase by get_vendor_comparison_stats()
-- (0011) and get_batches_ready_to_auto_close() (0020/0024): derive identity
-- from auth.uid() internally, do the authorization check inline against a
-- live vendor_connections row, and return only the exact columns needed.
-- Any caller-supplied id (p_connection_id, p_batch_id) is always
-- cross-checked against that auth.uid()-derived identity in the same WHERE
-- clause — never trusted on its own, which is the exact bug class 0024
-- fixed.

CREATE FUNCTION vendor_connected_customers()
RETURNS TABLE (
  connection_id     UUID,
  customer_name     TEXT,
  customer_avatar   TEXT,
  laundry_vendor_id UUID,
  connected_since   TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    vc.id,
    p.full_name,
    p.avatar_url,
    vc.laundry_vendor_id,
    vc.responded_at
  FROM vendor_connections vc
  JOIN vendor_accounts va ON va.id = vc.vendor_account_id
  JOIN profiles p ON p.id = vc.user_id
  WHERE va.auth_user_id = auth.uid()
    AND vc.status = 'active'
  ORDER BY vc.responded_at DESC NULLS LAST;
$$;

CREATE FUNCTION vendor_customer_batches(p_connection_id UUID)
RETURNS TABLE (
  batch_id       UUID,
  name           TEXT,
  notes          TEXT,
  sent_at        TIMESTAMPTZ,
  returned_at    TIMESTAMPTZ,
  closed_at      TIMESTAMPTZ,
  total_items    BIGINT,
  returned_items BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    b.id,
    b.name,
    b.notes,
    b.sent_at,
    b.returned_at,
    b.closed_at,
    COALESCE(s.total_qty, 0),
    COALESCE(s.returned_qty, 0)
  FROM vendor_connections vc
  JOIN vendor_accounts va ON va.id = vc.vendor_account_id
  JOIN laundry_batches b ON b.vendor_id = vc.laundry_vendor_id
  LEFT JOIN (
    SELECT batch_id, SUM(quantity_sent) AS total_qty, SUM(quantity_returned) AS returned_qty
    FROM batch_items WHERE deleted_at IS NULL GROUP BY batch_id
  ) s ON s.batch_id = b.id
  WHERE vc.id = p_connection_id
    AND va.auth_user_id = auth.uid()
    AND vc.status = 'active'
    AND b.sent_at IS NOT NULL   -- vendor never sees a draft batch not yet sent to them
    AND b.deleted_at IS NULL
  ORDER BY b.sent_at DESC;
$$;

CREATE FUNCTION vendor_customer_batch_items(p_batch_id UUID)
RETURNS TABLE (
  batch_item_id            UUID,
  quantity_sent            INT,
  quantity_returned        INT,
  unit_price                NUMERIC,
  pending_price_request_id  UUID,
  item_type                 item_type,
  custom_type                TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    bi.id,
    bi.quantity_sent,
    bi.quantity_returned,
    bi.unit_price,
    bi.pending_price_request_id,
    ci.type,
    ci.custom_type
  FROM laundry_batches b
  JOIN vendor_connections vc ON vc.laundry_vendor_id = b.vendor_id
  JOIN vendor_accounts va ON va.id = vc.vendor_account_id
  JOIN batch_items bi ON bi.batch_id = b.id AND bi.deleted_at IS NULL
  JOIN closet_items ci ON ci.id = bi.closet_item_id
  WHERE b.id = p_batch_id
    AND va.auth_user_id = auth.uid()
    AND vc.status = 'active'
    AND b.deleted_at IS NULL;
$$;

-- These functions intentionally return only the narrow shape needed by the
-- vendor portal — never full closet_items rows and never any other
-- customer's data, since every query re-derives the caller's identity via
-- auth.uid() rather than trusting the parameters alone.
REVOKE ALL ON FUNCTION vendor_connected_customers() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION vendor_connected_customers() TO authenticated;

REVOKE ALL ON FUNCTION vendor_customer_batches(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION vendor_customer_batches(UUID) TO authenticated;

REVOKE ALL ON FUNCTION vendor_customer_batch_items(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION vendor_customer_batch_items(UUID) TO authenticated;

-- ─────────────────────────────────────────────
-- Fuzzy vendor search (pg_trgm) — SECURITY INVOKER, since the
-- "discoverable" branch of vendor_accounts' own SELECT policy already
-- permits this for any authenticated user; this function only adds
-- trigram-similarity ordering on top of what RLS already allows.
-- ─────────────────────────────────────────────
CREATE FUNCTION search_vendor_accounts(p_query TEXT)
RETURNS TABLE (
  vendor_account_id UUID,
  business_name     TEXT,
  address           TEXT,
  similarity        REAL
)
LANGUAGE sql
STABLE
AS $$
  SELECT id, business_name, address, similarity(business_name, p_query) AS similarity
  FROM vendor_accounts
  WHERE onboarding_completed_at IS NOT NULL
    AND deleted_at IS NULL
    AND business_name % p_query
  ORDER BY similarity DESC
  LIMIT 20;
$$;

REVOKE ALL ON FUNCTION search_vendor_accounts(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION search_vendor_accounts(TEXT) TO authenticated;
