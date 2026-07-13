-- Migration 0019: Collection model fix
-- The batch_with_status view previously derived 'returned' from
-- SUM(quantity_returned) = SUM(quantity_sent). With per-item collection
-- tracking (some items intentionally left at quantity_returned=0 because
-- they didn't come back), this would keep the batch stuck in 'in_laundry'.
--
-- Fix: use returned_at IS NOT NULL as the authoritative signal for 'returned'.
-- collectBatch sets returned_at on the batch regardless of shortfall, so this
-- correctly transitions the batch even when some items have quantity_returned=0.

DROP VIEW IF EXISTS batch_with_status;

CREATE VIEW batch_with_status AS
SELECT
  b.*,
  COALESCE(s.total_qty,    0) AS total_items,
  COALESCE(s.returned_qty, 0) AS returned_items,
  s.calculated_cost,
  CASE
    WHEN b.sent_at     IS NULL     THEN 'draft'
    WHEN b.closed_at   IS NOT NULL THEN 'closed'
    WHEN b.returned_at IS NOT NULL THEN 'returned'
    WHEN b.sent_at     IS NOT NULL
      AND COALESCE(s.total_qty, 0) > 0
      AND COALESCE(s.total_qty, 0) = COALESCE(s.returned_qty, 0) THEN 'returned'
    ELSE 'in_laundry'
  END AS status,
  v.name AS vendor_name
FROM laundry_batches b
LEFT JOIN (
  SELECT
    batch_id,
    SUM(quantity_sent)     AS total_qty,
    SUM(quantity_returned) AS returned_qty,
    SUM(unit_price * quantity_sent) FILTER (WHERE unit_price IS NOT NULL) AS calculated_cost
  FROM batch_items
  WHERE deleted_at IS NULL
  GROUP BY batch_id
) s ON s.batch_id = b.id
LEFT JOIN laundry_vendors v ON v.id = b.vendor_id AND v.deleted_at IS NULL
WHERE b.deleted_at IS NULL;
