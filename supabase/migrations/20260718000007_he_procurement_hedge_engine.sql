-- ============================================================================
-- HOU INC · Houston Enterprise Procurement Hedge Engine (Beta)
--
-- Adds a real, database-backed material demand + supplier quote + RFQ
-- aggregation layer for the Houston Enterprise construction finance dashboard.
--
-- This is intentionally scoped to houston-enterprise. Browser-side Firecrawl
-- scraping is supported by the frontend when VITE_FIRECRAWL_API_KEY is set,
-- but supplier outreach remains a tracked RFQ package unless/until an email
-- provider or Edge Function is connected server-side.
--
-- Objects:
--   procurement_material_requirements — material demand by project/scope line
--   procurement_supplier_sources      — supplier URLs/contact targets
--   procurement_price_quotes          — manual or scraped price captures
--   procurement_rfq_batches           — aggregated RFQ package headers
--   procurement_rfq_lines             — grouped demand lines per RFQ
--   get_procurement_hedge_summary()   — grouped demand + best quote/savings
--   create_procurement_rfq_from_open()— draft an RFQ from open requirements
--   verify_he_procurement_hedge_engine()
--
-- Safe to re-run. Run after 20260718000006.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.procurement_material_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_id TEXT NOT NULL DEFAULT 'houston-enterprise',
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  scope_item_id UUID REFERENCES public.project_scope_items(id) ON DELETE SET NULL,
  material_name TEXT NOT NULL,
  normalized_material TEXT GENERATED ALWAYS AS (lower(regexp_replace(trim(material_name), '\s+', ' ', 'g'))) STORED,
  category TEXT NOT NULL DEFAULT 'materials',
  quantity NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  unit TEXT NOT NULL DEFAULT 'ea',
  target_unit_price NUMERIC(14,4),
  required_by DATE,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'quoted', 'rfq_drafted', 'ordered', 'cancelled', 'fulfilled')),
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

ALTER TABLE public.procurement_material_requirements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS procurement_material_requirements_entity ON public.procurement_material_requirements;
CREATE POLICY procurement_material_requirements_entity
  ON public.procurement_material_requirements FOR ALL
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.app_user_roles r
      WHERE r.user_id = auth.uid()
        AND r.entity_id = procurement_material_requirements.entity_id
        AND r.is_active
        AND r.role IN ('admin', 'finance_manager', 'finance', 'project_manager', 'read_only_auditor')
    )
  )
  WITH CHECK (
    entity_id = 'houston-enterprise'
    AND (
      auth.uid() = user_id
      OR EXISTS (
        SELECT 1 FROM public.app_user_roles r
        WHERE r.user_id = auth.uid()
          AND r.entity_id = procurement_material_requirements.entity_id
          AND r.is_active
          AND r.role IN ('admin', 'finance_manager', 'finance', 'project_manager')
      )
    )
  );

CREATE INDEX IF NOT EXISTS idx_proc_req_entity_status
  ON public.procurement_material_requirements(entity_id, status, required_by)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_proc_req_material
  ON public.procurement_material_requirements(entity_id, normalized_material, unit)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.procurement_supplier_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_id TEXT NOT NULL DEFAULT 'houston-enterprise',
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  supplier_name TEXT NOT NULL,
  source_url TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  source_type TEXT NOT NULL DEFAULT 'manual' CHECK (source_type IN ('manual', 'firecrawl', 'catalog', 'api')),
  preferred_categories TEXT[] NOT NULL DEFAULT '{}'::text[],
  active BOOLEAN NOT NULL DEFAULT true,
  last_scraped_at TIMESTAMPTZ,
  terms_notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

