-- ═══════════════════════════════════════════════════════════════════════════
-- HOU INC · Admin ↔ Finance Project Link
--
-- The bidirectional sync added in 20260714000005_project_management_complete
-- matched admin_projects ↔ projects rows by (user, title) string equality —
-- no real FK, no DELETE sync (despite an old comment claiming one existed),
-- and UPDATE sync only ran admin → finance. This migration:
--   1. adds a real FK link both ways (finance_project_id / admin_project_id)
--   2. adds admin_projects.deleted_at (soft-delete, matching projects' convention)
--   3. backfills the link for existing rows by best-effort name match
--   4. rewrites the sync triggers to link+sync by FK, add finance → admin
--      UPDATE sync (new) and admin → finance DELETE sync (new)
--   5. registers admin_projects for realtime (it was never added to the
--      supabase_realtime publication, so postgres_changes on it was a no-op)
--
-- Recursion safety: every sync function's first line is
-- `IF pg_trigger_depth() > 1 THEN RETURN NEW/OLD; END IF;` — a direct app
-- edit runs at depth 1 and propagates exactly one hop; the counterpart's own
-- trigger, invoked as a side effect of that hop, runs at depth 2 and returns
-- immediately. This is the only mechanism that stops a ping-pong regardless
-- of whether the propagated values happen to already match — IS DISTINCT
-- FROM diffing (also used below) only reduces unnecessary writes, it does
-- not by itself prevent recursion.
--
-- Safe to re-run (IF NOT EXISTS / OR REPLACE / DROP IF EXISTS throughout).
-- Run in the Supabase SQL editor.
-- ═══════════════════════════════════════════════════════════════════════════


-- ─── 1. Link columns + soft-delete on admin_projects ───────────────────────
ALTER TABLE public.admin_projects
  ADD COLUMN IF NOT EXISTS finance_project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS admin_project_id UUID REFERENCES public.admin_projects(id) ON DELETE SET NULL;

-- One-to-one: at most one row on either side may claim a given counterpart.
-- Scoped to NOT NULL (not to deleted_at IS NULL) — a soft-deleted pair stays
-- bonded rather than freeing its slot for a new row to claim.
CREATE UNIQUE INDEX IF NOT EXISTS ux_admin_projects_finance_project_id
  ON public.admin_projects (finance_project_id) WHERE finance_project_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_projects_admin_project_id
  ON public.projects (admin_project_id) WHERE admin_project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ap_deleted_at ON public.admin_projects(deleted_at);


-- ─── 2. Backfill existing rows by (user, title) — deterministic on dupes ───
-- DISTINCT ON + explicit ORDER BY avoids a non-deterministic match when two
-- admin projects for the same user happen to share a title.
WITH matched AS (
  SELECT DISTINCT ON (p.id) p.id AS project_id, ap.id AS admin_id
  FROM public.projects p
  JOIN public.admin_projects ap
    ON ap.admin_user_id = p.user_id
   AND ap.entity   = 'houston-enterprise'
   AND p.entity_id = 'houston-enterprise'
   AND ap.title    = p.name
  WHERE p.admin_project_id IS NULL
    AND ap.finance_project_id IS NULL
    AND p.deleted_at IS NULL
  ORDER BY p.id, ap.created_at ASC
)
UPDATE public.projects p
SET admin_project_id = m.admin_id
FROM matched m
WHERE p.id = m.project_id;

UPDATE public.admin_projects ap
SET finance_project_id = p.id
FROM public.projects p
WHERE p.admin_project_id = ap.id
  AND ap.finance_project_id IS NULL;


-- ─── 3. Status-mapping helper (admin free-text → finance enum) ─────────────
-- admin_projects.status is free text including 'planning'; the finance
-- project_status enum has no 'planning' value (active/on_hold/completed/
-- archived), so it maps to 'active'. Centralized here since the same
-- mapping is needed in both the INSERT and UPDATE sync functions below.
-- Status sync intentionally stays admin → finance only (no reverse
-- function needed) — there's no admin status this enum can round-trip to.
CREATE OR REPLACE FUNCTION public.map_admin_status_to_finance(s TEXT)
RETURNS project_status LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE s
    WHEN 'planning'  THEN 'active'::project_status
    WHEN 'active'    THEN 'active'::project_status
    WHEN 'on_hold'   THEN 'on_hold'::project_status
    WHEN 'completed' THEN 'completed'::project_status
    WHEN 'archived'  THEN 'archived'::project_status
    ELSE                  'active'::project_status
  END;
$$;


-- ─── 4. INSERT sync (both directions) ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sync_finance_project_to_admin()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_admin_id UUID;
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;
  IF NEW.entity_id <> 'houston-enterprise' OR NEW.admin_project_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.admin_projects (
    admin_user_id, entity, title, project_code, type,
    city, state, status, progress_pct,
    budget, contract_amount, description, custom_fields, finance_project_id
  ) VALUES (
    NEW.user_id, 'houston-enterprise', NEW.name, NEW.code, 'Other',
    'Houston', 'TX',
    CASE NEW.status
      WHEN 'active'    THEN 'active'
      WHEN 'on_hold'   THEN 'on_hold'
      WHEN 'completed' THEN 'completed'
      WHEN 'archived'  THEN 'archived'
      ELSE 'planning'
    END,
    0, NULLIF(NEW.budget, 0), NULLIF(NEW.budget, 0), NEW.notes, '{}'::jsonb, NEW.id
  )
  RETURNING id INTO v_admin_id;

  -- AFTER-trigger changes to NEW never persist back to the firing row —
  -- this follow-up UPDATE is the only way to backfill our own FK column.
  UPDATE public.projects SET admin_project_id = v_admin_id WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_finance_project_to_admin ON public.projects;
CREATE TRIGGER trg_sync_finance_project_to_admin
  AFTER INSERT ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.sync_finance_project_to_admin();


CREATE OR REPLACE FUNCTION public.sync_admin_project_to_finance()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_finance_id UUID;
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;
  IF NEW.entity <> 'houston-enterprise' OR NEW.finance_project_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.projects (user_id, entity_id, name, code, budget, status, notes, admin_project_id)
  VALUES (
    NEW.admin_user_id, 'houston-enterprise', NEW.title, NEW.project_code,
    COALESCE(NEW.budget, 0), public.map_admin_status_to_finance(NEW.status),
    NEW.description, NEW.id
  )
  RETURNING id INTO v_finance_id;

  UPDATE public.admin_projects SET finance_project_id = v_finance_id WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_admin_project_to_finance ON public.admin_projects;
CREATE TRIGGER trg_sync_admin_project_to_finance
  AFTER INSERT ON public.admin_projects
  FOR EACH ROW EXECUTE FUNCTION public.sync_admin_project_to_finance();


-- ─── 5. UPDATE sync (both directions — finance → admin is new) ────────────
DROP TRIGGER IF EXISTS trg_sync_admin_project_status_update ON public.admin_projects;
DROP FUNCTION IF EXISTS public.sync_admin_project_status_update();

CREATE OR REPLACE FUNCTION public.sync_admin_project_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;
  IF NEW.entity <> 'houston-enterprise' OR NEW.finance_project_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.title         IS NOT DISTINCT FROM OLD.title
     AND NEW.project_code IS NOT DISTINCT FROM OLD.project_code
     AND NEW.budget       IS NOT DISTINCT FROM OLD.budget
     AND NEW.status       IS NOT DISTINCT FROM OLD.status
     AND NEW.description  IS NOT DISTINCT FROM OLD.description
     AND NEW.deleted_at   IS NOT DISTINCT FROM OLD.deleted_at
  THEN
    RETURN NEW;
  END IF;

  UPDATE public.projects
  SET
    name       = NEW.title,
    code       = NEW.project_code,
    budget     = COALESCE(NEW.budget, budget),
    status     = public.map_admin_status_to_finance(NEW.status),
    notes      = NEW.description,
    deleted_at = CASE WHEN NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN now() ELSE deleted_at END
  WHERE id = NEW.finance_project_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_admin_project_update ON public.admin_projects;
CREATE TRIGGER trg_sync_admin_project_update
  AFTER UPDATE ON public.admin_projects
  FOR EACH ROW
  WHEN (NEW.finance_project_id IS NOT NULL)
  EXECUTE FUNCTION public.sync_admin_project_update();


-- finance projects UPDATE → admin_projects (new — this direction never
-- existed before). Status is intentionally excluded: project_status has no
-- 'planning' value to reconstruct admin's full status vocabulary from, so
-- status sync stays admin → finance only, unchanged from before.
CREATE OR REPLACE FUNCTION public.sync_finance_project_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;
  IF NEW.entity_id <> 'houston-enterprise' OR NEW.admin_project_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.name        IS NOT DISTINCT FROM OLD.name
     AND NEW.code        IS NOT DISTINCT FROM OLD.code
     AND NEW.budget      IS NOT DISTINCT FROM OLD.budget
     AND NEW.notes       IS NOT DISTINCT FROM OLD.notes
     AND NEW.deleted_at  IS NOT DISTINCT FROM OLD.deleted_at
  THEN
    RETURN NEW;
  END IF;

  UPDATE public.admin_projects
  SET
    title        = NEW.name,
    project_code = NEW.code,
    budget       = NULLIF(NEW.budget, 0),
    description  = NEW.notes,
    deleted_at   = CASE WHEN NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN now() ELSE deleted_at END
  WHERE id = NEW.admin_project_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_finance_project_update ON public.projects;
CREATE TRIGGER trg_sync_finance_project_update
  AFTER UPDATE ON public.projects
  FOR EACH ROW
  WHEN (NEW.admin_project_id IS NOT NULL)
  EXECUTE FUNCTION public.sync_finance_project_update();


-- ─── 6. DELETE sync (admin hard-delete → finance soft-delete) ──────────────
-- Finance never hard-deletes (its own soft-delete convention already
-- covers that direction via sync_finance_project_update's deleted_at
-- propagation above), so no separate finance-side DELETE trigger is needed.
CREATE OR REPLACE FUNCTION public.sync_admin_project_delete()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN OLD; END IF;
  IF OLD.finance_project_id IS NOT NULL THEN
    UPDATE public.projects
    SET deleted_at = now()
    WHERE id = OLD.finance_project_id AND deleted_at IS NULL;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_admin_project_delete ON public.admin_projects;
CREATE TRIGGER trg_sync_admin_project_delete
  AFTER DELETE ON public.admin_projects
  FOR EACH ROW EXECUTE FUNCTION public.sync_admin_project_delete();


-- ─── 7. Realtime — admin_projects was never registered for postgres_changes ─
DO $$ BEGIN
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_projects';
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
  END;
END $$;

NOTIFY pgrst, 'reload schema';
