-- Migration 0020: Auto-close cron support
-- Adds a SQL function that returns all 'returned' batches whose inspection
-- window has expired, joined against each user's policy (default 30 days).

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
$$;
