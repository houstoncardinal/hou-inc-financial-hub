-- ═══════════════════════════════════════════════════════════════════════════
-- HOU INC · Progress Photos column repair
--
-- The live project_photos table predates 20260711000001_cross_platform_bridges.sql
-- and was created with a different shape (storage_path/phase/uploaded_at)
-- instead of the columns that migration — and every reader/writer in the
-- app (PortalGallery.tsx, and the new admin upload tab) — actually expects
-- (url/phase_label/phase_index/created_at). Because that migration used
-- CREATE TABLE IF NOT EXISTS, it silently no-op'd against the existing table
-- and never added the missing columns. This is why Progress Photos always
-- showed "No photos yet": the portal's SELECT ...,url,phase_label,... failed
-- with "column does not exist" and the caller's try/catch swallowed it as an
-- empty list rather than a visible error.
--
-- Table is confirmed empty (0 rows) as of this writing, so this is a plain
-- additive repair — no backfill needed. The old columns (storage_path,
-- phase, uploaded_at) are left in place, just relaxed to nullable in case
-- anything still writes them, since nothing going forward populates them.
--
-- Safe to run any number of times.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.project_photos
  ADD COLUMN IF NOT EXISTS url          TEXT,
  ADD COLUMN IF NOT EXISTS phase_label  TEXT NOT NULL DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS phase_index  INT  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at   TIMESTAMPTZ NOT NULL DEFAULT now();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'project_photos' AND column_name = 'phase') THEN
    ALTER TABLE public.project_photos ALTER COLUMN phase DROP NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'project_photos' AND column_name = 'storage_path') THEN
    ALTER TABLE public.project_photos ALTER COLUMN storage_path DROP NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'project_photos' AND column_name = 'uploaded_at') THEN
    ALTER TABLE public.project_photos ALTER COLUMN uploaded_at DROP NOT NULL;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
