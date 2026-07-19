-- ============================================================================
-- HOU INC · Commitments, Cost-to-Complete Forecasting, WIP Reconciliation,
-- and AP Compliance Guard (Houston Enterprise)
--
-- Additive on top of existing infrastructure:
--   - finance_commitments (20260716000013) already tracks subcontracts/POs
--   - finance_cost_codes (20260715000001) already exists as an entity-scoped
--     master list, and transactions/checks already carry cost_code_id
--   - project_change_orders (20260714000011) already tracks approved COs
--   - finance_project_control_summary / get_finance_control_summary()
--     (20260716000013) already compute a cost-ratio WIP proxy — left
--     untouched; get_wip_reconciliation() below is a separate, EAC-based
--     methodology added alongside it, not a replacement.
--
-- New in this migration:
--   1. finance_commitment_lines   — cost-code line items on a commitment
--   2. finance_project_cost_budgets — per-project-per-cost-code original
--      budget + PM's live forecasted-cost-to-complete input
--   3. project_change_orders.cost_code_id (nullable)
--   4. transactions.compliance_hold / compliance_hold_reason
--   5. finance_lien_waivers
--   6. get_cost_to_complete_worksheet(project_id) RPC
--   7. upsert_project_cost_budget(...) RPC
--   8. get_wip_reconciliation(entity_id, project_id) RPC
--   9. trg_verify_subcontractor_invoice on transactions + checks
--  10. verify_ctc_commitments_wip()
-- ============================================================================

-- ── 1. finance_commitment_lines ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.finance_commitment_lines (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commitment_id      UUID NOT NULL REFERENCES public.finance_commitments(id) ON DELETE CASCADE,
  cost_code_id       UUID REFERENCES public.finance_cost_codes(id) ON DELETE SET NULL,
  description        TEXT,
  unit_price         NUMERIC(14,2) NOT NULL DEFAULT 0,
  quantity           NUMERIC(14,2) NOT NULL DEFAULT 1,
  total_budget_line  NUMERIC(14,2) GENERATED ALWAYS AS (unit_price * quantity) STORED,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.finance_commitment_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS finance_commitment_lines_via_commitment ON public.finance_commitment_lines;
CREATE POLICY finance_commitment_lines_via_commitment
  ON public.finance_commitment_lines FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.finance_commitments c
      WHERE c.id = finance_commitment_lines.commitment_id
        AND (
          auth.uid() = c.user_id
          OR EXISTS (
            SELECT 1 FROM public.app_user_roles r
            WHERE r.user_id = auth.uid() AND r.entity_id = c.entity_id AND r.is_active
              AND r.role IN ('admin', 'finance_manager', 'finance', 'project_manager', 'read_only_auditor')
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.finance_commitments c
      WHERE c.id = finance_commitment_lines.commitment_id
        AND (
          auth.uid() = c.user_id
          OR EXISTS (
            SELECT 1 FROM public.app_user_roles r
            WHERE r.user_id = auth.uid() AND r.entity_id = c.entity_id AND r.is_active
              AND r.role IN ('admin', 'finance_manager', 'finance', 'project_manager')
          )
        )
    )
  );

CREATE INDEX IF NOT EXISTS idx_finance_commitment_lines_commitment ON public.finance_commitment_lines(commitment_id);
CREATE INDEX IF NOT EXISTS idx_finance_commitment_lines_cost_code ON public.finance_commitment_lines(cost_code_id);

DROP TRIGGER IF EXISTS trg_commitment_lines_updated ON public.finance_commitment_lines;
CREATE TRIGGER trg_commitment_lines_updated
  BEFORE UPDATE ON public.finance_commitment_lines
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DO $$ BEGIN
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.finance_commitment_lines';
  EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL; END;
END $$;

-- ── 2. finance_project_cost_budgets ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.finance_project_cost_budgets (
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_id                     TEXT NOT NULL DEFAULT 'houston-enterprise',
  project_id                    UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  cost_code_id                  UUID NOT NULL REFERENCES public.finance_cost_codes(id) ON DELETE CASCADE,
  original_budget               NUMERIC(14,2) NOT NULL DEFAULT 0,
  forecasted_cost_to_complete   NUMERIC(14,2) NOT NULL DEFAULT 0,
  notes                         TEXT,
  updated_by                    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, cost_code_id)
);

