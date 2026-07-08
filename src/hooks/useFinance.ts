import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

type TableName = 'vendors' | 'projects' | 'checks' | 'transactions';

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
  queryFn: async () => {
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .is('deleted_at', null)
      .order('name', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },
});

export const useProjects = () => useQuery({
  queryKey: ['projects'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
});

export const useChecks = () => useQuery({
  queryKey: ['checks'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('checks')
      .select('*, projects(name), vendors(name)')
      .is('deleted_at', null)
      .order('issue_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
});

export const useTransactions = (type?: 'income' | 'expense') => useQuery({
  queryKey: ['transactions', type],
  queryFn: async () => {
    let query = supabase
      .from('transactions')
      .select('*, projects(name), vendors(name)')
      .is('deleted_at', null)
      .order('transaction_date', { ascending: false });
    if (type) query = query.eq('type', type);
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
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
      const payload = stripJoinedRelations(row as Record<string, unknown>);
      if (row.id) {
        const { error } = await supabase.from(table).update(payload).eq('id', row.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(table).insert({ ...payload, user_id: user!.id });
        if (error) throw error;
      }
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
      const { error } = await supabase
        .from(table)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
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
      const { data: created, error } = await supabase
        .from(table)
        .insert({ ...data, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return created;
    },
    onSuccess: async () => {
      await Promise.all(relatedQueryKeys[table].map(k => qc.invalidateQueries({ queryKey: k })));
    },
  });
};
