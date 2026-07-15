-- get_batches_ready_to_auto_close() had no LIMIT, so as batch volume grows this could
-- eventually return more rows than the cron route can process within Vercel's function
-- timeout in one invocation. Caps it at 200 per call — since this cron runs on a
-- recurring schedule, any backlog beyond that self-heals across subsequent runs rather
-- than needing pagination plumbed through the route. Ordering by returned_at ASC (already
-- in place) means the oldest, most-overdue batches are always processed first.
-- CREATE OR REPLACE preserves the function's OID (same zero-arg signature), so the
-- REVOKE/GRANT from migration 0024 locking this to service_role stays in effect.
CREATE OR REPLACE FUNCTION get_batches_ready_to_auto_close()
RETURNS SETOF batch_with_status
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT b.*
  FROM batch_with_status b
  LEFT JOIN user_inspection_policies p ON p.user_id = b.user_id
  WHERE b.status = 'returned'
    AND b.returned_at IS NOT NULL
    AND b.returned_at < NOW() - (COALESCE(p.auto_close_days, 30) || ' days')::interval
  ORDER BY b.returned_at ASC
  LIMIT 200
$$;
