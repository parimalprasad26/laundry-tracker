-- Fix: vendor comparison stats excluded batches returned item-by-item
-- because returned_at is only set by "Mark all returned", not individual toggles.
-- batch_with_status.status = 'completed' is the authoritative completion signal.
CREATE OR REPLACE FUNCTION get_vendor_comparison_stats(p_user_id uuid)
RETURNS TABLE (
  vendor_id             uuid,
  batch_count           bigint,
  avg_cost              numeric,
  total_spend           numeric,
  avg_turnaround_days   numeric,
  total_items_sent      bigint,
  total_damaged         bigint,
  total_missing         bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    b.vendor_id,
    COUNT(DISTINCT b.id)                                                       AS batch_count,
    AVG(b.actual_cost)                                                         AS avg_cost,
    SUM(b.actual_cost)                                                         AS total_spend,
    AVG(
      EXTRACT(EPOCH FROM (b.returned_at - b.sent_at)) / 86400.0
    ) FILTER (WHERE b.sent_at IS NOT NULL AND b.returned_at IS NOT NULL)       AS avg_turnaround_days,
    COALESCE(SUM(bi.quantity_sent), 0)                                         AS total_items_sent,
    COALESCE(SUM(bi.damaged_qty),   0)                                         AS total_damaged,
    COALESCE(SUM(bi.missing_qty),   0)                                         AS total_missing
  FROM laundry_batches b
  JOIN batch_with_status bws
         ON bws.id = b.id
        AND bws.status = 'completed'
  LEFT JOIN batch_items bi
         ON bi.batch_id = b.id
        AND bi.deleted_at IS NULL
  WHERE b.user_id    = p_user_id
    AND b.deleted_at IS NULL
    AND b.vendor_id  IS NOT NULL
  GROUP BY b.vendor_id
$$;
