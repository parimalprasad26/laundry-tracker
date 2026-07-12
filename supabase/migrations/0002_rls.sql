-- ─────────────────────────────────────────────
-- Enable RLS on all tables
-- ─────────────────────────────────────────────
ALTER TABLE profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE laundry_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE laundry_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE clothing_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_images     ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────
-- profiles
-- ─────────────────────────────────────────────
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- ─────────────────────────────────────────────
-- laundry_vendors
-- ─────────────────────────────────────────────
CREATE POLICY "Users can CRUD own vendors"
  ON laundry_vendors FOR ALL USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- laundry_batches
-- ─────────────────────────────────────────────
CREATE POLICY "Users can CRUD own batches"
  ON laundry_batches FOR ALL USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- clothing_items
-- ─────────────────────────────────────────────
CREATE POLICY "Users can CRUD own items"
  ON clothing_items FOR ALL USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- item_images
-- ─────────────────────────────────────────────
CREATE POLICY "Users can CRUD own images"
  ON item_images FOR ALL USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- Storage bucket policies
-- ─────────────────────────────────────────────
-- Run these in Supabase dashboard or via supabase-js admin:
-- 1. Create bucket: laundry-images (private)
-- 2. Policy: users can only access their own folder prefix

-- INSERT: users can upload to their own prefix
CREATE POLICY "Users can upload own images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'laundry-images' AND
    auth.uid()::text = (string_to_array(name, '/'))[2]
  );

-- SELECT: users can view their own images
CREATE POLICY "Users can view own images"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'laundry-images' AND
    auth.uid()::text = (string_to_array(name, '/'))[2]
  );

-- DELETE: users can delete their own images
CREATE POLICY "Users can delete own images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'laundry-images' AND
    auth.uid()::text = (string_to_array(name, '/'))[2]
  );
