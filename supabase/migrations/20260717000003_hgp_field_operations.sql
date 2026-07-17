-- ============================================================================
-- HOU INC · HGP Field Operations (generator jobs + outage intelligence)
--
-- Turns Houston Generator Pros' "Install Jobs" from a relabeled construction
-- screen into a real generator install/service operating system, and adds the
-- Storm Response (outage intelligence) data layer:
--
--   · hgp_jobs            — install / service / maintenance / emergency /
--                           warranty / survey jobs with the full generator
--                           pipeline (lead → survey → load calc → permit →
--                           equipment → scheduled → installing → inspection →
--                           commissioned → maintenance enrolled → completed),
--                           permit/inspection/equipment checklists, per-job
--                           economics (quote, deposit, equipment/labor/
--                           materials/sub/permit costs → margin), emergency
--                           priority, and an outage-event back-link
--   · hgp_customer_sites  — the customer equipment location registry that
--                           outage matching runs against (address/county/zip/
--                           utility provider + optional equipment/plan links)
--   · hgp_outage_sources  — provider adapter registry (CenterPoint, Oncor,
--                           AEP Texas, Entergy Texas, TNMP, ERCOT) with
--                           source type, polling interval, and TERMS NOTES.
--                           Browser-side scraping of map-only providers is
--                           deliberately NOT done — sources whose data isn't
--                           an official public API are registered as
--                           'map'/'manual' and fed via the manual event
--                           logger / import path (or a future Edge Function
--                           holding credentials server-side).
--   · hgp_outage_events   — logged/imported outage events (provider, area,
--                           affected customers, timing, cause, status)
--   · hgp_outage_impacts  — outage ↔ customer-site matches with outreach
--                           workflow status (none → planned → contacted →
--                           scheduled → converted)
--
--   RPCs:
--   · match_hgp_outage_impacts(event_id)  — zip/county/city matching of
--     customer sites into an outage event (idempotent, ON CONFLICT ignore)
--   · create_hgp_emergency_job(event_id, site_id) — one-click emergency
--     service job from an impacted site; stamps the impact 'scheduled'
--   · verify_hgp_field_ops() — launch verification
--
-- RLS: owner-scoped everywhere except the provider registry, which is
-- readable by any signed-in user (public provider metadata, no customer
-- data). Realtime registered for jobs/sites/events/impacts.
-- Safe to re-run. Run in the Supabase SQL editor after 20260717000002.
-- ============================================================================


-- ─── 1. Generator jobs ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hgp_jobs (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_id          TEXT NOT NULL DEFAULT 'houston-generator-pros',
  job_type           TEXT NOT NULL DEFAULT 'install'
    CHECK (job_type IN ('install', 'service', 'maintenance', 'emergency', 'warranty', 'survey')),
  stage              TEXT NOT NULL DEFAULT 'lead'
    CHECK (stage IN ('lead', 'survey', 'load_calc', 'permit', 'equipment_ordered', 'scheduled',
                     'installing', 'inspection', 'commissioned', 'maintenance_enrolled', 'completed', 'lost')),
  customer_name      TEXT NOT NULL,
  customer_email     TEXT,
  customer_phone     TEXT,
  site_address       TEXT,
  city               TEXT,
  county             TEXT,
  zip                TEXT,
  utility_provider   TEXT,
  generator_model    TEXT,
  serial_number      TEXT,
  transfer_switch    TEXT,
  kw_rating          NUMERIC(8,2),
  fuel_type          TEXT NOT NULL DEFAULT 'natural_gas'
    CHECK (fuel_type IN ('natural_gas', 'propane', 'diesel', 'bi_fuel')),
  permit_status      TEXT NOT NULL DEFAULT 'none'
    CHECK (permit_status IN ('none', 'pending', 'submitted', 'approved', 'failed')),
  inspection_status  TEXT NOT NULL DEFAULT 'none'
    CHECK (inspection_status IN ('none', 'pending', 'scheduled', 'passed', 'failed')),
  equipment_status   TEXT NOT NULL DEFAULT 'not_ordered'
    CHECK (equipment_status IN ('not_ordered', 'ordered', 'delivered', 'installed')),
  vendor_id          UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  equipment_unit_id  UUID REFERENCES public.hgp_equipment_units(id) ON DELETE SET NULL,
  quoted_amount      NUMERIC(14,2) NOT NULL DEFAULT 0,
  deposit_amount     NUMERIC(14,2) NOT NULL DEFAULT 0,
  equipment_cost     NUMERIC(14,2) NOT NULL DEFAULT 0,
  labor_cost         NUMERIC(14,2) NOT NULL DEFAULT 0,
  materials_cost     NUMERIC(14,2) NOT NULL DEFAULT 0,
  subcontractor_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  permit_cost        NUMERIC(14,2) NOT NULL DEFAULT 0,
  emergency          BOOLEAN NOT NULL DEFAULT false,
  outage_event_id    UUID,
  maintenance_enrolled BOOLEAN NOT NULL DEFAULT false,
  warranty_status    TEXT,
  target_install_date DATE,
  completed_date     DATE,
  notes              TEXT,
  metadata           JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at         TIMESTAMPTZ
);

