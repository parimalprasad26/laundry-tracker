-- Enforce damaged_qty <= quantity_returned at the DB level.
-- NOT VALID skips scanning existing rows — safe to add without downtime.
-- Run VALIDATE CONSTRAINT separately once existing data is confirmed clean.
ALTER TABLE batch_items
  ADD CONSTRAINT batch_items_damaged_qty_max
  CHECK (damaged_qty >= 0 AND damaged_qty <= quantity_returned) NOT VALID;
