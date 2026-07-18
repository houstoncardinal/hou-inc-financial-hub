-- ============================================================================
-- HOU INC · Holdings Covenant & Compliance Tracking
--
-- Loan/note covenants for Houston Enterprise Holdings: financial ratios,
-- reporting obligations, insurance requirements, and other lender terms —
-- each with a status workflow (compliant → warning → breached, or waived),
-- a next-review date, and an optional link to the note it protects. Feeds
-- the Holdings HQ compliance panel and maturity-risk view.
--
-- Owner-scoped RLS, indexed on status/review date, realtime-registered.
-- Safe to re-run. Run in the Supabase SQL editor after 20260717000004.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.holdings_covenants (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_id    TEXT NOT NULL DEFAULT 'houston-enterprise-holdings',
  note_id      UUID REFERENCES public.holdings_notes(id) ON DELETE SET NULL,
  name         TEXT NOT NULL,
  covenant_type TEXT NOT NULL DEFAULT 'financial'
    CHECK (covenant_type IN ('financial', 'reporting', 'insurance', 'operational', 'other')),
  requirement  TEXT,
  status       TEXT NOT NULL DEFAULT 'compliant'
    CHECK (status IN ('compliant', 'warning', 'breached', 'waived')),
  next_review_date DATE,
  last_reviewed_date DATE,
  notes        TEXT,
  metadata     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at   TIMESTAMPTZ
);

ALTER TABLE public.holdings_covenants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS holdings_covenants_owner ON public.holdings_covenants;
CREATE POLICY holdings_covenants_owner ON public.holdings_covenants FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_holdings_covenants_status
  ON public.holdings_covenants(entity_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_holdings_covenants_review
  ON public.holdings_covenants(next_review_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_holdings_covenants_note
  ON public.holdings_covenants(note_id) WHERE deleted_at IS NULL;

DO $$ BEGIN
  EXECUTE 'DROP TRIGGER IF EXISTS trg_holdings_covenants_updated ON public.holdings_covenants';
  EXECUTE 'CREATE TRIGGER trg_holdings_covenants_updated BEFORE UPDATE ON public.holdings_covenants FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()';
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.holdings_covenants';
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
  END;
END $$;

CREATE OR REPLACE FUNCTION public.verify_holdings_covenants()
RETURNS TABLE (check_name TEXT, ok BOOLEAN, details TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY VALUES
    ('holdings_covenants_table',
      EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='holdings_covenants'),
      'covenant/compliance tracking with status workflow, review dates, note links');
END;
$$;

NOTIFY pgrst, 'reload schema';
