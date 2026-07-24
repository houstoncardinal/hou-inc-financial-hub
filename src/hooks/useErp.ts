/* ── ERP core hooks — employees/payroll, estimates, workflow items,
   equipment, purchase orders, recurring obligations, cash-flow forecast,
   and the executive snapshot. New tables from
   supabase/migrations/20260722000001_erp_core_expansion.sql are not yet in
   the generated Database types, so queries follow the repo's established
   `(supabase as any)` convention (see admin_changelog / admin_projects). ── */
import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEntity } from '@/contexts/EntityContext';

const sb = supabase as any;

/* ── Types ── */
export interface ExecutiveInsight {
  severity: 'critical' | 'warning' | 'info' | 'good';
  kind: string;
  title: string;
  detail: string;
  action: string;
}

export interface ExecutiveSnapshot {
  as_of: string;
  cash_on_hand: number;
  revenue_today: number;
  revenue_wtd: number;
  revenue_mtd: number;
  expenses_mtd: number;
  net_mtd: number;
  ar_open: number;
  ar_overdue: number;
  ap_open: number;
  payroll_due: number;
  next_payroll_date: string | null;
  active_projects: number;
  delayed_projects: number;
  backlog_value: number;
  pending_change_orders: number;
  pending_change_order_value: number;
  pending_estimates: number;
  pending_estimate_value: number;
  retainage_held: number;
  retainage_receivable: number;
  burn_rate_monthly: number;
  runway_months: number | null;
  open_rfis: number;
  open_punch_items: number;
  failed_inspections: number;
  overdue_workflow_items: number;
  upcoming_milestones: { project: string; title: string; target_date: string }[];
  insights: ExecutiveInsight[];
}

export interface ForecastRow {
  day: string;
  inflow: number;
  outflow: number;
  net: number;
  running_balance: number;
  detail: { ar: number; checks: number; payroll: number; recurring: number };
}

export interface Employee {
  id: string;
  name: string;
  title: string | null;
  trade: string | null;
  employment_type: 'w2_hourly' | 'w2_salary' | 'contractor_1099';
  pay_rate: number;
  pay_cadence: 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';
  burden_pct: number;
  status: 'active' | 'inactive';
  hire_date: string | null;
  phone: string | null;
  email: string | null;
  certifications: string[];
  notes: string | null;
}

export interface PayrollRun {
  id: string;
  period_start: string;
  period_end: string;
  pay_date: string;
  status: 'draft' | 'approved' | 'paid';
  paid_at: string | null;
  notes: string | null;
  finance_payroll_items?: PayrollItem[];
}

export interface PayrollItem {
  id: string;
  payroll_run_id: string;
  employee_id: string;
  project_id: string | null;
  cost_code_id: string | null;
  hours: number;
  rate: number;
  gross_amount: number;
  burden_amount: number;
  memo: string | null;
}

export interface Estimate {
  id: string;
  estimate_number: string;
  title: string;
  project_type: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted';
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  property_address: string | null;
  markup_pct: number;
  overhead_pct: number;
  contingency_pct: number;
  tax_pct: number;
  permit_allowance: number;
  valid_until: string | null;
  notes: string | null;
  converted_project_id: string | null;
  created_at: string;
  finance_estimate_lines?: EstimateLine[];
}

export interface EstimateLine {
  id: string;
  estimate_id: string;
  trade: string;
  description: string;
  quantity: number;
  unit: string;
  unit_material_cost: number;
  unit_labor_cost: number;
  unit_equipment_cost: number;
  waste_pct: number;
  cost_code_id: string | null;
  sort_order: number;
}

export interface WorkflowItem {
  id: string;
  project_id: string;
  item_type: 'task' | 'rfi' | 'submittal' | 'punch_item' | 'inspection' | 'warranty_claim';
  title: string;
  description: string | null;
  status: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
  assignee_employee_id: string | null;
  assignee_name: string | null;
  ball_in_court: string | null;
  location: string | null;
  due_date: string | null;
  response: string | null;
  responded_at: string | null;
  closed_at: string | null;
  created_at: string;
}

