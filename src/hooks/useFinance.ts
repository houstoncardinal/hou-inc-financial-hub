import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ENTITIES, useEntity } from '@/contexts/EntityContext';
import { isSchemaCacheError, recordSystemHealthEvent } from '@/lib/systemHealth';

type TableName = 'vendors' | 'projects' | 'checks' | 'transactions';
type SaveMode = 'insert' | 'update';
type SaveHints = {
  __mode?: SaveMode;
  __forceInsert?: boolean;
};

const relatedQueryKeys: Record<TableName, string[][]> = {
  vendors:      [['vendors'],       ['transactions'], ['checks'], ['invoices'], ['project-financial-summary']],
  projects:     [['projects'],      ['transactions'], ['checks'], ['invoices'], ['project-financial-summary']],
  checks:       [['checks'],        ['projects'],     ['vendors'], ['project-financial-summary']],
  transactions: [['transactions'],  ['projects'],     ['vendors'], ['invoices'], ['project-financial-summary']],
};

const HOLDINGS_ENTITY_ID = 'houston-enterprise-holdings';
const CONSOLIDATED_ENTITY_IDS = ENTITIES.map(e => e.id);

const entityMetaFor = (entityId: string | null | undefined) => {
  const meta = ENTITIES.find(e => e.id === entityId);
  return {
    entity_label: meta?.shortName ?? entityId ?? 'Entity',
    entity_name: meta?.name ?? entityId ?? 'Entity',
    entity_color: meta?.color ?? '#8A8580',
  };
};

const withEntityMeta = <T extends Record<string, unknown>>(row: T): T & ReturnType<typeof entityMetaFor> => ({
  ...row,
  ...entityMetaFor(row.entity_id as string | undefined),
});

const stripJoinedRelations = <T extends Record<string, unknown>>(row: T) => {
  const { projects, vendors, subcontractors, __mode, __forceInsert, ...payload } = row;
  return payload;
};

const missingColumnFromSchemaCache = (message?: string) => {
  if (!message) return null;
  return message.match(/Could not find the '([^']+)' column/)?.[1] ?? null;
};

const CRITICAL_FINANCE_COLUMNS = new Set([
  'check_reference',
  'retainage_percent',
  'retainage_amount',
  'invoice_id',
  'cost_phase',
  'client_id',
  'total_amount',
  'net_amount',
  'posting_date',
  'receipt_status',
  'billable_status',
  'reimbursable_status',
  'expense_type',
]);

const nextUuid = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const writeWithSchemaCacheFallback = async (
  table: TableName,
  mode: 'insert' | 'update',
  payload: Record<string, unknown>,
  id?: string,
) => {
  let current = { ...payload };
  if (mode === 'insert' && !current.id) current.id = nextUuid();

  for (let attempt = 0; attempt < 8; attempt++) {
    const result = mode === 'update'
      ? await supabase.from(table).update(current).eq('id', id)
      : await supabase.from(table).insert(current);

    if (!result.error) {
      const recordId = (mode === 'update' ? id : current.id) as string | undefined;
      if (!recordId) return current;
      const verify = await supabase.from(table).select('*').eq('id', recordId).maybeSingle();
      if (verify.error) {
        throw new Error(`Saved ${table}, but verification failed: ${verify.error.message}`);
      }
      if (!verify.data) {
        throw new Error(`Save reached ${table}, but the saved row is hidden from the current session. Confirm you are signed in as the same user, the active entity is correct, and reload the app after the latest RLS migration.`);
      }
      return verify.data;
    }

    const missing = missingColumnFromSchemaCache(result.error.message);
    if (!missing || !(missing in current)) {
      recordSystemHealthEvent({
        area: `finance:${table}:write`,
        severity: isSchemaCacheError(result.error.message) ? 'critical' : 'error',
        message: result.error.message,
        details: { mode, attempt, payloadKeys: Object.keys(current) },
      });
      throw result.error;
    }
    if (CRITICAL_FINANCE_COLUMNS.has(missing)) {
      recordSystemHealthEvent({
        area: `finance:${table}:schema`,
        severity: 'critical',
        message: `Missing required finance column "${missing}"`,
        details: { mode, attempt },
      });
      throw new Error(`Database is missing required finance column "${missing}". Run supabase/migrations/20260715000002_finance_logging_repair.sql, then reload the app.`);
    }

    const { [missing]: _ignored, ...next } = current;
    current = next;
  }

  throw new Error('Could not save because the database schema cache rejected multiple columns.');
};

