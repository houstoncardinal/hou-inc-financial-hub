-- ── Add custom_fields JSONB to admin_projects ──────────────────────────────────────────────
--
-- Stores arbitrary key-value pairs added via the New Project wizard's "Details" step.
-- Displayed in the project overview panel under "Custom Fields".
--
-- Also includes the bidirectional sync triggers from migration 20260714000003
-- in case that migration has not been run yet (all statements use IF NOT EXISTS / OR REPLACE).
--
-- Run in the Supabase SQL editor.

-- 1. Custom fields column
ALTER TABLE admin_projects
  ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}';

COMMENT ON COLUMN admin_projects.custom_fields IS
  'Arbitrary key-value pairs added via the New Project wizard (e.g. Permit #, HOA Contact, Parcel ID)';

-- 2. GIN index for fast JSONB querying on custom_fields
CREATE INDEX IF NOT EXISTS idx_admin_projects_custom_fields
  ON admin_projects USING gin(custom_fields);

-- 3. Bidirectional sync: finance projects → admin_projects (INSERT)
CREATE OR REPLACE FUNCTION sync_finance_project_to_admin()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.entity_id <> 'houston-enterprise' THEN RETURN NEW; END IF;
  IF EXISTS (
    SELECT 1 FROM admin_projects
    WHERE admin_user_id = NEW.user_id AND entity = 'houston-enterprise' AND title = NEW.name
  ) THEN RETURN NEW; END IF;

  INSERT INTO admin_projects (
    admin_user_id, entity, title, project_code, type, city, state,
    status, progress_pct, budget, contract_amount, description, custom_fields
  ) VALUES (
    NEW.user_id, 'houston-enterprise', NEW.name, NEW.code, 'Other', 'Houston', 'TX',
    CASE NEW.status
      WHEN 'active' THEN 'active' WHEN 'on_hold' THEN 'on_hold'
      WHEN 'completed' THEN 'completed' WHEN 'archived' THEN 'archived'
      ELSE 'planning' END,
    0, NULLIF(NEW.budget, 0), NULLIF(NEW.budget, 0), NEW.notes, '{}'::jsonb
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_finance_project_to_admin ON projects;
CREATE TRIGGER trg_sync_finance_project_to_admin
  AFTER INSERT ON projects FOR EACH ROW
  EXECUTE FUNCTION sync_finance_project_to_admin();

-- 4. Bidirectional sync: admin_projects → finance projects (INSERT)
CREATE OR REPLACE FUNCTION sync_admin_project_to_finance()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.entity <> 'houston-enterprise' THEN RETURN NEW; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM projects
    WHERE user_id = NEW.admin_user_id AND entity_id = 'houston-enterprise' AND name = NEW.title
  ) THEN
    INSERT INTO projects (user_id, entity_id, name, code, budget, status, notes)
    VALUES (
      NEW.admin_user_id, 'houston-enterprise', NEW.title, NEW.project_code,
      COALESCE(NEW.budget, 0),
      CASE NEW.status
        WHEN 'planning' THEN 'active' WHEN 'active' THEN 'active'
        WHEN 'on_hold' THEN 'on_hold' WHEN 'completed' THEN 'completed'
        WHEN 'archived' THEN 'archived' ELSE 'active' END,
      NEW.description
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_admin_project_to_finance ON admin_projects;
CREATE TRIGGER trg_sync_admin_project_to_finance
  AFTER INSERT ON admin_projects FOR EACH ROW
  EXECUTE FUNCTION sync_admin_project_to_finance();

-- 5. Status / budget / title sync: admin_projects UPDATE → finance projects
CREATE OR REPLACE FUNCTION sync_admin_project_status_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.entity <> 'houston-enterprise' THEN RETURN NEW; END IF;
  IF OLD.status <> NEW.status OR OLD.budget IS DISTINCT FROM NEW.budget OR OLD.title <> NEW.title THEN
    UPDATE projects
    SET
      status = CASE NEW.status
        WHEN 'planning' THEN 'active' WHEN 'active' THEN 'active'
        WHEN 'on_hold' THEN 'on_hold' WHEN 'completed' THEN 'completed'
        WHEN 'archived' THEN 'archived' ELSE status END,
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
  AFTER UPDATE ON admin_projects FOR EACH ROW
  EXECUTE FUNCTION sync_admin_project_status_update();

NOTIFY pgrst, 'reload schema';
