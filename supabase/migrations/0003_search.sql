-- ─────────────────────────────────────────────
-- Full-text search: batches
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_batch_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.notes, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER batches_search_vector_update
  BEFORE INSERT OR UPDATE ON laundry_batches
  FOR EACH ROW EXECUTE FUNCTION update_batch_search_vector();

-- Backfill existing rows
UPDATE laundry_batches SET name = name;

-- ─────────────────────────────────────────────
-- Full-text search: clothing_items
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_item_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.color, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.notes, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER items_search_vector_update
  BEFORE INSERT OR UPDATE ON clothing_items
  FOR EACH ROW EXECUTE FUNCTION update_item_search_vector();

UPDATE clothing_items SET name = name;
