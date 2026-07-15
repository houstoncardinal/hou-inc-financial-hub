-- ============================================================================
-- HOU INC · Expense Entry System Upgrade
--
-- Adds durable expense workflow, documentation, job-costing, and billing fields
-- to transactions while keeping higher-level expense categories separate from
-- construction cost codes/divisions.
-- ============================================================================

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS paid_date DATE,
  ADD COLUMN IF NOT EXISTS receipt_status TEXT NOT NULL DEFAULT 'not_provided'
    CHECK (receipt_status IN ('not_provided','attached','pending_review','verified','rejected','missing')),
  ADD COLUMN IF NOT EXISTS billable_status TEXT NOT NULL DEFAULT 'not_billable'
    CHECK (billable_status IN ('not_billable','billable','billed','partially_billed','written_off')),
  ADD COLUMN IF NOT EXISTS reimbursable_status TEXT NOT NULL DEFAULT 'not_reimbursable'
    CHECK (reimbursable_status IN ('not_reimbursable','reimbursable','submitted','reimbursed','rejected')),
  ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS approval_notes TEXT,
  ADD COLUMN IF NOT EXISTS expense_type TEXT,
  ADD COLUMN IF NOT EXISTS purchase_order_ref TEXT,
  ADD COLUMN IF NOT EXISTS vendor_bill_ref TEXT,
  ADD COLUMN IF NOT EXISTS commitment_ref TEXT,
  ADD COLUMN IF NOT EXISTS budget_category TEXT,
  ADD COLUMN IF NOT EXISTS budget_line_item TEXT,
  ADD COLUMN IF NOT EXISTS quantity NUMERIC(14,4),
  ADD COLUMN IF NOT EXISTS unit TEXT,
  ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(14,4),
  ADD COLUMN IF NOT EXISTS markup_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS billable_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subcontractor_retainage_withheld NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subcontractor_retainage_released NUMERIC(14,2) NOT NULL DEFAULT 0;

UPDATE public.transactions
SET paid_date = COALESCE(paid_date, cleared_date),
    submitted_by = COALESCE(submitted_by, created_by, user_id),
    submitted_at = COALESCE(submitted_at, created_at),
    approved_by = CASE
      WHEN approval_status = 'approved' THEN COALESCE(approved_by, updated_by, created_by, user_id)
      ELSE approved_by
    END,
    approved_at = CASE
      WHEN approval_status = 'approved' THEN COALESCE(approved_at, updated_at, created_at)
      ELSE approved_at
    END,
    expense_type = COALESCE(expense_type, cost_type, category)
WHERE type = 'expense';

CREATE INDEX IF NOT EXISTS idx_transactions_expense_workflow
  ON public.transactions(entity_id, type, approval_status, payment_status, receipt_status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_expense_job_costing
  ON public.transactions(project_id, cost_code_id, construction_division_id, project_phase_id)
  WHERE type = 'expense' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_vendor_bill_ref
  ON public.transactions(vendor_bill_ref)
  WHERE vendor_bill_ref IS NOT NULL;

-- Make transaction RLS explicit. Some older environments had a single broad
-- policy without a visible WITH CHECK expression, which made post-save
-- verification hard to diagnose from PostgREST.
DROP POLICY IF EXISTS "transactions: own rows" ON public.transactions;
DROP POLICY IF EXISTS transactions_select_own ON public.transactions;
DROP POLICY IF EXISTS transactions_insert_own ON public.transactions;
DROP POLICY IF EXISTS transactions_update_own ON public.transactions;
DROP POLICY IF EXISTS transactions_delete_own ON public.transactions;

CREATE POLICY transactions_select_own
  ON public.transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY transactions_insert_own
  ON public.transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY transactions_update_own
  ON public.transactions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY transactions_delete_own
  ON public.transactions FOR DELETE
  USING (auth.uid() = user_id);

-- Allocation table already exists from the construction-finance core. These
-- indexes support split expenses by project, code, SOV item, phase, and change order.
CREATE INDEX IF NOT EXISTS idx_transaction_allocations_expense_txn
  ON public.finance_transaction_allocations(transaction_id, allocation_type);

CREATE INDEX IF NOT EXISTS idx_transaction_allocations_costing
  ON public.finance_transaction_allocations(project_id, cost_code_id, sov_item_id, milestone_id, change_order_id, phase_id, division_id);

NOTIFY pgrst, 'reload schema';
