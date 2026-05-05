import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const relatedQueryKeys: Record<'vendors' | 'projects' | 'checks' | 'transactions', string[][]> = {
  vendors: [['vendors'], ['transactions'], ['checks']],
  projects: [['projects'], ['transactions'], ['checks']],
  checks: [['checks'], ['projects'], ['vendors']],
  transactions: [['transactions'], ['projects'], ['vendors']],
};

const stripJoinedRelations = <T extends Record<string, unknown>>(row: T) => {
  const { projects, vendors, ...payload } = row;
  return payload;
};

export const useVendors = () => useQuery({
  queryKey: ['vendors'],
  queryFn: async () => {
    const { data, error } = await supabase.from('vendors').select('*').order('name');
    if (error) throw error; return data;
  },
});

export const useProjects = () => useQuery({
  queryKey: ['projects'],
  queryFn: async () => {
    const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
    if (error) throw error; return data;
  },
});

export const useChecks = () => useQuery({
  queryKey: ['checks'],
  queryFn: async () => {
    const { data, error } = await supabase.from('checks').select('*, projects(name), vendors(name)').order('issue_date', { ascending: false });
    if (error) throw error; return data;
  },
});

export const useTransactions = (type?: 'income' | 'expense') => useQuery({
  queryKey: ['transactions', type],
  queryFn: async () => {
    let q = supabase.from('transactions').select('*, projects(name), vendors(name)').order('transaction_date', { ascending: false });
    if (type) q = q.eq('type', type);
    const { data, error } = await q;
    if (error) throw error; return data;
  },
});

export const useUpsert = <T extends { id?: string }>(table: 'vendors' | 'projects' | 'checks' | 'transactions', invalidate: string[][]) => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (row: T) => {
      if (!user) throw new Error('You must be signed in to save changes');
      const payload = { ...stripJoinedRelations(row as Record<string, unknown>), user_id: user.id } as never;
      if (row.id) {
        const { error } = await supabase.from(table).update(payload).eq('id', row.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(table).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: async () => {
      const keys = [...invalidate, ...relatedQueryKeys[table]];
      await Promise.all(keys.map(k => qc.invalidateQueries({ queryKey: k })));
    },
  });
};

export const useDelete = (table: 'vendors' | 'projects' | 'checks' | 'transactions', invalidate: string[][]) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq('id', id);
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
      if (!user) throw new Error('You must be signed in to save changes');
      const { data: result, error } = await supabase
        .from(table)
        .insert({ ...data, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return result as { id: string; name: string; [key: string]: unknown };
    },
    onSuccess: async () => {
      await Promise.all(relatedQueryKeys[table].map(k => qc.invalidateQueries({ queryKey: k })));
    },
  });
};
