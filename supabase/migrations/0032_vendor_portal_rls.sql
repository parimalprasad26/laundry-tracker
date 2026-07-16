-- Vendor Portal Phase 1 — RLS + column-level grants
--
-- Principle carried through every policy below: the existing
-- FOR ALL USING (auth.uid() = user_id) pattern remains correct for anything
-- that ISN'T a trust-boundary transition. Anywhere a column's value
-- determines CROSS-ACCOUNT authorization, it is written only by a server
-- action using the service-role client, with identity re-verified in the
-- service layer — RLS alone is not trusted for those specific writes.

ALTER TABLE vendor_accounts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_account_prices  ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_connections     ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_price_requests  ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────
-- vendor_accounts
-- ─────────────────────────────────────────────
-- Discoverable to anyone browsing (search), always visible to the vendor
-- themselves, and always visible to a customer who has ever connected — so
-- a customer's batch history keeps showing the vendor's name even if the
-- vendor later becomes non-discoverable.
CREATE POLICY "Vendor accounts are visible when discoverable, owned, or connected"
  ON vendor_accounts FOR SELECT
  USING (
    (onboarding_completed_at IS NOT NULL AND deleted_at IS NULL)
    OR auth.uid() = auth_user_id
    OR EXISTS (
      SELECT 1 FROM vendor_connections vc
      WHERE vc.vendor_account_id = vendor_accounts.id AND vc.user_id = auth.uid()
    )
  );

-- No INSERT/UPDATE/DELETE policy for `authenticated` at all. Vendor account
-- creation is invite-only via the service-role admin action; a vendor's own
-- profile edits (business_name/phone/address) go through a server action
-- using the service-role client after verifying auth.uid() = auth_user_id,
-- explicitly never including onboarding_completed_at in that action's
-- writable fields (VendorAccountService.updateOwnProfile).

-- ─────────────────────────────────────────────
-- vendor_account_prices
-- ─────────────────────────────────────────────
-- Deliberate, first-of-its-kind exception in this codebase: readable by any
-- authenticated user, not just the owner. The row carries no customer PII —
-- only (vendor_account_id, item_type, custom_type, unit_price) — and needs
-- to be visible during vendor discovery/search, before a customer connects.
-- "Readable by everyone" here must never be treated as an authorization
-- signal anywhere else in the app.
CREATE POLICY "Vendor prices are publicly readable"
  ON vendor_account_prices FOR SELECT USING (true);

CREATE POLICY "Vendor can insert own prices"
  ON vendor_account_prices FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM vendor_accounts va WHERE va.id = vendor_account_prices.vendor_account_id AND va.auth_user_id = auth.uid())
  );

CREATE POLICY "Vendor can update own prices"
  ON vendor_account_prices FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM vendor_accounts va WHERE va.id = vendor_account_prices.vendor_account_id AND va.auth_user_id = auth.uid())
  );

CREATE POLICY "Vendor can delete own prices"
  ON vendor_account_prices FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM vendor_accounts va WHERE va.id = vendor_account_prices.vendor_account_id AND va.auth_user_id = auth.uid())
  );

-- ─────────────────────────────────────────────
-- vendor_connections
-- ─────────────────────────────────────────────
CREATE POLICY "Customer creates own pending request"
  ON vendor_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Both parties can see a connection"
  ON vendor_connections FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM vendor_accounts va WHERE va.id = vendor_connections.vendor_account_id AND va.auth_user_id = auth.uid())
  );

-- Customer-safe self-service transitions only: cancelling their own
-- still-pending request, or disconnecting their own active connection.
-- Neither policy can ever reach 'active' — that transition (accept) is
-- written exclusively by VendorConnectionService using the service-role
-- client, after verifying auth.uid() = the target vendor account's
-- auth_user_id. RLS is a backstop for this table, not the sole gate, for
-- exactly that reason.
CREATE POLICY "Customer can cancel own pending request"
  ON vendor_connections FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id AND status = 'cancelled');

CREATE POLICY "Customer can disconnect own active connection"
  ON vendor_connections FOR UPDATE
  USING (auth.uid() = user_id AND status = 'active')
  WITH CHECK (auth.uid() = user_id AND status = 'disconnected');

-- ─────────────────────────────────────────────
-- vendor_price_requests
-- ─────────────────────────────────────────────
-- A customer can create a request only for a vendor they're actively
-- connected to — prevents spamming price requests at vendors they have no
-- relationship with.
CREATE POLICY "Connected customer can request a price"
  ON vendor_price_requests FOR INSERT
  WITH CHECK (
    auth.uid() = requested_by_user_id
    AND status = 'pending'
    AND EXISTS (
      SELECT 1 FROM vendor_connections vc
      WHERE vc.vendor_account_id = vendor_price_requests.vendor_account_id
        AND vc.user_id = auth.uid()
        AND vc.status = 'active'
    )
  );

CREATE POLICY "Vendor and requester can see a price request"
  ON vendor_price_requests FOR SELECT
  USING (
    auth.uid() = requested_by_user_id
    OR EXISTS (SELECT 1 FROM vendor_accounts va WHERE va.id = vendor_price_requests.vendor_account_id AND va.auth_user_id = auth.uid())
  );

-- No UPDATE policy for `authenticated`. Resolving a price request also has
-- to write batch_items (which the vendor has no RLS access to at all) and
-- vendor_account_prices, so the whole resolution is one service-role write
-- from VendorPriceRequestService.resolve(), after verifying the caller
-- owns the vendor account — the batch itself may already be closed by the
-- time the vendor responds, so this deliberately does not go through
-- BatchService.getEditable.

-- ─────────────────────────────────────────────
-- laundry_vendors.vendor_account_id — column-level privilege, independent
-- of and in addition to the table's existing row-level policy.
-- ─────────────────────────────────────────────
-- Without this, the customer-owned FOR ALL policy on laundry_vendors would
-- let any customer set vendor_account_id to any discoverable vendor's id
-- directly via their own session — self-granting a "connection" the vendor
-- never approved. The row is created and linked exclusively by
-- VendorConnectionService's service-role write, at acceptance time; every
-- other column on this row stays fully customer-writable as before.
REVOKE INSERT (vendor_account_id), UPDATE (vendor_account_id)
  ON laundry_vendors FROM authenticated;
GRANT INSERT (vendor_account_id), UPDATE (vendor_account_id)
  ON laundry_vendors TO service_role;

-- ─────────────────────────────────────────────
-- batch_items.pending_price_request_id — same reasoning: only the
-- service-role price-request resolution path may write this.
-- ─────────────────────────────────────────────
REVOKE INSERT (pending_price_request_id), UPDATE (pending_price_request_id)
  ON batch_items FROM authenticated;
GRANT INSERT (pending_price_request_id), UPDATE (pending_price_request_id)
  ON batch_items TO service_role;

-- ─────────────────────────────────────────────
-- New-table grants: table/sequence-level ALL to anon/authenticated/
-- service_role is already covered by 0030's ALTER DEFAULT PRIVILEGES for
-- any table created after that migration. The column-level REVOKEs above
-- narrow that default down for the two specific sensitive columns; nothing
-- further needed here. Verified empirically against the dev project as
-- part of this migration's rollout (same Data API smoke-test pattern used
-- when 0030 was first written).
-- ─────────────────────────────────────────────
