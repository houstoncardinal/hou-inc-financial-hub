import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, MicOff } from 'lucide-react';
import { toast } from 'sonner';
import { useConversation } from '@elevenlabs/react';
import { Button } from '@/components/ui/button';
import { useChecks, useProjects, useTransactions, useUpsert, useVendors } from '@/hooks/useFinance';
import { invoiceSubtotal, invoiceTax, invoiceTotal, nextInvoiceNumber, useInvoices, type Invoice, type LineItem } from '@/hooks/useInvoices';
import {
  downloadCSV,
  downloadCheckExcel,
  downloadInvoiceExcel,
  downloadLedgerExcel,
  downloadProjectExcel,
  downloadTransactionExcel,
  generateCheckRegisterReport,
  generateInvoicesReport,
  generateLedgerReport,
  generateProjectReport,
  generateTransactionReport,
  savePDF,
} from '@/lib/reports';
import { todayLocalDate } from '@/lib/format';

const AGENT_ID = import.meta.env.VITE_ELEVENLABS_AGENT_ID;

const ROUTES = new Set([
  '/finance',
  '/finance/dashboard',
  '/ledger',
  '/checks',
  '/checks/new',
  '/income',
  '/expenses',
  '/projects',
  '/vendors',
  '/invoices',
  '/invoices/new',
  '/charts',
  '/concierge',
  '/settings',
]);

type ToolResult = {
  ok: boolean;
  message: string;
  data?: unknown;
};

function today() {
  return todayLocalDate();
}

function cleanDate(value?: string) {
  return value || today();
}

function findByNameOrId<T extends { id: string; name?: string }>(items: T[], value?: string) {
  if (!value) return undefined;
  const q = value.toLowerCase().trim();
  return items.find(item => item.id === value || item.name?.toLowerCase() === q)
    || items.find(item => item.name?.toLowerCase().includes(q));
}

function makeProjectSummaries(projects: any[], checks: any[], income: any[], expenses: any[]) {
  return projects.map((p: any) => {
    const pChecks = checks.filter((c: any) => c.project_id === p.id);
    const incoming = income.filter((t: any) => t.project_id === p.id).reduce((s: number, t: any) => s + Number(t.amount), 0);
    const expenseTotal = expenses.filter((t: any) => t.project_id === p.id).reduce((s: number, t: any) => s + Number(t.amount), 0);
    const cleared = pChecks.filter((c: any) => c.status === 'cleared').reduce((s: number, c: any) => s + Number(c.amount), 0);
    const outstanding = pChecks.filter((c: any) => c.status === 'pending').reduce((s: number, c: any) => s + Number(c.amount), 0);
    const spent = expenseTotal + cleared;
    const budget = Number(p.budget) || 0;
    return {
      ...p,
      incoming,
      spent,
      outstanding,
      net: incoming - spent,
      used: budget > 0 ? Math.min(100, (spent / budget) * 100) : 0,
    };
  });
}

function normalizeInvoiceStatus(status?: string): Invoice['status'] {
  return ['draft', 'sent', 'paid', 'overdue'].includes(status || '') ? status as Invoice['status'] : 'draft';
}

function normalizeCheckStatus(status?: string) {
  return ['pending', 'cleared', 'voided'].includes(status || '') ? status : 'pending';
}

