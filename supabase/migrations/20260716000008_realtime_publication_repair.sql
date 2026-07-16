-- ============================================================================
-- HOU INC · Realtime publication repair
--
-- src/hooks/useFinance.ts's useFinanceRealtime() (mounted globally in
-- AppShell.tsx) has always subscribed to postgres_changes on transactions,
-- checks, projects, vendors, and invoices — but none of those tables were
-- ever added to the supabase_realtime publication, so Postgres never emits
-- WAL events for them and the subscription has been a silent no-op. Same
-- root cause as project_photos before 20260716000003_project_photos_realtime.sql
-- and the finance_* tables in 20260715000001_upgrade_construction_finance_system.sql.
--
-- This also registers the project-reconciliation tables (change orders,
-- add-ons, draws, scope items, milestones) so a dedicated per-project
-- realtime subscription (added in ProjectDetail.tsx / ProjectBreakdown.tsx)
-- can keep the Overview and Reconciliation tabs live without a manual
-- refresh, and so any teammate viewing the same project sees updates from
-- others immediately.
--
-- Safe to run any number of times.
-- ============================================================================

DO $$ DECLARE t TEXT; BEGIN
  FOREACH t IN ARRAY ARRAY[
    'transactions', 'checks', 'projects', 'vendors', 'invoices',
    'project_change_orders', 'project_add_ons', 'draw_schedules',
    'project_scope_items', 'project_milestones'
  ] LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    EXCEPTION
      WHEN duplicate_object THEN NULL;
      WHEN undefined_object THEN NULL;
    END;
  END LOOP;
END $$;

-- ── Reload PostgREST schema cache ───────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
