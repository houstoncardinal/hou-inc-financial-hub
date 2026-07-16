-- ============================================================================
-- HOU INC · Admin Documents Manager
--
-- Powers the rebuilt /admin Documents tab:
--   1. portal_documents.client_id becomes nullable — admins can now upload
--      internal/general documents that aren't tied to a portal client yet.
--   2. portal_documents.project_id (nullable FK → admin_projects) — documents
--      can be assigned to a delivery project, independently of the client.
--   3. The portal-documents storage bucket is created if missing, made public
--      (files are shared via public URLs throughout the app), and its
--      bucket-level file size limit is cleared so uploads of any type/size
--      are accepted up to the platform's global cap.
--   4. Storage-object + row policies so the PIN-gated admin dashboard (anon
--      key, no Supabase auth session) can upload, replace, and delete files —
--      consistent with the permissive-RLS model the portal already uses.
--   5. Registers the portal tables in the supabase_realtime publication so
--      the admin dashboard's live subscription actually receives events.
--
-- Safe to run any number of times.
-- ============================================================================

-- 1 ── Allow unassigned documents ────────────────────────────────────────────
ALTER TABLE public.portal_documents ALTER COLUMN client_id DROP NOT NULL;

-- 2 ── Project assignment ────────────────────────────────────────────────────
ALTER TABLE public.portal_documents
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.admin_projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_portal_documents_project ON public.portal_documents(project_id);

-- 3 ── Bucket: exists, public, no bucket-level size limit ────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('portal-documents', 'portal-documents', true, NULL)
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = NULL;

-- 4 ── Policies (guarded; duplicates are ignored) ────────────────────────────
DO $$ BEGIN
  CREATE POLICY "portal_documents_bucket_manage" ON storage.objects
    FOR ALL
    USING (bucket_id = 'portal-documents')
    WITH CHECK (bucket_id = 'portal-documents');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "portal_documents_delete" ON public.portal_documents
    FOR DELETE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 5 ── Realtime publication for the admin live subscription ──────────────────
DO $$ DECLARE t TEXT; BEGIN
  FOREACH t IN ARRAY ARRAY[
    'portal_clients', 'portal_briefs', 'portal_documents', 'portal_meetings',
    'portal_messages', 'portal_help_requests',
    'contact_submissions', 'start_project_submissions'
  ] LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    EXCEPTION
      WHEN duplicate_object THEN NULL;
      WHEN undefined_object THEN NULL;
    END;
  END LOOP;
END $$;

-- ── Reload PostgREST schema cache ───────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
