-- ─────────────────────────────────────────────
-- closet_items: permanent garment catalog
-- ─────────────────────────────────────────────
CREATE TABLE closet_items (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES profiles(id),
  name               TEXT NOT NULL,
  type               item_type NOT NULL DEFAULT 'other',
  color              TEXT,
  brand              TEXT,
  notes              TEXT,
  primary_image_path TEXT,
  created_at         TIMESTAMPTZ DEFAULT now(),
  updated_at         TIMESTAMPTZ DEFAULT now(),
  created_by         UUID REFERENCES profiles(id),
  updated_by         UUID REFERENCES profiles(id),
  deleted_at         TIMESTAMPTZ
);

CREATE INDEX idx_closet_items_user ON closet_items(user_id);

CREATE TRIGGER closet_items_updated_at
  BEFORE UPDATE ON closet_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE closet_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own closet items"
  ON closet_items FOR ALL USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- batch_items: transactional join (replaces clothing_items for new batches)
-- ─────────────────────────────────────────────
CREATE TABLE batch_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id          UUID NOT NULL REFERENCES laundry_batches(id),
  closet_item_id    UUID NOT NULL REFERENCES closet_items(id),
  user_id           UUID NOT NULL REFERENCES profiles(id),
  quantity_sent     INTEGER NOT NULL DEFAULT 1 CHECK (quantity_sent > 0),
  quantity_returned INTEGER NOT NULL DEFAULT 0
    CHECK (quantity_returned >= 0 AND quantity_returned <= quantity_sent),
  notes             TEXT,
  returned_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  created_by        UUID REFERENCES profiles(id),
  updated_by        UUID REFERENCES profiles(id),
  deleted_at        TIMESTAMPTZ,
  UNIQUE (batch_id, closet_item_id)
);

CREATE INDEX idx_batch_items_batch  ON batch_items(batch_id);
CREATE INDEX idx_batch_items_closet ON batch_items(closet_item_id);
CREATE INDEX idx_batch_items_user   ON batch_items(user_id);

CREATE TRIGGER batch_items_updated_at
  BEFORE UPDATE ON batch_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE batch_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own batch items"
  ON batch_items FOR ALL USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- Update batch_with_status to aggregate from batch_items
-- ─────────────────────────────────────────────
CREATE OR REPLACE VIEW batch_with_status AS
SELECT
  b.*,
  COALESCE(s.total_qty, 0)    AS total_items,
  COALESCE(s.returned_qty, 0) AS returned_items,
  CASE
    WHEN b.sent_at IS NULL                                                        THEN 'draft'
    WHEN COALESCE(s.total_qty, 0) > 0
      AND COALESCE(s.total_qty, 0) = COALESCE(s.returned_qty, 0)                THEN 'completed'
    ELSE                                                                               'in_laundry'
  END AS status,
  v.name AS vendor_name
FROM laundry_batches b
LEFT JOIN (
  SELECT
    batch_id,
    SUM(quantity_sent)     AS total_qty,
    SUM(quantity_returned) AS returned_qty
  FROM batch_items
  WHERE deleted_at IS NULL
  GROUP BY batch_id
) s ON s.batch_id = b.id
LEFT JOIN laundry_vendors v ON v.id = b.vendor_id AND v.deleted_at IS NULL
WHERE b.deleted_at IS NULL;

-- Storage: closet image upload (users can write to their own prefix)
CREATE POLICY "Users can upload own closet images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'laundry-images' AND
    auth.uid()::text = (string_to_array(name, '/'))[2]
  );
