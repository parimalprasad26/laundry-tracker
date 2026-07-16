-- Vendor Portal Phase 1 — pending connection requests with customer display
-- info. profiles RLS is strictly owner-scoped (auth.uid() = id, no
-- cross-account read policy exists) — a vendor's own session cannot read a
-- customer's full_name/avatar_url directly. Mirrors vendor_connected_customers()
-- (0033) but for status = 'pending' instead of 'active', kept as its own
-- single-purpose function rather than a parameterized one, consistent with
-- this codebase's existing SECURITY DEFINER functions (get_vendor_comparison_stats
-- etc. also take no parameters, deriving everything from auth.uid()).

CREATE FUNCTION vendor_pending_requests()
RETURNS TABLE (
  connection_id UUID,
  customer_name TEXT,
  requested_at  TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    vc.id,
    p.full_name,
    vc.requested_at
  FROM vendor_connections vc
  JOIN vendor_accounts va ON va.id = vc.vendor_account_id
  JOIN profiles p ON p.id = vc.user_id
  WHERE va.auth_user_id = auth.uid()
    AND vc.status = 'pending'
  ORDER BY vc.requested_at ASC;
$$;

REVOKE ALL ON FUNCTION vendor_pending_requests() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION vendor_pending_requests() TO authenticated;
