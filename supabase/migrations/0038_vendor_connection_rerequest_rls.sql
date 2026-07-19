-- VendorConnectionRepository.reRequest transitions a connection from
-- 'rejected' / 'cancelled' / 'disconnected' back to 'pending', running on
-- the customer's own RLS-scoped session (not the admin client). No existing
-- UPDATE policy on vendor_connections covers that transition — only
-- pending->cancelled and active->disconnected exist (0032) — so the update
-- silently matches zero rows under RLS. .single() then throws a
-- PostgrestError (not `instanceof Error`), which surfaces to the user as
-- the generic "Something went wrong" toast instead of a real error.
CREATE POLICY "Customer can re-request after rejection, cancellation, or disconnection"
  ON vendor_connections FOR UPDATE
  USING (auth.uid() = user_id AND status IN ('rejected', 'cancelled', 'disconnected'))
  WITH CHECK (auth.uid() = user_id AND status = 'pending');
