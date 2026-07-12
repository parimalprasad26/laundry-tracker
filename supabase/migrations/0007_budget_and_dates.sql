-- ─────────────────────────────────────────────
-- Drop view first so we can alter enum used by the table
-- ─────────────────────────────────────────────
DROP VIEW IF EXISTS batch_with_status;

-- ─────────────────────────────────────────────
-- Remove 'partial' from payment_status enum
-- ─────────────────────────────────────────────
UPDATE laundry_batches SET payment_status = 'unpaid' WHERE payment_status = 'partial';

DROP TYPE IF EXISTS payment_status_new;

CREATE TYPE payment_status_new AS ENUM ('unpaid', 'paid');

ALTER TABLE laundry_batches ALTER COLUMN payment_status DROP DEFAULT;

ALTER TABLE laundry_batches
  ALTER COLUMN payment_status TYPE payment_status_new
  USING payment_status::text::payment_status_new;

DROP TYPE payment_status;
ALTER TYPE payment_status_new RENAME TO payment_status;

ALTER TABLE laundry_batches ALTER COLUMN payment_status SET DEFAULT 'unpaid';

-- ─────────────────────────────────────────────
-- Add returned_at and price_delta_note to batches
-- ─────────────────────────────────────────────
ALTER TABLE laundry_batches
  ADD COLUMN returned_at      TIMESTAMPTZ,
  ADD COLUMN price_delta_note TEXT;

-- ─────────────────────────────────────────────
-- user_settings: per-user budget preferences
-- ─────────────────────────────────────────────
CREATE TABLE user_settings (
  user_id       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  budget_amount NUMERIC(10,2),
  budget_period TEXT NOT NULL DEFAULT 'monthly'
                CHECK (budget_period IN ('weekly', 'monthly', 'yearly')),
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own settings"
  ON user_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- Rebuild batch_with_status view (includes returned_at, price_delta_note)
-- ─────────────────────────────────────────────
DROP VIEW IF EXISTS batch_with_status;

CREATE VIEW batch_with_status AS
SELECT
  b.*,
  COALESCE(s.total_qty, 0)    AS total_items,
  COALESCE(s.returned_qty, 0) AS returned_items,
  s.calculated_cost,
  CASE
    WHEN b.sent_at IS NULL                                                     THEN 'draft'
    WHEN COALESCE(s.total_qty, 0) > 0
      AND COALESCE(s.total_qty, 0) = COALESCE(s.returned_qty, 0)             THEN 'completed'
    ELSE                                                                            'in_laundry'
  END AS status,
  v.name AS vendor_name
FROM laundry_batches b
LEFT JOIN (
  SELECT
    batch_id,
    SUM(quantity_sent)     AS total_qty,
    SUM(quantity_returned) AS returned_qty,
    SUM(unit_price * quantity_sent) FILTER (WHERE unit_price IS NOT NULL) AS calculated_cost
  FROM batch_items
  WHERE deleted_at IS NULL
  GROUP BY batch_id
) s ON s.batch_id = b.id
LEFT JOIN laundry_vendors v ON v.id = b.vendor_id AND v.deleted_at IS NULL
WHERE b.deleted_at IS NULL;
