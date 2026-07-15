-- ═══════════════════════════════════════════════════════════════════════════
-- HOU INC · SOV Income Link
--
-- Extends the transactions table to support per-scope-item income attribution
-- inside the Project Financial Breakdown feature.
--
-- New columns:
--   scope_item_id      → links an income transaction to a specific SOV line item
--   work_completed_pct → snapshots % complete at time of billing/payment
--
-- No rows are modified. Both columns are nullable and backwards-compatible.
-- Run in the Supabase SQL editor.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS scope_item_id UUID
    REFERENCES public.project_scope_items(id) ON DELETE SET NULL;

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS work_completed_pct NUMERIC(5,2);

CREATE INDEX IF NOT EXISTS idx_txn_scope_item
  ON public.transactions(scope_item_id)
  WHERE scope_item_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';
