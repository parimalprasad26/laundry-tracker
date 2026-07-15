ALTER TABLE closet_items
  ADD COLUMN photo_status TEXT NOT NULL DEFAULT 'none'
    CHECK (photo_status IN ('none', 'pending', 'uploaded', 'failed'));

-- Backfill: existing rows that already have a photo must not be mislabeled 'none'
UPDATE closet_items SET photo_status = 'uploaded' WHERE primary_image_path IS NOT NULL;