function downloadJSON(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ElevenLabsAgent() {
  const navigate = useNavigate();
  const { data: checks = [] } = useChecks();
  const { data: projects = [] } = useProjects();
  const { data: vendors = [] } = useVendors();
  const { data: income = [] } = useTransactions('income');
  const { data: expenses = [] } = useTransactions('expense');
  const transactionUpsert = useUpsert('transactions', [['transactions']]);
  const checkUpsert = useUpsert('checks', [['checks']]);
  const vendorUpsert = useUpsert('vendors', [['vendors']]);
  const projectUpsert = useUpsert('projects', [['projects']]);
  const { invoices, create: createInvoiceRecord, update: updateInvoiceRecord } = useInvoices();

  const projectSummaries = useMemo(
    () => makeProjectSummaries(projects, checks, income, expenses),
    [projects, checks, income, expenses]
  );

  const clientTools = useMemo<Record<string, (parameters: any) => Promise<string | number | void>>>(() => {
    const tools = {
    navigateApp: ({ route }: { route: string }): ToolResult => {
      if (!ROUTES.has(route) && !route.startsWith('/projects/') && !route.startsWith('/invoices/')) {
        return { ok: false, message: `Unknown route: ${route}` };
      }
      navigate(route);
      return { ok: true, message: `Opened ${route}` };
    },

    getFinancialSnapshot: (): ToolResult => {
      const clearedChecks = checks.filter((c: any) => c.status === 'cleared').reduce((s: number, c: any) => s + Number(c.amount), 0);
      const pendingChecks = checks.filter((c: any) => c.status === 'pending');
      const inflow = income.reduce((s: number, t: any) => s + Number(t.amount), 0);
      const outflow = expenses.reduce((s: number, t: any) => s + Number(t.amount), 0) + clearedChecks;
      const outstandingInvoices = invoices
        .filter(inv => inv.status === 'sent' || inv.status === 'overdue')
        .reduce((s, inv) => s + invoiceTotal(inv), 0);

      return {
        ok: true,
        message: 'Financial snapshot ready',
        data: {
          balance: inflow - outflow,
          inflow,
          outflow,
          checks_count: checks.length,
          pending_checks_count: pendingChecks.length,
          pending_checks_total: pendingChecks.reduce((s: number, c: any) => s + Number(c.amount), 0),
          projects_count: projects.length,
          vendors_count: vendors.length,
          invoices_count: invoices.length,
          outstanding_invoices_total: outstandingInvoices,
          top_projects: projectSummaries.slice(0, 5).map((p: any) => ({
            id: p.id,
            name: p.name,
            status: p.status,
            budget: Number(p.budget) || 0,
            spent: p.spent,
            incoming: p.incoming,
            outstanding: p.outstanding,
            net: p.net,
          })),
        },
      };
    },

    searchRecords: ({ type, query = '', status = '', project = '' }: { type: string; query?: string; status?: string; project?: string }): ToolResult => {
      const q = query.toLowerCase().trim();
      const projectMatch = findByNameOrId(projects as any[], project);
      const matchesText = (...values: unknown[]) => !q || values.some(v => String(v || '').toLowerCase().includes(q));
      const matchesStatus = (value?: string) => !status || value === status;
      const matchesProject = (projectId?: string) => !projectMatch || projectId === projectMatch.id;

      const rows = [
        ...checks
          .filter((c: any) => matchesStatus(c.status) && matchesProject(c.project_id) && matchesText(c.check_number, c.payee_name, c.memo, c.projects?.name))
          .map((c: any) => ({ kind: 'check', id: c.id, check_number: c.check_number, payee_name: c.payee_name, amount: Number(c.amount), date: c.issue_date, status: c.status, project: c.projects?.name })),
        ...income
          .filter((t: any) => matchesProject(t.project_id) && matchesText(t.source_name, t.category, t.notes, t.projects?.name))
          .map((t: any) => ({ kind: 'income', id: t.id, source_name: t.source_name, amount: Number(t.amount), date: t.transaction_date, category: t.category, project: t.projects?.name })),
        ...expenses
          .filter((t: any) => matchesProject(t.project_id) && matchesText(t.vendors?.name, t.category, t.notes, t.projects?.name))
          .map((t: any) => ({ kind: 'expense', id: t.id, vendor: t.vendors?.name, amount: Number(t.amount), date: t.transaction_date, category: t.category, project: t.projects?.name })),
        ...projectSummaries
          .filter((p: any) => matchesStatus(p.status) && matchesText(p.name, p.code, p.notes))
          .map((p: any) => ({ kind: 'project', id: p.id, name: p.name, code: p.code, status: p.status, budget: Number(p.budget) || 0, spent: p.spent, incoming: p.incoming, net: p.net })),
        ...vendors
          .filter((v: any) => matchesText(v.name, v.contact_email, v.contact_phone, v.address, v.notes))
          .map((v: any) => ({ kind: 'vendor', id: v.id, name: v.name, email: v.contact_email, phone: v.contact_phone })),
        ...invoices
          .filter(inv => matchesStatus(inv.status) && matchesText(inv.invoice_number, inv.client_name, inv.client_company, inv.client_email))
          .map(inv => ({ kind: 'invoice', id: inv.id, invoice_number: inv.invoice_number, client_name: inv.client_name, status: inv.status, due_date: inv.due_date, total: invoiceTotal(inv) })),
      ].filter(row => type === 'all' || row.kind === type || (type === 'ledger' && ['check', 'income', 'expense'].includes(row.kind)));

      return { ok: true, message: `Found ${rows.length} matching records`, data: rows.slice(0, 25) };
    },

    createIncome: async ({ amount, date, source_name, category, payment_method, check_reference, retainage_percent, retainage_amount, invoice_id, cost_phase, project, notes }: any): Promise<ToolResult> => {
      const p = findByNameOrId(projects as any[], project);
      await transactionUpsert.mutateAsync({
        type: 'income',
        amount: Number(amount),
        transaction_date: cleanDate(date),
        source_name: source_name || null,
        category: category || null,
        project_id: p?.id || null,
        notes: notes || null,
        vendor_id: null,
        payment_method: payment_method || null,
        check_reference: check_reference || null,
        retainage_percent: retainage_percent ? Number(retainage_percent) : null,
        retainage_amount: retainage_amount ? Number(retainage_amount) : null,
        invoice_id: invoice_id || null,
        cost_phase: cost_phase || null,
      } as any);
      return { ok: true, message: 'Income saved' };
    },

    createExpense: async ({ amount, date, vendor, category, payment_method, check_reference, cost_phase, project, notes }: any): Promise<ToolResult> => {
      const v = findByNameOrId(vendors as any[], vendor);
      const p = findByNameOrId(projects as any[], project);
      await transactionUpsert.mutateAsync({
        type: 'expense',
        amount: Number(amount),
        transaction_date: cleanDate(date),
        vendor_id: v?.id || null,
        category: category || null,
        payment_method: payment_method || null,
        check_reference: check_reference || null,
        cost_phase: cost_phase || null,
        project_id: p?.id || null,
        notes: notes || null,
        source_name: null,
      } as any);
      return { ok: true, message: 'Expense saved' };
    },

    createCheck: async ({ payee_name, amount, check_number, issue_date, project, memo, status }: any): Promise<ToolResult> => {
      const v = findByNameOrId(vendors as any[], payee_name);
      const p = findByNameOrId(projects as any[], project);
      await checkUpsert.mutateAsync({
        payee_name,
        amount: Number(amount),
        check_number,
        issue_date: cleanDate(issue_date),
        payee_vendor_id: v?.id || null,
        project_id: p?.id || null,
        memo: memo || null,
        status: normalizeCheckStatus(status),
      } as any);
      return { ok: true, message: `Check #${check_number} created` };
    },

    createVendor: async ({ name, contact_email, contact_phone, address, notes }: any): Promise<ToolResult> => {
      await vendorUpsert.mutateAsync({ name, contact_email: contact_email || null, contact_phone: contact_phone || null, address: address || null, notes: notes || null } as any);
      return { ok: true, message: `Vendor ${name} created` };
    },

    createProject: async ({ name, code, budget, status, notes }: any): Promise<ToolResult> => {
      await projectUpsert.mutateAsync({ name, code: code || null, budget: Number(budget) || 0, status: status || 'active', notes: notes || null } as any);
      return { ok: true, message: `Project ${name} created` };
    },

    createInvoice: ({ client_name, client_email, client_company, client_address, invoice_number, issue_date, due_date, line_items_json, tax_rate, status, notes, terms }: any): ToolResult => {
      const parsed = JSON.parse(line_items_json || '[]') as Array<Partial<LineItem>>;
      const lineItems: LineItem[] = parsed.map(item => ({
        id: crypto.randomUUID(),
        description: item.description || '',
        qty: Number(item.qty) || 1,
        rate: Number(item.rate) || 0,
      }));
      const issueDate = cleanDate(issue_date);
      const defaultDue = new Date(new Date(issueDate).getTime() + 30 * 864e5).toISOString().slice(0, 10);
      const invoice = createInvoiceRecord({
        invoice_number: invoice_number || nextInvoiceNumber(invoices),
        status: normalizeInvoiceStatus(status),
        client_name,
        client_email: client_email || '',
        client_company: client_company || '',
        client_address: client_address || '',
        issue_date: issueDate,
        due_date: due_date || defaultDue,
        line_items: lineItems.length ? lineItems : [{ id: crypto.randomUUID(), description: 'Service', qty: 1, rate: 0 }],
        tax_rate: Number(tax_rate) || 0,
        notes: notes || '',
        terms: terms || 'Net 30 - Payment is due within 30 days of invoice date.',
      });
      return { ok: true, message: `Invoice ${invoice.invoice_number} created`, data: { id: invoice.id, invoice_number: invoice.invoice_number, total: invoiceTotal(invoice) } };
    },

    updateCheckStatus: async ({ check_id, status }: { check_id: string; status: string }): Promise<ToolResult> => {
      const check = checks.find((c: any) => c.id === check_id);
      if (!check) return { ok: false, message: 'Check not found' };
      await checkUpsert.mutateAsync({ ...check, status: normalizeCheckStatus(status) } as any);
      return { ok: true, message: `Check #${(check as any).check_number} marked ${status}` };
    },

    updateInvoiceStatus: ({ invoice_id, status }: { invoice_id: string; status: string }): ToolResult => {
      const invoice = invoices.find(inv => inv.id === invoice_id);
      if (!invoice) return { ok: false, message: 'Invoice not found' };
      updateInvoiceRecord(invoice_id, { status: normalizeInvoiceStatus(status) });
      return { ok: true, message: `Invoice ${invoice.invoice_number} marked ${status}` };
    },

    exportReport: ({ report, format, project }: { report: string; format: string; project?: string }): ToolResult => {
      const stamp = today();
      if (report === 'income') {
        if (format === 'pdf') savePDF(generateTransactionReport(income, 'income'), `hou-income-${stamp}.pdf`);
        else downloadTransactionExcel(income, 'income');
      } else if (report === 'expenses') {
        if (format === 'pdf') savePDF(generateTransactionReport(expenses, 'expense'), `hou-expenses-${stamp}.pdf`);
        else downloadTransactionExcel(expenses, 'expense');
      } else if (report === 'checks') {
        if (format === 'pdf') savePDF(generateCheckRegisterReport(checks), `hou-check-register-${stamp}.pdf`);
        else downloadCheckExcel(checks);
      } else if (report === 'ledger') {
        if (format === 'pdf') savePDF(generateLedgerReport(income, expenses, checks), `hou-general-ledger-${stamp}.pdf`);
        else downloadLedgerExcel(income, expenses, checks);
      } else if (report === 'projects') {
        if (format === 'pdf') savePDF(generateProjectReport(projectSummaries), `hou-projects-${stamp}.pdf`);
        else downloadProjectExcel(projectSummaries);
      } else if (report === 'vendors') {
        downloadCSV(vendors, `hou-vendors-${stamp}.csv`, ['Name', 'Email', 'Phone', 'Address', 'Notes'], (v: any) => [v.name, v.contact_email, v.contact_phone, v.address, v.notes]);
      } else if (report === 'invoices') {
        const summaries = invoices.map(inv => ({
          invoice_number: inv.invoice_number,
          client_name: inv.client_name,
          client_company: inv.client_company,
          issue_date: inv.issue_date,
          due_date: inv.due_date,
          status: inv.status,
          subtotal: invoiceSubtotal(inv),
          tax: invoiceTax(inv),
          total: invoiceTotal(inv),
        }));
        if (format === 'pdf') savePDF(generateInvoicesReport(summaries), `hou-invoices-${stamp}.pdf`);
        else downloadInvoiceExcel(summaries);
      } else if (report === 'project_detail') {
        const p = findByNameOrId(projectSummaries as any[], project);
        if (!p) return { ok: false, message: 'Project not found' };
        if (format === 'pdf') savePDF(generateProjectReport([p]), `hou-project-${p.name.toLowerCase().replace(/\s+/g, '-')}-${stamp}.pdf`);
        else {
          const activity = [
            ...income.filter((t: any) => t.project_id === p.id).map((t: any) => ({ date: t.transaction_date, type: 'Income', reference: t.source_name || t.category || '', amount: Number(t.amount) })),
            ...expenses.filter((t: any) => t.project_id === p.id).map((t: any) => ({ date: t.transaction_date, type: 'Expense', reference: t.vendors?.name || t.category || '', amount: -Number(t.amount) })),
            ...checks.filter((c: any) => c.project_id === p.id).map((c: any) => ({ date: c.issue_date, type: 'Check', reference: `#${c.check_number} ${c.payee_name}`, amount: -Number(c.amount) })),
          ].sort((a, b) => b.date.localeCompare(a.date));
          downloadCSV(activity, `hou-project-${p.name.toLowerCase().replace(/\s+/g, '-')}-${stamp}.csv`, ['Date', 'Type', 'Reference', 'Amount'], (row: any) => [row.date, row.type, row.reference, row.amount]);
        }
      } else if (report === 'all_data') {
        downloadJSON({ income, expenses, checks, projects, vendors, invoices }, `hou-full-export-${stamp}.json`);
      } else {
        return { ok: false, message: `Unsupported report: ${report}` };
      }
      return { ok: true, message: `${report} ${format} export started` };
    },
    };

    return Object.fromEntries(
      Object.entries(tools).map(([name, fn]) => [
        name,
        async (parameters: any) => {
          const result: any = await fn(parameters);
          if (result === undefined || typeof result === 'string' || typeof result === 'number') return result;
          return JSON.stringify(result);
        },
      ])
    );
  }, [
    navigate,
    checks,
    projects,
    vendors,
    income,
    expenses,
    invoices,
    projectSummaries,
    transactionUpsert,
    checkUpsert,
    vendorUpsert,
    projectUpsert,
    createInvoiceRecord,
    updateInvoiceRecord,
  ]);

  const conversation = useConversation({
    clientTools,
    onError: error => toast.error(typeof error === 'string' ? error : 'Voice agent error'),
  });

  if (!AGENT_ID) return null;

  const connected = conversation.status === 'connected';
  const connecting = conversation.status === 'connecting';

  const toggle = async () => {
    try {
      if (connected) {
        await conversation.endSession();
      } else {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        await conversation.startSession({ agentId: AGENT_ID });
      }
    } catch (error: any) {
      toast.error(error?.message || 'Could not start the voice agent');
    }
  };

  return (
    <Button
      type="button"
      onClick={toggle}
      disabled={connecting}
      className="fixed bottom-20 right-4 md:bottom-5 md:right-5 z-40 h-11 w-11 rounded-none bg-foreground text-background shadow-lg hover:opacity-90"
      size="icon"
      aria-label={connected ? 'End voice agent' : 'Start voice agent'}
      title={connected ? 'End voice agent' : 'Start voice agent'}
    >
      {connected ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
    </Button>
  );
}
