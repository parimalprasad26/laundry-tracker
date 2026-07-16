-- Fix: 0032's column-level REVOKE on laundry_vendors.vendor_account_id and
-- batch_items.pending_price_request_id had no effect.
--
-- Verified against the dev project immediately after 0032 was applied:
-- `authenticated` still held table-wide INSERT/UPDATE on vendor_account_id
-- via information_schema.column_privileges. Root cause: a column-level
-- REVOKE cannot narrow a pre-existing TABLE-level grant. Both
-- laundry_vendors (0001) and batch_items (0009) predate 0030's blanket
-- "GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated,
-- service_role" — a one-time grant applied to every table that already
-- existed at the time 0030 ran — so both tables carry a table-level ALL
-- grant that fully covers every column, including ones added afterward.
-- REVOKE on a single column only removes a column-level grant; it does not
-- touch the broader table-level one still in effect.
--
-- The correct Postgres pattern for "every column except one": revoke the
-- table-level INSERT/UPDATE grant entirely, then re-grant INSERT/UPDATE at
-- the column level for exactly the columns the app actually writes (see
-- src/repositories/VendorRepository.ts and BatchItemRepository.ts, the sole
-- writers of each table) — everything except the two sensitive link
-- columns, which stay writable only by service_role per 0032.

REVOKE INSERT, UPDATE ON laundry_vendors FROM authenticated;

GRANT INSERT (user_id, name, phone, address, notes, created_by, updated_by)
  ON laundry_vendors TO authenticated;

GRANT UPDATE (name, phone, address, notes, updated_by, deleted_at)
  ON laundry_vendors TO authenticated;

REVOKE INSERT, UPDATE ON batch_items FROM authenticated;

GRANT INSERT (batch_id, closet_item_id, unit_price, user_id, created_by, updated_by)
  ON batch_items TO authenticated;

GRANT UPDATE (
  unit_price, updated_by, damaged_qty, missing_qty, issue_reported_at,
  issue_reported_status, quantity_returned, returned_at, deleted_at
) ON batch_items TO authenticated;

-- vendor_account_id and pending_price_request_id are deliberately absent
-- from both column lists above — they stay writable only by service_role,
-- per 0032's REVOKE/GRANT for those two columns specifically.
