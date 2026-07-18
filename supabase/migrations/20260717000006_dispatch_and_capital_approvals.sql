-- ============================================================================
-- HOU INC · HGP Dispatch Fields + Holdings Capital Approvals
--
--   1. hgp_jobs gains technician + dispatch_status
--      (unassigned → assigned → en_route → on_site → done) so the emergency
--      queue and the 8-week planner become a real dispatch board.
--
--   2. holdings_capital_activity gains an approval workflow:
--      approval_status (draft/pending/approved/rejected), approved_by,
--      approved_at, approval_notes. Existing rows are grandfathered as
--      'approved' via the column DEFAULT so history is unchanged; the
--      Holdings HQ KPIs count only approved activity.
--
--   3. verify_dispatch_capital_approvals() — launch verification.
--
-- Safe to re-run. Run in the Supabase SQL editor after 20260717000005.
-- ============================================================================

ALTER TABLE public.hgp_jobs
  ADD COLUMN IF NOT EXISTS technician TEXT,
  ADD COLUMN IF NOT EXISTS dispatch_status TEXT NOT NULL DEFAULT 'unassigned'
    CHECK (dispatch_status IN ('unassigned', 'assigned', 'en_route', 'on_site', 'done'));

CREATE INDEX IF NOT EXISTS idx_hgp_jobs_dispatch
  ON public.hgp_jobs(dispatch_status)
  WHERE deleted_at IS NULL AND dispatch_status <> 'done';

ALTER TABLE public.holdings_capital_activity
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'approved'
    CHECK (approval_status IN ('draft', 'pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS approved_by TEXT,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approval_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_holdings_capital_pending
  ON public.holdings_capital_activity(approval_status)
  WHERE deleted_at IS NULL AND approval_status = 'pending';

CREATE OR REPLACE FUNCTION public.verify_dispatch_capital_approvals()
RETURNS TABLE (check_name TEXT, ok BOOLEAN, details TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY VALUES
    ('hgp_dispatch_fields',
      EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='hgp_jobs' AND column_name='dispatch_status'),
      'technician + dispatch status on generator jobs'),
    ('holdings_capital_approvals',
      EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='holdings_capital_activity' AND column_name='approval_status'),
      'draft/pending/approved/rejected workflow on capital activity');
END;
$$;

NOTIFY pgrst, 'reload schema';
