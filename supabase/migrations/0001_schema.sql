-- ─────────────────────────────────────────────
-- Enums
-- ─────────────────────────────────────────────
CREATE TYPE item_type AS ENUM (
  'shirt','pants','dress','jacket','shorts',
  'socks','underwear','sweater','suit','other'
);

CREATE TYPE payment_status AS ENUM ('unpaid','partial','paid');

-- ─────────────────────────────────────────────
-- profiles
-- ─────────────────────────────────────────────
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

-- Auto-create profile on sign up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- updated_at trigger helper
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────
-- laundry_vendors
-- ─────────────────────────────────────────────
CREATE TABLE laundry_vendors (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id),
  name        TEXT NOT NULL,
  phone       TEXT,
  address     TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  created_by  UUID REFERENCES profiles(id),
  updated_by  UUID REFERENCES profiles(id),
  deleted_at  TIMESTAMPTZ
);

CREATE INDEX idx_vendors_user ON laundry_vendors(user_id);

CREATE TRIGGER vendors_updated_at
  BEFORE UPDATE ON laundry_vendors
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────
-- laundry_batches  (NO status column — derived via view)
-- ─────────────────────────────────────────────
CREATE TABLE laundry_batches (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES profiles(id),
  vendor_id         UUID REFERENCES laundry_vendors(id),
  name              TEXT NOT NULL,
  notes             TEXT,
  sent_at           TIMESTAMPTZ,
  estimated_return  TIMESTAMPTZ,
  estimated_cost    NUMERIC(10,2),
  actual_cost       NUMERIC(10,2),
  payment_status    payment_status NOT NULL DEFAULT 'unpaid',
  receipt_path      TEXT,
  search_vector     TSVECTOR,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  created_by        UUID REFERENCES profiles(id),
  updated_by        UUID REFERENCES profiles(id),
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX idx_batches_user   ON laundry_batches(user_id, created_at DESC);
CREATE INDEX idx_batches_search ON laundry_batches USING GIN(search_vector);

CREATE TRIGGER batches_updated_at
  BEFORE UPDATE ON laundry_batches
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────
-- clothing_items
-- ─────────────────────────────────────────────
CREATE TABLE clothing_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id          UUID NOT NULL REFERENCES laundry_batches(id),
  user_id           UUID NOT NULL REFERENCES profiles(id),
  name              TEXT NOT NULL,
  type              item_type NOT NULL DEFAULT 'other',
  color             TEXT,
  quantity          INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  returned_quantity INTEGER NOT NULL DEFAULT 0
                      CHECK (returned_quantity >= 0 AND returned_quantity <= quantity),
  notes             TEXT,
  returned_at       TIMESTAMPTZ,
  search_vector     TSVECTOR,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  created_by        UUID REFERENCES profiles(id),
  updated_by        UUID REFERENCES profiles(id),
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX idx_items_batch  ON clothing_items(batch_id);
CREATE INDEX idx_items_user   ON clothing_items(user_id);
CREATE INDEX idx_items_search ON clothing_items USING GIN(search_vector);

CREATE TRIGGER items_updated_at
  BEFORE UPDATE ON clothing_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────
-- item_images
-- ─────────────────────────────────────────────
CREATE TABLE item_images (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id         UUID NOT NULL REFERENCES clothing_items(id),
  batch_id        UUID NOT NULL REFERENCES laundry_batches(id),
  user_id         UUID NOT NULL REFERENCES profiles(id),
  storage_path    TEXT NOT NULL,
  thumbnail_path  TEXT,
  mime_type       TEXT NOT NULL DEFAULT 'image/jpeg',
  file_size       INTEGER,
  width           INTEGER,
  height          INTEGER,
  created_at      TIMESTAMPTZ DEFAULT now(),
  created_by      UUID REFERENCES profiles(id),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_images_item ON item_images(item_id);