ALTER TABLE public.procurement_supplier_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS procurement_supplier_sources_entity ON public.procurement_supplier_sources;
CREATE POLICY procurement_supplier_sources_entity
  ON public.procurement_supplier_sources FOR ALL
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.app_user_roles r
      WHERE r.user_id = auth.uid()
        AND r.entity_id = procurement_supplier_sources.entity_id
        AND r.is_active
        AND r.role IN ('admin', 'finance_manager', 'finance', 'project_manager', 'read_only_auditor')
    )
  )
  WITH CHECK (
    entity_id = 'houston-enterprise'
    AND (
      auth.uid() = user_id
      OR EXISTS (
        SELECT 1 FROM public.app_user_roles r
        WHERE r.user_id = auth.uid()
          AND r.entity_id = procurement_supplier_sources.entity_id
          AND r.is_active
          AND r.role IN ('admin', 'finance_manager', 'finance', 'project_manager')
      )
    )
  );

CREATE INDEX IF NOT EXISTS idx_proc_sources_entity_active
  ON public.procurement_supplier_sources(entity_id, active)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.procurement_price_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_id TEXT NOT NULL DEFAULT 'houston-enterprise',
  supplier_source_id UUID REFERENCES public.procurement_supplier_sources(id) ON DELETE SET NULL,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  material_name TEXT NOT NULL,
  normalized_material TEXT GENERATED ALWAYS AS (lower(regexp_replace(trim(material_name), '\s+', ' ', 'g'))) STORED,
  category TEXT,
  unit TEXT NOT NULL DEFAULT 'ea',
  unit_price NUMERIC(14,4) NOT NULL CHECK (unit_price >= 0),
  min_quantity NUMERIC(14,3) NOT NULL DEFAULT 0,
  quote_url TEXT,
  quote_source TEXT NOT NULL DEFAULT 'manual' CHECK (quote_source IN ('manual', 'firecrawl', 'supplier_rfq', 'catalog', 'api')),
  confidence NUMERIC(5,2) NOT NULL DEFAULT 70 CHECK (confidence BETWEEN 0 AND 100),
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at DATE,
  raw_excerpt TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

ALTER TABLE public.procurement_price_quotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS procurement_price_quotes_entity ON public.procurement_price_quotes;
CREATE POLICY procurement_price_quotes_entity
  ON public.procurement_price_quotes FOR ALL
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.app_user_roles r
      WHERE r.user_id = auth.uid()
        AND r.entity_id = procurement_price_quotes.entity_id
        AND r.is_active
        AND r.role IN ('admin', 'finance_manager', 'finance', 'project_manager', 'read_only_auditor')
    )
  )
  WITH CHECK (
    entity_id = 'houston-enterprise'
    AND (
      auth.uid() = user_id
      OR EXISTS (
        SELECT 1 FROM public.app_user_roles r
        WHERE r.user_id = auth.uid()
          AND r.entity_id = procurement_price_quotes.entity_id
          AND r.is_active
          AND r.role IN ('admin', 'finance_manager', 'finance', 'project_manager')
      )
    )
  );

CREATE INDEX IF NOT EXISTS idx_proc_quotes_material
  ON public.procurement_price_quotes(entity_id, normalized_material, unit, captured_at DESC)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.procurement_rfq_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_id TEXT NOT NULL DEFAULT 'houston-enterprise',
  rfq_number TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'awarded', 'ordered', 'cancelled')),
  supplier_count INT NOT NULL DEFAULT 0,
  project_count INT NOT NULL DEFAULT 0,
  total_estimated_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  estimated_savings NUMERIC(14,2) NOT NULL DEFAULT 0,
  due_date DATE,
  sent_at TIMESTAMPTZ,
  awarded_supplier_source_id UUID REFERENCES public.procurement_supplier_sources(id) ON DELETE SET NULL,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (entity_id, rfq_number)
);

