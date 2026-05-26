import { useState, useCallback } from 'react';

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

const STORAGE_KEY = 'hou-invoices';

function load(): Invoice[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}

function persist(invoices: Invoice[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices));
}

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

export function useInvoices() {
  const [invoices, setInvoicesState] = useState<Invoice[]>(() => load());

  const setInvoices = useCallback((inv: Invoice[]) => {
    setInvoicesState(inv);
    persist(inv);
  }, []);

  const create = useCallback((data: Omit<Invoice, 'id' | 'created_at' | 'updated_at'>): Invoice => {
    const now = new Date().toISOString();
    const newInv: Invoice = { ...data, id: crypto.randomUUID(), created_at: now, updated_at: now };
    setInvoices([newInv, ...invoices]);
    return newInv;
  }, [invoices, setInvoices]);

  const update = useCallback((id: string, updates: Partial<Invoice>) => {
    setInvoices(invoices.map(inv => inv.id === id ? { ...inv, ...updates, updated_at: new Date().toISOString() } : inv));
  }, [invoices, setInvoices]);

  const remove = useCallback((id: string) => {
    setInvoices(invoices.filter(inv => inv.id !== id));
  }, [invoices, setInvoices]);

  return { invoices, create, update, remove };
}