export interface EquipmentUnit {
  id: string;
  name: string;
  category: string;
  identifier: string | null;
  status: 'available' | 'checked_out' | 'maintenance' | 'retired';
  current_project_id: string | null;
  assigned_employee_id: string | null;
  hourly_cost_rate: number;
  purchase_date: string | null;
  purchase_price: number;
  hours_used: number;
  next_service_due: string | null;
  notes: string | null;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  vendor_id: string | null;
  project_id: string | null;
  cost_code_id: string | null;
  status: string;
  order_date: string;
  expected_date: string | null;
  tax_amount: number;
  notes: string | null;
  finance_purchase_order_lines?: PurchaseOrderLine[];
  vendors?: { name: string } | null;
  projects?: { name: string } | null;
}

export interface PurchaseOrderLine {
  id: string;
  po_id: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  received_qty: number;
  sort_order: number;
}

export interface RecurringObligation {
  id: string;
  name: string;
  obligation_type: string;
  amount: number;
  cadence: string;
  next_due_date: string;
  end_date: string | null;
  vendor_id: string | null;
  is_active: boolean;
  notes: string | null;
}

/* ── Estimate math (single source of truth for totals) ── */
export function estimateLineDirectCost(l: Pick<EstimateLine, 'quantity' | 'unit_material_cost' | 'unit_labor_cost' | 'unit_equipment_cost' | 'waste_pct'>): number {
  const material = l.unit_material_cost * (1 + (l.waste_pct || 0) / 100);
  return (Number(l.quantity) || 0) * (material + Number(l.unit_labor_cost || 0) + Number(l.unit_equipment_cost || 0));
}

export function estimateTotals(est: Pick<Estimate, 'markup_pct' | 'overhead_pct' | 'contingency_pct' | 'tax_pct' | 'permit_allowance'>, lines: EstimateLine[]) {
  const direct = lines.reduce((s, l) => s + estimateLineDirectCost(l), 0);
  const overhead = direct * (est.overhead_pct || 0) / 100;
  const contingency = direct * (est.contingency_pct || 0) / 100;
  const subtotalCost = direct + overhead + contingency + (Number(est.permit_allowance) || 0);
  const markup = subtotalCost * (est.markup_pct || 0) / 100;
  const beforeTax = subtotalCost + markup;
  const tax = beforeTax * (est.tax_pct || 0) / 100;
  const total = beforeTax + tax;
  const margin = total > 0 ? (markup / total) * 100 : 0;
  return { direct, overhead, contingency, permits: Number(est.permit_allowance) || 0, subtotalCost, markup, beforeTax, tax, total, margin };
}

/* ── Shared helpers ── */
function useEntityId() {
  const { entity, ready } = useEntity();
  return { entityId: entity?.id ?? 'houston-enterprise', ready };
}

function useInvalidator(keys: string[]) {
  const qc = useQueryClient();
  return () => keys.forEach(k => qc.invalidateQueries({ queryKey: [k] }));
}

/* ── Executive snapshot + forecast ── */
export function useExecutiveSnapshot() {
  const { entityId, ready } = useEntityId();
  return useQuery<ExecutiveSnapshot>({
    queryKey: ['executive-snapshot', entityId],
    enabled: ready,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await sb.rpc('get_executive_snapshot', { p_entity_id: entityId });
      if (error) throw error;
      return data as ExecutiveSnapshot;
    },
  });
}

export function useCashFlowForecast(horizonDays: number) {
  const { entityId, ready } = useEntityId();
  return useQuery<ForecastRow[]>({
    queryKey: ['cash-flow-forecast', entityId, horizonDays],
    enabled: ready,
    queryFn: async () => {
      const { data, error } = await sb.rpc('get_cash_flow_forecast', {
        p_entity_id: entityId,
        p_horizon_days: horizonDays,
      });
      if (error) throw error;
      return (data ?? []) as ForecastRow[];
    },
  });
}

