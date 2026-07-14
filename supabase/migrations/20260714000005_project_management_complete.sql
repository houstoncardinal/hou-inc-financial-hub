-- ═══════════════════════════════════════════════════════════════════════════
-- HOU INC · Complete Project Management System
-- Run this SINGLE file — it supersedes migrations 000002, 000003, 000004.
-- Safe to re-run (all statements use IF NOT EXISTS / OR REPLACE / DROP IF EXISTS)
--
-- Paste at: https://supabase.com/dashboard/project/gvvvlivbsnfkjpwxgbla/sql/new
-- ═══════════════════════════════════════════════════════════════════════════


-- ─── 0. set_updated_at helper (safe to run even if it already exists) ────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;


-- ─── 1. ADMIN PROJECTS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_projects (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title                TEXT        NOT NULL,
  project_code         TEXT,
  type                 TEXT        NOT NULL DEFAULT 'Custom Estate',
  address              TEXT,
  city                 TEXT        NOT NULL DEFAULT 'Houston',
  state                TEXT        NOT NULL DEFAULT 'TX',
  portal_client_id     UUID        REFERENCES public.portal_clients(id) ON DELETE SET NULL,
  client_name          TEXT,
  client_email         TEXT,
  status               TEXT        NOT NULL DEFAULT 'planning',
  progress_pct         INT         NOT NULL DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
  start_date           DATE,
  estimated_completion DATE,
  actual_completion    DATE,
  contract_amount      NUMERIC(14,2),
  budget               NUMERIC(14,2),
  project_manager      TEXT,
  superintendent       TEXT,
  architect            TEXT,
  entity               TEXT        NOT NULL DEFAULT 'houston-enterprise',
  description          TEXT,
  internal_notes       TEXT,
  custom_fields        JSONB       DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add custom_fields in case the table already existed without it
ALTER TABLE public.admin_projects
  ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}';


-- ─── 2. PROJECT MILESTONES ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_project_milestones (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID        NOT NULL REFERENCES public.admin_projects(id) ON DELETE CASCADE,
  title             TEXT        NOT NULL,
  description       TEXT,
  sort_order        INT         NOT NULL DEFAULT 0,
  target_date       DATE,
  completed_date    DATE,
  is_active         BOOLEAN     NOT NULL DEFAULT FALSE,
  is_client_visible BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ─── 3. PROJECT UPDATES ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_project_updates (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID        NOT NULL REFERENCES public.admin_projects(id) ON DELETE CASCADE,
  title             TEXT        NOT NULL,
  body              TEXT        NOT NULL,
  update_type       TEXT        NOT NULL DEFAULT 'general',
  is_client_visible BOOLEAN     NOT NULL DEFAULT TRUE,
  pinned            BOOLEAN     NOT NULL DEFAULT FALSE,
  created_by        TEXT        NOT NULL DEFAULT 'Admin',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ─── 4. PORTAL INVITES ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.portal_invites (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  token      TEXT        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  email      TEXT        NOT NULL,
  name       TEXT,
  project_id UUID        REFERENCES public.admin_projects(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ─── 5. ROW LEVEL SECURITY ──────────────────────────────────────────────
ALTER TABLE public.admin_projects          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_project_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_project_updates   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_invites          ENABLE ROW LEVEL SECURITY;

-- admin_projects — owning admin only
DROP POLICY IF EXISTS "ap_select" ON public.admin_projects;
DROP POLICY IF EXISTS "ap_insert" ON public.admin_projects;
DROP POLICY IF EXISTS "ap_update" ON public.admin_projects;
DROP POLICY IF EXISTS "ap_delete" ON public.admin_projects;
CREATE POLICY "ap_select" ON public.admin_projects FOR SELECT USING (auth.uid() = admin_user_id);
CREATE POLICY "ap_insert" ON public.admin_projects FOR INSERT WITH CHECK (auth.uid() = admin_user_id);
CREATE POLICY "ap_update" ON public.admin_projects FOR UPDATE USING (auth.uid() = admin_user_id);
CREATE POLICY "ap_delete" ON public.admin_projects FOR DELETE USING (auth.uid() = admin_user_id);

-- milestones — scoped via project ownership
DROP POLICY IF EXISTS "apm_all" ON public.admin_project_milestones;
CREATE POLICY "apm_all" ON public.admin_project_milestones FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admin_projects WHERE id = project_id AND admin_user_id = auth.uid()));

-- updates — scoped via project ownership
DROP POLICY IF EXISTS "apu_all" ON public.admin_project_updates;
CREATE POLICY "apu_all" ON public.admin_project_updates FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admin_projects WHERE id = project_id AND admin_user_id = auth.uid()));

-- portal_invites — admin manages via project; anon can read valid unused invites
DROP POLICY IF EXISTS "pi_admin_all"       ON public.portal_invites;
DROP POLICY IF EXISTS "pi_anon_valid_select" ON public.portal_invites;
CREATE POLICY "pi_admin_all" ON public.portal_invites FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admin_projects WHERE id = project_id AND admin_user_id = auth.uid()));
CREATE POLICY "pi_anon_valid_select" ON public.portal_invites FOR SELECT
  USING (used_at IS NULL AND expires_at > now());


