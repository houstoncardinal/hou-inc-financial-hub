-- ============================================================================
-- HOU INC · Entity Client Accounts
--
-- Adds a finance-native client/account layer for Houston Enterprise and
-- Houston Generator Pros. This is intentionally separate from portal_clients:
-- the client portal is Houston Enterprise-only access/invite infrastructure,
-- while finance_client_accounts is the finance/operations account record that
-- links to projects, invoices, income, expenses, HGP jobs, service visits, and
-- sites.
--
-- Safe to re-run. Run after 20260718000007.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.finance_client_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_id TEXT NOT NULL CHECK (entity_id IN ('houston-enterprise', 'houston-generator-pros')),
  client_type TEXT NOT NULL DEFAULT 'residential'
    CHECK (client_type IN ('residential', 'commercial', 'builder', 'property_manager', 'investor', 'municipal', 'other')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('lead', 'active', 'proposal', 'scheduled', 'on_hold', 'completed', 'inactive', 'archived')),
  name TEXT NOT NULL,
  company TEXT,
  email TEXT,
  phone TEXT,
  secondary_phone TEXT,
  billing_address TEXT,
  site_address TEXT,
  city TEXT,
  county TEXT,
  state TEXT NOT NULL DEFAULT 'TX',
  zip TEXT,
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  preferred_contact_method TEXT DEFAULT 'phone'
    CHECK (preferred_contact_method IN ('phone', 'email', 'text', 'portal', 'other')),
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  hgp_site_id UUID REFERENCES public.hgp_customer_sites(id) ON DELETE SET NULL,
  hgp_equipment_unit_id UUID REFERENCES public.hgp_equipment_units(id) ON DELETE SET NULL,
  hgp_service_agreement_id UUID REFERENCES public.hgp_service_agreements(id) ON DELETE SET NULL,
  construction_scope TEXT,
  property_type TEXT,
  project_stage TEXT,
  utility_provider TEXT,
  generator_model TEXT,
  generator_serial TEXT,
  kw_rating NUMERIC(8,2),
  fuel_type TEXT,
  install_status TEXT,
  next_visit_date DATE,
  last_visit_date DATE,
  lifetime_revenue NUMERIC(14,2) NOT NULL DEFAULT 0,
  open_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  notes TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}'::text[],
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

ALTER TABLE public.finance_client_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS finance_client_accounts_entity ON public.finance_client_accounts;
CREATE POLICY finance_client_accounts_entity
  ON public.finance_client_accounts FOR ALL
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.app_user_roles r
      WHERE r.user_id = auth.uid()
        AND r.entity_id = finance_client_accounts.entity_id
        AND r.is_active
        AND r.role IN ('admin', 'finance_manager', 'finance', 'project_manager', 'read_only_auditor')
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.app_user_roles r
      WHERE r.user_id = auth.uid()
        AND r.entity_id = finance_client_accounts.entity_id
        AND r.is_active
        AND r.role IN ('admin', 'finance_manager', 'finance', 'project_manager')
    )
  );

CREATE INDEX IF NOT EXISTS idx_finance_client_accounts_entity_status
  ON public.finance_client_accounts(entity_id, status, name)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_finance_client_accounts_project
  ON public.finance_client_accounts(project_id)
  WHERE project_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_finance_client_accounts_hgp_site
  ON public.finance_client_accounts(hgp_site_id)
  WHERE hgp_site_id IS NOT NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_finance_client_accounts_entity_email_live
  ON public.finance_client_accounts(entity_id, lower(email))
  WHERE email IS NOT NULL AND trim(email) <> '' AND deleted_at IS NULL;

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS finance_client_id UUID REFERENCES public.finance_client_accounts(id) ON DELETE SET NULL;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS finance_client_id UUID REFERENCES public.finance_client_accounts(id) ON DELETE SET NULL;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS finance_client_id UUID REFERENCES public.finance_client_accounts(id) ON DELETE SET NULL;

ALTER TABLE public.hgp_jobs
  ADD COLUMN IF NOT EXISTS finance_client_id UUID REFERENCES public.finance_client_accounts(id) ON DELETE SET NULL;

ALTER TABLE public.hgp_service_visits
  ADD COLUMN IF NOT EXISTS finance_client_id UUID REFERENCES public.finance_client_accounts(id) ON DELETE SET NULL;