ALTER TABLE public.hgp_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hgp_jobs_owner ON public.hgp_jobs;
CREATE POLICY hgp_jobs_owner ON public.hgp_jobs FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_hgp_jobs_stage
  ON public.hgp_jobs(entity_id, stage) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_hgp_jobs_emergency
  ON public.hgp_jobs(emergency, stage) WHERE deleted_at IS NULL AND emergency;
CREATE INDEX IF NOT EXISTS idx_hgp_jobs_install_date
  ON public.hgp_jobs(target_install_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_hgp_jobs_zip
  ON public.hgp_jobs(zip) WHERE deleted_at IS NULL;


-- ─── 2. Customer equipment sites ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hgp_customer_sites (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_id          TEXT NOT NULL DEFAULT 'houston-generator-pros',
  customer_name      TEXT NOT NULL,
  customer_email     TEXT,
  customer_phone     TEXT,
  site_address       TEXT,
  city               TEXT,
  county             TEXT,
  zip                TEXT,
  utility_provider   TEXT,
  latitude           NUMERIC(9,6),
  longitude          NUMERIC(9,6),
  equipment_unit_id  UUID REFERENCES public.hgp_equipment_units(id) ON DELETE SET NULL,
  agreement_id       UUID REFERENCES public.hgp_service_agreements(id) ON DELETE SET NULL,
  notes              TEXT,
  metadata           JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at         TIMESTAMPTZ
);

ALTER TABLE public.hgp_customer_sites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hgp_customer_sites_owner ON public.hgp_customer_sites;
CREATE POLICY hgp_customer_sites_owner ON public.hgp_customer_sites FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_hgp_sites_zip
  ON public.hgp_customer_sites(zip) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_hgp_sites_county
  ON public.hgp_customer_sites(county) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_hgp_sites_provider
  ON public.hgp_customer_sites(utility_provider) WHERE deleted_at IS NULL;


-- ─── 3. Outage provider registry (public metadata, no customer data) ────────
CREATE TABLE IF NOT EXISTS public.hgp_outage_sources (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider                 TEXT NOT NULL UNIQUE,
  source_url               TEXT,
  source_type              TEXT NOT NULL DEFAULT 'manual'
    CHECK (source_type IN ('api', 'map', 'manual', 'import')),
  polling_interval_minutes INT,
  terms_notes              TEXT,
  active                   BOOLEAN NOT NULL DEFAULT true,
  metadata                 JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.hgp_outage_sources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hgp_outage_sources_read ON public.hgp_outage_sources;
CREATE POLICY hgp_outage_sources_read ON public.hgp_outage_sources FOR SELECT
  USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS hgp_outage_sources_write ON public.hgp_outage_sources;
CREATE POLICY hgp_outage_sources_write ON public.hgp_outage_sources FOR ALL
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

INSERT INTO public.hgp_outage_sources (provider, source_url, source_type, polling_interval_minutes, terms_notes) VALUES
  ('CenterPoint Energy', 'https://outagetracker.centerpointenergy.com', 'map', 5,
   'Public outage tracker states data refreshes every 5 minutes. Map-only; no documented public API — log events manually or via a server-side Edge Function if terms permit.'),
  ('Oncor', 'https://stormcenter.oncor.com', 'map', 15,
   'Storm center map. Public ArcGIS layers exist but are not documented as authoritative — treat as reference only; prefer manual event logging.'),
  ('AEP Texas', 'https://www.aeptexas.com/outages/', 'map', 15,
   'Outage map without documented public API. Manual logging.'),
  ('Entergy Texas', 'https://www.etrviewoutage.com/map?state=TX', 'map', 15,
   'View Outage map. Manual logging unless an approved data feed is arranged.'),
  ('TNMP', 'https://tnmp.com/outages', 'map', 15,
   'Outage center map; manual logging.'),
  ('ERCOT', 'https://www.ercot.com/services/mdt/data-portal', 'api', 60,
   'ERCOT public data portal covers grid/market conditions (not per-customer outage maps) — useful for storm-context KPIs, not customer matching.')
ON CONFLICT (provider) DO UPDATE
SET source_url = EXCLUDED.source_url,
    source_type = EXCLUDED.source_type,
    polling_interval_minutes = EXCLUDED.polling_interval_minutes,
    terms_notes = EXCLUDED.terms_notes;


-- ─── 4. Outage events ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hgp_outage_events (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_id                TEXT NOT NULL DEFAULT 'houston-generator-pros',
  source_id                UUID REFERENCES public.hgp_outage_sources(id) ON DELETE SET NULL,
  provider                 TEXT NOT NULL,
  external_outage_id       TEXT,
  status                   TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'monitoring', 'restored')),
  affected_customers       INT NOT NULL DEFAULT 0,
  outage_started_at        TIMESTAMPTZ,
  estimated_restoration_at TIMESTAMPTZ,
  cause                    TEXT,
  county                   TEXT,
  city                     TEXT,
  zip                      TEXT,
  latitude                 NUMERIC(9,6),
  longitude                NUMERIC(9,6),
  metadata                 JSONB NOT NULL DEFAULT '{}'::jsonb,
  resolved_at              TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at               TIMESTAMPTZ
);