export const useFinanceBankAccounts = () => {
  const { entity, ready } = useEntity();
  const entityId = entity?.id ?? 'houston-enterprise';
  return useQuery({
    queryKey: ['finance-bank-accounts', entityId],
    enabled: ready,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('finance_bank_accounts')
        .select('*')
        .eq('entity_id', entityId)
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('account_name', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
};

export const useFinanceCostCodes = () => {
  const { entity, ready } = useEntity();
  const entityId = entity?.id ?? 'houston-enterprise';
  return useQuery({
    queryKey: ['finance-cost-codes', entityId],
    enabled: ready,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('finance_cost_codes')
        .select('*, finance_construction_divisions(name, code)')
        .eq('entity_id', entityId)
        .eq('is_active', true)
        .order('code', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
};

export const useFinanceDivisions = () => {
  const { entity, ready } = useEntity();
  const entityId = entity?.id ?? 'houston-enterprise';
  return useQuery({
    queryKey: ['finance-construction-divisions', entityId],
    enabled: ready,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('finance_construction_divisions')
        .select('*')
        .eq('entity_id', entityId)
        .eq('is_active', true)
        .order('code', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
};

export const useFinanceProjectPhases = (projectId?: string) => {
  const { entity, ready } = useEntity();
  const entityId = entity?.id ?? 'houston-enterprise';
  return useQuery({
    queryKey: ['finance-project-phases', entityId, projectId ?? 'all'],
    enabled: ready,
    queryFn: async () => {
      let query = supabase
        .from('finance_project_phases')
        .select('*')
        .eq('entity_id', entityId)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });
      if (projectId) query = query.eq('project_id', projectId);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });
};

export const useCreateTransactionAllocations = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { entity, ready } = useEntity();
  const entityId = entity?.id ?? 'houston-enterprise';

  return useMutation({
    mutationFn: async ({ transactionId, allocations }: { transactionId: string; allocations: Record<string, unknown>[] }) => {
      if (!ready) throw new Error('Entity context not ready — please wait a moment and try again');
      if (!user?.id) throw new Error('You must be signed in to save allocations');
      const cleaned = allocations
        .map(a => ({ ...a, transaction_id: transactionId, user_id: user.id, entity_id: entityId }))
        .filter(a => Number(a.allocated_amount ?? 0) > 0);
      if (!cleaned.length) return [];
      const { data, error } = await supabase
        .from('finance_transaction_allocations')
        .insert(cleaned)
        .select('*');
      if (error) throw error;
      return data ?? [];
    },
    onSuccess: () => {
      [['transactions'], ['project-financial-summary'], ['finance-allocations']].forEach(k => qc.invalidateQueries({ queryKey: k }));
    },
  });
};

// ── Query hooks ───────────────────────────────────────────────────────────────

export const useVendors = () => {
  const { entity, ready } = useEntity();
  const entityId = entity?.id ?? 'houston-enterprise';
  return useQuery({
    queryKey: ['vendors', entityId],
    enabled: ready,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('entity_id', entityId)
        .is('deleted_at', null)
        .order('name', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
};

export const useFinanceRealtime = () => {
  const { entity, ready } = useEntity();
  const qc = useQueryClient();
  const entityId = entity?.id;

  useEffect(() => {
    if (!ready || !entityId) return;

    const invalidateFinance = () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['checks'] });
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['vendors'] });
      qc.invalidateQueries({ queryKey: ['finance-client-accounts'] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['project-financial-summary'] });
      qc.invalidateQueries({ queryKey: ['finance-reconciliation-audit'] });
      qc.invalidateQueries({ queryKey: ['finance-bank-activity'] });
      qc.invalidateQueries({ queryKey: ['finance-bank-match-suggestions'] });
      qc.invalidateQueries({ queryKey: ['finance-control-summary'] });
      qc.invalidateQueries({ queryKey: ['finance-aging-summary'] });
      qc.invalidateQueries({ queryKey: ['finance-commitments'] });
      qc.invalidateQueries({ queryKey: ['ledger-page'] });
      qc.invalidateQueries({ queryKey: ['system-health-events'] });
      qc.invalidateQueries({ queryKey: ['hgp-finance-summary'] });
      qc.invalidateQueries({ queryKey: ['holdings-consolidated-totals'] });
    };

    const channel = supabase
      .channel(`finance-realtime-${entityId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `entity_id=eq.${entityId}` }, invalidateFinance)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'checks', filter: `entity_id=eq.${entityId}` }, invalidateFinance)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects', filter: `entity_id=eq.${entityId}` }, invalidateFinance)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendors', filter: `entity_id=eq.${entityId}` }, invalidateFinance)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'finance_client_accounts', filter: `entity_id=eq.${entityId}` }, invalidateFinance)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices', filter: `entity_id=eq.${entityId}` }, invalidateFinance)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'finance_reconciliation_audit', filter: `entity_id=eq.${entityId}` }, invalidateFinance)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'finance_bank_activity', filter: `entity_id=eq.${entityId}` }, invalidateFinance)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'finance_bank_match_suggestions', filter: `entity_id=eq.${entityId}` }, invalidateFinance)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'finance_commitments', filter: `entity_id=eq.${entityId}` }, invalidateFinance)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_health_events', filter: `entity_id=eq.${entityId}` }, invalidateFinance)
      .subscribe(status => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          recordSystemHealthEvent({
            area: 'finance:realtime',
            severity: 'warning',
            entityId,
            message: `Finance realtime subscription ${status.toLowerCase().replace('_', ' ')}`,
            details: { channel: `finance-realtime-${entityId}` },
          });
        }
      });

    return () => { supabase.removeChannel(channel); };
  }, [ready, entityId, qc]);
};

export const useLedgerPage = ({
  page,
  pageSize,
  search,
  projectId,
  type,
}: {
  page: number;
  pageSize: number;
  search?: string;
  projectId?: string;
  type?: string;
}) => {
  const { entity, ready } = useEntity();
  const entityId = entity?.id ?? 'houston-enterprise';
  const consolidated = entityId === HOLDINGS_ENTITY_ID;
  return useQuery({
    queryKey: ['ledger-page', entityId, page, pageSize, search ?? '', projectId ?? 'all', type ?? 'all'],
    enabled: ready,
    queryFn: async () => {
      if (consolidated) {
        const perEntity = await Promise.all(CONSOLIDATED_ENTITY_IDS.map(async id => {
          const { data, error } = await supabase.rpc('get_ledger_page' as never, {
            p_entity_id: id,
            p_limit: 500,
            p_offset: 0,
            p_search: search?.trim() || null,
            p_project_id: projectId && projectId !== 'all' ? projectId : null,
            p_type: type && type !== 'all' ? type : null,
          });
          if (error) throw error;
          return ((data ?? []) as Record<string, unknown>[]).map(row => withEntityMeta({ ...row, entity_id: id }));
        }));
        const merged = perEntity
          .flat()
          .sort((a: Record<string, unknown>, b: Record<string, unknown>) =>
            String(b.ledger_date || '').localeCompare(String(a.ledger_date || '')));
        const offset = Math.max(0, (page - 1) * pageSize);
        return merged.slice(offset, offset + pageSize).map(row => ({ ...row, total_count: merged.length }));
      }
      const { data, error } = await supabase.rpc('get_ledger_page' as never, {
        p_entity_id: entityId,
        p_limit: pageSize,
        p_offset: Math.max(0, (page - 1) * pageSize),
        p_search: search?.trim() || null,
        p_project_id: projectId && projectId !== 'all' ? projectId : null,
        p_type: type && type !== 'all' ? type : null,
      });
      if (error) throw error;
      return data ?? [];
    },
  });
};

export const useFinanceControlSummary = () => {
  const { entity, ready } = useEntity();
  const entityId = entity?.id ?? 'houston-enterprise';
  return useQuery({
    queryKey: ['finance-control-summary', entityId],
    enabled: ready,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_finance_control_summary' as never, { p_entity_id: entityId });
      if (error) throw error;
      return data ?? [];
    },
  });
};

export const useFinanceAgingSummary = () => {
  const { entity, ready } = useEntity();
  const entityId = entity?.id ?? 'houston-enterprise';
  return useQuery({
    queryKey: ['finance-aging-summary', entityId],
    enabled: ready,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_finance_aging_summary' as never, { p_entity_id: entityId });
      if (error) throw error;
      return data ?? [];
    },
  });
};

export const useFinanceCommitments = () => {
  const { entity, ready } = useEntity();
  const entityId = entity?.id ?? 'houston-enterprise';
  return useQuery({
    queryKey: ['finance-commitments', entityId],
    enabled: ready,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('finance_commitments' as never)
        .select('*, projects:project_id(name), vendors:vendor_id(name)')
        .eq('entity_id', entityId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
};

/** EAC-based WIP reconciliation (percent-complete/earned-revenue/over-under-billed
    from the PM's Cost-to-Complete forecast) — additive alongside the
    cost-ratio-based useFinanceControlSummary() above, not a replacement. */
export const useWipReconciliation = () => {
  const { entity, ready } = useEntity();
  const entityId = entity?.id ?? 'houston-enterprise';
  return useQuery({
    queryKey: ['wip-reconciliation', entityId],
    enabled: ready,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_wip_reconciliation' as never, { p_entity_id: entityId });
      if (error) throw error;
      return data ?? [];
    },
  });
};

export const useCreateCommitmentLine = () => {
  const qc = useQueryClient();
  const { entity } = useEntity();
  const entityId = entity?.id ?? 'houston-enterprise';
  return useMutation({
    mutationFn: async (line: { commitment_id: string; cost_code_id: string; description?: string; unit_price: number; quantity: number }) => {
      const { error } = await supabase.from('finance_commitment_lines' as never).insert(line as never);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance-commitments', entityId] });
      qc.invalidateQueries({ queryKey: ['finance-commitment-lines'] });
    },
  });
};

export const useFinanceCommitmentLines = (commitmentId: string | null) => {
  return useQuery({
    queryKey: ['finance-commitment-lines', commitmentId],
    enabled: !!commitmentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('finance_commitment_lines' as never)
        .select('*, finance_cost_codes:cost_code_id(code, name)')
        .eq('commitment_id', commitmentId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
};

export const useBankMatchSuggestions = () => {
  const { entity, ready } = useEntity();
  const entityId = entity?.id ?? 'houston-enterprise';
  return useQuery({
    queryKey: ['finance-bank-match-suggestions', entityId],
    enabled: ready,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('finance_bank_match_suggestions' as never)
        .select('*, finance_bank_activity:bank_activity_id(*)')
        .eq('entity_id', entityId)
        .eq('status', 'suggested')
        .order('confidence', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
};

export const useFixedAssets = () => {
  const { entity, ready } = useEntity();
  const entityId = entity?.id ?? 'houston-enterprise';
  return useQuery({
    queryKey: ['fixed-assets-register', entityId],
    enabled: ready,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_fixed_assets_register' as never, { p_entity_id: entityId });
      if (error) throw error;
      return data ?? [];
    },
  });
};

export const useUpsertFixedAsset = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { entity, ready } = useEntity();
  const entityId = entity?.id ?? 'houston-enterprise';
  return useMutation({
    mutationFn: async (row: Record<string, unknown>) => {
      if (!ready) throw new Error('Entity context not ready — please wait a moment and try again');
      if (!user?.id) throw new Error('You must be signed in to save fixed assets');
      const payload = { ...row, user_id: user.id, entity_id: entityId };
      const { data, error } = row.id
        ? await supabase.from('fixed_assets' as never).update(payload as never).eq('id', row.id as string).select('*').single()
        : await supabase.from('fixed_assets' as never).insert(payload as never).select('*').single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fixed-assets-register'] }),
  });
};

export const useSoftDeleteFixedAsset = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('fixed_assets' as never).update({ deleted_at: new Date().toISOString() } as never).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fixed-assets-register'] }),
  });
};

export const useAccountingPeriods = () => {
  const { entity, ready } = useEntity();
  const entityId = entity?.id ?? 'houston-enterprise';
  return useQuery({
    queryKey: ['accounting-periods', entityId],
    enabled: ready,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounting_periods' as never)
        .select('*')
        .eq('entity_id', entityId)
        .order('period_key', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
};

export const useSetAccountingPeriodStatus = () => {
  const qc = useQueryClient();
  const { entity } = useEntity();
  const entityId = entity?.id ?? 'houston-enterprise';
  return useMutation({
    mutationFn: async ({ periodKey, status, notes }: { periodKey: string; status: 'open' | 'soft_closed' | 'locked'; notes?: string }) => {
      const { data, error } = await supabase.rpc('set_accounting_period_status' as never, {
        p_entity_id: entityId, p_period_key: periodKey, p_status: status, p_notes: notes ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounting-periods'] });
      qc.invalidateQueries({ queryKey: ['finance-reconciliation-audit'] });
    },
  });
};

export const useProjects = () => {
  const { entity, ready } = useEntity();
  const entityId = entity?.id ?? 'houston-enterprise';
  return useQuery({
    queryKey: ['projects', entityId],
    enabled: ready,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('entity_id', entityId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
};

export const useChecks = () => {
  const { entity, ready } = useEntity();
  const entityId = entity?.id ?? 'houston-enterprise';
  const consolidated = entityId === HOLDINGS_ENTITY_ID;
  return useQuery({
    queryKey: ['checks', entityId],
    enabled: ready,
    queryFn: async () => {
      let query = supabase
        .from('checks')
        .select('*, projects:project_id(name), vendors:payee_vendor_id(name)')
        .is('deleted_at', null)
        .order('issue_date', { ascending: false });
      query = consolidated ? query.in('entity_id', CONSOLIDATED_ENTITY_IDS) : query.eq('entity_id', entityId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map(withEntityMeta);
    },
  });
};

export const useTransactions = (type?: 'income' | 'expense') => {
  const { entity, ready } = useEntity();
  const entityId = entity?.id ?? 'houston-enterprise';
  const consolidated = entityId === HOLDINGS_ENTITY_ID;
  return useQuery({
    queryKey: ['transactions', type, entityId],
    enabled: ready,
    queryFn: async () => {
      let query = supabase
        .from('transactions')
        .select('*, projects:project_id(name), vendors:vendor_id(name), subcontractors:subcontractor_id(name), finance_client_accounts:finance_client_id(name, company)')
        .is('deleted_at', null)
        .order('transaction_date', { ascending: false });
      query = consolidated ? query.in('entity_id', CONSOLIDATED_ENTITY_IDS) : query.eq('entity_id', entityId);
      if (type) query = query.eq('type', type);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map(withEntityMeta);
    },
  });
};

export const useFinanceClientAccounts = () => {
  const { entity, ready } = useEntity();
  const entityId = entity?.id ?? 'houston-enterprise';
  return useQuery({
    queryKey: ['finance-client-accounts', entityId],
    enabled: ready,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('finance_client_accounts' as never)
        .select('*, projects:project_id(name), hgp_customer_sites:hgp_site_id(customer_name, site_address, utility_provider)')
        .eq('entity_id', entityId)
        .is('deleted_at', null)
        .order('name', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
};

// ── Mutation hooks ────────────────────────────────────────────────────────────

export const useUpsert = <T extends { id?: string } & SaveHints>(
  table: TableName,
  invalidate: string[][],
) => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { entity, ready } = useEntity();
  const entityId = entity?.id ?? 'houston-enterprise';

  return useMutation({
    mutationFn: async (row: T) => {
      if (!ready) throw new Error('Entity context not ready — please wait a moment and try again');
      if (!user?.id) throw new Error('You must be signed in to save finance records');
      const payload = stripJoinedRelations(row as Record<string, unknown>);
      const requestedMode: SaveMode | undefined = row.__forceInsert ? 'insert' : row.__mode;
      if (requestedMode === 'insert') {
        return await writeWithSchemaCacheFallback(table, 'insert', { ...payload, user_id: user.id, entity_id: entityId });
      }
      if (requestedMode === 'update' || row.id) {
        return await writeWithSchemaCacheFallback(table, 'update', payload, row.id);
      }
      return await writeWithSchemaCacheFallback(table, 'insert', { ...payload, user_id: user.id, entity_id: entityId });
    },
    onSuccess: () => {
      // Invalidate all variants — queryKey prefix match covers all entity buckets
      const keys = [...invalidate, ...relatedQueryKeys[table]];
      keys.forEach(k => qc.invalidateQueries({ queryKey: k }));
    },
  });
};

export const useDelete = (table: TableName, invalidate: string[][]) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from(table)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      const keys = [...invalidate, ...relatedQueryKeys[table]];
      keys.forEach(k => qc.invalidateQueries({ queryKey: k }));
    },
  });
};

export const useQuickCreate = (table: 'vendors' | 'projects') => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { entity, ready } = useEntity();
  const entityId = entity?.id ?? 'houston-enterprise';

  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      if (!ready) throw new Error('Entity context not ready — please wait a moment and try again');
      const { data: created, error } = await supabase
        .from(table)
        .insert({ ...data, user_id: user!.id, entity_id: entityId })
        .select()
        .single();
      if (error) throw error;
      return created;
    },
    onSuccess: () => {
      relatedQueryKeys[table].forEach(k => qc.invalidateQueries({ queryKey: k }));
    },
  });
};
