-- ═══════════════════════════════════════════════════════════════════════════
-- HOU INC · Entity Separation Migration
-- Safe to re-run: IF NOT EXISTS / IF EXISTS / OR REPLACE throughout
--
-- Run this in Supabase → SQL Editor after complete_schema.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 0. Ensure deleted_at exists on vendors / projects (hooks rely on it) ──
ALTER TABLE public.vendors  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ── 1. Add entity_id to every financial table ─────────────────────────────
--    Default = 'houston-enterprise' so all existing rows are assigned.
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS entity_id TEXT NOT NULL DEFAULT 'houston-enterprise';

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS entity_id TEXT NOT NULL DEFAULT 'houston-enterprise';

ALTER TABLE public.checks
  ADD COLUMN IF NOT EXISTS entity_id TEXT NOT NULL DEFAULT 'houston-enterprise';

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS entity_id TEXT NOT NULL DEFAULT 'houston-enterprise';

-- ── 2. Validate entity IDs via check constraints ──────────────────────────
DO $$ BEGIN
  ALTER TABLE public.vendors
    ADD CONSTRAINT chk_vendors_entity
      CHECK (entity_id IN ('houston-enterprise','houston-generator-pros','houston-enterprise-holdings'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.projects
    ADD CONSTRAINT chk_projects_entity
      CHECK (entity_id IN ('houston-enterprise','houston-generator-pros','houston-enterprise-holdings'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.checks
    ADD CONSTRAINT chk_checks_entity
      CHECK (entity_id IN ('houston-enterprise','houston-generator-pros','houston-enterprise-holdings'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.transactions
    ADD CONSTRAINT chk_transactions_entity
      CHECK (entity_id IN ('houston-enterprise','houston-generator-pros','houston-enterprise-holdings'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 3. Composite indexes (user + entity) for query performance ────────────
CREATE INDEX IF NOT EXISTS idx_vendors_user_entity      ON public.vendors(user_id, entity_id)      WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_projects_user_entity     ON public.projects(user_id, entity_id)     WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_checks_user_entity       ON public.checks(user_id, entity_id)       WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_user_entity ON public.transactions(user_id, entity_id) WHERE deleted_at IS NULL;

-- ── 4. INVOICES TABLE (migrated from localStorage to Supabase) ────────────
CREATE TABLE IF NOT EXISTS public.invoices (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_id        TEXT        NOT NULL DEFAULT 'houston-enterprise'
                               CHECK (entity_id IN ('houston-enterprise','houston-generator-pros','houston-enterprise-holdings')),
  invoice_number   TEXT        NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'draft'
                               CHECK (status IN ('draft','sent','paid','overdue')),
  client_name      TEXT        NOT NULL DEFAULT '',
  client_email     TEXT        NOT NULL DEFAULT '',
  client_company   TEXT        NOT NULL DEFAULT '',
  client_address   TEXT        NOT NULL DEFAULT '',
  issue_date       DATE        NOT NULL DEFAULT CURRENT_DATE,
  due_date         DATE        NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  line_items       JSONB       NOT NULL DEFAULT '[]',
  tax_rate         NUMERIC(5,2) NOT NULL DEFAULT 0,
  notes            TEXT        NOT NULL DEFAULT '',
  terms            TEXT        NOT NULL DEFAULT '',
  stripe_payment_link TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 5. RLS for invoices ───────────────────────────────────────────────────
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_select_invoices" ON public.invoices;
DROP POLICY IF EXISTS "own_insert_invoices" ON public.invoices;
DROP POLICY IF EXISTS "own_update_invoices" ON public.invoices;
DROP POLICY IF EXISTS "own_delete_invoices" ON public.invoices;

CREATE POLICY "own_select_invoices" ON public.invoices FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_insert_invoices" ON public.invoices FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_update_invoices" ON public.invoices FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own_delete_invoices" ON public.invoices FOR DELETE USING (auth.uid() = user_id);

-- ── 6. updated_at trigger for invoices ───────────────────────────────────
DROP TRIGGER IF EXISTS trg_invoices_updated ON public.invoices;
CREATE TRIGGER trg_invoices_updated
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 7. Indexes for invoices ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_invoices_user_entity ON public.invoices(user_id, entity_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status       ON public.invoices(user_id, entity_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date     ON public.invoices(due_date) WHERE status IN ('sent','overdue');

-- ═══════════════════════════════════════════════════════════════════════════
-- ✓ ENTITY SEPARATION COMPLETE
--   Next: restart your dev server so hooks pick up the new entity_id column.
-- ═══════════════════════════════════════════════════════════════════════════
