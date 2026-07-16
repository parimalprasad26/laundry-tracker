-- Vendor Portal Phase 1 — schema
--
-- Adds real vendor accounts (laundromats with their own login), the
-- connection request/accept/reject relationship to a customer's private
-- vendor list, a vendor's single shared rate card, and the pending
-- custom-item price-approval queue. All additive — nothing about the
-- existing schema changes destructively. See the vendor portal plan for the
-- full design and the security reasoning behind each piece (summarized
-- inline below where it isn't obvious from the schema alone).

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ─────────────────────────────────────────────
-- vendor_accounts: a real vendor's business identity + login
-- ─────────────────────────────────────────────
CREATE TABLE vendor_accounts (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id            UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name           TEXT NOT NULL CHECK (char_length(business_name) BETWEEN 2 AND 80),
  phone                   TEXT,
  address                 TEXT,
  -- Discoverability is derived (onboarding_completed_at IS NOT NULL), never
  -- an independently-settable flag the admin action could forget to flip —
  -- guarantees a vendor is never browsable/connectable before their
  -- required rate card exists.
  onboarding_completed_at TIMESTAMPTZ,
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now(),
  deleted_at              TIMESTAMPTZ
);

CREATE INDEX idx_vendor_accounts_auth_user ON vendor_accounts(auth_user_id);
CREATE INDEX idx_vendor_accounts_name_trgm ON vendor_accounts USING GIN (business_name gin_trgm_ops);

CREATE TRIGGER vendor_accounts_updated_at
  BEFORE UPDATE ON vendor_accounts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────
-- vendor_account_prices: ONE shared rate card per vendor account (not
-- per-customer, unlike vendor_item_prices). Mirrors that table's shape.
-- ─────────────────────────────────────────────
CREATE TABLE vendor_account_prices (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_account_id UUID NOT NULL REFERENCES vendor_accounts(id) ON DELETE CASCADE,
  item_type         item_type NOT NULL,
  custom_type       TEXT NULL CHECK (char_length(custom_type) BETWEEN 2 AND 30),
  unit_price        NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  created_by        UUID REFERENCES profiles(id),
  updated_by        UUID REFERENCES profiles(id),
  CONSTRAINT vendor_account_prices_custom_type_requires_other
    CHECK (custom_type IS NULL OR item_type = 'other'),
  CONSTRAINT vendor_account_prices_vendor_item_custom_key
    UNIQUE NULLS NOT DISTINCT (vendor_account_id, item_type, custom_type)
);

CREATE INDEX idx_vendor_account_prices_vendor ON vendor_account_prices(vendor_account_id);

CREATE TRIGGER vendor_account_prices_updated_at
  BEFORE UPDATE ON vendor_account_prices
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────
-- vendor_connections: the request/accept/reject relationship.
-- One row per (customer, vendor) pair, ever.
-- ─────────────────────────────────────────────
CREATE TABLE vendor_connections (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES profiles(id),               -- the customer
  vendor_account_id UUID NOT NULL REFERENCES vendor_accounts(id),
  -- Set only when status transitions to 'active' (see 0032's RLS comments).
  -- No laundry_vendors row — and therefore nothing batch-usable — exists
  -- for a pending or rejected request.
  laundry_vendor_id UUID NULL REFERENCES laundry_vendors(id),
  status            TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','active','rejected','cancelled','disconnected')),
  requested_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at      TIMESTAMPTZ,
  disconnected_at   TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, vendor_account_id),
  CONSTRAINT vendor_connections_laundry_vendor_unique UNIQUE (laundry_vendor_id)
);

CREATE INDEX idx_vendor_connections_vendor_status ON vendor_connections(vendor_account_id, status);
CREATE INDEX idx_vendor_connections_user ON vendor_connections(user_id);

CREATE TRIGGER vendor_connections_updated_at
  BEFORE UPDATE ON vendor_connections
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────
-- vendor_price_requests: pending custom-item price approval queue, kept
-- fully separate from batch_items so every existing null-price code path
-- (calculated_cost's SUM, isEditable guards, missingCustomPrices) needs
-- zero changes.
-- ─────────────────────────────────────────────
CREATE TABLE vendor_price_requests (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_account_id    UUID NOT NULL REFERENCES vendor_accounts(id) ON DELETE CASCADE,
  custom_type          TEXT NOT NULL CHECK (char_length(custom_type) BETWEEN 2 AND 30),
  status               TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved')),
  requested_by_user_id UUID NOT NULL REFERENCES profiles(id),
  resolved_unit_price  NUMERIC(10,2) CHECK (resolved_unit_price >= 0),
  resolved_at          TIMESTAMPTZ,
  requested_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Collapses concurrent requests for the same custom type into one row —
-- once resolved, it's on the vendor's shared list for every connected
-- customer, not just whoever asked first.
CREATE UNIQUE INDEX idx_vendor_price_requests_pending_unique
  ON vendor_price_requests(vendor_account_id, custom_type)
  WHERE status = 'pending';

CREATE INDEX idx_vendor_price_requests_vendor_status ON vendor_price_requests(vendor_account_id, status);

-- ─────────────────────────────────────────────
-- Link columns on existing tables (additive only)
-- ─────────────────────────────────────────────
ALTER TABLE laundry_vendors
  ADD COLUMN vendor_account_id UUID NULL REFERENCES vendor_accounts(id);

CREATE UNIQUE INDEX idx_laundry_vendors_user_vendor_account
  ON laundry_vendors(user_id, vendor_account_id)
  WHERE vendor_account_id IS NOT NULL;

ALTER TABLE batch_items
  ADD COLUMN pending_price_request_id UUID NULL REFERENCES vendor_price_requests(id);
