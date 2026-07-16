-- Fix: infinite recursion detected in policy for relation "vendor_accounts".
--
-- vendor_accounts' SELECT policy (0032) queries vendor_connections to check
-- "is the caller a connected customer" — but vendor_connections' SELECT
-- policy (also 0032) queries vendor_accounts right back, to check "does the
-- caller own the vendor account this connection points to." Evaluating
-- either policy requires evaluating the other, forever. Verified live
-- against the dev project: any query touching vendor_accounts or
-- vendor_connections failed with Postgres error 42P17.
--
-- Fix: a SECURITY DEFINER function that looks up the caller's own vendor
-- account id, bypassing RLS internally (it runs as the function owner, not
-- the caller), so using it in vendor_connections' policy no longer
-- re-triggers vendor_accounts' policy at all — breaking the cycle.

CREATE FUNCTION my_vendor_account_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT id FROM vendor_accounts WHERE auth_user_id = auth.uid() AND deleted_at IS NULL LIMIT 1;
$$;

REVOKE ALL ON FUNCTION my_vendor_account_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION my_vendor_account_id() TO authenticated;

DROP POLICY "Both parties can see a connection" ON vendor_connections;

CREATE POLICY "Both parties can see a connection"
  ON vendor_connections FOR SELECT
  USING (
    auth.uid() = user_id
    OR vendor_account_id = my_vendor_account_id()
  );
