-- Migration 0043: lock down vendor_connections columns
--
-- Same bug class already fixed twice (0034, 0039): a column-level REVOKE
-- has no effect against the table-level GRANT ALL every table gets at
-- creation via 0030's ALTER DEFAULT PRIVILEGES. vendor_connections (0031)
-- never got this treatment — its RLS policies only constrain `status` via
-- WITH CHECK, never restricting *which* columns a statement may set. Any
-- authenticated customer could set laundry_vendor_id directly on their own
-- INSERT/UPDATE, and VendorConnectionRepository.acceptServiceRole
-- (src/repositories/VendorConnectionRepository.ts:155) blindly reuses
-- whatever laundry_vendor_id is already on the row rather than verifying
-- it — so a forged value silently attaches unrelated batch history (their
-- own, or — if the UUID were ever known — another customer's) to a brand
-- new platform-vendor connection the moment the vendor accepts.
--
-- laundry_vendor_id stays writable only by service_role
-- (VendorConnectionRepository.acceptServiceRole, the sole writer).
-- requested_at/responded_at/disconnected_at stay authenticated-writable —
-- reRequest/disconnect legitimately set them from the customer's own
-- session, and forging them has no access-control consequence (only
-- `status` gates anything).

REVOKE INSERT, UPDATE ON vendor_connections FROM authenticated;

GRANT INSERT (user_id, vendor_account_id, status)
  ON vendor_connections TO authenticated;

GRANT UPDATE (status, requested_at, responded_at, disconnected_at)
  ON vendor_connections TO authenticated;
