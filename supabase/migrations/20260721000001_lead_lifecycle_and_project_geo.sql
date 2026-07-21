-- ═══════════════════════════════════════════════════════════════════════════
-- HOU INC · Lead Lifecycle Stages + Project Title + Project Geo-Coordinates
--
-- 1. start_project_submissions gets a `project_title` field (collected on the
--    public /start-project form) so inbound briefs carry a real project name
--    instead of only a contact name.
-- 2. Both lead sources (start_project_submissions, contact_submissions) get
--    a `lead_status` lifecycle column — the Construction & Residential
--    Project Lifecycle: lead_capture -> site_audit -> estimation ->
--    client_review -> awarded | lost -> contracting. Reaching `awarded`
--    triggers an atomic database-side creation of an
--    admin_projects row, which the existing admin<->finance sync trigger
--    (20260716000010_admin_finance_project_link.sql) then mirrors into the
--    finance `projects` table. `converted_admin_project_id` records that
--    link and prevents double-conversion if the stage is toggled again.
-- 3. admin_projects gets nullable `latitude`/`longitude` for the Overview's
--    interactive project site map — populated client-side from a static
--    Houston-area neighborhood lookup (no external geocoding dependency).
--
-- Safe to re-run (IF NOT EXISTS / OR REPLACE throughout).
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Project title on the Start a Project brief ─────────────────────────
ALTER TABLE public.start_project_submissions
  ADD COLUMN IF NOT EXISTS project_title TEXT;

-- ─── 2. Lead lifecycle stage on both inbound lead sources ──────────────────
ALTER TABLE public.start_project_submissions
  ADD COLUMN IF NOT EXISTS lead_status TEXT NOT NULL DEFAULT 'lead_capture',
  ADD COLUMN IF NOT EXISTS converted_admin_project_id UUID REFERENCES public.admin_projects(id) ON DELETE SET NULL;

ALTER TABLE public.contact_submissions
  ADD COLUMN IF NOT EXISTS lead_status TEXT NOT NULL DEFAULT 'lead_capture',
  ADD COLUMN IF NOT EXISTS converted_admin_project_id UUID REFERENCES public.admin_projects(id) ON DELETE SET NULL;

DO $$ BEGIN
  ALTER TABLE public.start_project_submissions
    ADD CONSTRAINT start_project_submissions_lead_status_check
    CHECK (lead_status IN ('lead_capture','site_audit','estimation','client_review','awarded','lost','contracting'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.contact_submissions
    ADD CONSTRAINT contact_submissions_lead_status_check
    CHECK (lead_status IN ('lead_capture','site_audit','estimation','client_review','awarded','lost','contracting'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_sps_lead_status ON public.start_project_submissions(lead_status);
CREATE INDEX IF NOT EXISTS idx_cs_lead_status ON public.contact_submissions(lead_status);
CREATE UNIQUE INDEX IF NOT EXISTS ux_sps_converted_admin_project
  ON public.start_project_submissions(converted_admin_project_id)
  WHERE converted_admin_project_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_cs_converted_admin_project
  ON public.contact_submissions(converted_admin_project_id)
  WHERE converted_admin_project_id IS NOT NULL;

-- ─── 3. Project site coordinates (Houston-metro neighborhood centroids) ───
ALTER TABLE public.admin_projects
  ADD COLUMN IF NOT EXISTS latitude NUMERIC,
  ADD COLUMN IF NOT EXISTS longitude NUMERIC;

-- ─── 4. Atomic lifecycle transition + awarded-project conversion ─────────
-- The row lock and conversion pointer prevent duplicate delivery projects.
CREATE OR REPLACE FUNCTION public.transition_inbound_lead(
  p_source TEXT, p_lead_id UUID, p_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_project_id UUID;
  v_finance_project_id UUID;
  v_title TEXT; v_name TEXT; v_email TEXT; v_phone TEXT; v_type TEXT;
  v_location TEXT; v_description TEXT; v_budget_key TEXT; v_budget NUMERIC;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication is required'; END IF;
  IF p_status NOT IN ('lead_capture','site_audit','estimation','client_review','awarded','lost','contracting') THEN
    RAISE EXCEPTION 'Invalid lead lifecycle status: %', p_status;
  END IF;

  IF p_source = 'start_project' THEN
    SELECT converted_admin_project_id,
           COALESCE(NULLIF(trim(project_title), ''), NULLIF(trim(name), '') || ' Project'),
           name, email, phone, type, location, description, budget
      INTO v_project_id, v_title, v_name, v_email, v_phone, v_type,
           v_location, v_description, v_budget_key
      FROM public.start_project_submissions WHERE id = p_lead_id FOR UPDATE;
  ELSIF p_source = 'contact' THEN
    SELECT converted_admin_project_id,
           COALESCE(NULLIF(trim(company), ''), NULLIF(trim(name), '') || ' Project'),
           name, email, phone, service_type, NULL, message, budget_range
      INTO v_project_id, v_title, v_name, v_email, v_phone, v_type,
           v_location, v_description, v_budget_key
      FROM public.contact_submissions WHERE id = p_lead_id FOR UPDATE;
  ELSE
    RAISE EXCEPTION 'Unknown lead source: %', p_source;
  END IF;
  IF NOT FOUND THEN RAISE EXCEPTION 'Inbound lead not found'; END IF;

  IF p_status = 'awarded' AND v_project_id IS NULL THEN
    v_budget := CASE v_budget_key
      WHEN 'under_250' THEN 200000 WHEN '250_500' THEN 375000
      WHEN '500_1m' THEN 750000 WHEN '1m_2.5m' THEN 1750000
      WHEN '2.5m_5m' THEN 3750000 WHEN 'over_5m' THEN 5000000 ELSE NULL END;
    INSERT INTO public.admin_projects (
      admin_user_id, title, type, address, city, state, client_name, client_email,
      status, progress_pct, contract_amount, budget, entity, description,
      internal_notes, custom_fields
    ) VALUES (
      v_user_id, v_title, COALESCE(NULLIF(v_type, ''), 'General Construction'),
      v_location, 'Houston', 'TX', v_name, v_email, 'planning', 0, v_budget,
      v_budget, 'houston-enterprise', v_description,
      'Created automatically when the inbound lead was marked Awarded / Approved.',
      jsonb_build_object('lead_source', p_source, 'lead_id', p_lead_id,
                         'lead_phone', v_phone, 'conversion_stage', 'awarded')
    ) RETURNING id INTO v_project_id;
  END IF;

  IF p_source = 'start_project' THEN
    UPDATE public.start_project_submissions SET lead_status = p_status,
      converted_admin_project_id = COALESCE(converted_admin_project_id, v_project_id)
      WHERE id = p_lead_id;
  ELSE
    UPDATE public.contact_submissions SET lead_status = p_status,
      converted_admin_project_id = COALESCE(converted_admin_project_id, v_project_id)
      WHERE id = p_lead_id;
  END IF;

  IF v_project_id IS NOT NULL THEN
    SELECT finance_project_id INTO v_finance_project_id
      FROM public.admin_projects WHERE id = v_project_id;
  END IF;
  RETURN jsonb_build_object('lead_status', p_status, 'admin_project_id', v_project_id,
    'finance_project_id', v_finance_project_id);
END;
$$;

REVOKE ALL ON FUNCTION public.transition_inbound_lead(TEXT, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transition_inbound_lead(TEXT, UUID, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
