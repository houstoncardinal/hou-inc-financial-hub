-- ============================================================================
-- HOU INC · Construction Finance System Upgrade
--
-- Additive project-centric finance architecture for the existing Supabase app.
-- This migration preserves legacy tables and IDs while adding normalized
-- accounting, allocation, attachment, audit, and project summary structures.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Reference/configuration tables
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.finance_construction_divisions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_id   TEXT NOT NULL DEFAULT 'houston-enterprise',
  code        TEXT NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, entity_id, code)
);

CREATE TABLE IF NOT EXISTS public.finance_cost_codes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_id    TEXT NOT NULL DEFAULT 'houston-enterprise',
  division_id  UUID REFERENCES public.finance_construction_divisions(id) ON DELETE SET NULL,
  code         TEXT NOT NULL,
  name         TEXT NOT NULL,
  cost_type    TEXT,
  description  TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, entity_id, code)
);

CREATE TABLE IF NOT EXISTS public.finance_project_phases (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_id   TEXT NOT NULL DEFAULT 'houston-enterprise',
  project_id  UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  code        TEXT,
  name        TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started','scheduled','in_progress','completed','delayed','on_hold','cancelled')),
  sort_order  INT NOT NULL DEFAULT 0,
  start_date  DATE,
  end_date    DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.finance_categories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_id     TEXT NOT NULL DEFAULT 'houston-enterprise',
  module        TEXT NOT NULL CHECK (module IN ('income','expense','check','journal')),
  name          TEXT NOT NULL,
  description   TEXT,
  default_account_id UUID,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  sort_order    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, entity_id, module, name)
);

CREATE TABLE IF NOT EXISTS public.finance_bank_accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_id       TEXT NOT NULL DEFAULT 'houston-enterprise',
  account_name    TEXT NOT NULL,
  bank_name       TEXT,
  account_type    TEXT NOT NULL DEFAULT 'checking'
    CHECK (account_type IN ('checking','savings','credit_card','loan','cash','other')),
  masked_account  TEXT,
  routing_ref     TEXT,
  currency        TEXT NOT NULL DEFAULT 'USD',
  opening_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  is_default      BOOLEAN NOT NULL DEFAULT false,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.finance_chart_accounts (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_id          TEXT NOT NULL DEFAULT 'houston-enterprise',
  account_number     TEXT NOT NULL,
  account_name       TEXT NOT NULL,
  account_type       TEXT NOT NULL CHECK (account_type IN (
    'asset','liability','equity','revenue','cost_of_revenue','expense','other_income','other_expense'
  )),
  account_subtype    TEXT,
  parent_account_id  UUID REFERENCES public.finance_chart_accounts(id) ON DELETE SET NULL,
  description        TEXT,
  normal_balance     TEXT NOT NULL CHECK (normal_balance IN ('debit','credit')),
  current_balance    NUMERIC(14,2) NOT NULL DEFAULT 0,
  is_system          BOOLEAN NOT NULL DEFAULT false,
  allow_manual_posting BOOLEAN NOT NULL DEFAULT true,
  is_active          BOOLEAN NOT NULL DEFAULT true,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, entity_id, account_number)
);

