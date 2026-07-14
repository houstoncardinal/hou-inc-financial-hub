-- Admin Changelog table: permanent audit trail for all dashboard changes
CREATE TABLE IF NOT EXISTS public.admin_changelog (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action       TEXT NOT NULL,                           -- 'created', 'updated', 'deleted', 'resolved', etc.
  entity       TEXT NOT NULL,                           -- 'project', 'check', 'income', 'expense', 'vendor', 'document', 'help_request', etc.
  dashboard    TEXT NOT NULL,                           -- 'admin', 'finance', 'portal', 'public'
  entity_id    TEXT,                                    -- ID of the record affected
  entity_label TEXT,                                    -- Human-readable label (e.g. check number, project name)
  changed_by   TEXT NOT NULL DEFAULT 'system',          -- User email or 'portal_client:{name}'
  details      JSONB DEFAULT '{}'::JSONB,               -- Before/after data or any relevant context
  created_at   TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Index for the most common query patterns
CREATE INDEX IF NOT EXISTS admin_changelog_created_at_idx ON public.admin_changelog (created_at DESC);
CREATE INDEX IF NOT EXISTS admin_changelog_entity_idx     ON public.admin_changelog (entity);
CREATE INDEX IF NOT EXISTS admin_changelog_dashboard_idx  ON public.admin_changelog (dashboard);

-- RLS
ALTER TABLE public.admin_changelog ENABLE ROW LEVEL SECURITY;

-- Admin users can read all changelog entries
CREATE POLICY "admin_read_changelog"
  ON public.admin_changelog FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
    )
  );

-- Only authenticated users (admin/finance) can insert changelog entries
CREATE POLICY "auth_insert_changelog"
  ON public.admin_changelog FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- SECURITY DEFINER RPC so the portal (unauthenticated clients) can log their own actions
CREATE OR REPLACE FUNCTION public.log_portal_changelog(
  p_action       TEXT,
  p_entity       TEXT,
  p_entity_id    TEXT  DEFAULT NULL,
  p_entity_label TEXT  DEFAULT NULL,
  p_changed_by   TEXT  DEFAULT 'portal_client',
  p_details      JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.admin_changelog (action, entity, dashboard, entity_id, entity_label, changed_by, details)
  VALUES (p_action, p_entity, 'portal', p_entity_id, p_entity_label, p_changed_by, p_details)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_portal_changelog TO anon, authenticated;
