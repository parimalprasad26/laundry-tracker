-- Migration 0040: Phase 3 follow-ups found during live testing
--
-- 1. vendor_customer_batch_items() never told the vendor whether an item
--    already has an open dispute (either party) — so the "Flag" button
--    stayed clickable after the vendor had already flagged something,
--    relying entirely on the server-side guard in raiseAsVendor to reject
--    a second attempt with an error toast instead of just not offering it.
--    CREATE OR REPLACE cannot change a function's return columns (same
--    constraint hit in 0037) — must drop and recreate.
DROP FUNCTION IF EXISTS vendor_customer_batch_items(UUID);

CREATE FUNCTION vendor_customer_batch_items(p_batch_id UUID)
RETURNS TABLE (
  batch_item_id            UUID,
  quantity_sent             INT,
  quantity_returned         INT,
  damaged_qty                INT,
  missing_qty                 INT,
  unit_price                NUMERIC,
  pending_price_request_id  UUID,
  item_type                 item_type,
  custom_type                TEXT,
  has_open_dispute           BOOLEAN
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
    bi.damaged_qty,
    bi.missing_qty,
    bi.unit_price,
    bi.pending_price_request_id,
    ci.type,
    ci.custom_type,
    EXISTS (
      SELECT 1 FROM batch_disputes bd
      WHERE bd.batch_item_id = bi.id AND bd.status = 'open'
    )
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

REVOKE ALL ON FUNCTION vendor_customer_batch_items(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION vendor_customer_batch_items(UUID) TO authenticated;

-- 2. Defense-in-depth against the race where two concurrent requests (e.g.
--    the customer reporting damage and the vendor flagging the same item
--    at the same instant) both pass their "no open issue yet" application
--    check before either write commits. The app-level guards
--    (findOpenByItem in openDispute/openSwapDispute/reportBatchItemIssues/
--    raiseAsVendor) already prevent this in the common case; this closes
--    the gap at the database level for the rare concurrent case.
CREATE UNIQUE INDEX batch_disputes_one_open_per_item
  ON batch_disputes (batch_item_id)
  WHERE status = 'open';
