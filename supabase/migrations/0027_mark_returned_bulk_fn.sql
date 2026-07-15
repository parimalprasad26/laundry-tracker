-- markAllReturned/markSelectivelyReturned each did one UPDATE per item in a
-- Promise.all loop — N round trips per collection, despite every item getting
-- essentially the same operation. A plain client-side bulk .update().in(...)
-- can't express this because the target value (quantity_sent) differs per
-- row; a SQL statement can, since it's just a column self-reference.
-- SECURITY INVOKER (the default) — unlike the auto-close cron function, this
-- never needs to cross user boundaries, so it runs under the caller's own
-- RLS-scoped session rather than elevated privilege.
CREATE OR REPLACE FUNCTION mark_batch_items_returned(
  p_batch_id uuid,
  p_user_id uuid,
  p_excluded_ids uuid[] DEFAULT '{}'
)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE batch_items
  SET quantity_returned = quantity_sent,
      returned_at = now(),
      updated_by = p_user_id
  WHERE batch_id = p_batch_id
    AND user_id = p_user_id
    AND quantity_returned < quantity_sent
    AND NOT (id = ANY(p_excluded_ids))
$$;
