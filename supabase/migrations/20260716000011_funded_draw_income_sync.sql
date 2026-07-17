-- ============================================================================
-- HOU INC · Funded Draw Requests → Income Ledger Sync
--
-- A draw request marked "funded" is real project/entity income. This trigger
-- keeps draw_schedules connected to transactions so project financial summaries,
-- the ledger register, realtime dashboards, and entity-level income all update
-- without manual duplicate entry.
--
-- Idempotency key: transactions.external_reference = 'draw_schedule:' || draw.id
-- Safe to re-run.
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_transactions_draw_external_reference
  ON public.transactions (external_reference)
  WHERE external_reference LIKE 'draw_schedule:%';

CREATE OR REPLACE FUNCTION public.sync_funded_draw_to_income()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project public.projects%ROWTYPE;
  v_existing_id UUID;
  v_ref TEXT;
  v_amount NUMERIC(14,2);
  v_txn_date DATE;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_ref := 'draw_schedule:' || OLD.id::text;
    UPDATE public.transactions
    SET
      status = 'voided',
      payment_status = 'voided',
      notes = 'Linked draw request was deleted; income voided to prevent revenue overstatement.',
      updated_at = now()
    WHERE external_reference = v_ref
      AND COALESCE(status, '') <> 'voided';
    RETURN OLD;
  END IF;

  SELECT * INTO v_project
  FROM public.projects
  WHERE id = NEW.project_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  v_ref := 'draw_schedule:' || NEW.id::text;
  v_amount := COALESCE(NEW.draw_amount, 0);
  v_txn_date := COALESCE(NEW.scheduled_date, NEW.billing_period_end, CURRENT_DATE);

  SELECT id INTO v_existing_id
  FROM public.transactions
  WHERE external_reference = v_ref
  ORDER BY created_at ASC
  LIMIT 1;

  IF NEW.status <> 'funded' THEN
    IF v_existing_id IS NOT NULL THEN
      UPDATE public.transactions
      SET
        status = 'voided',
        payment_status = 'voided',
        notes = 'Draw request is no longer funded; linked income voided to prevent revenue overstatement.',
        updated_by = v_project.user_id,
        updated_at = now()
      WHERE id = v_existing_id;
    END IF;
    RETURN NEW;
  END IF;

  IF v_amount <= 0 THEN
    RETURN NEW;
  END IF;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.transactions
    SET
      user_id = v_project.user_id,
      entity_id = v_project.entity_id,
      type = 'income',
      amount = v_amount,
      amount_before_tax = v_amount,
      tax_amount = 0,
      total_amount = v_amount,
      net_amount = v_amount,
      transaction_date = v_txn_date,
      posting_date = v_txn_date,
      source_name = COALESCE(v_project.name, 'Project draw funding'),
      project_id = NEW.project_id,
      category = 'Project Draw Funding',
      description = 'Funded draw request: ' || NEW.milestone_name,
      notes = COALESCE(NEW.notes, 'Auto-created from funded draw request.'),
      payment_method = 'financing_draw',
      status = 'posted',
      approval_status = 'approved',
      payment_status = 'paid',
      reconciliation_status = 'unreconciled',
      external_invoice_number = NEW.invoice_number,
      updated_by = v_project.user_id,
      updated_at = now()
    WHERE id = v_existing_id;
  ELSE
    INSERT INTO public.transactions (
      user_id, entity_id, type, amount, amount_before_tax, tax_amount,
      total_amount, net_amount, transaction_date, posting_date, source_name,
      project_id, category, description, notes, payment_method, status,
      approval_status, payment_status, reconciliation_status,
      external_reference, external_invoice_number, created_by, updated_by
    ) VALUES (
      v_project.user_id, v_project.entity_id, 'income', v_amount, v_amount, 0,
      v_amount, v_amount, v_txn_date, v_txn_date,
      COALESCE(v_project.name, 'Project draw funding'),
      NEW.project_id, 'Project Draw Funding',
      'Funded draw request: ' || NEW.milestone_name,
      COALESCE(NEW.notes, 'Auto-created from funded draw request.'),
      'financing_draw', 'posted', 'approved', 'paid', 'unreconciled',
      v_ref, NEW.invoice_number, v_project.user_id, v_project.user_id
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_funded_draw_to_income ON public.draw_schedules;
CREATE TRIGGER trg_sync_funded_draw_to_income
  AFTER INSERT OR UPDATE ON public.draw_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_funded_draw_to_income();

DROP TRIGGER IF EXISTS trg_void_funded_draw_income ON public.draw_schedules;
CREATE TRIGGER trg_void_funded_draw_income
  AFTER DELETE ON public.draw_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_funded_draw_to_income();

NOTIFY pgrst, 'reload schema';