ALTER TABLE public.procurement_rfq_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS procurement_rfq_batches_entity ON public.procurement_rfq_batches;
CREATE POLICY procurement_rfq_batches_entity
  ON public.procurement_rfq_batches FOR ALL
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.app_user_roles r
      WHERE r.user_id = auth.uid()
        AND r.entity_id = procurement_rfq_batches.entity_id
        AND r.is_active
        AND r.role IN ('admin', 'finance_manager', 'finance', 'project_manager', 'read_only_auditor')
    )
  )
  WITH CHECK (
    entity_id = 'houston-enterprise'
    AND (
      auth.uid() = user_id
      OR EXISTS (
        SELECT 1 FROM public.app_user_roles r
        WHERE r.user_id = auth.uid()
          AND r.entity_id = procurement_rfq_batches.entity_id
          AND r.is_active
          AND r.role IN ('admin', 'finance_manager', 'finance', 'project_manager')
      )
    )
  );

CREATE TABLE IF NOT EXISTS public.procurement_rfq_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_batch_id UUID NOT NULL REFERENCES public.procurement_rfq_batches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_id TEXT NOT NULL DEFAULT 'houston-enterprise',
  material_name TEXT NOT NULL,
  normalized_material TEXT NOT NULL,
  category TEXT,
  total_quantity NUMERIC(14,3) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'ea',
  project_count INT NOT NULL DEFAULT 0,
  requirement_ids UUID[] NOT NULL DEFAULT '{}'::uuid[],
  best_supplier_name TEXT,
  best_unit_price NUMERIC(14,4),
  target_unit_price NUMERIC(14,4),
  estimated_line_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  estimated_line_savings NUMERIC(14,2) NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.procurement_rfq_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS procurement_rfq_lines_entity ON public.procurement_rfq_lines;
CREATE POLICY procurement_rfq_lines_entity
  ON public.procurement_rfq_lines FOR ALL
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.app_user_roles r
      WHERE r.user_id = auth.uid()
        AND r.entity_id = procurement_rfq_lines.entity_id
        AND r.is_active
        AND r.role IN ('admin', 'finance_manager', 'finance', 'project_manager', 'read_only_auditor')
    )
  )
  WITH CHECK (
    entity_id = 'houston-enterprise'
    AND (
      auth.uid() = user_id
      OR EXISTS (
        SELECT 1 FROM public.app_user_roles r
        WHERE r.user_id = auth.uid()
          AND r.entity_id = procurement_rfq_lines.entity_id
          AND r.is_active
          AND r.role IN ('admin', 'finance_manager', 'finance', 'project_manager')
      )
    )
  );

