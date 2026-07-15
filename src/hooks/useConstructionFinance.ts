import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEntity } from '@/contexts/EntityContext';

export interface ProjectFinancialSummary {
  project_id: string;
  original_contract_value: number;
  approved_change_orders: number;
  current_contract_value: number;
  total_invoiced: number;
  total_collected: number;
  retainage_withheld: number;
  retainage_released: number;
  accounts_receivable: number;
  unbilled_contract_amount: number;
  committed_project_costs: number;
  actual_project_costs: number;
  paid_costs: number;
  unpaid_costs: number;
  outstanding_checks: number;
  remaining_budget: number;
  estimated_cost_to_complete: number;
  estimated_final_cost: number;
  estimated_gross_profit: number;
  estimated_gross_margin: number;
  actual_gross_profit: number;
  actual_gross_margin: number;
  percentage_billed: number;
  percentage_collected: number;
  cash_position: number;
  projects_over_budget: boolean;
}

export interface TransactionAllocation {
  id: string;
  transaction_id: string;
  allocation_type: string;
  project_id: string | null;
  invoice_id: string | null;
  sov_item_id: string | null;
  milestone_id: string | null;
  change_order_id: string | null;
  cost_code_id: string | null;
  phase_id: string | null;
  division_id: string | null;
  allocated_amount: number;
  allocation_percentage: number | null;
  retainage_amount: number;
  tax_amount: number;
  markup_amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type AllocationPayload = Partial<TransactionAllocation> & {
  transaction_id: string;
  allocation_type: string;
  allocated_amount: number;
};

export function useEnsureAccountingConfig() {
  const { entity } = useEntity();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!entity) throw new Error('Select an entity first');
      const { data, error } = await (supabase as any).rpc('ensure_default_accounting_config', {
        p_entity_id: entity.id,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['construction-finance-config'] });
      qc.invalidateQueries({ queryKey: ['chart-accounts'] });
      qc.invalidateQueries({ queryKey: ['finance-categories'] });
    },
  });
}

export function useProjectFinancialSummary(projectId?: string | null) {
  const qc = useQueryClient();
  const { entity } = useEntity();

  const query = useQuery({
    queryKey: ['project-financial-summary', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('get_project_financial_summary', {
        p_project_id: projectId,
      });
      if (error) {
        // Keeps legacy project detail usable before the migration has been applied.
        if (error.message?.includes('get_project_financial_summary')) return null;
        throw error;
      }
      const row = Array.isArray(data) ? data[0] : data;
      return (row ?? null) as ProjectFinancialSummary | null;
    },
  });

  useEffect(() => {
    if (!projectId || !entity) return;
    const channel = supabase
      .channel(`project-finance-${projectId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `project_id=eq.${projectId}` }, () => {
        qc.invalidateQueries({ queryKey: ['project-financial-summary', projectId] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'checks', filter: `project_id=eq.${projectId}` }, () => {
        qc.invalidateQueries({ queryKey: ['project-financial-summary', projectId] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices', filter: `project_id=eq.${projectId}` }, () => {
        qc.invalidateQueries({ queryKey: ['project-financial-summary', projectId] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'finance_transaction_allocations', filter: `project_id=eq.${projectId}` }, () => {
        qc.invalidateQueries({ queryKey: ['project-financial-summary', projectId] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, entity?.id, qc]);

  return query;
}

export function useTransactionAllocations(transactionId?: string | null) {
  return useQuery({
    queryKey: ['transaction-allocations', transactionId],
    enabled: !!transactionId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('finance_transaction_allocations')
        .select('*')
        .eq('transaction_id', transactionId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as TransactionAllocation[];
    },
  });
}

export function useUpsertTransactionAllocation() {
  const { user } = useAuth();
  const { entity } = useEntity();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AllocationPayload) => {
      if (!user || !entity) throw new Error('Not authenticated');
      const row = {
        ...payload,
        user_id: user.id,
        entity_id: entity.id,
        updated_at: new Date().toISOString(),
      };

      const query = payload.id
        ? (supabase as any).from('finance_transaction_allocations').update(row).eq('id', payload.id).select().single()
        : (supabase as any).from('finance_transaction_allocations').insert(row).select().single();

      const { data, error } = await query;
      if (error) throw error;
      return data as TransactionAllocation;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ['transaction-allocations', row.transaction_id] });
      qc.invalidateQueries({ queryKey: ['project-financial-summary', row.project_id] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

export function usePostTransactionToLedger() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (transactionId: string) => {
      const { data, error } = await (supabase as any).rpc('post_transaction_to_ledger', {
        p_transaction_id: transactionId,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['journal-entries'] });
      qc.invalidateQueries({ queryKey: ['project-financial-summary'] });
    },
  });
}

export function usePostCheckToLedger() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (checkId: string) => {
      const { data, error } = await (supabase as any).rpc('post_check_to_ledger', {
        p_check_id: checkId,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['journal-entries'] });
      qc.invalidateQueries({ queryKey: ['project-financial-summary'] });
    },
  });
}