ALTER TABLE public.hgp_outage_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hgp_outage_events_owner ON public.hgp_outage_events;
CREATE POLICY hgp_outage_events_owner ON public.hgp_outage_events FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE UNIQUE INDEX IF NOT EXISTS ux_hgp_outage_external
  ON public.hgp_outage_events(provider, external_outage_id)
  WHERE external_outage_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_hgp_outage_status_time
  ON public.hgp_outage_events(status, outage_started_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_hgp_outage_area
  ON public.hgp_outage_events(zip, county) WHERE deleted_at IS NULL;


-- ─── 5. Outage ↔ customer impacts ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hgp_outage_impacts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_id       TEXT NOT NULL DEFAULT 'houston-generator-pros',
  outage_event_id UUID NOT NULL REFERENCES public.hgp_outage_events(id) ON DELETE CASCADE,
  site_id         UUID NOT NULL REFERENCES public.hgp_customer_sites(id) ON DELETE CASCADE,
  match_basis     TEXT NOT NULL DEFAULT 'zip' CHECK (match_basis IN ('zip', 'county', 'city')),
  outreach_status TEXT NOT NULL DEFAULT 'none'
    CHECK (outreach_status IN ('none', 'planned', 'contacted', 'scheduled', 'converted')),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (outage_event_id, site_id)
);

ALTER TABLE public.hgp_outage_impacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hgp_outage_impacts_owner ON public.hgp_outage_impacts;
CREATE POLICY hgp_outage_impacts_owner ON public.hgp_outage_impacts FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_hgp_impacts_event
  ON public.hgp_outage_impacts(outage_event_id, outreach_status);


-- hgp_jobs.outage_event_id is declared before the events table exists —
-- attach the FK here (idempotent).
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND table_name = 'hgp_jobs'
      AND constraint_name = 'hgp_jobs_outage_event_id_fkey'
  ) THEN
    ALTER TABLE public.hgp_jobs
      ADD CONSTRAINT hgp_jobs_outage_event_id_fkey
      FOREIGN KEY (outage_event_id) REFERENCES public.hgp_outage_events(id) ON DELETE SET NULL;
  END IF;
END $$;


-- ─── 6. Impact matching RPC (invoker rights — RLS scopes rows) ──────────────
CREATE OR REPLACE FUNCTION public.match_hgp_outage_impacts(p_outage_event_id UUID)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  ev public.hgp_outage_events%ROWTYPE;
  inserted INT := 0;
