-- Migration 0041: Phase 4 — real-time dispute chat
--
-- Every vendor-facing read/write since Phase 1 has deliberately avoided
-- giving a vendor's session a direct RLS policy on a customer-owned table —
-- reads go through narrow SECURITY DEFINER functions, writes go through the
-- internally-held admin client after re-verifying ownership in the service
-- layer (0033's comment explains why: a row-level-open policy on a table
-- with unrelated sensitive columns would let a vendor's session see
-- everything in the row, not just the narrow slice a function exposes).
--
-- dispute_messages is a deliberate exception. Every column here (body,
-- sender_role, created_at) is already meant to be visible to both parties
-- of that specific dispute — there's no adjacent sensitive column to leak
-- the way batch_items/closet_items/laundry_vendors have. So both sides get
-- genuine RLS SELECT/INSERT policies directly. This is also a hard
-- requirement, not just a simplification: Supabase Realtime's
-- postgres_changes authorizes each subscriber against RLS on the table
-- directly — it cannot authorize through a SECURITY DEFINER function, so a
-- table only the admin client could write to would be a table Realtime
-- could never push to a vendor's browser at all.

CREATE TABLE dispute_messages (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id               uuid NOT NULL REFERENCES batch_disputes(id) ON DELETE CASCADE,
  sender_role              text NOT NULL CHECK (sender_role IN ('customer', 'vendor')),
  sender_user_id           uuid REFERENCES auth.users(id),
  sender_vendor_account_id uuid REFERENCES vendor_accounts(id),
  body                     text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  created_at               timestamptz NOT NULL DEFAULT now(),
  read_at                  timestamptz,
  CONSTRAINT dispute_messages_sender_matches_role CHECK (
    (sender_role = 'customer') = (sender_user_id IS NOT NULL)
    AND (sender_role = 'vendor') = (sender_vendor_account_id IS NOT NULL)
  )
);

CREATE INDEX dispute_messages_dispute_idx ON dispute_messages(dispute_id, created_at);

ALTER TABLE dispute_messages ENABLE ROW LEVEL SECURITY;

-- ── Read: history stays visible even after a disconnect — no active-
-- connection requirement here, only on INSERT below. Disputes and their
-- discussion aren't erased just because the relationship ended. ──

CREATE POLICY "Customer reads own dispute messages"
  ON dispute_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM batch_disputes bd
      WHERE bd.id = dispute_messages.dispute_id AND bd.user_id = auth.uid()
    )
  );

CREATE POLICY "Vendor reads messages on disputes tied to their batches"
  ON dispute_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM batch_disputes bd
      JOIN laundry_batches b ON b.id = bd.batch_id
      JOIN vendor_connections vc ON vc.laundry_vendor_id = b.vendor_id
      JOIN vendor_accounts va ON va.id = vc.vendor_account_id
      WHERE bd.id = dispute_messages.dispute_id AND va.auth_user_id = auth.uid()
    )
  );

-- ── Write: requires the dispute to still be open AND the connection to
-- still be active — this is what naturally freezes a thread after a
-- disconnect, on both sides, with no separate disconnect-time cleanup step
-- (unlike the vendor-raised-dispute fix in migration 0039/0040's era,
-- which needed one because that guard lived in application code, not RLS). ──

CREATE POLICY "Customer posts on own open dispute while connected"
  ON dispute_messages FOR INSERT
  WITH CHECK (
    sender_role = 'customer'
    AND sender_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM batch_disputes bd
      JOIN laundry_batches b ON b.id = bd.batch_id
      JOIN vendor_connections vc ON vc.laundry_vendor_id = b.vendor_id
      WHERE bd.id = dispute_id
        AND bd.user_id = auth.uid()
        AND bd.status = 'open'
        AND vc.status = 'active'
    )
  );

CREATE POLICY "Vendor posts on connected open dispute while connected"
  ON dispute_messages FOR INSERT
  WITH CHECK (
    sender_role = 'vendor'
    AND EXISTS (
      SELECT 1 FROM batch_disputes bd
      JOIN laundry_batches b ON b.id = bd.batch_id
      JOIN vendor_connections vc ON vc.laundry_vendor_id = b.vendor_id
      JOIN vendor_accounts va ON va.id = vc.vendor_account_id
      WHERE bd.id = dispute_id
        AND bd.status = 'open'
        AND vc.status = 'active'
        AND va.auth_user_id = auth.uid()
        AND va.id = sender_vendor_account_id
    )
  );

-- ── Read receipts: each party can only mark the OTHER party's messages as
-- read, on a dispute they're actually part of. ──

CREATE POLICY "Customer marks vendor messages read on own dispute"
  ON dispute_messages FOR UPDATE
  USING (
    sender_role = 'vendor'
    AND EXISTS (
      SELECT 1 FROM batch_disputes bd
      WHERE bd.id = dispute_messages.dispute_id AND bd.user_id = auth.uid()
    )
  )
  WITH CHECK (sender_role = 'vendor');

CREATE POLICY "Vendor marks customer messages read on connected dispute"
  ON dispute_messages FOR UPDATE
  USING (
    sender_role = 'customer'
    AND EXISTS (
      SELECT 1 FROM batch_disputes bd
      JOIN laundry_batches b ON b.id = bd.batch_id
      JOIN vendor_connections vc ON vc.laundry_vendor_id = b.vendor_id
      JOIN vendor_accounts va ON va.id = vc.vendor_account_id
      WHERE bd.id = dispute_messages.dispute_id AND va.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (sender_role = 'customer');

-- An UPDATE policy's USING/WITH CHECK constrains which ROWS can be touched
-- and what the row must look like afterward — it does not restrict which
-- COLUMNS a statement may set. Without this, the table-level UPDATE grant
-- authenticated already holds (0030's blanket default-privileges grant
-- applies to every new table) would let either policy above rewrite body/
-- sender_role/etc. on a row it's allowed to touch at all, not just read_at.
-- Same lesson as 0034/0039 — narrow the table-level grant to the one
-- column the app actually writes via UPDATE.
REVOKE UPDATE ON dispute_messages FROM authenticated;
GRANT UPDATE (read_at) ON dispute_messages TO authenticated;

-- Enable Realtime delivery for this table specifically.
ALTER PUBLICATION supabase_realtime ADD TABLE dispute_messages;

-- ── Vendor pre-send context — a vendor's own session has no RLS access to
-- batch_disputes at all (its only policy is "own batch disputes" scoped to
-- the customer's user_id), so DisputeChatService.sendAsVendor can't read
-- "is this dispute still open / still connected" itself to give a clean
-- error before attempting the write the way raiseAsVendor's pre-checks do.
-- Mirrors the existing vendor-read pattern (vendor_all_disputes,
-- vendor_customer_batch_items etc.) rather than reaching for the admin
-- client, which this codebase reserves for writes, not reads. The actual
-- authorization is still enforced by the INSERT policies above regardless
-- of what this returns — this is purely for a clean error message.
CREATE FUNCTION vendor_dispute_context(p_dispute_id UUID)
RETURNS TABLE (
  dispute_status    TEXT,
  connection_active BOOLEAN,
  vendor_account_id UUID
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    bd.status,
    (vc.status = 'active'),
    va.id
  FROM batch_disputes bd
  JOIN laundry_batches b ON b.id = bd.batch_id
  JOIN vendor_connections vc ON vc.laundry_vendor_id = b.vendor_id
  JOIN vendor_accounts va ON va.id = vc.vendor_account_id
  WHERE bd.id = p_dispute_id
    AND va.auth_user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION vendor_dispute_context(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION vendor_dispute_context(UUID) TO authenticated;
