/* ── Entity-operations hooks ──────────────────────────────────────────────────
   Data layer for the HGP generator dashboard (equipment inventory + service
   agreements) and the Holdings dashboard (notes + capital activity +
   consolidated cross-entity cash). Tables ship in migration
   20260716000015_entity_operations.sql; casts stay `as any` until types.ts is
   regenerated, matching the launch-hardening tables' convention. ── */
import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEntity, ENTITIES } from '@/contexts/EntityContext';

const HGP_ID = 'houston-generator-pros';
const HOLDINGS_ID = 'houston-enterprise-holdings';

function ownedList(table: string, entityId: string, order: { column: string; ascending?: boolean }) {
  return async () => {
    const { data, error } = await (supabase as any)
      .from(table)
      .select('*')
      .eq('entity_id', entityId)
      .is('deleted_at', null)
      .order(order.column, { ascending: order.ascending ?? false });
    if (error) throw error;
    return data ?? [];
  };
}

/* ── HGP ── */
export const useEquipmentUnits = () =>
  useQuery({
    queryKey: ['hgp-equipment-units'],
    queryFn: ownedList('hgp_equipment_units', HGP_ID, { column: 'created_at' }),
  });

export const useServiceAgreements = () =>
  useQuery({
    queryKey: ['hgp-service-agreements'],
    queryFn: ownedList('hgp_service_agreements', HGP_ID, { column: 'next_visit_date', ascending: true }),
  });

export const useServiceVisits = () =>
  useQuery({
    queryKey: ['hgp-service-visits'],
    queryFn: ownedList('hgp_service_visits', HGP_ID, { column: 'visit_date' }),
  });

export const useHgpJobs = () =>
  useQuery({
    queryKey: ['hgp-jobs'],
    queryFn: ownedList('hgp_jobs', HGP_ID, { column: 'created_at' }),
  });

export const useCustomerSites = () =>
  useQuery({
    queryKey: ['hgp-customer-sites'],
    queryFn: ownedList('hgp_customer_sites', HGP_ID, { column: 'customer_name', ascending: true }),
  });

