-- ═══════════════════════════════════════════════════════════════════════════
-- HOU INC · ERP Core Expansion — Houston Enterprise
--
-- Fills the audited gaps between the current finance dashboard and a full
-- construction ERP:
--   1. finance_employees + payroll runs/items  → workforce, Payroll Due KPI,
--      and an employee job-costing dimension on transactions/checks.
--   2. finance_estimates + lines               → estimating module with trade
--      lines, markup/overhead/tax/contingency, lead + project linkage.
--   3. project_workflow_items                  → tasks, RFIs, submittals,
--      punch-list items, inspections, warranty claims per project.
--   4. finance_equipment + logs                → construction fleet/tool
--      tracking with check-in/out and cost history (separate from the
--      entity-siloed HGP generator inventory).
--   5. finance_purchase_orders + lines         → real POs for Houston
--      Enterprise (hgp_purchase_orders is generator-business-only).
--   6. finance_recurring_obligations           → loans, rent, insurance,
--      payroll cadence, taxes — the forward-looking outflow feed.
--   7. get_cash_flow_forecast()                → 30/60/90/180/365-day
--      projected cash timeline from open AR, open AP, pending checks,
--      payroll, and recurring obligations.
--   8. get_executive_snapshot()                → one call that answers
--      "How is my company doing today?" with KPIs plus generated
--      insights (severity + recommended action), not just numbers.
--
-- Safe to re-run (IF NOT EXISTS / OR REPLACE throughout).
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Employees ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.finance_employees (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_id        TEXT NOT NULL DEFAULT 'houston-enterprise',
  name             TEXT NOT NULL,
  title            TEXT,
  trade            TEXT,
  employment_type  TEXT NOT NULL DEFAULT 'w2_hourly'
    CHECK (employment_type IN ('w2_hourly','w2_salary','contractor_1099')),
  pay_rate         NUMERIC NOT NULL DEFAULT 0,
  pay_cadence      TEXT NOT NULL DEFAULT 'biweekly'
    CHECK (pay_cadence IN ('weekly','biweekly','semimonthly','monthly')),
  burden_pct       NUMERIC NOT NULL DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  hire_date        DATE,
  phone            TEXT,
  email            TEXT,
  certifications   JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.finance_payroll_runs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_id     TEXT NOT NULL DEFAULT 'houston-enterprise',
  period_start  DATE NOT NULL,
  period_end    DATE NOT NULL,
  pay_date      DATE NOT NULL,
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','paid')),
  paid_at       TIMESTAMPTZ,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.finance_payroll_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id UUID NOT NULL REFERENCES public.finance_payroll_runs(id) ON DELETE CASCADE,
  employee_id    UUID NOT NULL REFERENCES public.finance_employees(id) ON DELETE CASCADE,
  project_id     UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  cost_code_id   UUID REFERENCES public.finance_cost_codes(id) ON DELETE SET NULL,
  hours          NUMERIC NOT NULL DEFAULT 0,
  rate           NUMERIC NOT NULL DEFAULT 0,
  gross_amount   NUMERIC NOT NULL DEFAULT 0,
  burden_amount  NUMERIC NOT NULL DEFAULT 0,
  memo           TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Employee job-costing dimension on the two spend tables
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES public.finance_employees(id) ON DELETE SET NULL;
ALTER TABLE public.checks       ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES public.finance_employees(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_fin_employees_entity   ON public.finance_employees(entity_id, status);
CREATE INDEX IF NOT EXISTS idx_fin_payroll_runs_entity ON public.finance_payroll_runs(entity_id, status, pay_date);
CREATE INDEX IF NOT EXISTS idx_fin_payroll_items_run   ON public.finance_payroll_items(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_fin_payroll_items_proj  ON public.finance_payroll_items(project_id);

-- ─── 2. Estimating ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.finance_estimates (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_id             TEXT NOT NULL DEFAULT 'houston-enterprise',
  estimate_number       TEXT NOT NULL,
  title                 TEXT NOT NULL,
  project_type          TEXT NOT NULL DEFAULT 'residential'
    CHECK (project_type IN ('residential','commercial','remodel','ground_up','tenant_finish','insurance_restoration','government')),
  status                TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','sent','accepted','rejected','expired','converted')),
  client_name           TEXT,
  client_email          TEXT,
  client_phone          TEXT,
  property_address      TEXT,
  markup_pct            NUMERIC NOT NULL DEFAULT 15,
  overhead_pct          NUMERIC NOT NULL DEFAULT 8,
  contingency_pct       NUMERIC NOT NULL DEFAULT 5,
  tax_pct               NUMERIC NOT NULL DEFAULT 0,
  permit_allowance      NUMERIC NOT NULL DEFAULT 0,
  valid_until           DATE,
  notes                 TEXT,
  lead_source_id        UUID,
  converted_project_id  UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.finance_estimate_lines (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id         UUID NOT NULL REFERENCES public.finance_estimates(id) ON DELETE CASCADE,
  trade               TEXT NOT NULL DEFAULT 'general',
  description         TEXT NOT NULL,
  quantity            NUMERIC NOT NULL DEFAULT 1,
  unit                TEXT NOT NULL DEFAULT 'ls',
  unit_material_cost  NUMERIC NOT NULL DEFAULT 0,
  unit_labor_cost     NUMERIC NOT NULL DEFAULT 0,
  unit_equipment_cost NUMERIC NOT NULL DEFAULT 0,
  waste_pct           NUMERIC NOT NULL DEFAULT 0,
  cost_code_id        UUID REFERENCES public.finance_cost_codes(id) ON DELETE SET NULL,
  sort_order          INT NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fin_estimates_entity ON public.finance_estimates(entity_id, status);
CREATE INDEX IF NOT EXISTS idx_fin_estimate_lines_est ON public.finance_estimate_lines(estimate_id);

-- ─── 3. Project workflow items (tasks / RFIs / submittals / punch / inspections / warranty) ──
CREATE TABLE IF NOT EXISTS public.project_workflow_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_id     TEXT NOT NULL DEFAULT 'houston-enterprise',
  project_id    UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  item_type     TEXT NOT NULL
    CHECK (item_type IN ('task','rfi','submittal','punch_item','inspection','warranty_claim')),
  title         TEXT NOT NULL,
  description   TEXT,
  status        TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','in_progress','blocked','answered','approved','rejected','scheduled','passed','failed','closed')),
  priority      TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','critical')),
  assignee_employee_id UUID REFERENCES public.finance_employees(id) ON DELETE SET NULL,
  assignee_name TEXT,
  ball_in_court TEXT,
  location      TEXT,
  due_date      DATE,
  response      TEXT,
  responded_at  TIMESTAMPTZ,
  closed_at     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pwi_project ON public.project_workflow_items(project_id, item_type, status);
CREATE INDEX IF NOT EXISTS idx_pwi_entity  ON public.project_workflow_items(entity_id, item_type, status);

-- ─── 4. Equipment ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.finance_equipment (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_id         TEXT NOT NULL DEFAULT 'houston-enterprise',
  name              TEXT NOT NULL,
  category          TEXT NOT NULL DEFAULT 'tool'
    CHECK (category IN ('truck','trailer','heavy_equipment','tool','vehicle','other')),
  identifier        TEXT,
  status            TEXT NOT NULL DEFAULT 'available'
    CHECK (status IN ('available','checked_out','maintenance','retired')),
  current_project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  assigned_employee_id UUID REFERENCES public.finance_employees(id) ON DELETE SET NULL,
  hourly_cost_rate  NUMERIC NOT NULL DEFAULT 0,
  purchase_date     DATE,
  purchase_price    NUMERIC NOT NULL DEFAULT 0,
  hours_used        NUMERIC NOT NULL DEFAULT 0,
  next_service_due  DATE,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.finance_equipment_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id  UUID NOT NULL REFERENCES public.finance_equipment(id) ON DELETE CASCADE,
  log_type      TEXT NOT NULL
    CHECK (log_type IN ('check_out','check_in','maintenance','repair','fuel','inspection')),
  project_id    UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  employee_id   UUID REFERENCES public.finance_employees(id) ON DELETE SET NULL,
  hours         NUMERIC NOT NULL DEFAULT 0,
  cost          NUMERIC NOT NULL DEFAULT 0,
  notes         TEXT,
  log_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fin_equipment_entity ON public.finance_equipment(entity_id, status);
CREATE INDEX IF NOT EXISTS idx_fin_equipment_logs_eq ON public.finance_equipment_logs(equipment_id, log_date);

-- ─── 5. Purchase orders ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.finance_purchase_orders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_id     TEXT NOT NULL DEFAULT 'houston-enterprise',
  po_number     TEXT NOT NULL,
  vendor_id     UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  project_id    UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  cost_code_id  UUID REFERENCES public.finance_cost_codes(id) ON DELETE SET NULL,
  status        TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','sent','approved','partially_received','received','closed','cancelled')),
  order_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_date DATE,
  tax_amount    NUMERIC NOT NULL DEFAULT 0,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.finance_purchase_order_lines (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id        UUID NOT NULL REFERENCES public.finance_purchase_orders(id) ON DELETE CASCADE,
  description  TEXT NOT NULL,
  quantity     NUMERIC NOT NULL DEFAULT 1,
  unit         TEXT NOT NULL DEFAULT 'ea',
  unit_price   NUMERIC NOT NULL DEFAULT 0,
  received_qty NUMERIC NOT NULL DEFAULT 0,
  sort_order   INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fin_pos_entity ON public.finance_purchase_orders(entity_id, status);
CREATE INDEX IF NOT EXISTS idx_fin_po_lines_po ON public.finance_purchase_order_lines(po_id);

-- ─── 6. Recurring obligations (forward-looking outflows) ───────────────────
CREATE TABLE IF NOT EXISTS public.finance_recurring_obligations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_id       TEXT NOT NULL DEFAULT 'houston-enterprise',
  name            TEXT NOT NULL,
  obligation_type TEXT NOT NULL DEFAULT 'other'
    CHECK (obligation_type IN ('loan_payment','rent','insurance','payroll','tax','subscription','utility','equipment_lease','other')),
  amount          NUMERIC NOT NULL DEFAULT 0,
  cadence         TEXT NOT NULL DEFAULT 'monthly'
    CHECK (cadence IN ('weekly','biweekly','monthly','quarterly','annual')),
  next_due_date   DATE NOT NULL,
  end_date        DATE,
  vendor_id       UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fin_recurring_entity ON public.finance_recurring_obligations(entity_id, is_active, next_due_date);

-- ─── RLS (shared pattern: owner OR active entity role) ─────────────────────
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'finance_employees','finance_payroll_runs','finance_estimates',
    'project_workflow_items','finance_equipment','finance_purchase_orders',
    'finance_recurring_obligations'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I_entity ON public.%I', t, t);
    EXECUTE format($p$
      CREATE POLICY %I_entity ON public.%I FOR ALL
      USING (
        auth.uid() = user_id
        OR EXISTS (
          SELECT 1 FROM public.app_user_roles r
          WHERE r.user_id = auth.uid() AND r.entity_id = %I.entity_id AND r.is_active
            AND r.role IN ('admin','finance_manager','finance','project_manager','read_only_auditor')
        )
      )
      WITH CHECK (
        auth.uid() = user_id
        OR EXISTS (
          SELECT 1 FROM public.app_user_roles r
          WHERE r.user_id = auth.uid() AND r.entity_id = %I.entity_id AND r.is_active
            AND r.role IN ('admin','finance_manager','finance','project_manager')
        )
      )
    $p$, t, t, t, t);
  END LOOP;
END $$;

-- Child tables inherit access via their parent
ALTER TABLE public.finance_payroll_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS finance_payroll_items_via_run ON public.finance_payroll_items;
CREATE POLICY finance_payroll_items_via_run ON public.finance_payroll_items FOR ALL
  USING (EXISTS (SELECT 1 FROM public.finance_payroll_runs pr WHERE pr.id = payroll_run_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.finance_payroll_runs pr WHERE pr.id = payroll_run_id));

ALTER TABLE public.finance_estimate_lines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS finance_estimate_lines_via_estimate ON public.finance_estimate_lines;
CREATE POLICY finance_estimate_lines_via_estimate ON public.finance_estimate_lines FOR ALL
  USING (EXISTS (SELECT 1 FROM public.finance_estimates e WHERE e.id = estimate_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.finance_estimates e WHERE e.id = estimate_id));

ALTER TABLE public.finance_equipment_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS finance_equipment_logs_via_equipment ON public.finance_equipment_logs;
CREATE POLICY finance_equipment_logs_via_equipment ON public.finance_equipment_logs FOR ALL
  USING (EXISTS (SELECT 1 FROM public.finance_equipment q WHERE q.id = equipment_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.finance_equipment q WHERE q.id = equipment_id));

ALTER TABLE public.finance_purchase_order_lines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS finance_po_lines_via_po ON public.finance_purchase_order_lines;
CREATE POLICY finance_po_lines_via_po ON public.finance_purchase_order_lines FOR ALL
  USING (EXISTS (SELECT 1 FROM public.finance_purchase_orders po WHERE po.id = po_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.finance_purchase_orders po WHERE po.id = po_id));

-- updated_at maintenance (reuses the shared trigger fn if present)
DO $$
DECLARE t TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at') THEN
    FOREACH t IN ARRAY ARRAY[
      'finance_employees','finance_payroll_runs','finance_estimates',
      'project_workflow_items','finance_equipment','finance_purchase_orders',
      'finance_recurring_obligations'
    ] LOOP
      EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated ON public.%I', t, t);
      EXECUTE format('CREATE TRIGGER trg_%s_updated BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', t, t);
    END LOOP;
  END IF;
END $$;

-- ─── 7. Cash-flow forecast ─────────────────────────────────────────────────
-- Daily projected inflows/outflows over the horizon, with a running balance
-- seeded from realized cash position. Sources:
--   inflows : open invoices at due_date (fallback issue+30), retainage ignored
--   outflows: pending checks, unpaid expense transactions, approved-unpaid
--             payroll runs, and recurring obligations expanded over horizon.
CREATE OR REPLACE FUNCTION public.get_cash_flow_forecast(
  p_entity_id TEXT DEFAULT 'houston-enterprise',
  p_horizon_days INT DEFAULT 90
)
RETURNS TABLE (
  day DATE,
  inflow NUMERIC,
  outflow NUMERIC,
  net NUMERIC,
  running_balance NUMERIC,
  detail JSONB
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
WITH cash_now AS (
  SELECT
    COALESCE((SELECT SUM(amount) FROM transactions WHERE entity_id = p_entity_id AND type = 'income'), 0)
    - COALESCE((SELECT SUM(amount) FROM transactions WHERE entity_id = p_entity_id AND type = 'expense'), 0)
    - COALESCE((SELECT SUM(amount) FROM checks WHERE entity_id = p_entity_id AND status = 'cleared'), 0)
    AS balance
),
horizon AS (
  SELECT generate_series(CURRENT_DATE, CURRENT_DATE + p_horizon_days, '1 day')::date AS d
),
ar_in AS (
  SELECT
    GREATEST(COALESCE(i.due_date::date, i.issue_date::date + 30), CURRENT_DATE) AS d,
    SUM(GREATEST(public.invoice_total_amount(i.line_items, i.tax_rate) - COALESCE(i.amount_paid, 0), 0)) AS amt
  FROM invoices i
  WHERE i.entity_id = p_entity_id
    AND i.status IN ('sent','overdue')
  GROUP BY 1
),
check_out AS (
  SELECT GREATEST(c.issue_date::date, CURRENT_DATE) AS d, SUM(c.amount) AS amt
  FROM checks c
  WHERE c.entity_id = p_entity_id AND c.status = 'pending'
  GROUP BY 1
),
payroll_out AS (
  SELECT GREATEST(pr.pay_date, CURRENT_DATE) AS d,
         SUM((SELECT COALESCE(SUM(pi.gross_amount + pi.burden_amount), 0)
              FROM finance_payroll_items pi WHERE pi.payroll_run_id = pr.id)) AS amt
  FROM finance_payroll_runs pr
  WHERE pr.entity_id = p_entity_id AND pr.status IN ('draft','approved')
  GROUP BY 1
),
recurring_out AS (
  SELECT occ::date AS d, SUM(r.amount) AS amt
  FROM finance_recurring_obligations r
  CROSS JOIN LATERAL generate_series(
    r.next_due_date,
    LEAST(COALESCE(r.end_date, CURRENT_DATE + p_horizon_days), CURRENT_DATE + p_horizon_days),
    CASE r.cadence
      WHEN 'weekly' THEN interval '7 days'
      WHEN 'biweekly' THEN interval '14 days'
      WHEN 'monthly' THEN interval '1 month'
      WHEN 'quarterly' THEN interval '3 months'
      ELSE interval '1 year'
    END
  ) occ
  WHERE r.entity_id = p_entity_id AND r.is_active
    AND occ::date >= CURRENT_DATE
  GROUP BY 1
),
merged AS (
  SELECT h.d,
    COALESCE(a.amt, 0) AS inflow,
    COALESCE(c.amt, 0) + COALESCE(p.amt, 0) + COALESCE(r.amt, 0) AS outflow,
    jsonb_build_object(
      'ar', COALESCE(a.amt, 0),
      'checks', COALESCE(c.amt, 0),
      'payroll', COALESCE(p.amt, 0),
      'recurring', COALESCE(r.amt, 0)
    ) AS detail
  FROM horizon h
  LEFT JOIN ar_in a ON a.d = h.d
  LEFT JOIN check_out c ON c.d = h.d
  LEFT JOIN payroll_out p ON p.d = h.d
  LEFT JOIN recurring_out r ON r.d = h.d
)
SELECT
  m.d AS day,
  m.inflow,
  m.outflow,
  m.inflow - m.outflow AS net,
  (SELECT balance FROM cash_now)
    + SUM(m.inflow - m.outflow) OVER (ORDER BY m.d) AS running_balance,
  m.detail
FROM merged m
ORDER BY m.d;
$$;

REVOKE ALL ON FUNCTION public.get_cash_flow_forecast(TEXT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_cash_flow_forecast(TEXT, INT) TO authenticated;

-- ─── 8. Executive snapshot: KPIs + generated insights ──────────────────────
CREATE OR REPLACE FUNCTION public.get_executive_snapshot(
  p_entity_id TEXT DEFAULT 'houston-enterprise'
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v JSONB;
  v_cash NUMERIC; v_rev_today NUMERIC; v_rev_wtd NUMERIC; v_rev_mtd NUMERIC;
  v_exp_mtd NUMERIC; v_ar NUMERIC; v_ar_overdue NUMERIC; v_ap NUMERIC;
  v_payroll_due NUMERIC; v_next_payroll DATE;
  v_active INT; v_delayed INT; v_backlog NUMERIC;
  v_pending_co INT; v_pending_co_amt NUMERIC;
  v_pending_est INT; v_pending_est_amt NUMERIC;
  v_ret_held NUMERIC; v_ret_receivable NUMERIC;
  v_burn NUMERIC; v_runway NUMERIC;
  v_open_rfis INT; v_open_punch INT; v_failed_insp INT; v_overdue_wf INT;
  v_milestones JSONB;
  insights JSONB := '[]'::jsonb;
BEGIN
  SELECT
    COALESCE((SELECT SUM(amount) FROM transactions WHERE entity_id = p_entity_id AND type = 'income'), 0)
    - COALESCE((SELECT SUM(amount) FROM transactions WHERE entity_id = p_entity_id AND type = 'expense'), 0)
    - COALESCE((SELECT SUM(amount) FROM checks WHERE entity_id = p_entity_id AND status = 'cleared'), 0)
  INTO v_cash;

  SELECT COALESCE(SUM(amount) FILTER (WHERE transaction_date::date = CURRENT_DATE), 0),
         COALESCE(SUM(amount) FILTER (WHERE transaction_date::date >= date_trunc('week', CURRENT_DATE)::date), 0),
         COALESCE(SUM(amount) FILTER (WHERE transaction_date::date >= date_trunc('month', CURRENT_DATE)::date), 0)
    INTO v_rev_today, v_rev_wtd, v_rev_mtd
  FROM transactions WHERE entity_id = p_entity_id AND type = 'income';

  SELECT COALESCE(SUM(amount), 0) INTO v_exp_mtd
  FROM transactions
  WHERE entity_id = p_entity_id AND type = 'expense'
    AND transaction_date::date >= date_trunc('month', CURRENT_DATE)::date;

  SELECT
    COALESCE(SUM(GREATEST(public.invoice_total_amount(line_items, tax_rate) - COALESCE(amount_paid, 0), 0)), 0),
    COALESCE(SUM(GREATEST(public.invoice_total_amount(line_items, tax_rate) - COALESCE(amount_paid, 0), 0))
      FILTER (WHERE status = 'overdue' OR COALESCE(due_date::date, issue_date::date + 30) < CURRENT_DATE), 0)
    INTO v_ar, v_ar_overdue
  FROM invoices
  WHERE entity_id = p_entity_id AND status IN ('sent','overdue');

  SELECT COALESCE(SUM(amount), 0) INTO v_ap
  FROM checks WHERE entity_id = p_entity_id AND status = 'pending';

  SELECT COALESCE(SUM(pi.gross_amount + pi.burden_amount), 0), MIN(pr.pay_date)
    INTO v_payroll_due, v_next_payroll
  FROM finance_payroll_runs pr
  JOIN finance_payroll_items pi ON pi.payroll_run_id = pr.id
  WHERE pr.entity_id = p_entity_id AND pr.status IN ('draft','approved');

  SELECT COUNT(*) FILTER (WHERE status = 'active') INTO v_active
  FROM projects WHERE entity_id = p_entity_id AND deleted_at IS NULL;

  SELECT COUNT(DISTINCT p.id) INTO v_delayed
  FROM projects p
  JOIN finance_project_phases ph ON ph.project_id = p.id
  WHERE p.entity_id = p_entity_id AND p.deleted_at IS NULL
    AND p.status = 'active' AND ph.status = 'delayed';

  SELECT COALESCE(SUM(GREATEST(s.revised_contract_value - s.earned_revenue, 0)), 0)
    INTO v_backlog
  FROM finance_project_control_summary s
  JOIN projects p ON p.id = s.project_id
  WHERE p.entity_id = p_entity_id AND p.status = 'active' AND p.deleted_at IS NULL;

  SELECT COUNT(*), COALESCE(SUM(co.amount), 0) INTO v_pending_co, v_pending_co_amt
  FROM project_change_orders co
  JOIN projects p ON p.id = co.project_id
  WHERE p.entity_id = p_entity_id AND co.status = 'pending';

  SELECT COUNT(*),
         COALESCE(SUM((
           SELECT SUM(
             l.quantity * (l.unit_material_cost * (1 + l.waste_pct / 100.0) + l.unit_labor_cost + l.unit_equipment_cost)
           ) FROM finance_estimate_lines l WHERE l.estimate_id = e.id
         )), 0)
    INTO v_pending_est, v_pending_est_amt
  FROM finance_estimates e
  WHERE e.entity_id = p_entity_id AND e.status IN ('draft','sent');

  SELECT COALESCE(SUM(s.ar_retainage_held), 0), COALESCE(SUM(s.ap_retainage_held), 0)
    INTO v_ret_receivable, v_ret_held
  FROM finance_project_control_summary s
  JOIN projects p ON p.id = s.project_id
  WHERE p.entity_id = p_entity_id AND p.deleted_at IS NULL;

  SELECT COALESCE(SUM(amount), 0) / 3.0 INTO v_burn
  FROM transactions
  WHERE entity_id = p_entity_id AND type = 'expense'
    AND transaction_date::date >= CURRENT_DATE - 90;
  v_runway := CASE WHEN v_burn > 0 THEN ROUND(v_cash / v_burn, 1) ELSE NULL END;

  SELECT
    COUNT(*) FILTER (WHERE item_type = 'rfi' AND status NOT IN ('answered','closed')),
    COUNT(*) FILTER (WHERE item_type = 'punch_item' AND status NOT IN ('closed','passed')),
    COUNT(*) FILTER (WHERE item_type = 'inspection' AND status = 'failed'),
    COUNT(*) FILTER (WHERE status NOT IN ('closed','answered','passed','approved') AND due_date < CURRENT_DATE)
    INTO v_open_rfis, v_open_punch, v_failed_insp, v_overdue_wf
  FROM project_workflow_items WHERE entity_id = p_entity_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'project', p.name, 'title', m.title, 'target_date', m.target_date
         ) ORDER BY m.target_date), '[]'::jsonb)
    INTO v_milestones
  FROM project_milestones m
  JOIN projects p ON p.id = m.project_id
  WHERE p.entity_id = p_entity_id AND p.status = 'active' AND p.deleted_at IS NULL
    AND m.status NOT IN ('completed','complete')
    AND m.target_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 30;

  -- Generated insights: severity + concrete recommended action
  IF v_ar_overdue > 0 THEN
    insights := insights || jsonb_build_object(
      'severity', CASE WHEN v_ar_overdue > v_cash * 0.5 THEN 'critical' ELSE 'warning' END,
      'kind', 'collections',
      'title', 'Overdue receivables need collection',
      'detail', format('$%s of invoices are past due.', to_char(v_ar_overdue, 'FM999,999,990')),
      'action', 'Open AR aging and send payment reminders to the oldest overdue invoices first.');
  END IF;
  IF v_runway IS NOT NULL AND v_runway < 3 THEN
    insights := insights || jsonb_build_object(
      'severity', CASE WHEN v_runway < 1.5 THEN 'critical' ELSE 'warning' END,
      'kind', 'cash',
      'title', format('Cash runway is %s months at current burn', v_runway),
      'detail', format('Cash $%s vs. avg monthly burn $%s.', to_char(v_cash,'FM999,999,990'), to_char(v_burn,'FM999,999,990')),
      'action', 'Accelerate draws/invoicing, delay non-critical spend, and review the 90-day cash forecast.');
  END IF;
  IF v_payroll_due > 0 AND v_payroll_due > v_cash THEN
    insights := insights || jsonb_build_object(
      'severity', 'critical', 'kind', 'payroll',
      'title', 'Payroll due exceeds cash on hand',
      'detail', format('$%s payroll vs. $%s cash.', to_char(v_payroll_due,'FM999,999,990'), to_char(v_cash,'FM999,999,990')),
      'action', 'Collect overdue AR or arrange short-term funding before the next pay date.');
  END IF;
  IF v_delayed > 0 THEN
    insights := insights || jsonb_build_object(
      'severity', 'warning', 'kind', 'schedule',
      'title', format('%s active project%s reporting delayed phases', v_delayed, CASE WHEN v_delayed = 1 THEN '' ELSE 's' END),
      'detail', 'Delays compound into margin erosion and retainage risk.',
      'action', 'Review the delayed phases and issue schedule-recovery change orders where owner-caused.');
  END IF;
  IF v_pending_co_amt > 0 THEN
    insights := insights || jsonb_build_object(
      'severity', 'info', 'kind', 'change_orders',
      'title', format('%s pending change order%s worth $%s', v_pending_co, CASE WHEN v_pending_co = 1 THEN '' ELSE 's' END, to_char(v_pending_co_amt,'FM999,999,990')),
      'detail', 'Unapproved COs are unbilled work at risk.',
      'action', 'Push for owner signatures — do not start CO work without approval.');
  END IF;
  IF v_failed_insp > 0 THEN
    insights := insights || jsonb_build_object(
      'severity', 'warning', 'kind', 'quality',
      'title', format('%s failed inspection%s to remediate', v_failed_insp, CASE WHEN v_failed_insp = 1 THEN '' ELSE 's' END),
      'detail', 'Failed inspections block downstream trades and draws.',
      'action', 'Schedule re-inspections and assign corrective punch items today.');
  END IF;
  IF v_overdue_wf > 0 THEN
    insights := insights || jsonb_build_object(
      'severity', 'info', 'kind', 'workflow',
      'title', format('%s overdue workflow item%s (tasks, RFIs, punch)', v_overdue_wf, CASE WHEN v_overdue_wf = 1 THEN '' ELSE 's' END),
      'detail', 'Aging RFIs and punch items stall progress payments.',
      'action', 'Triage overdue items and reassign anything blocked more than a week.');
  END IF;
  IF jsonb_array_length(insights) = 0 THEN
    insights := insights || jsonb_build_object(
      'severity', 'good', 'kind', 'all_clear',
      'title', 'No urgent issues detected',
      'detail', 'Collections, cash, payroll, schedule, and quality are all within normal bounds.',
      'action', 'Keep invoicing on schedule and review the 90-day forecast weekly.');
  END IF;

  v := jsonb_build_object(
    'as_of', now(),
    'cash_on_hand', v_cash,
    'revenue_today', v_rev_today,
    'revenue_wtd', v_rev_wtd,
    'revenue_mtd', v_rev_mtd,
    'expenses_mtd', v_exp_mtd,
    'net_mtd', v_rev_mtd - v_exp_mtd,
    'ar_open', v_ar,
    'ar_overdue', v_ar_overdue,
    'ap_open', v_ap,
    'payroll_due', COALESCE(v_payroll_due, 0),
    'next_payroll_date', v_next_payroll,
    'active_projects', v_active,
    'delayed_projects', v_delayed,
    'backlog_value', v_backlog,
    'pending_change_orders', v_pending_co,
    'pending_change_order_value', v_pending_co_amt,
    'pending_estimates', v_pending_est,
    'pending_estimate_value', v_pending_est_amt,
    'retainage_held', v_ret_held,
    'retainage_receivable', v_ret_receivable,
    'burn_rate_monthly', v_burn,
    'runway_months', v_runway,
    'open_rfis', v_open_rfis,
    'open_punch_items', v_open_punch,
    'failed_inspections', v_failed_insp,
    'overdue_workflow_items', v_overdue_wf,
    'upcoming_milestones', v_milestones,
    'insights', insights
  );
  RETURN v;
END;
$$;

REVOKE ALL ON FUNCTION public.get_executive_snapshot(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_executive_snapshot(TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
