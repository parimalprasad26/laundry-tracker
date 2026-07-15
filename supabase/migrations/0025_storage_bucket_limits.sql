-- Codifies storage bucket limits that were previously set manually via the Supabase
-- dashboard and existed only there, un-tracked — a fresh environment or an accidental
-- bucket recreation would silently lose this protection. Values match the app-layer
-- validation in src/lib/utils.ts (ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES) exactly, so
-- this is defense-in-depth: enforced at the storage layer independent of the app.
UPDATE storage.buckets
SET
  file_size_limit = 10485760, -- 10 MB
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
WHERE id = 'laundry-images';
