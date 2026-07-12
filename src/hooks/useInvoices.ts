import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEntity } from '@/contexts/EntityContext';

export interface LineItem {
  id: string;
  description: string;
  qty: number;
  rate: number;
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue';

export interface Invoice {
  id: string;
  invoice_number: string;
  status: InvoiceStatus;
  client_name: string;
  client_email: string;
  client_company: string;
  client_address: string;
  issue_date: string;
  due_date: string;
  line_items: LineItem[];
  tax_rate: number;
  notes: string;
  terms: string;
  stripe_payment_link?: string;
  created_at: string;
  updated_at: string;
}

// ── Pure math helpers (unchanged API) ────────────────────────────────────────

export function lineItemTotal(item: LineItem) {
  return item.qty * item.rate;
}

export function invoiceSubtotal(invoice: Pick<Invoice, 'line_items'>) {
  return invoice.line_items.reduce((s, i) => s + lineItemTotal(i), 0);
}

export function invoiceTax(invoice: Pick<Invoice, 'line_items' | 'tax_rate'>) {
  return invoiceSubtotal(invoice) * (invoice.tax_rate / 100);
}

export function invoiceTotal(invoice: Pick<Invoice, 'line_items' | 'tax_rate'>) {
  return invoiceSubtotal(invoice) + invoiceTax(invoice);
}

export function nextInvoiceNumber(invoices: Invoice[]): string {
  const nums = invoices
    .map(inv => parseInt(inv.invoice_number.replace(/\D/g, ''), 10))
    .filter(n => !isNaN(n));
  const next = nums.length ? Math.max(...nums) + 1 : 1001;
  return `INV-${next}`;
}

// ── Row mapper ────────────────────────────────────────────────────────────────

function mapRow(row: Record<string, unknown>): Invoice {
  return {
    id:                  row.id as string,
    invoice_number:      row.invoice_number as string,
    status:              row.status as InvoiceStatus,
    client_name:         (row.client_name as string) ?? '',
    client_email:        (row.client_email as string) ?? '',
    client_company:      (row.client_company as string) ?? '',
    client_address:      (row.client_address as string) ?? '',
    issue_date:          row.issue_date as string,
    due_date:            row.due_date as string,
    line_items:          (row.line_items as LineItem[]) ?? [],
    tax_rate:            Number(row.tax_rate ?? 0),
    notes:               (row.notes as string) ?? '',
    terms:               (row.terms as string) ?? '',
    stripe_payment_link: row.stripe_payment_link as string | undefined,
    created_at:          row.created_at as string,
    updated_at:          row.updated_at as string,
  };
}

// ── Auto-overdue check (server-side preferred; this handles edge cases) ───────

function applyAutoOverdue(invoices: Invoice[]): Invoice[] {
  const today = new Date().toISOString().slice(0, 10);
  return invoices.map(inv =>
    inv.status === 'sent' && inv.due_date && inv.due_date < today
      ? { ...inv, status: 'overdue' as const }
      : inv,
  );
}

// ── Main hook ─────────────────────────────────────────────────────────────────

export function useInvoices() {
  const { user } = useAuth();
  const { entity, ready } = useEntity();
  const entityId = entity?.id ?? 'houston-enterprise';
  const qc = useQueryClient();

  const QUERY_KEY = ['invoices', entityId];

  // ── Read ──
  const { data: rawInvoices = [] } = useQuery({
    queryKey: QUERY_KEY,
    enabled: !!user && ready,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return applyAutoOverdue((data ?? []).map(mapRow));
    },
  });

  const invoices: Invoice[] = rawInvoices;

  // ── Create ──
  const createMutation = useMutation({
    mutationFn: async (data: Omit<Invoice, 'id' | 'created_at' | 'updated_at'>) => {
      if (!ready) throw new Error('Entity context not ready — please wait a moment and try again');
      const { data: created, error } = await supabase
        .from('invoices')
        .insert({
          ...data,
          user_id:   user!.id,
          entity_id: entityId,
          line_items: data.line_items ?? [],
        })
        .select()
        .single();
      if (error) throw error;
      return mapRow(created as Record<string, unknown>);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  // ── Update ──
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Invoice> }) => {
      const { error } = await supabase
        .from('invoices')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  // ── Delete ──
  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('invoices').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const create = (data: Omit<Invoice, 'id' | 'created_at' | 'updated_at'>) =>
    createMutation.mutateAsync(data);

  const update = (id: string, updates: Partial<Invoice>) =>
    updateMutation.mutateAsync({ id, updates });

  const remove = (id: string) => {
    removeMutation.mutate(id);
  };

  return { invoices, create, update, remove };
}
