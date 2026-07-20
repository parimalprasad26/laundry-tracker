-- Migration 0042: vendor_customer_batch_items() returned has_open_dispute
-- as a boolean (0040) — enough to hide the "Flag" button, but not enough
-- to link to the dispute's chat thread (Phase 4). Swaps it for the actual
-- dispute id (null when there isn't one); has_open_dispute is just
-- open_dispute_id != null now, derived client-side.
-- CREATE OR REPLACE cannot change a function's return columns — must drop
-- and recreate (same constraint hit in 0037 and 0040).
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
  open_dispute_id            UUID
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
    (
      SELECT bd.id FROM batch_disputes bd
      WHERE bd.batch_item_id = bi.id AND bd.status = 'open'
      LIMIT 1
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
