-- ═══════════════════════════════════════════════════════════════════════════
-- HOU INC · Milestone Bridge — one milestone list across finance + admin/portal
--
-- project_milestones had two disjoint populations in one table:
--   · finance side (ProjectDetail / ProjectBreakdown) writes rows keyed by
--     project_id with title/description/planned_completion_date
--   · admin MilestoneManager + client portal write rows keyed by client_id
--     with phase_name/phase_description/target_date
-- The projects.portal_client_id link lets us join them. This trigger fills
-- whichever key is missing and mirrors the parallel name/date fields, so a
-- milestone created on either dashboard instantly appears on the other
-- (both sides already subscribe to realtime changes on this table).
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.sync_project_milestone_bridge()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Cross-fill the missing foreign key via the portal-client bridge
  IF NEW.project_id IS NOT NULL AND NEW.client_id IS NULL THEN
    SELECT portal_client_id::text INTO NEW.client_id
      FROM projects WHERE id = NEW.project_id;
    -- (client_id, phase_index) is unique — slot after the client's last phase
    IF NEW.client_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM project_milestones
      WHERE client_id = NEW.client_id AND phase_index = COALESCE(NEW.phase_index, 0)
        AND id IS DISTINCT FROM NEW.id
    ) THEN
      SELECT COALESCE(MAX(phase_index), -1) + 1 INTO NEW.phase_index
        FROM project_milestones WHERE client_id = NEW.client_id;
    END IF;
  ELSIF NEW.client_id IS NOT NULL AND NEW.project_id IS NULL THEN
    SELECT id INTO NEW.project_id
      FROM projects
      WHERE portal_client_id::text = NEW.client_id AND deleted_at IS NULL
      ORDER BY created_at DESC LIMIT 1;
  END IF;

  -- Mirror the parallel field pairs so each UI reads a populated value
  NEW.title      := COALESCE(NULLIF(NEW.title, ''), NEW.phase_name);
  NEW.phase_name := COALESCE(NULLIF(NEW.phase_name, ''), NEW.title);
  NEW.description       := COALESCE(NEW.description, NEW.phase_description);
  NEW.phase_description := COALESCE(NEW.phase_description, NEW.description);
  NEW.target_date             := COALESCE(NEW.target_date, NEW.planned_completion_date);
  NEW.planned_completion_date := COALESCE(NEW.planned_completion_date, NEW.target_date);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_project_milestone_bridge ON public.project_milestones;
CREATE TRIGGER trg_project_milestone_bridge
  BEFORE INSERT OR UPDATE ON public.project_milestones
  FOR EACH ROW EXECUTE FUNCTION public.sync_project_milestone_bridge();

-- One-time backfill of the existing disjoint rows.
-- Assign each newly-bridged row a phase_index after the client's current max
-- to satisfy the (client_id, phase_index) unique constraint.
WITH bridged AS (
  SELECT m.id,
         p.portal_client_id::text AS new_client,
         COALESCE((SELECT MAX(x.phase_index) FROM public.project_milestones x
                   WHERE x.client_id = p.portal_client_id::text), -1)
           + ROW_NUMBER() OVER (PARTITION BY p.portal_client_id::text ORDER BY m.sort_order, m.created_at) AS new_index
  FROM public.project_milestones m
  JOIN public.projects p ON p.id = m.project_id
  WHERE m.client_id IS NULL AND p.portal_client_id IS NOT NULL
)
UPDATE public.project_milestones m
SET client_id = b.new_client, phase_index = b.new_index
FROM bridged b WHERE m.id = b.id;

UPDATE public.project_milestones m
SET project_id = p.id
FROM public.projects p
WHERE m.client_id = p.portal_client_id::text AND m.project_id IS NULL AND p.deleted_at IS NULL;

UPDATE public.project_milestones
SET title      = COALESCE(NULLIF(title, ''), phase_name),
    phase_name = COALESCE(NULLIF(phase_name, ''), title),
    description       = COALESCE(description, phase_description),
    phase_description = COALESCE(phase_description, description),
    target_date             = COALESCE(target_date, planned_completion_date),
    planned_completion_date = COALESCE(planned_completion_date, target_date)
WHERE (title IS NULL OR title = '') OR (phase_name IS NULL OR phase_name = '')
   OR (target_date IS NULL AND planned_completion_date IS NOT NULL)
   OR (planned_completion_date IS NULL AND target_date IS NOT NULL);

NOTIFY pgrst, 'reload schema';

-- Realtime for the new ERP tables (payroll live updates, workflow counts…)
DO $do$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'finance_employees','finance_payroll_runs','finance_payroll_items',
    'project_workflow_items','finance_equipment','finance_purchase_orders',
    'finance_recurring_obligations','finance_estimates'
  ] LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END LOOP;
END $do$;
