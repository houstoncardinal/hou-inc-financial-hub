-- ═══════════════════════════════════════════════════════════════════════════
-- HOU INC · Multi-brief portal support
--
-- portal_briefs.client_id was UNIQUE, so a client could only ever have one
-- brief in the system's entire lifetime — "Add Project" always resolved back
-- to that single row and there was no way to submit a second request. This
-- drops the one-brief-per-client constraint and adds an optional link to an
-- existing admin_projects row (for briefs tied to a project that already
-- exists; NULL for a fresh inquiry, same as every brief worked before).
--
-- Run in the Supabase SQL editor (after portal-setup.sql has been applied).
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.portal_briefs
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.admin_projects(id) ON DELETE SET NULL;

ALTER TABLE public.portal_briefs
  DROP CONSTRAINT IF EXISTS portal_briefs_client_id_key;

CREATE INDEX IF NOT EXISTS idx_portal_briefs_client
  ON public.portal_briefs(client_id, created_at DESC);

NOTIFY pgrst, 'reload schema';