ALTER TABLE public.finance_project_cost_budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS finance_project_cost_budgets_entity ON public.finance_project_cost_budgets;
CREATE POLICY finance_project_cost_budgets_entity
  ON public.finance_project_cost_budgets FOR ALL
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.app_user_roles r
      WHERE r.user_id = auth.uid() AND r.entity_id = finance_project_cost_budgets.entity_id AND r.is_active
        AND r.role IN ('admin', 'finance_manager', 'finance', 'project_manager', 'read_only_auditor')
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.app_user_roles r
      WHERE r.user_id = auth.uid() AND r.entity_id = finance_project_cost_budgets.entity_id AND r.is_active
        AND r.role IN ('admin', 'finance_manager', 'finance', 'project_manager')
    )
  );

CREATE INDEX IF NOT EXISTS idx_finance_project_cost_budgets_project ON public.finance_project_cost_budgets(project_id);

DROP TRIGGER IF EXISTS trg_project_cost_budgets_updated ON public.finance_project_cost_budgets;
CREATE TRIGGER trg_project_cost_budgets_updated
  BEFORE UPDATE ON public.finance_project_cost_budgets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DO $$ BEGIN
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.finance_project_cost_budgets';
  EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL; END;
END $$;

-- ── 3. project_change_orders: optional cost-code allocation ────────────────
ALTER TABLE public.project_change_orders
  ADD COLUMN IF NOT EXISTS cost_code_id UUID REFERENCES public.finance_cost_codes(id) ON DELETE SET NULL;

-- ── 4. transactions: orthogonal compliance-hold flag ────────────────────────
-- NOT overloading `status` — it has a locked CHECK constraint
-- (draft/submitted/under_review/approved/rejected/posted/paid/partially_paid/
-- voided/archived) and is read pervasively across Ledger/Reports/Charts.
-- Matches the schema's existing pattern of separate orthogonal *_status
-- columns (approval_status, billable_status, receipt_status, etc.)
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS compliance_hold BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS compliance_hold_reason TEXT;

-- ── 5. finance_lien_waivers ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.finance_lien_waivers (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_id               TEXT NOT NULL DEFAULT 'houston-enterprise',
  commitment_id           UUID REFERENCES public.finance_commitments(id) ON DELETE CASCADE,
  vendor_id               UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  project_id              UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  amount                  NUMERIC(14,2) NOT NULL DEFAULT 0,
  status                  TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'received', 'waived')),
  document_id             UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  related_transaction_id  UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.finance_lien_waivers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS finance_lien_waivers_entity ON public.finance_lien_waivers;
CREATE POLICY finance_lien_waivers_entity
  ON public.finance_lien_waivers FOR ALL
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.app_user_roles r
      WHERE r.user_id = auth.uid() AND r.entity_id = finance_lien_waivers.entity_id AND r.is_active
        AND r.role IN ('admin', 'finance_manager', 'finance', 'project_manager', 'read_only_auditor')
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.app_user_roles r
      WHERE r.user_id = auth.uid() AND r.entity_id = finance_lien_waivers.entity_id AND r.is_active
        AND r.role IN ('admin', 'finance_manager', 'finance', 'project_manager')
    )
  );

CREATE INDEX IF NOT EXISTS idx_finance_lien_waivers_commitment ON public.finance_lien_waivers(commitment_id);

DROP TRIGGER IF EXISTS trg_lien_waivers_updated ON public.finance_lien_waivers;
CREATE TRIGGER trg_lien_waivers_updated
  BEFORE UPDATE ON public.finance_lien_waivers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 6. Cost-to-Complete worksheet RPC ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_cost_to_complete_worksheet(p_project_id UUID)