CREATE TABLE IF NOT EXISTS public.company_accounting_settings (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_id                       TEXT NOT NULL DEFAULT 'houston-enterprise',
  accounting_method               TEXT NOT NULL DEFAULT 'cash' CHECK (accounting_method IN ('cash','accrual')),
  fiscal_year_start_month         INT NOT NULL DEFAULT 1 CHECK (fiscal_year_start_month BETWEEN 1 AND 12),
  default_currency                TEXT NOT NULL DEFAULT 'USD',
  default_income_account_id       UUID REFERENCES public.finance_chart_accounts(id) ON DELETE SET NULL,
  default_accounts_receivable_id  UUID REFERENCES public.finance_chart_accounts(id) ON DELETE SET NULL,
  default_accounts_payable_id     UUID REFERENCES public.finance_chart_accounts(id) ON DELETE SET NULL,
  default_undeposited_funds_id    UUID REFERENCES public.finance_chart_accounts(id) ON DELETE SET NULL,
  default_bank_account_id         UUID REFERENCES public.finance_chart_accounts(id) ON DELETE SET NULL,
  default_retainage_receivable_id UUID REFERENCES public.finance_chart_accounts(id) ON DELETE SET NULL,
  default_retainage_payable_id    UUID REFERENCES public.finance_chart_accounts(id) ON DELETE SET NULL,
  default_customer_deposit_id     UUID REFERENCES public.finance_chart_accounts(id) ON DELETE SET NULL,
  default_sales_tax_account_id    UUID REFERENCES public.finance_chart_accounts(id) ON DELETE SET NULL,
  default_processing_fee_id       UUID REFERENCES public.finance_chart_accounts(id) ON DELETE SET NULL,
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, entity_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Add normalized fields to legacy source tables
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS portal_client_id UUID REFERENCES public.portal_clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS original_contract_value NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_contract_value NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estimated_cost_to_complete NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS client_name_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS department TEXT;

UPDATE public.projects
SET original_contract_value = COALESCE(NULLIF(original_contract_value, 0), budget, 0),
    current_contract_value = COALESCE(NULLIF(current_contract_value, 0), budget, 0)
WHERE COALESCE(original_contract_value, 0) = 0
   OR COALESCE(current_contract_value, 0) = 0;

ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS legal_name TEXT,
  ADD COLUMN IF NOT EXISTS dba TEXT,
  ADD COLUMN IF NOT EXISTS remittance_address TEXT,
  ADD COLUMN IF NOT EXISTS tax_id_status TEXT,
  ADD COLUMN IF NOT EXISTS insurance_expiration DATE,
  ADD COLUMN IF NOT EXISTS license_number TEXT,
  ADD COLUMN IF NOT EXISTS payment_terms TEXT,
  ADD COLUMN IF NOT EXISTS default_expense_category TEXT,
  ADD COLUMN IF NOT EXISTS default_cost_code_id UUID REFERENCES public.finance_cost_codes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS current_payable_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS retainage_payable NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_subcontractor BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS transaction_number TEXT,
  ADD COLUMN IF NOT EXISTS subtype TEXT,
  ADD COLUMN IF NOT EXISTS posting_date DATE,
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS cleared_date DATE,
  ADD COLUMN IF NOT EXISTS amount_before_tax NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS processing_fee NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_amount NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS net_amount NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS internal_memo TEXT,
  ADD COLUMN IF NOT EXISTS public_memo TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'posted'
    CHECK (status IN ('draft','submitted','under_review','approved','rejected','posted','paid','partially_paid','voided','archived')),
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'approved'
    CHECK (approval_status IN ('draft','submitted','under_review','approved','rejected')),
  ADD COLUMN IF NOT EXISTS reconciliation_status TEXT NOT NULL DEFAULT 'unreconciled'
    CHECK (reconciliation_status IN ('unreconciled','pending','reconciled')),
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'paid'
    CHECK (payment_status IN ('unpaid','partial','paid','overpaid','refunded','voided')),
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.portal_clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS subcontractor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS bank_account_id UUID REFERENCES public.finance_bank_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cost_code_id UUID REFERENCES public.finance_cost_codes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS project_phase_id UUID REFERENCES public.finance_project_phases(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS construction_division_id UUID REFERENCES public.finance_construction_divisions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS milestone_id UUID REFERENCES public.project_milestones(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS change_order_id UUID REFERENCES public.project_change_orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS scope_item_id UUID REFERENCES public.project_scope_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS parent_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS original_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS attachment_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS accounting_period TEXT,
  ADD COLUMN IF NOT EXISTS fiscal_year INT,
  ADD COLUMN IF NOT EXISTS external_reference TEXT,
  ADD COLUMN IF NOT EXISTS import_batch_id UUID,
  ADD COLUMN IF NOT EXISTS sync_status TEXT NOT NULL DEFAULT 'local'
    CHECK (sync_status IN ('local','pending','synced','failed','ignored')),
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

UPDATE public.transactions
SET posting_date = COALESCE(posting_date, transaction_date),
    amount_before_tax = COALESCE(amount_before_tax, amount),
    total_amount = COALESCE(total_amount, amount),
    net_amount = COALESCE(net_amount, amount - COALESCE(processing_fee, 0)),
    description = COALESCE(description, notes, source_name, category),
    fiscal_year = COALESCE(fiscal_year, EXTRACT(YEAR FROM transaction_date)::INT),
    accounting_period = COALESCE(accounting_period, to_char(transaction_date, 'YYYY-MM')),
    created_by = COALESCE(created_by, user_id)
WHERE posting_date IS NULL
   OR amount_before_tax IS NULL
   OR total_amount IS NULL
   OR net_amount IS NULL
   OR fiscal_year IS NULL
   OR accounting_period IS NULL
   OR created_by IS NULL;

UPDATE public.transactions
SET transaction_number = COALESCE(transaction_number, upper(type::TEXT) || '-' || to_char(transaction_date, 'YYYYMMDD') || '-' || substr(id::TEXT, 1, 8))
WHERE transaction_number IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS transactions_user_entity_number_uidx
  ON public.transactions(user_id, entity_id, transaction_number)
  WHERE deleted_at IS NULL;

ALTER TABLE public.checks
  ADD COLUMN IF NOT EXISTS posting_date DATE,
  ADD COLUMN IF NOT EXISTS cleared_date DATE,
  ADD COLUMN IF NOT EXISTS void_date DATE,
  ADD COLUMN IF NOT EXISTS void_reason TEXT,
  ADD COLUMN IF NOT EXISTS replacement_check_id UUID REFERENCES public.checks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS original_check_id UUID REFERENCES public.checks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS bank_account_id UUID REFERENCES public.finance_bank_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cost_code_id UUID REFERENCES public.finance_cost_codes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS project_phase_id UUID REFERENCES public.finance_project_phases(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS construction_division_id UUID REFERENCES public.finance_construction_divisions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS scope_item_id UUID REFERENCES public.project_scope_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS milestone_id UUID REFERENCES public.project_milestones(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS change_order_id UUID REFERENCES public.project_change_orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'approved'
    CHECK (approval_status IN ('draft','pending_approval','approved','rejected')),
  ADD COLUMN IF NOT EXISTS print_status TEXT NOT NULL DEFAULT 'not_printed'
    CHECK (print_status IN ('not_printed','queued','printed','reprinted')),
  ADD COLUMN IF NOT EXISTS delivery_status TEXT NOT NULL DEFAULT 'not_delivered'
    CHECK (delivery_status IN ('not_delivered','mailed','hand_delivered','deposited','returned')),
  ADD COLUMN IF NOT EXISTS reconciliation_status TEXT NOT NULL DEFAULT 'unreconciled'
    CHECK (reconciliation_status IN ('unreconciled','pending','reconciled')),
  ADD COLUMN IF NOT EXISTS amount_in_words TEXT,
  ADD COLUMN IF NOT EXISTS external_reference TEXT,
  ADD COLUMN IF NOT EXISTS attachment_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

UPDATE public.checks
SET posting_date = COALESCE(posting_date, issue_date),
    cleared_date = COALESCE(cleared_date, reconciled_at::DATE)
WHERE posting_date IS NULL OR cleared_date IS NULL;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS retainage_withheld NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS retainage_released NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_terms TEXT,
  ADD COLUMN IF NOT EXISTS public_memo TEXT,
  ADD COLUMN IF NOT EXISTS internal_memo TEXT;

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS linked_project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS related_entity_type TEXT,
  ADD COLUMN IF NOT EXISTS related_entity_id UUID,
  ADD COLUMN IF NOT EXISTS document_category TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- ─────────────────────────────────────────────────────────────────────────────
-- Allocation and relationship tables
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.finance_transaction_allocations (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_id                TEXT NOT NULL DEFAULT 'houston-enterprise',
  transaction_id           UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  allocation_type          TEXT NOT NULL CHECK (allocation_type IN (
    'invoice','sov_item','milestone','change_order','retainage','tax','fee','credit','base_contract','project','overhead','other'
  )),
  project_id               UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  invoice_id               UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  sov_item_id              UUID REFERENCES public.project_scope_items(id) ON DELETE SET NULL,
  milestone_id             UUID REFERENCES public.project_milestones(id) ON DELETE SET NULL,
  change_order_id          UUID REFERENCES public.project_change_orders(id) ON DELETE SET NULL,
  cost_code_id             UUID REFERENCES public.finance_cost_codes(id) ON DELETE SET NULL,
  phase_id                 UUID REFERENCES public.finance_project_phases(id) ON DELETE SET NULL,
  division_id              UUID REFERENCES public.finance_construction_divisions(id) ON DELETE SET NULL,
  allocated_amount         NUMERIC(14,2) NOT NULL DEFAULT 0,
  allocation_percentage    NUMERIC(7,4),
  retainage_amount         NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax_amount               NUMERIC(14,2) NOT NULL DEFAULT 0,
  markup_amount            NUMERIC(14,2) NOT NULL DEFAULT 0,
  notes                    TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (allocated_amount >= 0),
  CHECK (retainage_amount >= 0),
  CHECK (tax_amount >= 0)
);

CREATE TABLE IF NOT EXISTS public.finance_check_allocations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_id             TEXT NOT NULL DEFAULT 'houston-enterprise',
  check_id              UUID NOT NULL REFERENCES public.checks(id) ON DELETE CASCADE,
  expense_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  project_id            UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  vendor_id             UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  cost_code_id          UUID REFERENCES public.finance_cost_codes(id) ON DELETE SET NULL,
  sov_item_id           UUID REFERENCES public.project_scope_items(id) ON DELETE SET NULL,
  milestone_id          UUID REFERENCES public.project_milestones(id) ON DELETE SET NULL,
  change_order_id       UUID REFERENCES public.project_change_orders(id) ON DELETE SET NULL,
  allocated_amount      NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (allocated_amount >= 0),
  retainage_amount      NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (retainage_amount >= 0),
  discount_amount       NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.project_milestone_sov_links (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_id             TEXT NOT NULL DEFAULT 'houston-enterprise',
  milestone_id          UUID NOT NULL REFERENCES public.project_milestones(id) ON DELETE CASCADE,
  sov_item_id           UUID NOT NULL REFERENCES public.project_scope_items(id) ON DELETE CASCADE,
  allocation_percentage NUMERIC(7,4),
  allocation_amount     NUMERIC(14,2),
  sync_completion       BOOLEAN NOT NULL DEFAULT false,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (milestone_id, sov_item_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Journal entries and audit trail
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.finance_journal_entries (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_id          TEXT NOT NULL DEFAULT 'houston-enterprise',
  journal_number     TEXT NOT NULL,
  transaction_id     UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  source_module      TEXT NOT NULL,
  source_record_id   UUID NOT NULL,
  posting_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  accounting_period  TEXT NOT NULL,
  memo               TEXT,
  status             TEXT NOT NULL DEFAULT 'posted' CHECK (status IN ('draft','posted','voided','reversed')),
  posted_by          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  posted_at          TIMESTAMPTZ,
  reversal_entry_id  UUID REFERENCES public.finance_journal_entries(id) ON DELETE SET NULL,
  is_reversal        BOOLEAN NOT NULL DEFAULT false,
  is_adjusting_entry BOOLEAN NOT NULL DEFAULT false,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, entity_id, journal_number),
  UNIQUE (source_module, source_record_id, is_reversal)
);

CREATE TABLE IF NOT EXISTS public.finance_journal_lines (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id  UUID NOT NULL REFERENCES public.finance_journal_entries(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_id         TEXT NOT NULL DEFAULT 'houston-enterprise',
  account_id        UUID NOT NULL REFERENCES public.finance_chart_accounts(id) ON DELETE RESTRICT,
  debit             NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (debit >= 0),
  credit            NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (credit >= 0),
  project_id        UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  client_id         UUID REFERENCES public.portal_clients(id) ON DELETE SET NULL,
  vendor_id         UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  cost_code_id      UUID REFERENCES public.finance_cost_codes(id) ON DELETE SET NULL,
  sov_item_id       UUID REFERENCES public.project_scope_items(id) ON DELETE SET NULL,
  phase_id          UUID REFERENCES public.finance_project_phases(id) ON DELETE SET NULL,
  division_id       UUID REFERENCES public.finance_construction_divisions(id) ON DELETE SET NULL,
  department        TEXT,
  description       TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0))
);

CREATE TABLE IF NOT EXISTS public.finance_audit_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  entity_id       TEXT NOT NULL DEFAULT 'houston-enterprise',
  entity_type     TEXT NOT NULL,
  entity_record_id UUID,
  action          TEXT NOT NULL,
  previous_values JSONB,
  new_values      JSONB,
  changed_fields  TEXT[],
  reason          TEXT,
  source          TEXT NOT NULL DEFAULT 'app',
  ip_address      INET,
  session_metadata JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.finance_attachments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_id           TEXT NOT NULL DEFAULT 'houston-enterprise',
  file_name           TEXT NOT NULL,
  file_path           TEXT NOT NULL,
  file_type           TEXT,
  file_size           BIGINT,
  storage_bucket      TEXT NOT NULL DEFAULT 'documents',
  related_entity_type TEXT NOT NULL,
  related_entity_id   UUID NOT NULL,
  description         TEXT,
  document_category   TEXT,
  archived_at         TIMESTAMPTZ,
  uploaded_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Indexes and triggers
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_finance_cost_codes_entity ON public.finance_cost_codes(user_id, entity_id, is_active);
CREATE INDEX IF NOT EXISTS idx_finance_categories_entity ON public.finance_categories(user_id, entity_id, module, is_active);
CREATE INDEX IF NOT EXISTS idx_finance_bank_accounts_entity ON public.finance_bank_accounts(user_id, entity_id, is_active);
CREATE INDEX IF NOT EXISTS idx_transaction_allocations_txn ON public.finance_transaction_allocations(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_allocations_project ON public.finance_transaction_allocations(project_id);
CREATE INDEX IF NOT EXISTS idx_check_allocations_check ON public.finance_check_allocations(check_id);
CREATE INDEX IF NOT EXISTS idx_check_allocations_project ON public.finance_check_allocations(project_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_source ON public.finance_journal_entries(source_module, source_record_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_project ON public.finance_journal_lines(project_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON public.finance_audit_events(entity_type, entity_record_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_finance_attachments_related ON public.finance_attachments(related_entity_type, related_entity_id);

DO $$ DECLARE t TEXT; BEGIN
  FOREACH t IN ARRAY ARRAY[
    'finance_construction_divisions','finance_cost_codes','finance_project_phases',
    'finance_categories','finance_bank_accounts','finance_chart_accounts',
    'company_accounting_settings','finance_transaction_allocations',
    'finance_check_allocations','project_milestone_sov_links',
    'finance_journal_entries','finance_attachments'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER trg_%I_updated BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', t, t);
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS policies
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ DECLARE t TEXT; BEGIN
  FOREACH t IN ARRAY ARRAY[
    'finance_construction_divisions','finance_cost_codes','finance_project_phases',
    'finance_categories','finance_bank_accounts','finance_chart_accounts',
    'company_accounting_settings','finance_transaction_allocations',
    'finance_check_allocations','project_milestone_sov_links',
    'finance_journal_entries','finance_journal_lines','finance_audit_events',
    'finance_attachments'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_own_all', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)', t || '_own_all', t);
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Utility/default configuration functions
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.ensure_default_accounting_config(p_entity_id TEXT DEFAULT 'houston-enterprise')
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_cash UUID; v_ar UUID; v_ap UUID; v_income UUID; v_cogs UUID; v_exp UUID;
  v_ret_ar UUID; v_ret_ap UUID; v_deposit UUID; v_tax UUID; v_fee UUID;
  v_settings UUID;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  INSERT INTO public.finance_chart_accounts (user_id, entity_id, account_number, account_name, account_type, account_subtype, normal_balance, is_system)
  VALUES
    (v_user, p_entity_id, '1000', 'Cash', 'asset', 'bank', 'debit', true),
    (v_user, p_entity_id, '1100', 'Accounts Receivable', 'asset', 'receivables', 'debit', true),
    (v_user, p_entity_id, '1120', 'Retainage Receivable', 'asset', 'retainage', 'debit', true),
    (v_user, p_entity_id, '2000', 'Accounts Payable', 'liability', 'payables', 'credit', true),
    (v_user, p_entity_id, '2100', 'Retainage Payable', 'liability', 'retainage', 'credit', true),
    (v_user, p_entity_id, '2200', 'Customer Deposits', 'liability', 'deposits', 'credit', true),
    (v_user, p_entity_id, '2300', 'Sales Tax Payable', 'liability', 'tax', 'credit', true),
    (v_user, p_entity_id, '4000', 'Contract Revenue', 'revenue', 'construction_revenue', 'credit', true),
    (v_user, p_entity_id, '5000', 'Construction Costs', 'cost_of_revenue', 'job_costs', 'debit', true),
    (v_user, p_entity_id, '6100', 'Processing Fees', 'expense', 'merchant_fees', 'debit', true)
  ON CONFLICT (user_id, entity_id, account_number) DO NOTHING;

  SELECT id INTO v_cash FROM public.finance_chart_accounts WHERE user_id = v_user AND entity_id = p_entity_id AND account_number = '1000';
  SELECT id INTO v_ar FROM public.finance_chart_accounts WHERE user_id = v_user AND entity_id = p_entity_id AND account_number = '1100';
  SELECT id INTO v_ret_ar FROM public.finance_chart_accounts WHERE user_id = v_user AND entity_id = p_entity_id AND account_number = '1120';
  SELECT id INTO v_ap FROM public.finance_chart_accounts WHERE user_id = v_user AND entity_id = p_entity_id AND account_number = '2000';
  SELECT id INTO v_ret_ap FROM public.finance_chart_accounts WHERE user_id = v_user AND entity_id = p_entity_id AND account_number = '2100';
  SELECT id INTO v_deposit FROM public.finance_chart_accounts WHERE user_id = v_user AND entity_id = p_entity_id AND account_number = '2200';
  SELECT id INTO v_tax FROM public.finance_chart_accounts WHERE user_id = v_user AND entity_id = p_entity_id AND account_number = '2300';
  SELECT id INTO v_income FROM public.finance_chart_accounts WHERE user_id = v_user AND entity_id = p_entity_id AND account_number = '4000';
  SELECT id INTO v_cogs FROM public.finance_chart_accounts WHERE user_id = v_user AND entity_id = p_entity_id AND account_number = '5000';
  SELECT id INTO v_fee FROM public.finance_chart_accounts WHERE user_id = v_user AND entity_id = p_entity_id AND account_number = '6100';

  INSERT INTO public.company_accounting_settings (
    user_id, entity_id, default_bank_account_id, default_income_account_id,
    default_accounts_receivable_id, default_accounts_payable_id,
    default_undeposited_funds_id, default_retainage_receivable_id,
    default_retainage_payable_id, default_customer_deposit_id,
    default_sales_tax_account_id, default_processing_fee_id
  )
  VALUES (v_user, p_entity_id, v_cash, v_income, v_ar, v_ap, v_cash, v_ret_ar, v_ret_ap, v_deposit, v_tax, v_fee)
  ON CONFLICT (user_id, entity_id) DO UPDATE
  SET default_bank_account_id = COALESCE(company_accounting_settings.default_bank_account_id, EXCLUDED.default_bank_account_id),
      default_income_account_id = COALESCE(company_accounting_settings.default_income_account_id, EXCLUDED.default_income_account_id),
      default_accounts_receivable_id = COALESCE(company_accounting_settings.default_accounts_receivable_id, EXCLUDED.default_accounts_receivable_id),
      default_accounts_payable_id = COALESCE(company_accounting_settings.default_accounts_payable_id, EXCLUDED.default_accounts_payable_id),
      updated_at = now()
  RETURNING id INTO v_settings;

  INSERT INTO public.finance_categories (user_id, entity_id, module, name, sort_order)
  VALUES
    (v_user, p_entity_id, 'income', 'Contract revenue', 10),
    (v_user, p_entity_id, 'income', 'Progress billing', 20),
    (v_user, p_entity_id, 'income', 'Mobilization deposit', 30),
    (v_user, p_entity_id, 'income', 'Change order revenue', 40),
    (v_user, p_entity_id, 'income', 'Retainage release', 50),
    (v_user, p_entity_id, 'expense', 'Materials', 10),
    (v_user, p_entity_id, 'expense', 'Labor', 20),
    (v_user, p_entity_id, 'expense', 'Subcontractor', 30),
    (v_user, p_entity_id, 'expense', 'Equipment', 40),
    (v_user, p_entity_id, 'expense', 'Permits and fees', 50),
    (v_user, p_entity_id, 'expense', 'Office overhead', 90)
  ON CONFLICT (user_id, entity_id, module, name) DO NOTHING;

  RETURN v_settings;
END;
$$;

CREATE OR REPLACE FUNCTION public.finance_next_number(p_prefix TEXT, p_table TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_next BIGINT;
BEGIN
  SELECT floor(extract(epoch from clock_timestamp()) * 1000)::BIGINT % 100000000 INTO v_next;
  RETURN upper(p_prefix) || '-' || v_next::TEXT;
END;
$$;

-- Balanced ledger posting for legacy transactions.
CREATE OR REPLACE FUNCTION public.post_transaction_to_ledger(p_transaction_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t public.transactions%ROWTYPE;
  s public.company_accounting_settings%ROWTYPE;
  v_entry UUID;
  v_cash UUID; v_income UUID; v_expense UUID; v_ar UUID; v_ap UUID; v_fee UUID;
  v_amount NUMERIC(14,2);
BEGIN
  SELECT * INTO t FROM public.transactions WHERE id = p_transaction_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transaction not found'; END IF;

  PERFORM public.ensure_default_accounting_config(t.entity_id);
  SELECT * INTO s FROM public.company_accounting_settings WHERE user_id = t.user_id AND entity_id = t.entity_id;

  SELECT id INTO v_expense FROM public.finance_chart_accounts WHERE user_id = t.user_id AND entity_id = t.entity_id AND account_number = '5000';
  v_cash := COALESCE(s.default_bank_account_id, s.default_undeposited_funds_id);
  v_income := s.default_income_account_id;
  v_ar := s.default_accounts_receivable_id;
  v_ap := s.default_accounts_payable_id;
  v_fee := s.default_processing_fee_id;
  v_amount := COALESCE(t.total_amount, t.amount, 0);

  IF COALESCE(t.status, 'posted') IN ('draft','rejected','voided','archived') THEN
    RAISE EXCEPTION 'Only approved/posted transactions can be posted to ledger';
  END IF;

  SELECT id INTO v_entry
  FROM public.finance_journal_entries
  WHERE source_module = 'transactions'
    AND source_record_id = t.id
    AND is_reversal = false
  LIMIT 1;
  IF v_entry IS NOT NULL THEN RETURN v_entry; END IF;

  INSERT INTO public.finance_journal_entries (
    user_id, entity_id, journal_number, transaction_id, source_module,
    source_record_id, posting_date, accounting_period, memo, status, posted_by, posted_at
  )
  VALUES (
    t.user_id, t.entity_id, public.finance_next_number('JE', 'finance_journal_entries'),
    t.id, 'transactions', t.id, COALESCE(t.posting_date, t.transaction_date),
    COALESCE(t.accounting_period, to_char(COALESCE(t.posting_date, t.transaction_date), 'YYYY-MM')),
    COALESCE(t.description, t.notes, t.category), 'posted', COALESCE(t.updated_by, t.user_id), now()
  )
  RETURNING id INTO v_entry;

  IF t.type = 'income' THEN
    INSERT INTO public.finance_journal_lines (journal_entry_id, user_id, entity_id, account_id, debit, credit, project_id, client_id, description)
    VALUES
      (v_entry, t.user_id, t.entity_id, v_cash, v_amount, 0, t.project_id, t.client_id, 'Cash / undeposited funds'),
      (v_entry, t.user_id, t.entity_id, COALESCE(v_income, v_ar), 0, v_amount, t.project_id, t.client_id, 'Income received');
    IF COALESCE(t.processing_fee, 0) > 0 AND v_fee IS NOT NULL THEN
      INSERT INTO public.finance_journal_lines (journal_entry_id, user_id, entity_id, account_id, debit, credit, project_id, client_id, description)
      VALUES
        (v_entry, t.user_id, t.entity_id, v_fee, t.processing_fee, 0, t.project_id, t.client_id, 'Processing fee'),
        (v_entry, t.user_id, t.entity_id, v_cash, 0, t.processing_fee, t.project_id, t.client_id, 'Processing fee paid from deposit');
    END IF;
  ELSE
    INSERT INTO public.finance_journal_lines (journal_entry_id, user_id, entity_id, account_id, debit, credit, project_id, vendor_id, cost_code_id, sov_item_id, phase_id, division_id, description)
    VALUES
      (v_entry, t.user_id, t.entity_id, COALESCE(v_expense, v_ap), v_amount, 0, t.project_id, t.vendor_id, t.cost_code_id, t.scope_item_id, t.project_phase_id, t.construction_division_id, 'Expense / job cost'),
      (v_entry, t.user_id, t.entity_id, v_cash, 0, v_amount, t.project_id, t.vendor_id, t.cost_code_id, t.scope_item_id, t.project_phase_id, t.construction_division_id, 'Payment source');
  END IF;

  IF (SELECT COALESCE(sum(debit), 0) - COALESCE(sum(credit), 0) FROM public.finance_journal_lines WHERE journal_entry_id = v_entry) <> 0 THEN
    RAISE EXCEPTION 'Journal entry is not balanced';
  END IF;

  RETURN v_entry;
END;
$$;

CREATE OR REPLACE FUNCTION public.post_check_to_ledger(p_check_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.checks%ROWTYPE;
  s public.company_accounting_settings%ROWTYPE;
  v_entry UUID;
  v_cash UUID; v_ap UUID; v_expense UUID;
BEGIN
  SELECT * INTO c FROM public.checks WHERE id = p_check_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Check not found'; END IF;
  IF c.status = 'voided' THEN RAISE EXCEPTION 'Voided checks cannot be posted'; END IF;

  PERFORM public.ensure_default_accounting_config(c.entity_id);
  SELECT * INTO s FROM public.company_accounting_settings WHERE user_id = c.user_id AND entity_id = c.entity_id;
  SELECT id INTO v_expense FROM public.finance_chart_accounts WHERE user_id = c.user_id AND entity_id = c.entity_id AND account_number = '5000';
  v_cash := s.default_bank_account_id;
  v_ap := s.default_accounts_payable_id;

  SELECT id INTO v_entry
  FROM public.finance_journal_entries
  WHERE source_module = 'checks'
    AND source_record_id = c.id
    AND is_reversal = false
  LIMIT 1;
  IF v_entry IS NOT NULL THEN RETURN v_entry; END IF;

  INSERT INTO public.finance_journal_entries (
    user_id, entity_id, journal_number, source_module, source_record_id,
    posting_date, accounting_period, memo, status, posted_by, posted_at
  )
  VALUES (
    c.user_id, c.entity_id, public.finance_next_number('JE', 'finance_journal_entries'),
    'checks', c.id, COALESCE(c.posting_date, c.issue_date),
    to_char(COALESCE(c.posting_date, c.issue_date), 'YYYY-MM'),
    'Check #' || c.check_number || ' · ' || c.payee_name, 'posted', c.user_id, now()
  )
  RETURNING id INTO v_entry;

  INSERT INTO public.finance_journal_lines (journal_entry_id, user_id, entity_id, account_id, debit, credit, project_id, vendor_id, cost_code_id, sov_item_id, phase_id, division_id, description)
  VALUES
    (v_entry, c.user_id, c.entity_id, COALESCE(v_ap, v_expense), c.amount, 0, c.project_id, c.payee_vendor_id, c.cost_code_id, c.scope_item_id, c.project_phase_id, c.construction_division_id, 'Check issued'),
    (v_entry, c.user_id, c.entity_id, v_cash, 0, c.amount, c.project_id, c.payee_vendor_id, c.cost_code_id, c.scope_item_id, c.project_phase_id, c.construction_division_id, 'Cash/checking');

  IF (SELECT COALESCE(sum(debit), 0) - COALESCE(sum(credit), 0) FROM public.finance_journal_lines WHERE journal_entry_id = v_entry) <> 0 THEN
    RAISE EXCEPTION 'Journal entry is not balanced';
  END IF;

  RETURN v_entry;
END;
$$;

CREATE OR REPLACE FUNCTION public.reverse_journal_entry(p_journal_entry_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  original public.finance_journal_entries%ROWTYPE;
  reversal UUID;
BEGIN
  SELECT * INTO original FROM public.finance_journal_entries WHERE id = p_journal_entry_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Journal entry not found'; END IF;
  IF original.is_reversal THEN RAISE EXCEPTION 'Cannot reverse a reversal entry'; END IF;

  SELECT id INTO reversal
  FROM public.finance_journal_entries
  WHERE reversal_entry_id = original.id AND is_reversal = true
  LIMIT 1;
  IF reversal IS NOT NULL THEN RETURN reversal; END IF;

  INSERT INTO public.finance_journal_entries (
    user_id, entity_id, journal_number, transaction_id, source_module, source_record_id,
    posting_date, accounting_period, memo, status, posted_by, posted_at,
    reversal_entry_id, is_reversal
  )
  VALUES (
    original.user_id, original.entity_id, public.finance_next_number('REV', 'finance_journal_entries'),
    original.transaction_id, original.source_module || '_reversal', original.id,
    CURRENT_DATE, to_char(CURRENT_DATE, 'YYYY-MM'),
    COALESCE(p_reason, 'Reversal for ' || original.journal_number),
    'posted', auth.uid(), now(), original.id, true
  )
  RETURNING id INTO reversal;

  INSERT INTO public.finance_journal_lines (
    journal_entry_id, user_id, entity_id, account_id, debit, credit,
    project_id, client_id, vendor_id, cost_code_id, sov_item_id, phase_id,
    division_id, department, description
  )
  SELECT
    reversal, user_id, entity_id, account_id, credit, debit,
    project_id, client_id, vendor_id, cost_code_id, sov_item_id, phase_id,
    division_id, department, 'Reversal · ' || COALESCE(description, '')
  FROM public.finance_journal_lines
  WHERE journal_entry_id = original.id;

  UPDATE public.finance_journal_entries
  SET status = 'reversed', reversal_entry_id = reversal, updated_at = now()
  WHERE id = original.id;

  RETURN reversal;
END;
$$;

CREATE OR REPLACE FUNCTION public.finance_invoice_total(p_line_items JSONB, p_tax_rate NUMERIC DEFAULT 0)
RETURNS NUMERIC
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(sum(COALESCE((item->>'qty')::NUMERIC, 0) * COALESCE((item->>'rate')::NUMERIC, 0)), 0)
       * (1 + COALESCE(p_tax_rate, 0) / 100)
  FROM jsonb_array_elements(COALESCE(p_line_items, '[]'::jsonb)) AS item;
$$;

CREATE OR REPLACE FUNCTION public.get_project_financial_summary(p_project_id UUID)
RETURNS TABLE (
  project_id UUID,
  original_contract_value NUMERIC,
  approved_change_orders NUMERIC,
  current_contract_value NUMERIC,
  total_invoiced NUMERIC,
  total_collected NUMERIC,
  retainage_withheld NUMERIC,
  retainage_released NUMERIC,
  accounts_receivable NUMERIC,
  unbilled_contract_amount NUMERIC,
  committed_project_costs NUMERIC,
  actual_project_costs NUMERIC,
  paid_costs NUMERIC,
  unpaid_costs NUMERIC,
  outstanding_checks NUMERIC,
  remaining_budget NUMERIC,
  estimated_cost_to_complete NUMERIC,
  estimated_final_cost NUMERIC,
  estimated_gross_profit NUMERIC,
  estimated_gross_margin NUMERIC,
  actual_gross_profit NUMERIC,
  actual_gross_margin NUMERIC,
  percentage_billed NUMERIC,
  percentage_collected NUMERIC,
  cash_position NUMERIC,
  projects_over_budget BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH p AS (
    SELECT * FROM public.projects WHERE id = p_project_id
  ),
  co AS (
    SELECT COALESCE(sum(CASE WHEN status = 'approved' THEN amount ELSE 0 END), 0) AS approved
    FROM public.project_change_orders WHERE project_id = p_project_id
  ),
  inv AS (
    SELECT
      COALESCE(sum(public.finance_invoice_total(line_items::jsonb, tax_rate)), 0) AS invoiced,
      COALESCE(sum(amount_paid), 0) AS paid,
      COALESCE(sum(retainage_withheld), 0) AS ret_w,
      COALESCE(sum(retainage_released), 0) AS ret_r
    FROM public.invoices
    WHERE project_id = p_project_id
      AND status NOT IN ('draft','voided','rejected')
  ),
  inc AS (
    SELECT
      COALESCE(sum(CASE WHEN COALESCE(status,'posted') NOT IN ('draft','rejected','voided','archived') THEN COALESCE(total_amount, amount) ELSE 0 END), 0) AS collected
    FROM public.transactions
    WHERE project_id = p_project_id AND type = 'income' AND deleted_at IS NULL
  ),
  exp AS (
    SELECT
      COALESCE(sum(CASE WHEN COALESCE(status,'posted') NOT IN ('draft','rejected','voided','archived') THEN COALESCE(total_amount, amount) ELSE 0 END), 0) AS actual
    FROM public.transactions
    WHERE project_id = p_project_id AND type = 'expense' AND deleted_at IS NULL
  ),
  chk AS (
    SELECT
      COALESCE(sum(CASE WHEN status = 'cleared' THEN amount ELSE 0 END), 0) AS cleared,
      COALESCE(sum(CASE WHEN status NOT IN ('cleared','voided') THEN amount ELSE 0 END), 0) AS outstanding
    FROM public.checks
    WHERE project_id = p_project_id AND deleted_at IS NULL
  ),
  alloc_exp AS (
    SELECT COALESCE(sum(allocated_amount), 0) AS committed
    FROM public.finance_transaction_allocations
    WHERE project_id = p_project_id
  ),
  base AS (
    SELECT
      p.id AS project_id,
      COALESCE(NULLIF(p.original_contract_value, 0), p.budget, 0) AS original_contract_value,
      co.approved AS approved_change_orders,
      COALESCE(NULLIF(p.current_contract_value, 0), COALESCE(NULLIF(p.original_contract_value, 0), p.budget, 0) + co.approved) AS current_contract_value,
      inv.invoiced AS total_invoiced,
      GREATEST(inv.paid, inc.collected) AS total_collected,
      inv.ret_w AS retainage_withheld,
      inv.ret_r AS retainage_released,
      GREATEST(inv.invoiced - GREATEST(inv.paid, inc.collected), 0) AS accounts_receivable,
      GREATEST(COALESCE(NULLIF(p.current_contract_value, 0), COALESCE(NULLIF(p.original_contract_value, 0), p.budget, 0) + co.approved) - inv.invoiced, 0) AS unbilled_contract_amount,
      alloc_exp.committed AS committed_project_costs,
      exp.actual + chk.cleared AS actual_project_costs,
      chk.cleared AS paid_costs,
      GREATEST(exp.actual - chk.cleared, 0) AS unpaid_costs,
      chk.outstanding AS outstanding_checks,
      GREATEST(COALESCE(p.budget, 0) - exp.actual - chk.cleared - chk.outstanding, 0) AS remaining_budget,
      COALESCE(p.estimated_cost_to_complete, 0) AS estimated_cost_to_complete
    FROM p, co, inv, inc, exp, chk, alloc_exp
  )
  SELECT
    base.project_id,
    base.original_contract_value,
    base.approved_change_orders,
    base.current_contract_value,
    base.total_invoiced,
    base.total_collected,
    base.retainage_withheld,
    base.retainage_released,
    base.accounts_receivable,
    base.unbilled_contract_amount,
    base.committed_project_costs,
    base.actual_project_costs,
    base.paid_costs,
    base.unpaid_costs,
    base.outstanding_checks,
    base.remaining_budget,
    base.estimated_cost_to_complete,
    base.actual_project_costs + base.estimated_cost_to_complete AS estimated_final_cost,
    base.current_contract_value - (base.actual_project_costs + base.estimated_cost_to_complete) AS estimated_gross_profit,
    CASE WHEN base.current_contract_value > 0 THEN ((base.current_contract_value - (base.actual_project_costs + base.estimated_cost_to_complete)) / base.current_contract_value) * 100 ELSE 0 END AS estimated_gross_margin,
    base.total_collected - base.actual_project_costs AS actual_gross_profit,
    CASE WHEN base.total_collected > 0 THEN ((base.total_collected - base.actual_project_costs) / base.total_collected) * 100 ELSE 0 END AS actual_gross_margin,
    CASE WHEN base.current_contract_value > 0 THEN (base.total_invoiced / base.current_contract_value) * 100 ELSE 0 END AS percentage_billed,
    CASE WHEN base.total_invoiced > 0 THEN (base.total_collected / base.total_invoiced) * 100 ELSE 0 END AS percentage_collected,
    base.total_collected - base.actual_project_costs - base.outstanding_checks AS cash_position,
    base.actual_project_costs + base.outstanding_checks > base.current_contract_value AS projects_over_budget
  FROM base;
$$;

CREATE OR REPLACE FUNCTION public.finance_allocation_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_total NUMERIC(14,2);
  v_txn NUMERIC(14,2);
BEGIN
  SELECT COALESCE(total_amount, amount, 0) INTO v_txn
  FROM public.transactions
  WHERE id = NEW.transaction_id;

  SELECT COALESCE(sum(allocated_amount), 0) INTO v_total
  FROM public.finance_transaction_allocations
  WHERE transaction_id = NEW.transaction_id
    AND id <> COALESCE(NEW.id, gen_random_uuid());

  IF v_total + NEW.allocated_amount > v_txn AND NEW.allocation_type <> 'credit' THEN
    RAISE EXCEPTION 'Allocation exceeds transaction amount';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_finance_allocation_guard ON public.finance_transaction_allocations;
CREATE TRIGGER trg_finance_allocation_guard
  BEFORE INSERT OR UPDATE ON public.finance_transaction_allocations
  FOR EACH ROW EXECUTE FUNCTION public.finance_allocation_guard();

-- ─────────────────────────────────────────────────────────────────────────────
-- Realtime publication registration
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ DECLARE t TEXT; BEGIN
  FOREACH t IN ARRAY ARRAY[
    'finance_transaction_allocations','finance_check_allocations',
    'finance_journal_entries','finance_journal_lines','finance_audit_events',
    'finance_attachments','finance_cost_codes','finance_project_phases'
  ] LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    EXCEPTION
      WHEN duplicate_object THEN NULL;
      WHEN undefined_object THEN NULL;
    END;
  END LOOP;
END $$;

-- Refresh PostgREST schema cache.
NOTIFY pgrst, 'reload schema';
