-- ============================================================================
-- HOU INC · Fix combined transactions+checks exposure in the AP compliance
-- guard (verify_subcontractor_invoice, from 20260719000004)
--
-- Bug found via live testing: the original trigger computed prior-invoiced
-- totals SEPARATELY per table (a check insert only summed prior checks, a
-- transaction insert only summed prior transactions), so a vendor could
-- bypass a commitment's dollar cap entirely by mixing payment methods —
-- exactly the loophole the migration's own comment claimed to close.
-- Live-reproduced: $800 in prior expense transactions + a new $500 check
-- (total exposure $1300 against a $1000 commitment) was incorrectly
-- allowed because the check-side query only saw $0 in prior checks.
--
-- Fix: both guards (max-dollar hard block, lien-waiver soft flag) now sum
-- exposure across transactions AND checks combined, regardless of which
-- table fired the trigger.
-- ============================================================================

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
  v_prior_txn_total NUMERIC;
  v_prior_chk_total NUMERIC;
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

  -- Only enforce when this spend is actually tied to a tracked commitment.
  SELECT * INTO v_commitment
  FROM public.finance_commitments
  WHERE vendor_id = v_vendor_id AND project_id = NEW.project_id
    AND status IN ('active', 'pending_approval') AND deleted_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Combined prior exposure across BOTH transactions and checks — a vendor
  -- can't bypass the commitment cap by mixing payment methods.
  SELECT COALESCE(sum(COALESCE(total_amount, amount, 0)), 0) INTO v_prior_txn_total
  FROM public.transactions
  WHERE vendor_id = v_vendor_id AND project_id = NEW.project_id AND type = 'expense'
    AND deleted_at IS NULL AND COALESCE(status, '') <> 'voided'
    AND NOT (TG_TABLE_NAME = 'transactions' AND TG_OP = 'UPDATE' AND id = NEW.id);

  SELECT COALESCE(sum(COALESCE(amount, 0)), 0) INTO v_prior_chk_total
  FROM public.checks
  WHERE payee_vendor_id = v_vendor_id AND project_id = NEW.project_id
    AND deleted_at IS NULL AND status <> 'voided'
    AND NOT (TG_TABLE_NAME = 'checks' AND TG_OP = 'UPDATE' AND id = NEW.id);

  v_prior_total := v_prior_txn_total + v_prior_chk_total;

  IF v_prior_total + v_amount > v_commitment.revised_amount THEN
    RAISE EXCEPTION
      'Commitment overrun: "%" (%) revised amount is $%, prior invoiced $% (transactions + checks combined) plus this $% would total $%, exceeding the commitment by $%',
      v_commitment.title, COALESCE(v_commitment.commitment_number, v_commitment.id::text),
      v_commitment.revised_amount, v_prior_total, v_amount,
      v_prior_total + v_amount, (v_prior_total + v_amount) - v_commitment.revised_amount;
  END IF;

  -- Lien waiver guard (soft flag) — most recent prior draw across BOTH tables.
  SELECT amt INTO v_prior_amount
  FROM (
    SELECT COALESCE(total_amount, amount, 0) AS amt, transaction_date AS d, created_at AS c
    FROM public.transactions
    WHERE vendor_id = v_vendor_id AND project_id = NEW.project_id AND type = 'expense'
      AND deleted_at IS NULL AND COALESCE(status, '') <> 'voided'
      AND NOT (TG_TABLE_NAME = 'transactions' AND TG_OP = 'UPDATE' AND id = NEW.id)
    UNION ALL
    SELECT COALESCE(amount, 0) AS amt, issue_date AS d, created_at AS c
    FROM public.checks
    WHERE payee_vendor_id = v_vendor_id AND project_id = NEW.project_id
      AND deleted_at IS NULL AND status <> 'voided'
      AND NOT (TG_TABLE_NAME = 'checks' AND TG_OP = 'UPDATE' AND id = NEW.id)
  ) prior
  ORDER BY d DESC NULLS LAST, c DESC
  LIMIT 1;

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

-- ─── Verification ───────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.verify_ctc_combined_ap_guard_fix()
RETURNS TABLE (check_name TEXT, ok BOOLEAN, details TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY VALUES
    ('verify_subcontractor_invoice_combines_both_tables',
      EXISTS (
        SELECT 1 FROM pg_proc
        WHERE proname = 'verify_subcontractor_invoice'
          AND prosrc ILIKE '%v_prior_txn_total%' AND prosrc ILIKE '%v_prior_chk_total%'
      ),
      'AP dollar guard sums prior exposure across transactions AND checks combined, not per-table');
END;
$$;

NOTIFY pgrst, 'reload schema';