ALTER TABLE public.hgp_customer_sites
  ADD COLUMN IF NOT EXISTS finance_client_id UUID REFERENCES public.finance_client_accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_finance_client
  ON public.transactions(finance_client_id)
  WHERE finance_client_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_finance_client
  ON public.invoices(finance_client_id)
  WHERE finance_client_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_projects_finance_client
  ON public.projects(finance_client_id)
  WHERE finance_client_id IS NOT NULL AND deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.get_finance_client_account_summary(p_entity_id TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  company TEXT,
  status TEXT,
  client_type TEXT,
  email TEXT,
  phone TEXT,
  site_address TEXT,
  city TEXT,
  zip TEXT,
  project_name TEXT,
  lifetime_income NUMERIC,
  lifetime_expense NUMERIC,
  invoice_open_balance NUMERIC,
  job_count BIGINT,
  visit_count BIGINT,
  next_visit_date DATE,
  last_visit_date DATE
)
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.name,
    c.company,
    c.status,
    c.client_type,
    c.email,
    c.phone,
    c.site_address,
    c.city,
    c.zip,
    p.name AS project_name,
    COALESCE(sum(CASE WHEN t.type = 'income' AND COALESCE(t.status, '') <> 'voided' THEN COALESCE(t.total_amount, t.amount, 0) ELSE 0 END), 0) AS lifetime_income,
    COALESCE(sum(CASE WHEN t.type = 'expense' AND COALESCE(t.status, '') <> 'voided' THEN COALESCE(t.total_amount, t.amount, 0) ELSE 0 END), 0) AS lifetime_expense,
    COALESCE((
      SELECT sum(GREATEST(public.invoice_total_amount(i.line_items, i.tax_rate) - COALESCE(i.amount_paid, 0), 0))
      FROM public.invoices i
      WHERE i.finance_client_id = c.id
        AND i.status IN ('sent', 'overdue', 'partial')
    ), 0) AS invoice_open_balance,
    COALESCE(count(DISTINCT j.id), 0) AS job_count,
    COALESCE(count(DISTINCT sv.id), 0) AS visit_count,
    COALESCE(min(sv.visit_date) FILTER (WHERE sv.visit_date >= CURRENT_DATE AND COALESCE(sv.status, '') <> 'completed'), c.next_visit_date) AS next_visit_date,
    COALESCE(max(sv.visit_date) FILTER (WHERE sv.visit_date < CURRENT_DATE OR COALESCE(sv.status, '') = 'completed'), c.last_visit_date) AS last_visit_date
  FROM public.finance_client_accounts c
  LEFT JOIN public.projects p ON p.id = c.project_id
  LEFT JOIN public.transactions t ON t.finance_client_id = c.id AND t.deleted_at IS NULL
  LEFT JOIN public.hgp_jobs j ON j.finance_client_id = c.id AND j.deleted_at IS NULL
  LEFT JOIN public.hgp_service_visits sv ON sv.finance_client_id = c.id AND sv.deleted_at IS NULL
  WHERE c.entity_id = p_entity_id
    AND c.deleted_at IS NULL
  GROUP BY c.id, p.name
  ORDER BY c.updated_at DESC, c.name ASC;
$$;

CREATE OR REPLACE FUNCTION public.sync_finance_client_rollups()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_client := NEW.finance_client_id;
  ELSIF TG_OP = 'UPDATE' THEN
    v_client := COALESCE(NEW.finance_client_id, OLD.finance_client_id);
  ELSE
    v_client := OLD.finance_client_id;
  END IF;
  IF v_client IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  UPDATE public.finance_client_accounts c
  SET
    lifetime_revenue = COALESCE((
      SELECT sum(COALESCE(t.total_amount, t.amount, 0))
      FROM public.transactions t
      WHERE t.finance_client_id = c.id
        AND t.type = 'income'
        AND t.deleted_at IS NULL
        AND COALESCE(t.status, '') <> 'voided'
    ), 0),
    open_balance = COALESCE((
      SELECT sum(GREATEST(public.invoice_total_amount(i.line_items, i.tax_rate) - COALESCE(i.amount_paid, 0), 0))
      FROM public.invoices i
      WHERE i.finance_client_id = c.id
        AND i.status IN ('sent', 'overdue', 'partial')
    ), 0),
    updated_at = now()
  WHERE c.id = v_client;

  IF TG_OP = 'UPDATE'
     AND OLD.finance_client_id IS NOT NULL
     AND OLD.finance_client_id IS DISTINCT FROM NEW.finance_client_id THEN
    UPDATE public.finance_client_accounts c
    SET
      lifetime_revenue = COALESCE((
        SELECT sum(COALESCE(t.total_amount, t.amount, 0))
        FROM public.transactions t
        WHERE t.finance_client_id = c.id
          AND t.type = 'income'
          AND t.deleted_at IS NULL
          AND COALESCE(t.status, '') <> 'voided'
      ), 0),
      open_balance = COALESCE((
        SELECT sum(GREATEST(public.invoice_total_amount(i.line_items, i.tax_rate) - COALESCE(i.amount_paid, 0), 0))
        FROM public.invoices i
        WHERE i.finance_client_id = c.id
          AND i.status IN ('sent', 'overdue', 'partial')
      ), 0),
      updated_at = now()
    WHERE c.id = OLD.finance_client_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_client_rollups_transactions ON public.transactions;
CREATE TRIGGER trg_sync_client_rollups_transactions
  AFTER INSERT OR UPDATE OF finance_client_id, amount, total_amount, status, deleted_at ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.sync_finance_client_rollups();

DROP TRIGGER IF EXISTS trg_sync_client_rollups_invoices ON public.invoices;
CREATE TRIGGER trg_sync_client_rollups_invoices
  AFTER INSERT OR UPDATE OF finance_client_id, status, amount_paid, line_items, tax_rate ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.sync_finance_client_rollups();

DO $$ DECLARE t TEXT; BEGIN
  FOREACH t IN ARRAY ARRAY['finance_client_accounts'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER trg_%s_updated BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', t, t);
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL; END;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.verify_entity_client_accounts()
RETURNS TABLE (check_name TEXT, ok BOOLEAN, details TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY VALUES
    ('finance_client_accounts_table',
      EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='finance_client_accounts')
      AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='transactions' AND column_name='finance_client_id')
      AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='invoices' AND column_name='finance_client_id'),
      'client account table plus transaction/invoice/project links'),
    ('finance_client_summary_rpc',
      EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_finance_client_account_summary'),
      'entity client account summary rollup');
END;
$$;

NOTIFY pgrst, 'reload schema';