-- ─── 6. UPDATED_AT TRIGGERS ─────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_ap_updated  ON public.admin_projects;
DROP TRIGGER IF EXISTS trg_apm_updated ON public.admin_project_milestones;
DROP TRIGGER IF EXISTS trg_apu_updated ON public.admin_project_updates;

CREATE TRIGGER trg_ap_updated
  BEFORE UPDATE ON public.admin_projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_apm_updated
  BEFORE UPDATE ON public.admin_project_milestones
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_apu_updated
  BEFORE UPDATE ON public.admin_project_updates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ─── 7. RPC: get_portal_project_data ────────────────────────────────────
-- Used by portal pages — SECURITY DEFINER bypasses RLS for portal clients
DROP FUNCTION IF EXISTS public.get_portal_project_data(UUID);
CREATE FUNCTION public.get_portal_project_data(p_client_id UUID)
RETURNS TABLE (
  project_id           UUID,
  title                TEXT,
  type                 TEXT,
  address              TEXT,
  city                 TEXT,
  state                TEXT,
  status               TEXT,
  progress_pct         INT,
  start_date           DATE,
  estimated_completion DATE,
  contract_amount      NUMERIC,
  project_manager      TEXT,
  superintendent       TEXT,
  description          TEXT,
  milestones           JSONB,
  updates              JSONB
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT
    p.id,
    p.title,
    p.type,
    p.address,
    p.city,
    p.state,
    p.status,
    p.progress_pct,
    p.start_date,
    p.estimated_completion,
    p.contract_amount,
    p.project_manager,
    p.superintendent,
    p.description,
    COALESCE((
      SELECT jsonb_agg(m ORDER BY (m->>'sort_order')::int)
      FROM (
        SELECT jsonb_build_object(
          'id',             id,
          'title',          title,
          'description',    description,
          'sort_order',     sort_order,
          'target_date',    target_date,
          'completed_date', completed_date,
          'is_active',      is_active
        ) AS m
        FROM admin_project_milestones
        WHERE project_id = p.id AND is_client_visible = TRUE
      ) ms
    ), '[]'::jsonb),
    COALESCE((
      SELECT jsonb_agg(u)
      FROM (
        SELECT jsonb_build_object(
          'id',          id,
          'title',       title,
          'body',        body,
          'update_type', update_type,
          'pinned',      pinned,
          'created_by',  created_by,
          'created_at',  created_at
        ) AS u
        FROM admin_project_updates
        WHERE project_id = p.id AND is_client_visible = TRUE
        ORDER BY pinned DESC, created_at DESC
        LIMIT 30
      ) us
    ), '[]'::jsonb)
  FROM admin_projects p
  WHERE p.portal_client_id = p_client_id
  ORDER BY p.created_at DESC;
$$;


-- ─── 8. RPC: validate_portal_invite ─────────────────────────────────────
DROP FUNCTION IF EXISTS public.validate_portal_invite(TEXT);
CREATE FUNCTION public.validate_portal_invite(p_token TEXT)
RETURNS TABLE (
  id            UUID,
  token         TEXT,
  email         TEXT,
  name          TEXT,
  project_id    UUID,
  project_title TEXT,
  expires_at    TIMESTAMPTZ,
  is_valid      BOOLEAN
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT
    i.id, i.token, i.email, i.name, i.project_id,
    p.title AS project_title,
    i.expires_at,
    (i.used_at IS NULL AND i.expires_at > now()) AS is_valid
  FROM portal_invites i
  LEFT JOIN admin_projects p ON p.id = i.project_id
  WHERE i.token = p_token;
$$;


-- ─── 9. RPC: consume_portal_invite ──────────────────────────────────────
DROP FUNCTION IF EXISTS public.consume_portal_invite(TEXT, UUID);
CREATE FUNCTION public.consume_portal_invite(p_token TEXT, p_client_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_project_id UUID;
BEGIN
  SELECT project_id INTO v_project_id
  FROM portal_invites
  WHERE token = p_token AND used_at IS NULL AND expires_at > now();

  IF NOT FOUND THEN RETURN FALSE; END IF;

  UPDATE portal_invites SET used_at = now() WHERE token = p_token;

  IF v_project_id IS NOT NULL THEN
    UPDATE admin_projects
    SET portal_client_id = p_client_id, updated_at = now()
    WHERE id = v_project_id AND portal_client_id IS NULL;
  END IF;

  RETURN TRUE;
END;
$$;


-- ─── 10. RPC: get_portal_client_by_email (used by PortalInvite.tsx) ─────
DROP FUNCTION IF EXISTS public.get_portal_client_by_email(TEXT);
CREATE FUNCTION public.get_portal_client_by_email(p_email TEXT)
RETURNS TABLE (id UUID, name TEXT, email TEXT)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT id, name, email
  FROM portal_clients
  WHERE lower(email) = lower(p_email)
  LIMIT 1;
$$;


-- ─── 11. BIDIRECTIONAL SYNC: finance projects ↔ admin_projects ──────────
--
-- finance projects INSERT → create mirrored admin_projects row
CREATE OR REPLACE FUNCTION public.sync_finance_project_to_admin()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.entity_id <> 'houston-enterprise' THEN RETURN NEW; END IF;
  -- Skip if an admin project with the same title already exists for this user
  IF EXISTS (
    SELECT 1 FROM public.admin_projects
    WHERE admin_user_id = NEW.user_id
      AND entity = 'houston-enterprise'
      AND title = NEW.name
  ) THEN RETURN NEW; END IF;

  INSERT INTO public.admin_projects (
    admin_user_id, entity, title, project_code, type,
    city, state, status, progress_pct,
    budget, contract_amount, description, custom_fields
  ) VALUES (
    NEW.user_id,
    'houston-enterprise',
    NEW.name,
    NEW.code,
    'Other',
    'Houston', 'TX',
    CASE NEW.status
      WHEN 'active'    THEN 'active'
      WHEN 'on_hold'   THEN 'on_hold'
      WHEN 'completed' THEN 'completed'
      WHEN 'archived'  THEN 'archived'
      ELSE 'planning'
    END,
    0,
    NULLIF(NEW.budget, 0),
    NULLIF(NEW.budget, 0),
    NEW.notes,
    '{}'::jsonb
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_finance_project_to_admin ON public.projects;
CREATE TRIGGER trg_sync_finance_project_to_admin
  AFTER INSERT ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.sync_finance_project_to_admin();


-- admin_projects INSERT → create mirrored finance projects row
CREATE OR REPLACE FUNCTION public.sync_admin_project_to_finance()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.entity <> 'houston-enterprise' THEN RETURN NEW; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.projects
    WHERE user_id = NEW.admin_user_id
      AND entity_id = 'houston-enterprise'
      AND name = NEW.title
  ) THEN
    INSERT INTO public.projects (user_id, entity_id, name, code, budget, status, notes)
    VALUES (
      NEW.admin_user_id,
      'houston-enterprise',
      NEW.title,
      NEW.project_code,
      COALESCE(NEW.budget, 0),
      CASE NEW.status
        WHEN 'planning'  THEN 'active'
        WHEN 'active'    THEN 'active'
        WHEN 'on_hold'   THEN 'on_hold'
        WHEN 'completed' THEN 'completed'
        WHEN 'archived'  THEN 'archived'
        ELSE 'active'
      END,
      NEW.description
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_admin_project_to_finance ON public.admin_projects;
CREATE TRIGGER trg_sync_admin_project_to_finance
  AFTER INSERT ON public.admin_projects
  FOR EACH ROW EXECUTE FUNCTION public.sync_admin_project_to_finance();


-- admin_projects UPDATE → sync status / budget / title back to finance
CREATE OR REPLACE FUNCTION public.sync_admin_project_status_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.entity <> 'houston-enterprise' THEN RETURN NEW; END IF;
  IF OLD.status <> NEW.status
    OR OLD.budget IS DISTINCT FROM NEW.budget
    OR OLD.title <> NEW.title
  THEN
    UPDATE public.projects
    SET
      status = CASE NEW.status
        WHEN 'planning'  THEN 'active'
        WHEN 'active'    THEN 'active'
        WHEN 'on_hold'   THEN 'on_hold'
        WHEN 'completed' THEN 'completed'
        WHEN 'archived'  THEN 'archived'
        ELSE status
      END,
      budget = COALESCE(NEW.budget, budget),
      name   = CASE WHEN OLD.title <> NEW.title THEN NEW.title ELSE name END
    WHERE user_id = NEW.admin_user_id
      AND entity_id = 'houston-enterprise'
      AND name = OLD.title;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_admin_project_status_update ON public.admin_projects;
CREATE TRIGGER trg_sync_admin_project_status_update
  AFTER UPDATE ON public.admin_projects
  FOR EACH ROW EXECUTE FUNCTION public.sync_admin_project_status_update();


-- ─── 12. INDEXES ────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ap_admin        ON public.admin_projects(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_ap_client       ON public.admin_projects(portal_client_id);
CREATE INDEX IF NOT EXISTS idx_ap_entity       ON public.admin_projects(entity);
CREATE INDEX IF NOT EXISTS idx_ap_custom       ON public.admin_projects USING gin(custom_fields);
CREATE INDEX IF NOT EXISTS idx_apm_proj        ON public.admin_project_milestones(project_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_apu_proj        ON public.admin_project_updates(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pi_token        ON public.portal_invites(token);
CREATE INDEX IF NOT EXISTS idx_pi_project      ON public.portal_invites(project_id);


-- ─── Done ────────────────────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
