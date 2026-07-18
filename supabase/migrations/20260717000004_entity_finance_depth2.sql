-- ============================================================================
-- HOU INC · Entity Finance Depth II (Holdings amortization + HGP lifecycle)
--
--   1. get_holdings_note_amortization(note_id, max_periods)
--      Projected payment schedule for a note from its live balance, APR, and
--      payment frequency: level-payment amortization when a payment amount is
--      set (or derivable from the maturity date), interest-only rows for
--      interest_only/balloon notes with the balloon due at maturity. Runs as
--      INVOKER — RLS on holdings_notes scopes access.
--
--   2. sync_hgp_job_completion() trigger on hgp_jobs
--      When an install/service job reaches 'commissioned' or 'completed':
--        · upserts the customer into hgp_customer_sites (keyed on owner +
--          customer name + zip) so the Storm Response registry grows itself
--          from finished work instead of manual entry
--        · marks the linked inventory unit installed (status, install_date,
--          customer, serial backfill) so equipment lifecycle follows the job
--
--   3. verify_entity_finance_depth2() — launch verification.
--
-- Safe to re-run. Run in the Supabase SQL editor after 20260717000003.
-- ============================================================================


-- ─── 1. Holdings · projected amortization schedule ──────────────────────────
CREATE OR REPLACE FUNCTION public.get_holdings_note_amortization(
  p_note_id UUID,
  p_max_periods INT DEFAULT 60
)
RETURNS TABLE (
  period INT,
  due_date DATE,
  payment NUMERIC,
  interest NUMERIC,
  principal NUMERIC,
  ending_balance NUMERIC
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  n public.holdings_notes%ROWTYPE;
  ppy INT;                    -- payment periods per year
  step INTERVAL;
  bal NUMERIC(14,2);
  rate NUMERIC;               -- periodic rate
  pay NUMERIC(14,2);
  d DATE;
  i INT := 0;
  int_part NUMERIC(14,2);
  prin_part NUMERIC(14,2);
  n_periods INT;
BEGIN
  SELECT * INTO n FROM public.holdings_notes
  WHERE id = p_note_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RETURN; END IF;

  bal := COALESCE(n.outstanding_balance, 0);
  IF bal <= 0 THEN RETURN; END IF;

  ppy := CASE n.payment_frequency
    WHEN 'monthly' THEN 12
    WHEN 'quarterly' THEN 4
    WHEN 'annual' THEN 1
    ELSE 12                    -- interest_only / balloon accrue monthly
  END;
  step := (interval '1 year') / ppy;
  rate := COALESCE(n.interest_rate, 0) / 100 / ppy;
  d := CURRENT_DATE;

  -- Interest-only / balloon: periodic interest rows, principal at maturity.
  IF n.payment_frequency IN ('interest_only', 'balloon') THEN
    WHILE i < LEAST(p_max_periods, 120) LOOP
      i := i + 1;
      d := (d + step)::date;
      int_part := round(bal * rate, 2);
      IF n.maturity_date IS NOT NULL AND d >= n.maturity_date THEN
        period := i; due_date := n.maturity_date;
        payment := round(bal + int_part, 2); interest := int_part;
        principal := bal; ending_balance := 0;
        RETURN NEXT;
        RETURN;
      END IF;
      period := i; due_date := d; payment := int_part; interest := int_part;
      principal := 0; ending_balance := bal;
      RETURN NEXT;
      EXIT WHEN n.maturity_date IS NULL AND i >= 12;  -- open-ended: show one year
    END LOOP;
    RETURN;
  END IF;

  -- Amortizing: use the stated payment, or derive a level payment from the
  -- remaining term when a maturity date exists.
  pay := n.payment_amount;
  IF pay IS NULL OR pay <= 0 THEN
    IF n.maturity_date IS NULL OR n.maturity_date <= CURRENT_DATE THEN RETURN; END IF;
    n_periods := GREATEST(1, CEIL(
      EXTRACT(EPOCH FROM (n.maturity_date::timestamp - CURRENT_DATE::timestamp))
      / EXTRACT(EPOCH FROM step)
    )::int);
    IF rate > 0 THEN
      pay := round(bal * rate / (1 - power(1 + rate, -n_periods)), 2);
    ELSE
      pay := round(bal / n_periods, 2);
    END IF;
  END IF;

  IF pay <= round(bal * rate, 2) AND rate > 0 THEN
    -- Payment doesn't cover interest — schedule would never converge.
    RETURN;
  END IF;

  WHILE bal > 0 AND i < LEAST(p_max_periods, 360) LOOP
    i := i + 1;
    d := (d + step)::date;
    int_part := round(bal * rate, 2);
    prin_part := LEAST(bal, round(pay - int_part, 2));
    bal := round(bal - prin_part, 2);
    period := i; due_date := d;
    payment := round(int_part + prin_part, 2);
    interest := int_part; principal := prin_part; ending_balance := bal;
    RETURN NEXT;
  END LOOP;
END;
$$;


-- ─── 2. HGP · job completion → customer site + inventory lifecycle ──────────
CREATE OR REPLACE FUNCTION public.sync_hgp_job_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing UUID;
BEGIN
  -- Only when the job newly reaches a done stage.
  IF NEW.deleted_at IS NOT NULL THEN RETURN NEW; END IF;
  IF NEW.stage NOT IN ('commissioned', 'maintenance_enrolled', 'completed') THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.stage = NEW.stage THEN RETURN NEW; END IF;

  -- Grow the Storm Response registry from finished work.
  IF NEW.customer_name IS NOT NULL AND (NEW.zip IS NOT NULL OR NEW.site_address IS NOT NULL) THEN
    SELECT id INTO v_existing
    FROM public.hgp_customer_sites
    WHERE user_id = NEW.user_id
      AND deleted_at IS NULL
      AND lower(customer_name) = lower(NEW.customer_name)
      AND COALESCE(zip, '') = COALESCE(NEW.zip, '')
    LIMIT 1;

    IF v_existing IS NULL THEN
      INSERT INTO public.hgp_customer_sites (
        user_id, entity_id, customer_name, customer_email, customer_phone,
        site_address, city, county, zip, utility_provider, equipment_unit_id,
        notes, metadata
      ) VALUES (
        NEW.user_id, NEW.entity_id, NEW.customer_name, NEW.customer_email, NEW.customer_phone,
        NEW.site_address, NEW.city, NEW.county, NEW.zip, NEW.utility_provider, NEW.equipment_unit_id,
        'Auto-registered from ' || NEW.job_type || ' job completion.',
        jsonb_build_object('created_from', 'hgp_job', 'job_id', NEW.id)
      );
    ELSIF NEW.equipment_unit_id IS NOT NULL THEN
      UPDATE public.hgp_customer_sites
      SET equipment_unit_id = COALESCE(equipment_unit_id, NEW.equipment_unit_id)
      WHERE id = v_existing;
    END IF;
  END IF;

  -- Move the linked inventory unit through its lifecycle.
  IF NEW.equipment_unit_id IS NOT NULL THEN
    UPDATE public.hgp_equipment_units
    SET status = 'installed',
        install_date = COALESCE(install_date, NEW.completed_date, CURRENT_DATE),
        customer_name = COALESCE(customer_name, NEW.customer_name),
        serial_number = COALESCE(serial_number, NEW.serial_number)
    WHERE id = NEW.equipment_unit_id AND deleted_at IS NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_hgp_job_completion ON public.hgp_jobs;
CREATE TRIGGER trg_sync_hgp_job_completion
  AFTER INSERT OR UPDATE OF stage ON public.hgp_jobs
  FOR EACH ROW EXECUTE FUNCTION public.sync_hgp_job_completion();


-- ─── 3. Verification ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.verify_entity_finance_depth2()
RETURNS TABLE (check_name TEXT, ok BOOLEAN, details TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY VALUES
    ('holdings_amortization_rpc',
      EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_holdings_note_amortization'),
      'projected level-payment / interest-only schedules per note'),
    ('hgp_job_lifecycle_sync',
      EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'sync_hgp_job_completion'),
      'completed jobs auto-register customer sites and install inventory units');
END;
$$;

NOTIFY pgrst, 'reload schema';