RETURNS TABLE (
  cost_code_id                  UUID,
  code                          TEXT,
  name                          TEXT,
  original_budget               NUMERIC,
  approved_changes              NUMERIC,
  revised_budget                NUMERIC,
  commitments                   NUMERIC,
  actual_cost                   NUMERIC,
  forecasted_cost_to_complete   NUMERIC,
  projected_variance            NUMERIC,
  flag                          TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH relevant_codes AS (
    SELECT cost_code_id FROM public.finance_project_cost_budgets WHERE project_id = p_project_id AND cost_code_id IS NOT NULL
    UNION
    SELECT fcl.cost_code_id
    FROM public.finance_commitment_lines fcl
    JOIN public.finance_commitments fc ON fc.id = fcl.commitment_id
    WHERE fc.project_id = p_project_id AND fcl.cost_code_id IS NOT NULL
    UNION
    SELECT cost_code_id FROM public.transactions WHERE project_id = p_project_id AND cost_code_id IS NOT NULL
    UNION
    SELECT cost_code_id FROM public.checks WHERE project_id = p_project_id AND cost_code_id IS NOT NULL
    UNION
    SELECT cost_code_id FROM public.project_change_orders WHERE project_id = p_project_id AND cost_code_id IS NOT NULL
  ),
  budget AS (
    SELECT cost_code_id, original_budget, forecasted_cost_to_complete
    FROM public.finance_project_cost_budgets
    WHERE project_id = p_project_id
  ),
  changes AS (
    SELECT cost_code_id, sum(amount) AS approved_changes
    FROM public.project_change_orders
    WHERE project_id = p_project_id AND status = 'approved' AND cost_code_id IS NOT NULL
    GROUP BY cost_code_id
  ),
  commit_lines AS (
    SELECT fcl.cost_code_id, sum(fcl.total_budget_line) AS committed
    FROM public.finance_commitment_lines fcl
    JOIN public.finance_commitments fc ON fc.id = fcl.commitment_id
    WHERE fc.project_id = p_project_id AND fc.status IN ('active', 'pending_approval') AND fcl.cost_code_id IS NOT NULL
    GROUP BY fcl.cost_code_id
  ),
  actual_txn AS (
    SELECT cost_code_id, sum(COALESCE(total_amount, amount, 0)) AS spent
    FROM public.transactions
    WHERE project_id = p_project_id AND type = 'expense' AND deleted_at IS NULL
      AND COALESCE(status, '') <> 'voided' AND cost_code_id IS NOT NULL
    GROUP BY cost_code_id
  ),
  actual_chk AS (
    SELECT cost_code_id, sum(COALESCE(amount, 0)) AS spent
    FROM public.checks
    WHERE project_id = p_project_id AND status = 'cleared' AND deleted_at IS NULL AND cost_code_id IS NOT NULL
    GROUP BY cost_code_id
  ),
  code_rows AS (
    SELECT
      rc.cost_code_id,
      cc.code, cc.name,
      COALESCE(b.original_budget, 0) AS original_budget,
      COALESCE(ch.approved_changes, 0) AS approved_changes,
      COALESCE(b.original_budget, 0) + COALESCE(ch.approved_changes, 0) AS revised_budget,
      COALESCE(cm.committed, 0) AS commitments,
      COALESCE(at.spent, 0) + COALESCE(ac.spent, 0) AS actual_cost,
      COALESCE(b.forecasted_cost_to_complete, 0) AS forecasted_cost_to_complete
    FROM relevant_codes rc
    JOIN public.finance_cost_codes cc ON cc.id = rc.cost_code_id
    LEFT JOIN budget b ON b.cost_code_id = rc.cost_code_id
    LEFT JOIN changes ch ON ch.cost_code_id = rc.cost_code_id
    LEFT JOIN commit_lines cm ON cm.cost_code_id = rc.cost_code_id
    LEFT JOIN actual_txn at ON at.cost_code_id = rc.cost_code_id
    LEFT JOIN actual_chk ac ON ac.cost_code_id = rc.cost_code_id
  ),
  unallocated_row AS (
    SELECT
      NULL::uuid AS cost_code_id,
      'UNALLOC'::text AS code,
      'Unallocated Change Orders'::text AS name,
      0::numeric AS original_budget,
      sum(amount) AS approved_changes,
      sum(amount) AS revised_budget,
      0::numeric AS commitments,
      0::numeric AS actual_cost,
      0::numeric AS forecasted_cost_to_complete
    FROM public.project_change_orders
    WHERE project_id = p_project_id AND status = 'approved' AND cost_code_id IS NULL
    HAVING count(*) > 0
  ),
  merged AS (
    SELECT * FROM code_rows
    UNION ALL
    SELECT * FROM unallocated_row
  )
  SELECT
    m.cost_code_id, m.code, m.name,
    m.original_budget, m.approved_changes, m.revised_budget, m.commitments, m.actual_cost,
    m.forecasted_cost_to_complete,
    (m.revised_budget - (m.actual_cost + m.forecasted_cost_to_complete)) AS projected_variance,
    CASE
      WHEN m.revised_budget > 0 AND (m.revised_budget - (m.actual_cost + m.forecasted_cost_to_complete)) < (-0.10 * m.revised_budget) THEN 'red'
      WHEN m.revised_budget = 0 AND (m.revised_budget - (m.actual_cost + m.forecasted_cost_to_complete)) < -5000 THEN 'red'
      WHEN (m.revised_budget - (m.actual_cost + m.forecasted_cost_to_complete)) < 0 THEN 'yellow'
      ELSE 'ok'
    END AS flag
  FROM merged m
  ORDER BY m.code NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.get_cost_to_complete_worksheet(UUID) TO authenticated;

-- ── 7. Worksheet write path ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.upsert_project_cost_budget(
  p_project_id                    UUID,
  p_cost_code_id                  UUID,
  p_original_budget               NUMERIC DEFAULT NULL,
  p_forecasted_cost_to_complete   NUMERIC DEFAULT NULL,
  p_notes                         TEXT DEFAULT NULL
)
RETURNS public.finance_project_cost_budgets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entity_id TEXT;
  v_row public.finance_project_cost_budgets;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT entity_id INTO v_entity_id FROM public.projects WHERE id = p_project_id;
  IF v_entity_id IS NULL THEN
    RAISE EXCEPTION 'Project not found';
  END IF;

  INSERT INTO public.finance_project_cost_budgets
    (user_id, entity_id, project_id, cost_code_id, original_budget, forecasted_cost_to_complete, notes, updated_by)
  VALUES
    (auth.uid(), v_entity_id, p_project_id, p_cost_code_id,
     COALESCE(p_original_budget, 0), COALESCE(p_forecasted_cost_to_complete, 0), p_notes, auth.uid())
  ON CONFLICT (project_id, cost_code_id) DO UPDATE SET
    original_budget = COALESCE(p_original_budget, finance_project_cost_budgets.original_budget),
    forecasted_cost_to_complete = COALESCE(p_forecasted_cost_to_complete, finance_project_cost_budgets.forecasted_cost_to_complete),
    notes = COALESCE(p_notes, finance_project_cost_budgets.notes),
    updated_by = auth.uid(),
    updated_at = now()
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_project_cost_budget(UUID, UUID, NUMERIC, NUMERIC, TEXT) TO authenticated;

-- ── 8. WIP reconciliation RPC (EAC-based — additive alongside the existing
--       cost-ratio-based finance_project_control_summary view) ─────────────
CREATE OR REPLACE FUNCTION public.get_wip_reconciliation(
  p_entity_id TEXT DEFAULT 'houston-enterprise',
  p_project_id UUID DEFAULT NULL
)
RETURNS TABLE (
  project_id            UUID,
  project_name          TEXT,
  contract_value        NUMERIC,
  actual_cost_to_date    NUMERIC,
  pm_forecasted_etc      NUMERIC,
  percent_complete       NUMERIC,
  earned_revenue         NUMERIC,
  billed_to_date         NUMERIC,
  over_under_billed      NUMERIC,
  classification         TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH co AS (
    SELECT project_id, sum(amount) AS approved_changes
    FROM public.project_change_orders
    WHERE status = 'approved'
    GROUP BY project_id
  ),
  actual AS (
    SELECT project_id,
      sum(CASE WHEN COALESCE(status, '') <> 'voided' THEN COALESCE(total_amount, amount, 0) ELSE 0 END) AS spent
    FROM public.transactions
    WHERE type = 'expense' AND deleted_at IS NULL
    GROUP BY project_id
  ),
  actual_chk AS (
    SELECT project_id, sum(COALESCE(amount, 0)) AS spent
    FROM public.checks
    WHERE status = 'cleared' AND deleted_at IS NULL
    GROUP BY project_id
  ),
  etc AS (
    SELECT project_id, sum(forecasted_cost_to_complete) AS etc_total
    FROM public.finance_project_cost_budgets
    GROUP BY project_id
  ),
  billed AS (
    SELECT project_id, sum(draw_amount) AS funded
    FROM public.draw_schedules
    WHERE status = 'funded'
    GROUP BY project_id
  )
  SELECT
    p.id AS project_id,
    p.name AS project_name,
    COALESCE(p.budget, 0) + COALESCE(co.approved_changes, 0) AS contract_value,
    COALESCE(a.spent, 0) + COALESCE(ac.spent, 0) AS actual_cost_to_date,
    COALESCE(e.etc_total, 0) AS pm_forecasted_etc,
    CASE
      WHEN (COALESCE(a.spent, 0) + COALESCE(ac.spent, 0) + COALESCE(e.etc_total, 0)) <= 0 THEN 0
      ELSE ROUND(((COALESCE(a.spent, 0) + COALESCE(ac.spent, 0)) /
        (COALESCE(a.spent, 0) + COALESCE(ac.spent, 0) + COALESCE(e.etc_total, 0))) * 100, 2)
    END AS percent_complete,
    ROUND(
      (CASE
        WHEN (COALESCE(a.spent, 0) + COALESCE(ac.spent, 0) + COALESCE(e.etc_total, 0)) <= 0 THEN 0
        ELSE (COALESCE(a.spent, 0) + COALESCE(ac.spent, 0)) /
          (COALESCE(a.spent, 0) + COALESCE(ac.spent, 0) + COALESCE(e.etc_total, 0))
      END) * (COALESCE(p.budget, 0) + COALESCE(co.approved_changes, 0)), 2
    ) AS earned_revenue,
    COALESCE(b.funded, 0) AS billed_to_date,
    ROUND(
      COALESCE(b.funded, 0) - (
        (CASE
          WHEN (COALESCE(a.spent, 0) + COALESCE(ac.spent, 0) + COALESCE(e.etc_total, 0)) <= 0 THEN 0
          ELSE (COALESCE(a.spent, 0) + COALESCE(ac.spent, 0)) /
            (COALESCE(a.spent, 0) + COALESCE(ac.spent, 0) + COALESCE(e.etc_total, 0))
        END) * (COALESCE(p.budget, 0) + COALESCE(co.approved_changes, 0))
      ), 2
    ) AS over_under_billed,
    CASE
      WHEN COALESCE(b.funded, 0) - (
        (CASE
          WHEN (COALESCE(a.spent, 0) + COALESCE(ac.spent, 0) + COALESCE(e.etc_total, 0)) <= 0 THEN 0
          ELSE (COALESCE(a.spent, 0) + COALESCE(ac.spent, 0)) /
            (COALESCE(a.spent, 0) + COALESCE(ac.spent, 0) + COALESCE(e.etc_total, 0))
        END) * (COALESCE(p.budget, 0) + COALESCE(co.approved_changes, 0))
      ) > 0.01 THEN 'over_billed'
      WHEN COALESCE(b.funded, 0) - (
        (CASE
          WHEN (COALESCE(a.spent, 0) + COALESCE(ac.spent, 0) + COALESCE(e.etc_total, 0)) <= 0 THEN 0
          ELSE (COALESCE(a.spent, 0) + COALESCE(ac.spent, 0)) /
            (COALESCE(a.spent, 0) + COALESCE(ac.spent, 0) + COALESCE(e.etc_total, 0))
        END) * (COALESCE(p.budget, 0) + COALESCE(co.approved_changes, 0))
      ) < -0.01 THEN 'under_billed'
      ELSE 'balanced'
    END AS classification
  FROM public.projects p
  LEFT JOIN co ON co.project_id = p.id
  LEFT JOIN actual a ON a.project_id = p.id
  LEFT JOIN actual_chk ac ON ac.project_id = p.id
  LEFT JOIN etc e ON e.project_id = p.id
  LEFT JOIN billed b ON b.project_id = p.id
  WHERE p.deleted_at IS NULL
    AND p.entity_id = p_entity_id
    AND (p_project_id IS NULL OR p.id = p_project_id);
$$;

GRANT EXECUTE ON FUNCTION public.get_wip_reconciliation(TEXT, UUID) TO authenticated;

-- ── 9. AP compliance trigger ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.verify_subcontractor_invoice()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vendor_id UUID;
  v_amount NUMERIC;
  v_commitment public.finance_commitments%ROWTYPE;
  v_prior_total NUMERIC;
  v_prior_amount NUMERIC;
  v_waiver_ok BOOLEAN;
BEGIN
  IF TG_TABLE_NAME = 'transactions' THEN
    IF NEW.type IS DISTINCT FROM 'expense' OR NEW.vendor_id IS NULL OR NEW.project_id IS NULL THEN
      RETURN NEW;
    END IF;
    v_vendor_id := NEW.vendor_id;
    v_amount := COALESCE(NEW.total_amount, NEW.amount, 0);
  ELSE
    IF NEW.payee_vendor_id IS NULL OR NEW.project_id IS NULL THEN
      RETURN NEW;
    END IF;
    v_vendor_id := NEW.payee_vendor_id;
    v_amount := COALESCE(NEW.amount, 0);
  END IF;

  -- Only enforce when this spend is actually tied to a tracked commitment —
  -- the vast majority of today's expenses aren't, and must never be blocked.
  SELECT * INTO v_commitment
  FROM public.finance_commitments
  WHERE vendor_id = v_vendor_id AND project_id = NEW.project_id
    AND status IN ('active', 'pending_approval') AND deleted_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Max-dollar guard (hard block).
  IF TG_TABLE_NAME = 'transactions' THEN
    SELECT COALESCE(sum(COALESCE(total_amount, amount, 0)), 0) INTO v_prior_total
    FROM public.transactions
    WHERE vendor_id = v_vendor_id AND project_id = NEW.project_id AND type = 'expense'
      AND deleted_at IS NULL AND COALESCE(status, '') <> 'voided'
      AND (TG_OP = 'INSERT' OR id <> NEW.id);
  ELSE
    SELECT COALESCE(sum(COALESCE(amount, 0)), 0) INTO v_prior_total
    FROM public.checks
    WHERE payee_vendor_id = v_vendor_id AND project_id = NEW.project_id
      AND deleted_at IS NULL AND status <> 'voided'
      AND (TG_OP = 'INSERT' OR id <> NEW.id);
  END IF;

  IF v_prior_total + v_amount > v_commitment.revised_amount THEN
    RAISE EXCEPTION
      'Commitment overrun: "%" (%) revised amount is $%, prior invoiced $% plus this $% would total $%, exceeding the commitment by $%',
      v_commitment.title, COALESCE(v_commitment.commitment_number, v_commitment.id::text),
      v_commitment.revised_amount, v_prior_total, v_amount,
      v_prior_total + v_amount, (v_prior_total + v_amount) - v_commitment.revised_amount;
  END IF;

  -- Lien waiver guard (soft flag) — checks the vendor's most recent prior
  -- draw against this same commitment for a matching received waiver.
  IF TG_TABLE_NAME = 'transactions' THEN
    SELECT COALESCE(total_amount, amount, 0) INTO v_prior_amount
    FROM public.transactions
    WHERE vendor_id = v_vendor_id AND project_id = NEW.project_id AND type = 'expense'
      AND deleted_at IS NULL AND COALESCE(status, '') <> 'voided'
      AND (TG_OP = 'INSERT' OR id <> NEW.id)
    ORDER BY transaction_date DESC NULLS LAST, created_at DESC
    LIMIT 1;
  ELSE
    SELECT COALESCE(amount, 0) INTO v_prior_amount
    FROM public.checks
    WHERE payee_vendor_id = v_vendor_id AND project_id = NEW.project_id
      AND deleted_at IS NULL AND status <> 'voided'
      AND (TG_OP = 'INSERT' OR id <> NEW.id)
    ORDER BY issue_date DESC NULLS LAST, created_at DESC
    LIMIT 1;
  END IF;

  IF v_prior_amount IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.finance_lien_waivers
      WHERE commitment_id = v_commitment.id AND status = 'received' AND amount = v_prior_amount
    ) INTO v_waiver_ok;

    IF NOT v_waiver_ok THEN
      IF TG_TABLE_NAME = 'transactions' THEN
        NEW.compliance_hold := true;
        NEW.compliance_hold_reason := format(
          'Awaiting lien waiver for previous draw of $%s against commitment %s',
          v_prior_amount, COALESCE(v_commitment.commitment_number, v_commitment.title));
      ELSE
        NEW.lien_waiver_status := 'pending';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_verify_subcontractor_invoice ON public.transactions;
CREATE TRIGGER trg_verify_subcontractor_invoice
  BEFORE INSERT OR UPDATE OF amount, total_amount ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.verify_subcontractor_invoice();

DROP TRIGGER IF EXISTS trg_verify_subcontractor_invoice_checks ON public.checks;
CREATE TRIGGER trg_verify_subcontractor_invoice_checks
  BEFORE INSERT OR UPDATE OF amount ON public.checks
  FOR EACH ROW EXECUTE FUNCTION public.verify_subcontractor_invoice();

-- ── 10. Verification ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.verify_ctc_commitments_wip()
RETURNS TABLE (check_name TEXT, ok BOOLEAN, details TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY VALUES
    ('finance_commitment_lines_table',
      EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='finance_commitment_lines'),
      'cost-code line items on subcontract/PO commitments'),
    ('finance_project_cost_budgets_table',
      EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='finance_project_cost_budgets'),
      'per-project-per-cost-code original budget + PM forecasted ETC'),
    ('project_change_orders_cost_code_column',
      EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='project_change_orders' AND column_name='cost_code_id'),
      'optional cost-code allocation on change orders'),
    ('transactions_compliance_hold_columns',
      EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='transactions' AND column_name='compliance_hold')
      AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='transactions' AND column_name='compliance_hold_reason'),
      'orthogonal compliance-hold flag, not overloading the locked status enum'),
    ('finance_lien_waivers_table',
      EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='finance_lien_waivers'),
      'dollar-matched lien waiver ledger'),
    ('get_cost_to_complete_worksheet_rpc',
      EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_cost_to_complete_worksheet'),
      'per-cost-code CTC worksheet RPC'),
    ('upsert_project_cost_budget_rpc',
      EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'upsert_project_cost_budget'),
      'worksheet write path for PM forecasted ETC'),
    ('get_wip_reconciliation_rpc',
      EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_wip_reconciliation'),
      'EAC-based percent-complete / earned-revenue / over-under-billed RPC'),
    ('verify_subcontractor_invoice_trigger',
      EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_verify_subcontractor_invoice')
      AND EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_verify_subcontractor_invoice_checks'),
      'AP max-dollar hard guard + lien-waiver soft guard on transactions and checks'),
    ('cost_codes_seeded',
      (SELECT count(*) FROM public.finance_cost_codes WHERE entity_id = 'houston-enterprise') >= 17,
      'starter construction cost-code list seeded for Houston Enterprise');
