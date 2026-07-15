-- get_vendor_comparison_stats accepted an arbitrary p_user_id and ran as SECURITY
-- DEFINER, so any authenticated user could call it directly via the PostgREST rpc/
-- endpoint with someone else's user id and read their vendor spend/damage stats.
-- Drop the parameter entirely (derive the user from auth.uid() instead of trusting
-- a caller-supplied id) and run as SECURITY INVOKER so RLS on the underlying tables
-- applies as a second, independent layer of defense.
DROP FUNCTION IF EXISTS get_vendor_comparison_stats(uuid);

CREATE FUNCTION get_vendor_comparison_stats()
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
         ON bws.id    = b.id
        AND bws.status = 'closed'
  LEFT JOIN batch_items bi
         ON bi.batch_id   = b.id
        AND bi.deleted_at IS NULL
  WHERE b.user_id    = auth.uid()
    AND b.deleted_at IS NULL
    AND b.vendor_id  IS NOT NULL
  GROUP BY b.vendor_id
$$;

-- get_batches_ready_to_auto_close() intentionally spans every user's batches (the
-- cron needs to see all of them in one pass) and must stay SECURITY DEFINER for that
-- reason — but it was left callable by any authenticated user via the public rpc/
-- endpoint, letting them enumerate other users' batches (id, vendor, cost, dates).
-- It's only ever meant to be called by the cron route's service-role admin client.
REVOKE EXECUTE ON FUNCTION get_batches_ready_to_auto_close() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION get_batches_ready_to_auto_close() TO service_role;
