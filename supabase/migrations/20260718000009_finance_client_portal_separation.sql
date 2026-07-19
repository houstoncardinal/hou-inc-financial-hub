-- ============================================================================
-- HOU INC · Finance Client / Portal Client Separation
--
-- Clarifies the client architecture after 20260718000008:
--   · portal_clients remains Houston Enterprise-only portal access/invites
--   · finance_client_accounts is the finance/operations account registry for
--     Houston Enterprise and Houston Generator Pros
--   · Houston Enterprise Holdings does not manage clients; it reads corporate
--     rollups from the operating entities
--
-- This removes the optional portal_client_id bridge from finance_client_accounts
-- so finance client management cannot be mistaken for portal access management.
-- Safe to re-run.
-- ============================================================================

ALTER TABLE public.finance_client_accounts
  DROP COLUMN IF EXISTS portal_client_id;

COMMENT ON TABLE public.finance_client_accounts IS
  'Finance/operations client accounts for Houston Enterprise and Houston Generator Pros. Separate from portal_clients, which is Houston Enterprise client portal access infrastructure.';

COMMENT ON TABLE public.portal_clients IS
  'Houston Enterprise client portal access records only. Not used as the finance client account registry for entity dashboards.';

CREATE OR REPLACE FUNCTION public.verify_finance_client_portal_separation()
RETURNS TABLE (check_name TEXT, ok BOOLEAN, details TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY VALUES
    ('finance_clients_are_portal_independent',
      NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'finance_client_accounts'
          AND column_name = 'portal_client_id'
      ),
      'finance_client_accounts has no portal_client_id bridge'),
    ('portal_clients_still_exist_for_he_portal',
      EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'portal_clients'
      ),
      'portal_clients remains available for Houston Enterprise client portal');
END;
$$;

NOTIFY pgrst, 'reload schema';