export const useOutageSources = () =>
  useQuery({
    queryKey: ['hgp-outage-sources'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('hgp_outage_sources')
        .select('*')
        .eq('active', true)
        .order('provider', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useOutageEvents = () =>
  useQuery({
    queryKey: ['hgp-outage-events'],
    queryFn: ownedList('hgp_outage_events', HGP_ID, { column: 'outage_started_at' }),
  });

export const useOutageImpacts = () =>
  useQuery({
    queryKey: ['hgp-outage-impacts'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('hgp_outage_impacts')
        .select('*, hgp_customer_sites:site_id(*)')
        .eq('entity_id', HGP_ID)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

/* ── Holdings ── */
export const useHoldingsNotes = () =>
  useQuery({
    queryKey: ['holdings-notes'],
    queryFn: ownedList('holdings_notes', HOLDINGS_ID, { column: 'created_at' }),
  });

export const useCapitalActivity = () =>
  useQuery({
    queryKey: ['holdings-capital-activity'],
    queryFn: ownedList('holdings_capital_activity', HOLDINGS_ID, { column: 'activity_date' }),
  });

export const useNotePayments = () =>
  useQuery({
    queryKey: ['holdings-note-payments'],
    queryFn: ownedList('holdings_note_payments', HOLDINGS_ID, { column: 'payment_date' }),
  });

/* Consolidated cross-entity cash for the Holdings portfolio view. Prefers
   the server-side get_holdings_entity_performance() rollup (migration
   20260717000001) so this stays fast at thousands of ledger rows; falls back
   to a client-side scan when the RPC isn't deployed yet. RLS scopes both
   paths to the signed-in owner's rows. */
export const useConsolidatedEntityTotals = () =>
  useQuery({
    queryKey: ['holdings-consolidated-totals'],
    queryFn: async () => {
      const totals: Record<string, { income: number; expense: number; clearedChecks: number }> = {};
      for (const e of ENTITIES) totals[e.id] = { income: 0, expense: 0, clearedChecks: 0 };

      const rpc = await (supabase as any).rpc('get_holdings_entity_performance');
      if (!rpc.error) {
        for (const row of rpc.data ?? []) {
          totals[row.entity_id] = {
            income: Number(row.income ?? 0),
            expense: Number(row.expense ?? 0),
            clearedChecks: Number(row.cleared_checks ?? 0),
          };
        }
        return totals;
      }

      const [txnRes, chkRes] = await Promise.all([
        (supabase as any)
          .from('transactions')
          .select('entity_id, type, amount, total_amount, status')
          .is('deleted_at', null),
        (supabase as any)
          .from('checks')
          .select('entity_id, amount, status')
          .is('deleted_at', null),
      ]);
      if (txnRes.error) throw txnRes.error;
      if (chkRes.error) throw chkRes.error;

      for (const t of txnRes.data ?? []) {
        const bucket = totals[t.entity_id] ?? (totals[t.entity_id] = { income: 0, expense: 0, clearedChecks: 0 });
        if ((t.status ?? '') === 'voided') continue;
        const amt = Number(t.total_amount ?? t.amount ?? 0);
        if (t.type === 'income') bucket.income += amt;
        else if (t.type === 'expense') bucket.expense += amt;
      }
      for (const c of chkRes.data ?? []) {
        const bucket = totals[c.entity_id] ?? (totals[c.entity_id] = { income: 0, expense: 0, clearedChecks: 0 });
        if (c.status === 'cleared') bucket.clearedChecks += Number(c.amount ?? 0);
      }
      return totals;
    },
  });

/* HGP headline numbers from the server-side rollup — null when the RPC isn't
   deployed yet, in which case GeneratorOps falls back to client-side math. */
export const useHgpFinanceSummary = () =>
  useQuery({
    queryKey: ['hgp-finance-summary'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('get_hgp_finance_summary');
      if (error) return null;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) return null;
      return {
        totalIncome: Number(row.total_income ?? 0),
        totalExpense: Number(row.total_expense ?? 0),
        serviceRevenue: Number(row.service_revenue ?? 0),
        emergencyRevenue: Number(row.emergency_revenue ?? 0),
        inventoryValue: Number(row.inventory_value ?? 0),
        depositsHeld: Number(row.deposits_held ?? 0),
        recurringAnnualValue: Number(row.recurring_annual_value ?? 0),
      };
    },
  });

/* ── Writes ── */
type EntityOpsTable =
  | 'hgp_equipment_units' | 'hgp_service_agreements' | 'hgp_service_visits'
  | 'hgp_jobs' | 'hgp_customer_sites' | 'hgp_outage_events' | 'hgp_outage_impacts'
  | 'holdings_notes' | 'holdings_capital_activity' | 'holdings_note_payments';

/* Visit revenue and note-payment interest mirror into transactions via DB
   triggers, and note payments recompute their note's balance — so those
   writes also invalidate the ledger-side and notes caches. */
const ENTITY_OPS_KEYS: Record<EntityOpsTable, string[][]> = {
  hgp_equipment_units: [['hgp-equipment-units']],
  hgp_service_agreements: [['hgp-service-agreements']],
  hgp_service_visits: [['hgp-service-visits'], ['hgp-service-agreements'], ['transactions'], ['ledger-page'], ['hgp-finance-summary']],
  hgp_jobs: [['hgp-jobs'], ['hgp-outage-impacts']],
  hgp_customer_sites: [['hgp-customer-sites'], ['hgp-outage-impacts']],
  hgp_outage_events: [['hgp-outage-events'], ['hgp-outage-impacts']],
  hgp_outage_impacts: [['hgp-outage-impacts']],
  holdings_notes: [['holdings-notes']],
  holdings_capital_activity: [['holdings-capital-activity']],
  holdings_note_payments: [['holdings-note-payments'], ['holdings-notes'], ['transactions'], ['ledger-page']],
};

export function useEntityOpsUpsert(table: EntityOpsTable) {
  const qc = useQueryClient();
  const keys = ENTITY_OPS_KEYS;
  return useMutation({
    mutationFn: async (row: Record<string, unknown>) => {
      const { data, error } = await (supabase as any).from(table).upsert(row).select('*').single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => keys[table].forEach(k => qc.invalidateQueries({ queryKey: k })),
  });
}

export function useEntityOpsSoftDelete(table: EntityOpsTable) {
  const qc = useQueryClient();
  const keys = ENTITY_OPS_KEYS;
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from(table).update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => keys[table].forEach(k => qc.invalidateQueries({ queryKey: k })),
  });
}

/* Live refresh for the entity-ops tables (they're in the realtime publication
   via migration 15). Mounted by the HGP/Holdings dashboards. */
export function useEntityOpsRealtime() {
  const { ready } = useEntity();
  const qc = useQueryClient();
  useEffect(() => {
    if (!ready) return;
    const invalidate = () => {
      qc.invalidateQueries({ queryKey: ['hgp-equipment-units'] });
      qc.invalidateQueries({ queryKey: ['hgp-service-agreements'] });
      qc.invalidateQueries({ queryKey: ['hgp-service-visits'] });
      qc.invalidateQueries({ queryKey: ['holdings-notes'] });
      qc.invalidateQueries({ queryKey: ['holdings-capital-activity'] });
      qc.invalidateQueries({ queryKey: ['holdings-note-payments'] });
      qc.invalidateQueries({ queryKey: ['holdings-consolidated-totals'] });
      qc.invalidateQueries({ queryKey: ['hgp-finance-summary'] });
      qc.invalidateQueries({ queryKey: ['hgp-jobs'] });
      qc.invalidateQueries({ queryKey: ['hgp-customer-sites'] });
      qc.invalidateQueries({ queryKey: ['hgp-outage-events'] });
      qc.invalidateQueries({ queryKey: ['hgp-outage-impacts'] });
    };
    const ch = supabase.channel('entity-ops-rt');
    ['hgp_equipment_units', 'hgp_service_agreements', 'hgp_service_visits',
      'hgp_jobs', 'hgp_customer_sites', 'hgp_outage_events', 'hgp_outage_impacts',
      'holdings_notes', 'holdings_capital_activity', 'holdings_note_payments'].forEach(table => {
      ch.on('postgres_changes', { event: '*', schema: 'public', table }, invalidate);
    });
    ch.subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [ready, qc]);
}
