import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';

// ── Storage keys ──────────────────────────────────────────────────────────────
const STORE = {
  vendors:      'hou-vendors',
  projects:     'hou-projects',
  checks:       'hou-checks',
  transactions: 'hou-transactions',
} as const;

type TableName = keyof typeof STORE;

function load<T>(key: string): T[] {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); }
  catch { return []; }
}
function save<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

// ── Query invalidation map ─────────────────────────────────────────────────────
const relatedQueryKeys: Record<TableName, string[][]> = {
  vendors:      [['vendors'],  ['transactions'], ['checks']],
  projects:     [['projects'], ['transactions'], ['checks']],
  checks:       [['checks'],   ['projects'],     ['vendors']],
  transactions: [['transactions'], ['projects'], ['vendors']],
};

const stripJoinedRelations = <T extends Record<string, unknown>>(row: T) => {
  const { projects, vendors, ...payload } = row;
  return payload;
};

// ── Query hooks ───────────────────────────────────────────────────────────────

export const useVendors = () => useQuery({
  queryKey: ['vendors'],
  queryFn: () =>
    load<any>(STORE.vendors).sort((a: any, b: any) => (a.name || '').localeCompare(b.name || '')),
});

export const useProjects = () => useQuery({
  queryKey: ['projects'],
  queryFn: () =>
    load<any>(STORE.projects).sort((a: any, b: any) =>
      (b.created_at || '').localeCompare(a.created_at || '')),
});

export const useChecks = () => useQuery({
  queryKey: ['checks'],
  queryFn: () => {
    const checks   = load<any>(STORE.checks);
    const projects = load<any>(STORE.projects);
    const vendors  = load<any>(STORE.vendors);
    return checks
      .map((c: any) => ({
        ...c,
        projects: projects.find((p: any) => p.id === c.project_id)
          ? { name: projects.find((p: any) => p.id === c.project_id).name }
          : null,
        vendors: vendors.find((v: any) => v.id === c.payee_vendor_id)
          ? { name: vendors.find((v: any) => v.id === c.payee_vendor_id).name }
          : null,
      }))
      .sort((a: any, b: any) => (b.issue_date || '').localeCompare(a.issue_date || ''));
  },
});

export const useTransactions = (type?: 'income' | 'expense') => useQuery({
  queryKey: ['transactions', type],
  queryFn: () => {
    const txns     = load<any>(STORE.transactions);
    const projects = load<any>(STORE.projects);
    const vendors  = load<any>(STORE.vendors);
    return txns
      .filter((t: any) => !type || t.type === type)
      .map((t: any) => ({
        ...t,
        projects: projects.find((p: any) => p.id === t.project_id)
          ? { name: projects.find((p: any) => p.id === t.project_id).name }
          : null,
        vendors: vendors.find((v: any) => v.id === t.vendor_id)
          ? { name: vendors.find((v: any) => v.id === t.vendor_id).name }
          : null,
      }))
      .sort((a: any, b: any) =>
        (b.transaction_date || '').localeCompare(a.transaction_date || ''));
  },
});

// ── Mutation hooks ────────────────────────────────────────────────────────────

export const useUpsert = <T extends { id?: string }>(
  table: TableName,
  invalidate: string[][],
) => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (row: T) => {
      const payload = {
        ...stripJoinedRelations(row as Record<string, unknown>),
        user_id: user.id,
        updated_at: new Date().toISOString(),
      } as any;
      const items = load<any>(STORE[table]);
      if (row.id) {
        const idx = items.findIndex((i: any) => i.id === row.id);
        if (idx >= 0) items[idx] = { ...items[idx], ...payload };
        else items.unshift({ ...payload, created_at: new Date().toISOString() });
      } else {
        items.unshift({ ...payload, id: crypto.randomUUID(), created_at: new Date().toISOString() });
      }
      save(STORE[table], items);
    },
    onSuccess: async () => {
      const keys = [...invalidate, ...relatedQueryKeys[table]];
      await Promise.all(keys.map(k => qc.invalidateQueries({ queryKey: k })));
    },
  });
};

export const useDelete = (table: TableName, invalidate: string[][]) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const items = load<any>(STORE[table]).filter((i: any) => i.id !== id);
      save(STORE[table], items);
    },
    onSuccess: async () => {
      const keys = [...invalidate, ...relatedQueryKeys[table]];
      await Promise.all(keys.map(k => qc.invalidateQueries({ queryKey: k })));
    },
  });
};

export const useQuickCreate = (table: 'vendors' | 'projects') => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const now = new Date().toISOString();
      const record = {
        ...data,
        user_id: user.id,
        id: crypto.randomUUID(),
        created_at: now,
        updated_at: now,
      } as unknown as { id: string; name: string; [key: string]: unknown };
      const items = load<any>(STORE[table]);
      items.unshift(record);
      save(STORE[table], items);
      return record;
    },
    onSuccess: async () => {
      await Promise.all(relatedQueryKeys[table].map(k => qc.invalidateQueries({ queryKey: k })));
    },
  });
};