END;
$$;

-- ── 11. Seed starter cost codes for Houston Enterprise ──────────────────────
-- finance_cost_codes (20260715000001) has existed since an earlier migration
-- but was never seeded or exposed in any UI, so it was empty — the CTC
-- worksheet's "Add Cost Code" picker would have nothing to offer without
-- this. Standard construction division codes, safe to re-run
-- (ON CONFLICT on the table's own UNIQUE (user_id, entity_id, code)).
INSERT INTO public.finance_cost_codes (user_id, entity_id, code, name, cost_type)
SELECT u.id, 'houston-enterprise', v.code, v.name, v.cost_type
FROM auth.users u
CROSS JOIN (VALUES
  ('01-000', 'General Requirements', 'general'),
  ('02-000', 'Sitework & Demolition', 'labor'),
  ('03-000', 'Concrete', 'material'),
  ('04-000', 'Masonry', 'material'),
  ('05-000', 'Metals & Structural Steel', 'material'),
  ('06-000', 'Wood, Plastics & Framing', 'material'),
  ('07-000', 'Thermal & Moisture Protection', 'material'),
  ('08-000', 'Doors, Windows & Openings', 'material'),
  ('09-000', 'Finishes', 'material'),
  ('10-000', 'Specialties', 'material'),
  ('11-000', 'Equipment', 'equipment'),
  ('12-000', 'Furnishings', 'material'),
  ('14-000', 'Conveying Systems', 'subcontract'),
  ('15-000', 'Mechanical / HVAC', 'subcontract'),
  ('16-000', 'Plumbing', 'subcontract'),
  ('17-000', 'Electrical', 'subcontract'),
  ('99-000', 'General Conditions / Overhead', 'general')
) AS v(code, name, cost_type)
WHERE u.email = 'hunainm.qureshi@gmail.com'
ON CONFLICT (user_id, entity_id, code) DO NOTHING;

NOTIFY pgrst, 'reload schema';
