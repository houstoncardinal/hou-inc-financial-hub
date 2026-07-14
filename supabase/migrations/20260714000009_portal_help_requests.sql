-- ═══════════════════════════════════════════════════════════════════════════
-- HOU INC · Portal Help Requests
--
-- Clients submit help requests from the portal project view.
-- Admins receive and resolve them in the /admin Notifications tab.
--
-- Paste at: https://supabase.com/dashboard/project/gvvvlivbsnfkjpwxgbla/sql/new
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Help requests table ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.portal_help_requests (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id     UUID NOT NULL REFERENCES public.portal_clients(id) ON DELETE CASCADE,
  project_id    UUID,                         -- optional: links to admin_projects.id
  project_title TEXT,                         -- denormalized for display even if project deleted
  subject       TEXT NOT NULL,
  message       TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
  resolved_at   TIMESTAMPTZ,
  resolved_by   TEXT,
  resolution_note TEXT,
  created_at    TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ── 2. Indexes ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_portal_help_requests_client_id ON public.portal_help_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_portal_help_requests_status    ON public.portal_help_requests(status);
CREATE INDEX IF NOT EXISTS idx_portal_help_requests_created   ON public.portal_help_requests(created_at DESC);

-- ── 3. RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE public.portal_help_requests ENABLE ROW LEVEL SECURITY;

-- Allow insert/select by anyone (portal uses SECURITY DEFINER RPCs, not auth)
CREATE POLICY "portal_help_requests_insert" ON public.portal_help_requests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "portal_help_requests_select" ON public.portal_help_requests
  FOR SELECT USING (true);

CREATE POLICY "portal_help_requests_update" ON public.portal_help_requests
  FOR UPDATE USING (true);

-- ── 4. RPC: submit a help request (no auth required for portal clients) ───────
CREATE OR REPLACE FUNCTION public.submit_portal_help_request(
  p_client_id     UUID,
  p_project_id    UUID,
  p_project_title TEXT,
  p_subject       TEXT,
  p_message       TEXT
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_row JSONB;
BEGIN
  INSERT INTO public.portal_help_requests
    (client_id, project_id, project_title, subject, message)
  VALUES
    (p_client_id, p_project_id, p_project_title, p_subject, p_message)
  RETURNING to_jsonb(portal_help_requests.*) INTO v_row;

  RETURN v_row;
END;
$$;

-- ── 5. RPC: resolve a help request (admin) ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.resolve_portal_help_request(
  p_request_id     UUID,
  p_resolver_name  TEXT,
  p_resolution_note TEXT DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.portal_help_requests
  SET status          = 'resolved',
      resolved_at     = now(),
      resolved_by     = p_resolver_name,
      resolution_note = p_resolution_note
  WHERE id = p_request_id;
END;
$$;

-- ── Done ────────────────────────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
