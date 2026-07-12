-- ─────────────────────────────────────────────
-- vendor_item_prices: rate card per item type per vendor
-- ─────────────────────────────────────────────
CREATE TABLE vendor_item_prices (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id   UUID NOT NULL REFERENCES laundry_vendors(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id),
  item_type   item_type NOT NULL,
  unit_price  NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  created_by  UUID REFERENCES profiles(id),
  updated_by  UUID REFERENCES profiles(id),
  UNIQUE (vendor_id, item_type)
);

CREATE INDEX idx_vendor_prices_vendor ON vendor_item_prices(vendor_id);

CREATE TRIGGER vendor_item_prices_updated_at
  BEFORE UPDATE ON vendor_item_prices
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE vendor_item_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own vendor prices"
  ON vendor_item_prices FOR ALL USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- Add unit_price snapshot column to batch_items
-- ─────────────────────────────────────────────
ALTER TABLE batch_items
  ADD COLUMN unit_price NUMERIC(10,2) CHECK (unit_price >= 0);

-- ─────────────────────────────────────────────
-- Update batch_with_status to include calculated_cost
-- Must drop and recreate because OR REPLACE cannot add columns mid-list
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
