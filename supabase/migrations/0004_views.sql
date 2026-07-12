-- ─────────────────────────────────────────────
-- Derived batch status view
-- status:
--   'draft'      = sent_at IS NULL
--   'in_laundry' = sent_at IS NOT NULL AND not all items returned
--   'completed'  = all items returned (and at least 1 item exists)
-- ─────────────────────────────────────────────
CREATE OR REPLACE VIEW batch_with_status AS
SELECT
  b.*,
  COALESCE(s.total_qty, 0)    AS total_items,
  COALESCE(s.returned_qty, 0) AS returned_items,
  CASE
    WHEN b.sent_at IS NULL                                                    THEN 'draft'
    WHEN COALESCE(s.total_qty, 0) > 0
      AND COALESCE(s.total_qty, 0) = COALESCE(s.returned_qty, 0)            THEN 'completed'
    ELSE                                                                           'in_laundry'
  END AS status,
  v.name AS vendor_name
FROM laundry_batches b
LEFT JOIN (
  SELECT
    batch_id,
    SUM(quantity)          AS total_qty,
    SUM(returned_quantity) AS returned_qty
  FROM clothing_items
  WHERE deleted_at IS NULL
  GROUP BY batch_id
) s ON s.batch_id = b.id
LEFT JOIN laundry_vendors v ON v.id = b.vendor_id AND v.deleted_at IS NULL
WHERE b.deleted_at IS NULL;