CREATE INDEX IF NOT EXISTS idx_proc_rfq_batches_entity_status
  ON public.procurement_rfq_batches(entity_id, status, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_proc_rfq_lines_batch
  ON public.procurement_rfq_lines(rfq_batch_id);

CREATE OR REPLACE FUNCTION public.get_procurement_hedge_summary(p_entity_id TEXT DEFAULT 'houston-enterprise')
RETURNS TABLE (
  normalized_material TEXT,
  display_material TEXT,
  category TEXT,
  unit TEXT,
  open_quantity NUMERIC,
  project_count BIGINT,
  requirement_count BIGINT,
  earliest_required_by DATE,
  avg_target_unit_price NUMERIC,
  best_supplier_name TEXT,
  best_unit_price NUMERIC,
  best_quote_captured_at TIMESTAMPTZ,
  estimated_cost NUMERIC,
  estimated_savings NUMERIC
)
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  WITH req AS (
    SELECT
      r.normalized_material,
      min(r.material_name) AS display_material,
      min(r.category) AS category,
      r.unit,
      sum(r.quantity) AS open_quantity,
      count(DISTINCT r.project_id) AS project_count,
      count(*) AS requirement_count,
      min(r.required_by) AS earliest_required_by,
      avg(r.target_unit_price) FILTER (WHERE r.target_unit_price IS NOT NULL) AS avg_target_unit_price
    FROM public.procurement_material_requirements r
    WHERE r.entity_id = p_entity_id
      AND r.deleted_at IS NULL
      AND r.status IN ('open', 'quoted')
    GROUP BY r.normalized_material, r.unit
  ),
  quote AS (
    SELECT DISTINCT ON (q.normalized_material, q.unit)
      q.normalized_material,
      q.unit,
      COALESCE(s.supplier_name, v.name, 'Supplier') AS best_supplier_name,
      q.unit_price AS best_unit_price,
      q.captured_at AS best_quote_captured_at
    FROM public.procurement_price_quotes q
    LEFT JOIN public.procurement_supplier_sources s ON s.id = q.supplier_source_id
    LEFT JOIN public.vendors v ON v.id = q.vendor_id
    WHERE q.entity_id = p_entity_id
      AND q.deleted_at IS NULL
      AND (q.expires_at IS NULL OR q.expires_at >= CURRENT_DATE)
    ORDER BY q.normalized_material, q.unit, q.unit_price ASC, q.captured_at DESC
  )
  SELECT
    req.normalized_material,
    req.display_material,
    req.category,
    req.unit,
    req.open_quantity,
    req.project_count,
    req.requirement_count,
    req.earliest_required_by,
    ROUND(req.avg_target_unit_price, 4) AS avg_target_unit_price,
    quote.best_supplier_name,
    quote.best_unit_price,
    quote.best_quote_captured_at,
    ROUND(req.open_quantity * COALESCE(quote.best_unit_price, req.avg_target_unit_price, 0), 2) AS estimated_cost,
    ROUND(GREATEST(0, req.open_quantity * (COALESCE(req.avg_target_unit_price, quote.best_unit_price, 0) - COALESCE(quote.best_unit_price, req.avg_target_unit_price, 0))), 2) AS estimated_savings
  FROM req
  LEFT JOIN quote ON quote.normalized_material = req.normalized_material AND quote.unit = req.unit
  ORDER BY estimated_savings DESC, open_quantity DESC, display_material ASC;
$$;

CREATE OR REPLACE FUNCTION public.create_procurement_rfq_from_open(
  p_title TEXT DEFAULT NULL,
  p_due_date DATE DEFAULT NULL,
  p_requirement_ids UUID[] DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_batch UUID;
  v_number TEXT;
  v_total NUMERIC;
  v_savings NUMERIC;
  v_project_count INT;
  v_supplier_count INT;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_number := 'RFQ-' || to_char(now(), 'YYYYMMDD-HH24MISS');

  INSERT INTO public.procurement_rfq_batches (
    user_id, entity_id, rfq_number, title, due_date
  ) VALUES (
    v_user, 'houston-enterprise', v_number,
    COALESCE(NULLIF(trim(p_title), ''), 'Bulk Material RFQ ' || to_char(now(), 'Mon DD, YYYY')),
    p_due_date
  )
  RETURNING id INTO v_batch;

  INSERT INTO public.procurement_rfq_lines (
    rfq_batch_id, user_id, entity_id, material_name, normalized_material,
    category, total_quantity, unit, project_count, requirement_ids,
    best_supplier_name, best_unit_price, target_unit_price,
    estimated_line_cost, estimated_line_savings
  )
  SELECT
    v_batch,
    v_user,
    'houston-enterprise',
    min(r.material_name),
    r.normalized_material,
    min(r.category),
    sum(r.quantity),
    r.unit,
    count(DISTINCT r.project_id)::int,
    array_agg(r.id),
    q.best_supplier_name,
    q.best_unit_price,
    avg(r.target_unit_price) FILTER (WHERE r.target_unit_price IS NOT NULL),
    ROUND(sum(r.quantity) * COALESCE(q.best_unit_price, avg(r.target_unit_price), 0), 2),
    ROUND(GREATEST(0, sum(r.quantity) * (COALESCE(avg(r.target_unit_price), q.best_unit_price, 0) - COALESCE(q.best_unit_price, avg(r.target_unit_price), 0))), 2)
  FROM public.procurement_material_requirements r
  LEFT JOIN LATERAL (
    SELECT
      COALESCE(s.supplier_name, v.name, 'Supplier') AS best_supplier_name,
      pq.unit_price AS best_unit_price
    FROM public.procurement_price_quotes pq
    LEFT JOIN public.procurement_supplier_sources s ON s.id = pq.supplier_source_id
    LEFT JOIN public.vendors v ON v.id = pq.vendor_id
    WHERE pq.entity_id = 'houston-enterprise'
      AND pq.deleted_at IS NULL
      AND pq.normalized_material = r.normalized_material
      AND pq.unit = r.unit
      AND (pq.expires_at IS NULL OR pq.expires_at >= CURRENT_DATE)
    ORDER BY pq.unit_price ASC, pq.captured_at DESC
    LIMIT 1
  ) q ON true
  WHERE r.entity_id = 'houston-enterprise'
    AND r.deleted_at IS NULL
    AND r.status IN ('open', 'quoted')
    AND (p_requirement_ids IS NULL OR r.id = ANY(p_requirement_ids))
  GROUP BY r.normalized_material, r.unit, q.best_supplier_name, q.best_unit_price;

  UPDATE public.procurement_material_requirements r
  SET status = 'rfq_drafted', updated_at = now()
  WHERE r.entity_id = 'houston-enterprise'
    AND r.deleted_at IS NULL
    AND r.status IN ('open', 'quoted')
    AND (p_requirement_ids IS NULL OR r.id = ANY(p_requirement_ids));

  SELECT COALESCE(sum(estimated_line_cost), 0), COALESCE(sum(estimated_line_savings), 0)
    INTO v_total, v_savings
  FROM public.procurement_rfq_lines
  WHERE rfq_batch_id = v_batch;

  SELECT count(DISTINCT r.project_id)::int INTO v_project_count
  FROM public.procurement_rfq_lines l
  JOIN LATERAL unnest(l.requirement_ids) AS req(req_id) ON true
  JOIN public.procurement_material_requirements r ON r.id = req.req_id
  WHERE l.rfq_batch_id = v_batch
    AND r.project_id IS NOT NULL;

  SELECT count(*)::int INTO v_supplier_count
  FROM public.procurement_supplier_sources
  WHERE entity_id = 'houston-enterprise'
    AND active
    AND deleted_at IS NULL
    AND contact_email IS NOT NULL
    AND trim(contact_email) <> '';

  UPDATE public.procurement_rfq_batches
  SET
    total_estimated_cost = v_total,
    estimated_savings = v_savings,
    project_count = COALESCE(v_project_count, 0),
    supplier_count = COALESCE(v_supplier_count, 0),
    updated_at = now()
  WHERE id = v_batch;

  RETURN v_batch;
END;
$$;

DO $$ DECLARE t TEXT; BEGIN
  FOREACH t IN ARRAY ARRAY[
    'procurement_material_requirements',
    'procurement_supplier_sources',
    'procurement_rfq_batches'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER trg_%s_updated BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', t, t);
  END LOOP;

  FOREACH t IN ARRAY ARRAY[
    'procurement_material_requirements',
    'procurement_supplier_sources',
    'procurement_price_quotes',
    'procurement_rfq_batches',
    'procurement_rfq_lines'
  ] LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL; END;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.verify_he_procurement_hedge_engine()
RETURNS TABLE (check_name TEXT, ok BOOLEAN, details TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY VALUES
    ('procurement_tables',
      EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='procurement_material_requirements')
      AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='procurement_supplier_sources')
      AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='procurement_price_quotes')
      AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='procurement_rfq_batches')
      AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='procurement_rfq_lines'),
      'requirements, suppliers, quotes, RFQ batches, and RFQ lines'),
    ('procurement_rpcs',
      EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_procurement_hedge_summary')
      AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_procurement_rfq_from_open'),
      'hedge summary and bulk RFQ creation functions');
END;
$$;

NOTIFY pgrst, 'reload schema';