BEGIN
  SELECT * INTO ev FROM public.hgp_outage_events WHERE id = p_outage_event_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RETURN 0; END IF;

  INSERT INTO public.hgp_outage_impacts (user_id, entity_id, outage_event_id, site_id, match_basis)
  SELECT ev.user_id, ev.entity_id, ev.id, s.id,
         CASE
           WHEN ev.zip IS NOT NULL AND s.zip = ev.zip THEN 'zip'
           WHEN ev.county IS NOT NULL AND s.county ILIKE ev.county THEN 'county'
           ELSE 'city'
         END
  FROM public.hgp_customer_sites s
  WHERE s.deleted_at IS NULL
    AND (
      (ev.zip IS NOT NULL AND s.zip = ev.zip)
      OR (ev.county IS NOT NULL AND s.county ILIKE ev.county)
      OR (ev.city IS NOT NULL AND s.city ILIKE ev.city)
    )
  ON CONFLICT (outage_event_id, site_id) DO NOTHING;

  GET DIAGNOSTICS inserted = ROW_COUNT;
  RETURN inserted;
END;
$$;


-- ─── 7. Emergency job from an impacted site ────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_hgp_emergency_job(p_outage_event_id UUID, p_site_id UUID)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  ev public.hgp_outage_events%ROWTYPE;
  site public.hgp_customer_sites%ROWTYPE;
  v_job_id UUID;
BEGIN
  SELECT * INTO ev FROM public.hgp_outage_events WHERE id = p_outage_event_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Outage event not found'; END IF;
  SELECT * INTO site FROM public.hgp_customer_sites WHERE id = p_site_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Customer site not found'; END IF;

  INSERT INTO public.hgp_jobs (
    user_id, entity_id, job_type, stage, emergency, outage_event_id,
    customer_name, customer_email, customer_phone,
    site_address, city, county, zip, utility_provider,
    equipment_unit_id, notes, metadata
  ) VALUES (
    site.user_id, site.entity_id, 'emergency', 'scheduled', true, ev.id,
    site.customer_name, site.customer_email, site.customer_phone,
    site.site_address, site.city, site.county, site.zip, site.utility_provider,
    site.equipment_unit_id,
    'Emergency dispatch created from ' || ev.provider || ' outage'
      || COALESCE(' (' || ev.cause || ')', '') || '.',
    jsonb_build_object('created_from', 'storm_response', 'outage_event_id', ev.id, 'provider', ev.provider)
  )
  RETURNING id INTO v_job_id;

  UPDATE public.hgp_outage_impacts
  SET outreach_status = 'scheduled', updated_at = now()
  WHERE outage_event_id = p_outage_event_id AND site_id = p_site_id;

  RETURN v_job_id;
END;
$$;


-- ─── 8. updated_at triggers + realtime ──────────────────────────────────────
DO $$ DECLARE t TEXT; BEGIN
  FOREACH t IN ARRAY ARRAY[
    'hgp_jobs', 'hgp_customer_sites', 'hgp_outage_sources', 'hgp_outage_events', 'hgp_outage_impacts'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER trg_%s_updated BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', t, t);
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    EXCEPTION
      WHEN duplicate_object THEN NULL;
      WHEN undefined_object THEN NULL;
    END;
  END LOOP;
END $$;


-- ─── 9. Verification ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.verify_hgp_field_ops()
RETURNS TABLE (check_name TEXT, ok BOOLEAN, details TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY VALUES
    ('hgp_jobs_pipeline',
      EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='hgp_jobs')
      AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='hgp_jobs' AND column_name='stage'),
      'generator job pipeline table with checklist + economics columns'),
    ('hgp_outage_intelligence',
      EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='hgp_outage_events')
      AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='hgp_customer_sites')
      AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'match_hgp_outage_impacts')
      AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_hgp_emergency_job'),
      'outage sources/events/impacts + matching and emergency-dispatch RPCs'),
    ('hgp_outage_sources_seeded',
      (SELECT count(*) FROM public.hgp_outage_sources) >= 6,
      'Texas provider registry seeded (CenterPoint/Oncor/AEP/Entergy/TNMP/ERCOT)');
END;
$$;

NOTIFY pgrst, 'reload schema';
