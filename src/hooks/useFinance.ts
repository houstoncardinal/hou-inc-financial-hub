import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEntity } from '@/contexts/EntityContext';

type TableName = 'vendors' | 'projects' | 'checks' | 'transactions';

const relatedQueryKeys: Record<TableName, string[][]> = {
  vendors:      [['vendors'],       ['transactions'], ['checks']],
  projects:     [['projects'],      ['transactions'], ['checks']],
  checks:       [['checks'],        ['projects'],     ['vendors']],
  transactions: [['transactions'],  ['projects'],     ['vendors']],
};

const stripJoinedRelations = <T extends Record<string, unknown>>(row: T) => {
  const { projects, vendors, ...payload } = row;
  return payload;
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
  return useQuery({
    queryKey: ['checks', entityId],
    enabled: ready,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checks')
        .select('*, projects(name), vendors(name)')
        .eq('entity_id', entityId)
        .is('deleted_at', null)
        .order('issue_date', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
};

export const useTransactions = (type?: 'income' | 'expense') => {
  const { entity, ready } = useEntity();
  const entityId = entity?.id ?? 'houston-enterprise';
  return useQuery({
    queryKey: ['transactions', type, entityId],
    enabled: ready,
    queryFn: async () => {
      let query = supabase
        .from('transactions')
        .select('*, projects(name), vendors(name)')
        .eq('entity_id', entityId)
        .is('deleted_at', null)
        .order('transaction_date', { ascending: false });
      if (type) query = query.eq('type', type);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });
};

// ── Mutation hooks ────────────────────────────────────────────────────────────

export const useUpsert = <T extends { id?: string }>(
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
      const payload = stripJoinedRelations(row as Record<string, unknown>);
      if (row.id) {
        const { error } = await supabase.from(table).update(payload).eq('id', row.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from(table)
          .insert({ ...payload, user_id: user!.id, entity_id: entityId });
        if (error) throw error;
      }
    },
    onSuccess: async () => {
      // Invalidate all variants — queryKey prefix match covers all entity buckets
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
    onSuccess: async () => {
      await Promise.all(relatedQueryKeys[table].map(k => qc.invalidateQueries({ queryKey: k })));
    },
  });
};
