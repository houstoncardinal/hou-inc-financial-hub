-- ═══════════════════════════════════════════════════════════════════════════
-- HOU INC · Fix project_status enum cast error + add zip_code column
--
-- Root cause: the sync triggers wrote plain 'active'::text into projects.status
-- which is typed project_status (ENUM). PostgreSQL won't implicitly cast.
-- Fix: add explicit ::project_status casts inside the trigger functions.
--
-- Also adds zip_code TEXT to admin_projects.
--
-- Run in the Supabase SQL editor.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Add zip_code column ───────────────────────────────────────────────────
ALTER TABLE public.admin_projects
  ADD COLUMN IF NOT EXISTS zip_code TEXT;


-- ── 2. Fix sync_admin_project_to_finance (INSERT) ────────────────────────────
CREATE OR REPLACE FUNCTION public.sync_admin_project_to_finance()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.entity <> 'houston-enterprise' THEN RETURN NEW; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.projects
    WHERE user_id   = NEW.admin_user_id
      AND entity_id = 'houston-enterprise'
      AND name      = NEW.title
  ) THEN
    INSERT INTO public.projects (user_id, entity_id, name, code, budget, status, notes)
    VALUES (
      NEW.admin_user_id,
      'houston-enterprise',
      NEW.title,
      NEW.project_code,
      COALESCE(NEW.budget, 0),
      CASE NEW.status
        WHEN 'planning'  THEN 'active'   ::project_status
        WHEN 'active'    THEN 'active'   ::project_status
        WHEN 'on_hold'   THEN 'on_hold'  ::project_status
        WHEN 'completed' THEN 'completed'::project_status
        WHEN 'archived'  THEN 'archived' ::project_status
        ELSE                  'active'   ::project_status
      END,
      NEW.description
    );
  END IF;
  RETURN NEW;
END;
$$;


-- ── 3. Fix sync_admin_project_status_update (UPDATE) ─────────────────────────
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
        WHEN 'planning'  THEN 'active'   ::project_status
        WHEN 'active'    THEN 'active'   ::project_status
        WHEN 'on_hold'   THEN 'on_hold'  ::project_status
        WHEN 'completed' THEN 'completed'::project_status
        WHEN 'archived'  THEN 'archived' ::project_status
        ELSE status
      END,
      budget = COALESCE(NEW.budget, budget),
      name   = CASE WHEN OLD.title <> NEW.title THEN NEW.title ELSE name END
    WHERE user_id   = NEW.admin_user_id
      AND entity_id = 'houston-enterprise'
      AND name      = OLD.title;
  END IF;
  RETURN NEW;
END;
$$;


-- ── Done ────────────────────────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
