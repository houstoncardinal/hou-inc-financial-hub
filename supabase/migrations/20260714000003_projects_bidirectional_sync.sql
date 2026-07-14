-- ── Bidirectional sync: finance projects ↔ admin_projects (Houston Enterprise) ──────────────
--
-- When a project is created in the finance `projects` table for entity_id = 'houston-enterprise',
-- create a mirrored record in `admin_projects` so it appears in the Admin Projects tab.
--
-- When a project is deleted from `projects` (houston-enterprise), also remove the admin mirror.
-- Update sync is intentionally NOT done — admin projects have richer fields; let them drift.
--
-- Run at: https://supabase.com/dashboard/project/gvvvlivbsnfkjpwxgbla/sql/new

-- ── Helper: get or look up the first admin user id ───────────────────────────────────────────
-- We store the admin_user_id as the user who owns the finance project (its user_id column).

-- ── Trigger: finance projects → admin_projects (INSERT) ─────────────────────────────────────
CREATE OR REPLACE FUNCTION sync_finance_project_to_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only sync Houston Enterprise projects
  IF NEW.entity_id <> 'houston-enterprise' THEN
    RETURN NEW;
  END IF;

  -- Avoid creating a duplicate if one already exists with the same title for this user
  IF EXISTS (
    SELECT 1 FROM admin_projects
    WHERE admin_user_id = NEW.user_id
      AND entity = 'houston-enterprise'
      AND title = NEW.name
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO admin_projects (
    admin_user_id,
    entity,
    title,
    project_code,
    type,
    city,
    state,
    status,
    progress_pct,
    budget,
    contract_amount,
    description
  ) VALUES (
    NEW.user_id,
    'houston-enterprise',
    NEW.name,
    NEW.code,
    'Other',
    'Houston',
    'TX',
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
    NEW.notes
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_finance_project_to_admin ON projects;
CREATE TRIGGER trg_sync_finance_project_to_admin
  AFTER INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION sync_finance_project_to_admin();

-- ── Trigger: admin_projects → finance projects (INSERT) ─────────────────────────────────────
-- When an admin project is created for houston-enterprise, ensure a finance projects row exists.
CREATE OR REPLACE FUNCTION sync_admin_project_to_finance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.entity <> 'houston-enterprise' THEN
    RETURN NEW;
  END IF;

  -- Only create if no matching name already exists for this user
  IF NOT EXISTS (
    SELECT 1 FROM projects
    WHERE user_id = NEW.admin_user_id
      AND entity_id = 'houston-enterprise'
      AND name = NEW.title
  ) THEN
    INSERT INTO projects (
      user_id,
      entity_id,
      name,
      code,
      budget,
      status,
      notes
    ) VALUES (
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

DROP TRIGGER IF EXISTS trg_sync_admin_project_to_finance ON admin_projects;
CREATE TRIGGER trg_sync_admin_project_to_finance
  AFTER INSERT ON admin_projects
  FOR EACH ROW
  EXECUTE FUNCTION sync_admin_project_to_finance();

-- ── Status sync: admin_projects UPDATE → projects ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION sync_admin_project_status_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.entity <> 'houston-enterprise' THEN
    RETURN NEW;
  END IF;

  -- Only sync status and budget changes back to finance
  IF OLD.status <> NEW.status OR OLD.budget IS DISTINCT FROM NEW.budget OR OLD.title <> NEW.title THEN
    UPDATE projects
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

DROP TRIGGER IF EXISTS trg_sync_admin_project_status_update ON admin_projects;
CREATE TRIGGER trg_sync_admin_project_status_update
  AFTER UPDATE ON admin_projects
  FOR EACH ROW
  EXECUTE FUNCTION sync_admin_project_status_update();

NOTIFY pgrst, 'reload schema';
