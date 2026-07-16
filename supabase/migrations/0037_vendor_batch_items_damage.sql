-- Fix: vendor_customer_batch_items (0033) never returned damaged_qty/
-- missing_qty — a vendor's read-only view into a connected customer's
-- batch showed quantities and price but nothing about damage the customer
-- had already reported, even though that's squarely within Phase 1's
-- stated scope ("vendor's read-only view into connected customers'
-- batches"), not the Phase 2+ "vendor-raised issues" feature. Caught by
-- manual testing, not code review.
-- CREATE OR REPLACE cannot change a function's return columns — must drop
-- and recreate.
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
    bi.damaged_qty,
    bi.missing_qty,
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
