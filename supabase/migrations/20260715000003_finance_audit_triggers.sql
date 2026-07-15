-- ============================================================================
-- HOU INC · Finance Audit Triggers
--
-- Permanent database-backed changelog entries for finance records. This keeps
-- add/edit/delete activity visible in the admin changelog even when changes are
-- made from different finance screens.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.finance_changelog_label(p_table TEXT, p_row JSONB)
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT CASE p_table
    WHEN 'transactions' THEN COALESCE(
      NULLIF(p_row->>'transaction_number', ''),
      NULLIF(p_row->>'source_name', ''),
      NULLIF(p_row->>'category', ''),
      p_row->>'id'
    )
    WHEN 'checks' THEN COALESCE(
      'Check #' || NULLIF(p_row->>'check_number', ''),
      NULLIF(p_row->>'payee_name', ''),
      p_row->>'id'
    )
    WHEN 'projects' THEN COALESCE(NULLIF(p_row->>'name', ''), p_row->>'id')
    WHEN 'vendors' THEN COALESCE(NULLIF(p_row->>'name', ''), p_row->>'id')
    WHEN 'invoices' THEN COALESCE(NULLIF(p_row->>'invoice_number', ''), NULLIF(p_row->>'client_name', ''), p_row->>'id')
    ELSE p_row->>'id'
  END;
$$;

CREATE OR REPLACE FUNCTION public.finance_changelog_entity(p_table TEXT, p_row JSONB)
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT CASE p_table
    WHEN 'transactions' THEN COALESCE(NULLIF(p_row->>'type', ''), 'transaction')
    WHEN 'checks' THEN 'check'
    WHEN 'projects' THEN 'project'
    WHEN 'vendors' THEN 'vendor'
    WHEN 'invoices' THEN 'invoice'
    ELSE p_table
  END;
$$;

CREATE OR REPLACE FUNCTION public.log_finance_record_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old JSONB;
  v_new JSONB;
  v_action TEXT;
  v_row JSONB;
  v_changed_by TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'created';
    v_new := to_jsonb(NEW);
    v_row := v_new;
  ELSIF TG_OP = 'UPDATE' THEN
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_row := v_new;

    IF v_old ? 'deleted_at'
       AND v_new ? 'deleted_at'
       AND COALESCE(v_old->>'deleted_at', '') = ''
       AND COALESCE(v_new->>'deleted_at', '') <> '' THEN
      v_action := 'deleted';
    ELSE
      v_action := 'updated';
    END IF;

    IF v_old = v_new THEN
      RETURN NEW;
    END IF;
  ELSE
    v_action := 'deleted';
    v_old := to_jsonb(OLD);
    v_row := v_old;
  END IF;

  v_changed_by := COALESCE(
    NULLIF(auth.jwt() ->> 'email', ''),
    auth.uid()::TEXT,
    'system'
  );

  INSERT INTO public.admin_changelog (
    action,
    entity,
    dashboard,
    entity_id,
    entity_label,
    changed_by,
    details
  )
  VALUES (
    v_action,
    public.finance_changelog_entity(TG_TABLE_NAME, v_row),
    'finance',
    v_row->>'id',
    public.finance_changelog_label(TG_TABLE_NAME, v_row),
    v_changed_by,
    jsonb_build_object(
      'table', TG_TABLE_NAME,
      'entity_id', COALESCE(v_row->>'entity_id', 'houston-enterprise'),
      'operation', TG_OP,
      'previous', v_old,
      'current', v_new
    )
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['transactions','checks','projects','vendors','invoices'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_finance_changelog ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_%I_finance_changelog
       AFTER INSERT OR UPDATE OR DELETE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.log_finance_record_change()',
      t,
      t
    );
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
