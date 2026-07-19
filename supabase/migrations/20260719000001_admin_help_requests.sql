-- ============================================================================
-- HOU INC · In-app "type help" support requests
--
-- Any signed-in internal user (finance/admin app — not the public site or
-- client portal) can hit a keyboard shortcut anywhere to capture a
-- screenshot of what they're looking at, describe what they need, and file
-- it here. hunainm.qureshi@gmail.com is the sole support admin and is the
-- only account that can read the inbox (RLS-enforced, not just UI-hidden) —
-- everyone else can only insert their own request and read it back.
--
-- Screenshots go to a private 'help-screenshots' storage bucket, one folder
-- per uploader (auth.uid()), mirroring the existing 'documents' bucket
-- pattern in 20260712000005_schema_completeness.sql.
--
-- Safe to run any number of times.
-- ============================================================================

-- ── Support-admin check, single point of change if the email ever changes ──
CREATE OR REPLACE FUNCTION public.is_help_support_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(auth.jwt() ->> 'email', '') = 'hunainm.qureshi@gmail.com';
$$;

-- ── Table ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_help_requests (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email       TEXT NOT NULL,
  user_name        TEXT,
  user_role        TEXT,
  category         TEXT NOT NULL DEFAULT 'other'
                     CHECK (category IN ('stuck', 'bug', 'feature_request', 'question', 'other')),
  message          TEXT NOT NULL,
  page_path        TEXT,
  page_title       TEXT,
  entity_id        TEXT,
  screenshot_path  TEXT,
  viewport         JSONB,
  status           TEXT NOT NULL DEFAULT 'open'
                     CHECK (status IN ('open', 'in_progress', 'resolved')),
  resolution_note  TEXT,
  resolved_at      TIMESTAMPTZ,
  resolved_by      UUID REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_help_requests_status ON public.admin_help_requests(status);
CREATE INDEX IF NOT EXISTS idx_admin_help_requests_created ON public.admin_help_requests(created_at DESC);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_admin_help_requests_updated') THEN
    CREATE TRIGGER trg_admin_help_requests_updated
      BEFORE UPDATE ON public.admin_help_requests
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

ALTER TABLE public.admin_help_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "help_requests_insert_own" ON public.admin_help_requests;
CREATE POLICY "help_requests_insert_own" ON public.admin_help_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "help_requests_select_own_or_support" ON public.admin_help_requests;
CREATE POLICY "help_requests_select_own_or_support" ON public.admin_help_requests
  FOR SELECT USING (auth.uid() = user_id OR public.is_help_support_admin());

DROP POLICY IF EXISTS "help_requests_update_support_only" ON public.admin_help_requests;
CREATE POLICY "help_requests_update_support_only" ON public.admin_help_requests
  FOR UPDATE USING (public.is_help_support_admin());

-- ── Realtime ─────────────────────────────────────────────────────────────
DO $$ BEGIN
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_help_requests';
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

-- ── Screenshot storage bucket ────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
  VALUES ('help-screenshots', 'help-screenshots', false)
  ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  CREATE POLICY "help_screenshots_insert_own" ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'help-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "help_screenshots_select_own_or_support" ON storage.objects FOR SELECT
    USING (bucket_id = 'help-screenshots' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_help_support_admin()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Verification ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.verify_admin_help_requests()
RETURNS TABLE (check_name TEXT, ok BOOLEAN, details TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY VALUES
    ('admin_help_requests_table',
      EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='admin_help_requests'),
      'in-app help request inbox table'),
    ('support_admin_helper',
      EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_help_support_admin'),
      'single-email support-admin check used by RLS'),
    ('help_screenshots_bucket',
      EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'help-screenshots'),
      'private per-user screenshot storage bucket');
END;
$$;

NOTIFY pgrst, 'reload schema';
