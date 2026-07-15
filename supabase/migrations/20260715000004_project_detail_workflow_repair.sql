-- ============================================================================
-- HOU INC · Project Detail Workflow Repair
--
-- Makes project-level reconciliation workflows reliable on databases where the
-- older portal milestone table existed before the finance reconciliation screens.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.project_milestones
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS entity_id TEXT NOT NULL DEFAULT 'houston-enterprise',
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS planned_start_date DATE,
  ADD COLUMN IF NOT EXISTS planned_completion_date DATE,
  ADD COLUMN IF NOT EXISTS actual_completion_date DATE,
  ADD COLUMN IF NOT EXISTS percent_complete NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS billing_eligible BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS billing_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS client_visible BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS client_visible_notes TEXT,
  ADD COLUMN IF NOT EXISTS internal_notes TEXT;

ALTER TABLE public.project_milestones
  ALTER COLUMN client_id DROP NOT NULL,
  ALTER COLUMN phase_index SET DEFAULT 0;

UPDATE public.project_milestones
SET title = COALESCE(title, phase_name, 'Project milestone'),
    description = COALESCE(description, phase_description),
    actual_completion_date = COALESCE(actual_completion_date, completed_date),
    user_id = COALESCE(user_id, (SELECT p.user_id FROM public.projects p WHERE p.id = project_milestones.project_id)),
    entity_id = COALESCE(entity_id, 'houston-enterprise')
WHERE title IS NULL
   OR description IS NULL
   OR actual_completion_date IS NULL
   OR user_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_project_milestones_project_id
  ON public.project_milestones(project_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_project_milestones_user_entity
  ON public.project_milestones(user_id, entity_id);

ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pm_all" ON public.project_milestones;
DROP POLICY IF EXISTS "pm_select_all" ON public.project_milestones;
DROP POLICY IF EXISTS "pm_public_read" ON public.project_milestones;
DROP POLICY IF EXISTS "project_milestones_public_read" ON public.project_milestones;
DROP POLICY IF EXISTS "project_milestones_auth_all" ON public.project_milestones;

CREATE POLICY "project_milestones_project_owner_all"
ON public.project_milestones
FOR ALL
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_milestones.project_id
      AND p.user_id = auth.uid()
  )
)
WITH CHECK (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_milestones.project_id
      AND p.user_id = auth.uid()
  )
);

ALTER TABLE public.draw_schedules
  ADD COLUMN IF NOT EXISTS invoice_number TEXT,
  ADD COLUMN IF NOT EXISTS billing_period_start DATE,
  ADD COLUMN IF NOT EXISTS billing_period_end DATE;

NOTIFY pgrst, 'reload schema';
