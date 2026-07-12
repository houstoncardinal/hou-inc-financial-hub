-- ============================================================
-- Create portal-documents Storage bucket + RLS policies
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- Safe to re-run (idempotent).
-- ============================================================

-- 1. Create the storage bucket (50 MB limit, specific file types)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'portal-documents',
  'portal-documents',
  true,
  52428800,  -- 50 MB per file
  ARRAY[
    'image/jpeg','image/jpg','image/png','image/heic','image/webp',
    'application/pdf','application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow anon & authenticated to upload files
DROP POLICY IF EXISTS "portal_docs_insert" ON storage.objects;
CREATE POLICY "portal_docs_insert" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'portal-documents');

-- 3. Allow anyone to read files (public URLs)
DROP POLICY IF EXISTS "portal_docs_select" ON storage.objects;
CREATE POLICY "portal_docs_select" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'portal-documents');

-- 4. Allow delete (client removes their own upload, admin can also delete)
DROP POLICY IF EXISTS "portal_docs_delete" ON storage.objects;
CREATE POLICY "portal_docs_delete" ON storage.objects
  FOR DELETE TO anon, authenticated
  USING (bucket_id = 'portal-documents');

-- 5. Also ensure portal_documents table has storage columns
ALTER TABLE public.portal_documents ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE public.portal_documents ADD COLUMN IF NOT EXISTS file_url     TEXT;
ALTER TABLE public.portal_documents ADD COLUMN IF NOT EXISTS reviewed_at  TIMESTAMPTZ;
ALTER TABLE public.portal_documents ADD COLUMN IF NOT EXISTS reviewed_by  TEXT;

-- Done! Refresh the admin panel and portal to see uploaded files.