/* ── Generic list + upsert + delete factories ── */
function useEntityList<T>(table: string, key: string, select = '*', order = 'created_at.desc') {
  const { entityId, ready } = useEntityId();
  const [orderCol, orderDir] = order.split('.');
  return useQuery<T[]>({
    queryKey: [key, entityId],
    enabled: ready,
    queryFn: async () => {
      const { data, error } = await sb
        .from(table)
        .select(select)
        .eq('entity_id', entityId)
        .order(orderCol, { ascending: orderDir !== 'desc' });
      if (error) throw error;
      return (data ?? []) as T[];
    },
  });
}

function useEntityUpsert(table: string, keys: string[]) {
  const { user } = useAuth();
  const { entityId } = useEntityId();
  const invalidate = useInvalidator(keys);
  return useMutation({
    mutationFn: async (row: Record<string, unknown>) => {
      const payload = { user_id: user?.id, entity_id: entityId, ...row };
      const { data, error } = await sb.from(table).upsert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });
}

function useRowDelete(table: string, keys: string[]) {
  const invalidate = useInvalidator(keys);
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from(table).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

/* ── Employees & payroll ── */

/** Live payroll: any change to employees, runs, or items — from any device
    or teammate — invalidates the payroll queries so the screen updates in
    real time without a manual refresh. */
export function usePayrollRealtime() {
  const qc = useQueryClient();
  const { entityId } = useEntityId();
  useEffect(() => {
    const invalidate = () => {
      qc.invalidateQueries({ queryKey: ['erp-payroll-runs'] });
      qc.invalidateQueries({ queryKey: ['erp-employees'] });
      qc.invalidateQueries({ queryKey: ['executive-snapshot'] });
      qc.invalidateQueries({ queryKey: ['cash-flow-forecast'] });
    };
    const ch = supabase.channel(`payroll-live-${entityId}`);
    ['finance_employees', 'finance_payroll_runs', 'finance_payroll_items'].forEach(table => {
      ch.on('postgres_changes', { event: '*', schema: 'public', table }, invalidate);
    });
    ch.subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc, entityId]);
}
export const useEmployees = () => useEntityList<Employee>('finance_employees', 'erp-employees', '*', 'name.asc');
export const useUpsertEmployee = () => useEntityUpsert('finance_employees', ['erp-employees', 'executive-snapshot']);
export const useDeleteEmployee = () => useRowDelete('finance_employees', ['erp-employees']);

export const usePayrollRuns = () =>
  useEntityList<PayrollRun>('finance_payroll_runs', 'erp-payroll-runs', '*, finance_payroll_items(*)', 'pay_date.desc');
export const useUpsertPayrollRun = () => useEntityUpsert('finance_payroll_runs', ['erp-payroll-runs', 'executive-snapshot', 'cash-flow-forecast']);
export const useDeletePayrollRun = () => useRowDelete('finance_payroll_runs', ['erp-payroll-runs', 'executive-snapshot', 'cash-flow-forecast']);

export function useUpsertPayrollItem() {
  const invalidate = useInvalidator(['erp-payroll-runs', 'executive-snapshot', 'cash-flow-forecast']);
  return useMutation({
    mutationFn: async (row: Partial<PayrollItem> & { payroll_run_id: string }) => {
      const { data, error } = await sb.from('finance_payroll_items').upsert(row).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });
}

export function useDeletePayrollItem() {
  const invalidate = useInvalidator(['erp-payroll-runs', 'executive-snapshot', 'cash-flow-forecast']);
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from('finance_payroll_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

/** Marks a run paid AND books the cash out as a single Payroll expense
    transaction so the ledger/cash position stays truthful. */
export function useMarkPayrollPaid() {
  const { user } = useAuth();
  const { entityId } = useEntityId();
  const invalidate = useInvalidator(['erp-payroll-runs', 'executive-snapshot', 'cash-flow-forecast', 'transactions']);
  return useMutation({
    mutationFn: async (run: PayrollRun) => {
      const total = (run.finance_payroll_items ?? []).reduce((s, i) => s + Number(i.gross_amount || 0) + Number(i.burden_amount || 0), 0);
      const { error: upErr } = await sb.from('finance_payroll_runs')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('id', run.id);
      if (upErr) throw upErr;
      if (total > 0) {
        const { error: txErr } = await sb.from('transactions').insert({
          user_id: user?.id,
          entity_id: entityId,
          type: 'expense',
          amount: total,
          category: 'Payroll',
          description: `Payroll ${run.period_start} → ${run.period_end}`,
          transaction_date: run.pay_date,
          status: 'completed',
        });
        if (txErr) throw txErr;
      }
    },
    onSuccess: invalidate,
  });
}

/* ── Estimates ── */
export const useEstimates = () =>
  useEntityList<Estimate>('finance_estimates', 'erp-estimates', '*, finance_estimate_lines(*)', 'created_at.desc');
export const useUpsertEstimate = () => useEntityUpsert('finance_estimates', ['erp-estimates', 'executive-snapshot']);
export const useDeleteEstimate = () => useRowDelete('finance_estimates', ['erp-estimates', 'executive-snapshot']);

export function useUpsertEstimateLine() {
  const invalidate = useInvalidator(['erp-estimates', 'executive-snapshot']);
  return useMutation({
    mutationFn: async (row: Partial<EstimateLine> & { estimate_id: string }) => {
      const { data, error } = await sb.from('finance_estimate_lines').upsert(row).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteEstimateLine() {
  const invalidate = useInvalidator(['erp-estimates', 'executive-snapshot']);
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from('finance_estimate_lines').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

/** Accept an estimate and spin up the delivery project with its budget seeded
    from the estimate's cost basis and contract value from the sell price. */
export function useConvertEstimateToProject() {
  const { user } = useAuth();
  const { entityId } = useEntityId();
  const invalidate = useInvalidator(['erp-estimates', 'projects', 'executive-snapshot']);
  return useMutation({
    mutationFn: async (est: Estimate) => {
      const totals = estimateTotals(est, est.finance_estimate_lines ?? []);
      const { data: project, error: projErr } = await sb.from('projects').insert({
        user_id: user?.id,
        entity_id: entityId,
        name: est.title,
        client_name_snapshot: est.client_name,
        location: est.property_address,
        status: 'active',
        budget: totals.subtotalCost,
        original_contract_value: totals.total,
        current_contract_value: totals.total,
        estimated_cost_to_complete: totals.subtotalCost,
        notes: `Created from estimate ${est.estimate_number}.`,
      }).select().single();
      if (projErr) throw projErr;
      const { error: estErr } = await sb.from('finance_estimates')
        .update({ status: 'converted', converted_project_id: project.id })
        .eq('id', est.id);
      if (estErr) throw estErr;
      return project;
    },
    onSuccess: invalidate,
  });
}

/* ── Project workflow items ── */
export function useWorkflowItems(projectId?: string) {
  const { entityId, ready } = useEntityId();
  return useQuery<WorkflowItem[]>({
    queryKey: ['erp-workflow-items', entityId, projectId ?? 'all'],
    enabled: ready,
    queryFn: async () => {
      let q = sb.from('project_workflow_items').select('*').eq('entity_id', entityId);
      if (projectId) q = q.eq('project_id', projectId);
      const { data, error } = await q.order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as WorkflowItem[];
    },
  });
}

export const useUpsertWorkflowItem = () => useEntityUpsert('project_workflow_items', ['erp-workflow-items', 'executive-snapshot']);
export const useDeleteWorkflowItem = () => useRowDelete('project_workflow_items', ['erp-workflow-items', 'executive-snapshot']);

/* ── Equipment ── */
export const useEquipment = () => useEntityList<EquipmentUnit>('finance_equipment', 'erp-equipment', '*', 'name.asc');
export const useUpsertEquipment = () => useEntityUpsert('finance_equipment', ['erp-equipment']);
export const useDeleteEquipment = () => useRowDelete('finance_equipment', ['erp-equipment']);

/** Check-out / check-in / maintenance movement: writes the log row and keeps
    the unit's live status, assignment, and hour meter in sync atomically
    enough for a single-operator admin app. */
export function useLogEquipment() {
  const invalidate = useInvalidator(['erp-equipment', 'erp-equipment-logs']);
  return useMutation({
    mutationFn: async (input: {
      equipment: EquipmentUnit;
      log_type: 'check_out' | 'check_in' | 'maintenance' | 'repair' | 'fuel' | 'inspection';
      project_id?: string | null;
      employee_id?: string | null;
      hours?: number;
      cost?: number;
      notes?: string;
    }) => {
      const { equipment, log_type, project_id = null, employee_id = null, hours = 0, cost = 0, notes = '' } = input;
      const { error: logErr } = await sb.from('finance_equipment_logs').insert({
        equipment_id: equipment.id, log_type, project_id, employee_id, hours, cost, notes,
      });
      if (logErr) throw logErr;
      const patch: Record<string, unknown> = { hours_used: Number(equipment.hours_used || 0) + Number(hours || 0) };
      if (log_type === 'check_out') {
        patch.status = 'checked_out';
        patch.current_project_id = project_id;
        patch.assigned_employee_id = employee_id;
      } else if (log_type === 'check_in') {
        patch.status = 'available';
        patch.current_project_id = null;
        patch.assigned_employee_id = null;
      } else if (log_type === 'maintenance' || log_type === 'repair') {
        patch.status = 'maintenance';
      }
      const { error: upErr } = await sb.from('finance_equipment').update(patch).eq('id', equipment.id);
      if (upErr) throw upErr;
    },
    onSuccess: invalidate,
  });
}

export function useEquipmentLogs(equipmentId: string | null) {
  return useQuery({
    queryKey: ['erp-equipment-logs', equipmentId],
    enabled: Boolean(equipmentId),
    queryFn: async () => {
      const { data, error } = await sb.from('finance_equipment_logs')
        .select('*')
        .eq('equipment_id', equipmentId)
        .order('log_date', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/* ── Purchase orders ── */
export const usePurchaseOrders = () =>
  useEntityList<PurchaseOrder>('finance_purchase_orders', 'erp-purchase-orders',
    '*, finance_purchase_order_lines(*), vendors(name), projects(name)', 'order_date.desc');
export const useUpsertPurchaseOrder = () => useEntityUpsert('finance_purchase_orders', ['erp-purchase-orders']);
export const useDeletePurchaseOrder = () => useRowDelete('finance_purchase_orders', ['erp-purchase-orders']);

export function useUpsertPurchaseOrderLine() {
  const invalidate = useInvalidator(['erp-purchase-orders']);
  return useMutation({
    mutationFn: async (row: Partial<PurchaseOrderLine> & { po_id: string }) => {
      const { data, error } = await sb.from('finance_purchase_order_lines').upsert(row).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });
}

export function useDeletePurchaseOrderLine() {
  const invalidate = useInvalidator(['erp-purchase-orders']);
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from('finance_purchase_order_lines').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function poTotal(po: PurchaseOrder): number {
  const lines = po.finance_purchase_order_lines ?? [];
  return lines.reduce((s, l) => s + Number(l.quantity || 0) * Number(l.unit_price || 0), 0) + Number(po.tax_amount || 0);
}

/* ── Recurring obligations ── */
export const useRecurringObligations = () =>
  useEntityList<RecurringObligation>('finance_recurring_obligations', 'erp-recurring', '*', 'next_due_date.asc');
export const useUpsertRecurringObligation = () => useEntityUpsert('finance_recurring_obligations', ['erp-recurring', 'cash-flow-forecast', 'executive-snapshot']);
export const useDeleteRecurringObligation = () => useRowDelete('finance_recurring_obligations', ['erp-recurring', 'cash-flow-forecast', 'executive-snapshot']);
