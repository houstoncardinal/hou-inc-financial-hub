import { useMemo, useState, useRef, useCallback } from 'react';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { DateInput } from '@/components/ui/date-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  useCreateTransactionAllocations,
  useDelete,
  useFinanceBankAccounts,
  useFinanceCostCodes,
  useFinanceDivisions,
  useFinanceProjectPhases,
  useProjects,
  useTransactions,
  useUpsert,
  useVendors,
  useQuickCreate,
} from '@/hooks/useFinance';
import { useEntity } from '@/contexts/EntityContext';
import { useAuth } from '@/hooks/useAuth';
import { useInvoices } from '@/hooks/useInvoices';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fmtDate, fmtUSD } from '@/lib/format';
import { toast } from 'sonner';
import { Trash2, FileText, Table2, Plus, Camera, X, Sparkles } from 'lucide-react';
import FinanceDetailDrawer from '@/components/FinanceDetailDrawer';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { QuickCreateSelect } from '@/components/QuickCreateSelect';
import { useCreatePortalClient, usePortalClients } from '@/hooks/usePortalClients';
import { generateTransactionReport, savePDF, downloadTransactionExcel } from '@/lib/reports';
import { scanReceipt, type ScannedReceipt } from '@/lib/receiptScan';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { FinanceRangePicker, financeRangeLabel, isInFinanceRange } from '@/lib/financeTime';

const EXPENSE_CATEGORIES = [
  'Materials', 'Labor', 'Subcontractor', 'Equipment', 'Equipment rental',
  'Permits', 'Inspections', 'Fuel', 'Delivery', 'Dumpster and disposal',
  'Jobsite utilities', 'Temporary facilities', 'Professional services',
  'Repairs', 'Tools and supplies', 'Office overhead', 'Insurance',
  'Marketing', 'Software', 'Payroll', 'Vehicle expense', 'Travel',
  'Meals', 'Other',
];

const EXPENSE_TYPES = EXPENSE_CATEGORIES;

const INCOME_CATEGORIES = [
  'Client Payment', 'Retainer', 'Project Milestone', 'Consulting Fee',
  'Reimbursement', 'Interest Income', 'Grant', 'Investment',
  'Refund', 'Other Income',
];

const INCOME_PAYMENT_METHODS = [
  { value: 'check',           label: 'Check' },
  { value: 'ach_wire',        label: 'ACH / Wire' },
  { value: 'credit_card',     label: 'Credit Card' },
  { value: 'financing_draw',  label: 'Financing Draw' },
  { value: 'cash',            label: 'Cash' },
  { value: 'other',           label: 'Other' },
];

const INVOICE_LINK_PROVIDERS = [
  { value: 'stripe', label: 'Stripe' },
  { value: 'quickbooks', label: 'QuickBooks' },
  { value: 'other', label: 'Other Link' },
];

const EXPENSE_PAYMENT_METHODS = [
  { value: 'check',       label: 'Check' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'ach',         label: 'ACH' },
  { value: 'net_30',      label: 'NET 30' },
  { value: 'net_60',      label: 'NET 60' },
  { value: 'net_90',      label: 'NET 90' },
  { value: 'cash',        label: 'Cash' },
  { value: 'wire',        label: 'Wire' },
  { value: 'other',       label: 'Other' },
];

const COST_PHASES = [
  'Phase 1: Site Prep & Demo',
  'Phase 2: Foundation & Concrete',
  'Phase 3: Framing & Structure',
  'Phase 4: Rough-Ins (MEP)',
  'Phase 5: Exterior & Roofing',
  'Phase 6: Insulation & Drywall',
  'Phase 7: Finishes & Fixtures',
  'Phase 8: Landscaping & Final',
  'General / Overhead',
];

const num = (value: string | number | null | undefined) => {
  const parsed = typeof value === 'number' ? value : parseFloat(value || '');
  return Number.isFinite(parsed) ? parsed : 0;
};

const blankAllocation = () => ({
  project_id: '',
  cost_code_id: '',
  division_id: '',
  phase_id: '',
  sov_item_id: '',
  milestone_id: '',
  change_order_id: '',
  allocation_type: 'project',
  allocated_amount: '',
  allocation_percentage: '',
  tax_amount: '',
  markup_amount: '',
  notes: '',
});

const REF_REQUIRED_METHODS = new Set(['check', 'ach_wire', 'ach', 'wire']);

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function CategorySelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  const [custom, setCustom] = useState(false);
  const [customVal, setCustomVal] = useState('');
  if (custom) {
    return (
      <div className="flex gap-2">
        <Input value={customVal} onChange={e => setCustomVal(e.target.value)} placeholder="Type custom category..." className="rounded-none h-10 flex-1 text-sm" />
        <button onClick={() => { if (customVal.trim()) { onChange(customVal.trim()); setCustomVal(''); setCustom(false); } }} className="px-3 border border-border hover:bg-secondary/50 transition-colors text-xs">Set</button>
        <button onClick={() => setCustom(false)} className="px-3 border border-border hover:bg-secondary/50 transition-colors text-xs text-muted-foreground"><X className="w-3 h-3" /></button>
      </div>
    );
  }
  return (
    <div className="flex gap-2">
      <div className="flex-1">
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="rounded-none h-10"><SelectValue placeholder="Select category" /></SelectTrigger>
          <SelectContent>
            {options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <button onClick={() => setCustom(true)} className="px-3 border border-border hover:bg-secondary/50 transition-colors text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 shrink-0">
        <Plus className="w-3 h-3" /> Add
      </button>
    </div>
  );
}

function FieldLabel({ label, filled }: { label: string; filled?: boolean }) {
  return (
    <div className="flex items-center gap-2 mb-1.5">
      <span className="micro-label">{label}</span>
      {filled && (
        <span className="flex items-center gap-1 text-[9px] px-1.5 py-px bg-accent/10 text-accent font-semibold leading-none">
          <Sparkles className="w-2.5 h-2.5" /> Auto-filled
        </span>
      )}
    </div>
  );
}

/* ── Step indicator ──────────────────────────────────────────────────────── */
function StepIndicator({ current, labels }: { current: number; labels: string[] }) {
  return (
    <div className="flex items-start my-5">
      {labels.map((label, i) => (
        <div key={i} className={`flex items-start ${i < labels.length - 1 ? 'flex-1' : ''}`}>
          <div className="flex flex-col items-center gap-1.5 shrink-0">
            <div className={`w-7 h-7 flex items-center justify-center text-[11px] font-bold border-2 transition-all
              ${i + 1 < current ? 'bg-foreground border-foreground text-background' :
                i + 1 === current ? 'border-foreground text-foreground bg-transparent' :
                'border-border text-muted-foreground bg-transparent'}`}>
              {i + 1 < current ? '✓' : i + 1}
            </div>
            <span className={`text-[9px] uppercase tracking-[0.1em] font-medium text-center leading-tight max-w-[52px]
              ${i + 1 === current ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</span>
          </div>
          {i < labels.length - 1 && (
            <div className={`flex-1 h-px mx-2 mt-3.5 transition-colors ${current > i + 1 ? 'bg-foreground/40' : 'bg-border'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Form nav ────────────────────────────────────────────────────────────── */
function FormNav({ step, total, onBack, onNext, submitLabel, isPending }: {
  step: number; total: number; onBack: () => void; onNext: () => void; submitLabel: string; isPending: boolean;
}) {
  return (
    <div className="flex items-center gap-3 pt-5 mt-5 border-t border-border">
      {step > 1 ? (
        <Button type="button" variant="outline" className="rounded-none h-10 flex-1" onClick={onBack}>← Back</Button>
      ) : <div className="flex-1" />}
      {step < total ? (
        <Button type="button" className="rounded-none h-10 flex-1 bg-foreground text-background hover:bg-foreground/90" onClick={onNext}>Next →</Button>
      ) : (
        <Button type="submit" className="rounded-none h-10 flex-1 bg-foreground text-background hover:bg-foreground/90" disabled={isPending}>
          {isPending ? 'Saving…' : submitLabel}
        </Button>
      )}
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────────────────── */

const TXN_CSS = `
.txn-row:hover{background-color:rgba(157,126,63,0.032)!important;}
.txn-stat{background:rgba(255,255,255,0.86)!important;backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);}
.dark .txn-stat{background:hsl(var(--card))!important;backdrop-filter:none;-webkit-backdrop-filter:none;}
.dark .txn-row:hover{background-color:hsl(var(--accent) / 0.07)!important;}
`;

const INCOME_STEPS  = ['Core Details', 'Payment', 'Classification'];
const EXPENSE_STEPS = ['Core Details', 'Payment', 'Classification'];

export default function TxnPage({ kind }: { kind: 'income' | 'expense' }) {
  const { entity } = useEntity();
  const { user } = useAuth();
  const { data: txns = [] } = useTransactions(kind);
  const { data: projects = [] } = useProjects();
  const { data: vendors = [] } = useVendors();
  const { data: portalClients = [] } = usePortalClients();
  const { data: bankAccounts = [] } = useFinanceBankAccounts();
  const { data: costCodes = [] } = useFinanceCostCodes();
  const { data: divisions = [] } = useFinanceDivisions();
  const upsert = useUpsert('transactions', [['transactions']]);
  const del = useDelete('transactions', [['transactions']]);
  const allocationCreate = useCreateTransactionAllocations();
  const createVendor = useQuickCreate('vendors');
  const createProject = useQuickCreate('projects');
  const createClient = useCreatePortalClient();

  const isIncome = kind === 'income';
  const { invoices, update: updateInvoice } = useInvoices();

  const STEP_LABELS = isIncome ? INCOME_STEPS : EXPENSE_STEPS;
  const TOTAL_STEPS = 3;

  /* ── Dialog + form state ── */
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [detailRow, setDetailRow] = useState<any>(null);
  const [timePeriod, setTimePeriod] = useState('all');

  const blankForm = {
    amount: '', transaction_date: new Date().toISOString().slice(0, 10),
    transaction_number: '', external_reference: '', posting_date: new Date().toISOString().slice(0, 10),
    due_date: '', paid_date: '', tax_amount: '', currency: 'USD',
    vendor_id: '', source_name: '', portal_client_id: '', project_id: '',
    category: '', notes: '', payment_method: '',
    check_reference: '', retainage_percent: '', retainage_amount: '',
    invoice_id: '', external_invoice_provider: '', external_invoice_url: '', external_invoice_number: '',
    cost_phase: '', cost_type: '', bank_account_id: '',
    payment_status: 'paid', approval_status: 'approved', reconciliation_status: 'unreconciled',
    receipt_status: 'not_provided', billable_status: 'not_billable', reimbursable_status: 'not_reimbursable',
    expense_type: '', description: '', internal_memo: '', approval_notes: '', rejection_reason: '',
    cost_code_id: '', construction_division_id: '', project_phase_id: '', scope_item_id: '',
    milestone_id: '', change_order_id: '', purchase_order_ref: '', vendor_bill_ref: '',
    commitment_ref: '', budget_category: '', budget_line_item: '',
    quantity: '', unit: '', unit_cost: '', markup_amount: '', billable_amount: '',
    subcontractor_retainage_withheld: '', subcontractor_retainage_released: '',
  };
  const [form, setForm] = useState(blankForm);
  const [allocations, setAllocations] = useState([blankAllocation()]);
  const [autoFilled, setAutoFilled] = useState<Set<string>>(new Set());
  const { data: projectPhases = [] } = useFinanceProjectPhases(form.project_id || undefined);
  const { data: sovItems = [] } = useQuery({
    queryKey: ['project-scope-items', form.project_id],
    enabled: !!form.project_id,
    queryFn: async () => {
      const { data, error } = await supabase.from('project_scope_items').select('*').eq('project_id', form.project_id);
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: milestones = [] } = useQuery({
    queryKey: ['project-milestones', form.project_id],
    enabled: !!form.project_id,
    queryFn: async () => {
      const { data, error } = await supabase.from('project_milestones').select('*').eq('project_id', form.project_id);
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: changeOrders = [] } = useQuery({
    queryKey: ['project-change-orders', form.project_id],
    enabled: !!form.project_id,
    queryFn: async () => {
      const { data, error } = await supabase.from('project_change_orders').select('*').eq('project_id', form.project_id);
      if (error) throw error;
      return data ?? [];
    },
  });

  /* ── Receipt scanner state (external scan only) ── */
  const [scanning, setScanning] = useState(false);
  const quickCamRef    = useRef<HTMLInputElement>(null);
  const quickUploadRef = useRef<HTMLInputElement>(null);

  const applyResult = useCallback((result: ScannedReceipt) => {
    const filled = new Set<string>();
    const patch: Partial<typeof blankForm> = {};
    if (result.amount)   { patch.amount = result.amount;               filled.add('amount'); }
    if (result.date)     { patch.transaction_date = result.date;       filled.add('transaction_date'); }
    if (result.category) { patch.category = result.category;           filled.add('category'); }
    if (result.notes)    { patch.notes = result.notes;                 filled.add('notes'); }
    if (result.merchant && isIncome)  { patch.source_name = result.merchant; filled.add('source_name'); }
    if (result.merchant && !isIncome && !patch.notes) { patch.notes = result.merchant; filled.add('notes'); }
    setForm(f => ({ ...f, ...patch }));
    setAutoFilled(filled);
  }, [isIncome]);

  const processImage = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    const dataUrl: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = ev => resolve(ev.target!.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    setScanning(true);
    if (!open) { setOpen(true); setStep(1); }
    try {
      const result = await scanReceipt(dataUrl);
      applyResult(result);
      toast.success('Receipt scanned — review and save');
    } catch (e: any) {
      const msg = e.message === 'OPENAI_API_KEY_MISSING'
        ? 'Add VITE_OPENAI_API_KEY to .env to enable AI scanning'
        : (e.message || 'Could not read receipt');
      toast.error(msg);
    } finally {
      setScanning(false);
    }
  }, [open, applyResult]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processImage(f);
    e.target.value = '';
  };

  const resetDialog = () => {
    setForm(blankForm);
    setAllocations([blankAllocation()]);
    setAutoFilled(new Set());
    setStep(1);
  };

  /* ── Validation per step ── */
  const validateStep = () => {
    if (step === 1 && (!form.amount || !parseFloat(form.amount))) {
      toast.error('Amount is required');
      return false;
    }
    return true;
  };

  const amountBeforeTax = num(form.amount);
  const taxAmount = num(form.tax_amount);
  const totalAmount = amountBeforeTax + taxAmount;
  const allocationTotal = useMemo(
    () => allocations.reduce((sum, a) => sum + num(a.allocated_amount), 0),
    [allocations],
  );
  const unallocatedAmount = Math.max(0, totalAmount - allocationTotal);

  /* ── Submit ── */
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || !parseFloat(form.amount)) { toast.error('Amount required'); return; }
    try {
      const payload: Record<string, any> = {
        type: kind,
        amount: totalAmount,
        amount_before_tax: amountBeforeTax,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        net_amount: totalAmount,
        transaction_date: form.transaction_date,
        transaction_number: form.transaction_number || undefined,
        external_reference: form.external_reference || form.check_reference || null,
        posting_date: form.posting_date || form.transaction_date,
        due_date: form.due_date || null,
        cleared_date: form.paid_date || null,
        paid_date: form.paid_date || null,
        currency: form.currency || 'USD',
        category: form.category || null,
        description: form.description || form.notes || form.category || form.source_name || null,
        internal_memo: form.internal_memo || null,
        notes: form.notes || null,
        project_id: form.project_id || null,
        payment_method: form.payment_method || null,
        check_reference: form.check_reference || null,
        bank_account_id: form.bank_account_id || null,
        cost_phase: form.cost_phase || null,
        status: form.approval_status === 'draft' ? 'draft' : form.payment_status === 'paid' ? 'paid' : 'posted',
        approval_status: form.approval_status || 'approved',
        payment_status: form.payment_status || 'paid',
        reconciliation_status: form.reconciliation_status || 'unreconciled',
        receipt_status: form.receipt_status || 'not_provided',
        billable_status: form.billable_status || 'not_billable',
        reimbursable_status: form.reimbursable_status || 'not_reimbursable',
        submitted_by: user?.id || null,
        submitted_at: new Date().toISOString(),
        approved_by: form.approval_status === 'approved' ? user?.id || null : null,
        approved_at: form.approval_status === 'approved' ? new Date().toISOString() : null,
        approval_notes: form.approval_notes || null,
        rejection_reason: form.approval_status === 'rejected' ? form.rejection_reason || null : null,
        fiscal_year: new Date(form.posting_date || form.transaction_date).getFullYear(),
        accounting_period: (form.posting_date || form.transaction_date).slice(0, 7),
      };
      if (isIncome) {
        payload.source_name = form.source_name || null;
        payload.client_id = form.portal_client_id || null;
        payload.vendor_id = null;
        payload.invoice_id = form.invoice_id || null;
        payload.external_invoice_provider = form.external_invoice_provider || null;
        payload.external_invoice_url = form.external_invoice_url || null;
        payload.external_invoice_number = form.external_invoice_number || null;
        payload.retainage_percent = form.retainage_percent ? parseFloat(form.retainage_percent) : null;
        payload.retainage_amount  = form.retainage_amount  ? parseFloat(form.retainage_amount)  : null;
        if (payload.retainage_amount) payload.net_amount = Math.max(0, payload.total_amount - payload.retainage_amount);
      } else {
        const transactionId = crypto.randomUUID();
        payload.id = transactionId;
        payload.__mode = 'insert';
        payload.source_name = null;
        payload.vendor_id = form.vendor_id || null;
        payload.subcontractor_id = form.cost_type === 'subcontract' ? form.vendor_id || null : null;
        payload.cost_type = form.cost_type || null;
        payload.expense_type = form.expense_type || form.category || form.cost_type || null;
        payload.cost_code_id = form.cost_code_id || null;
        payload.construction_division_id = form.construction_division_id || null;
        payload.project_phase_id = form.project_phase_id || null;
        payload.scope_item_id = form.scope_item_id || null;
        payload.milestone_id = form.milestone_id || null;
        payload.change_order_id = form.change_order_id || null;
        payload.purchase_order_ref = form.purchase_order_ref || null;
        payload.vendor_bill_ref = form.vendor_bill_ref || null;
        payload.commitment_ref = form.commitment_ref || null;
        payload.budget_category = form.budget_category || null;
        payload.budget_line_item = form.budget_line_item || null;
        payload.quantity = form.quantity ? num(form.quantity) : null;
        payload.unit = form.unit || null;
        payload.unit_cost = form.unit_cost ? num(form.unit_cost) : null;
        payload.markup_amount = num(form.markup_amount);
        payload.billable_amount = num(form.billable_amount);
        payload.subcontractor_retainage_withheld = num(form.subcontractor_retainage_withheld);
        payload.subcontractor_retainage_released = num(form.subcontractor_retainage_released);
      }
      const saved = await upsert.mutateAsync(payload as any);
      if (isIncome && form.invoice_id && (form.external_invoice_url || form.external_invoice_provider || form.external_invoice_number || form.portal_client_id)) {
        await updateInvoice(form.invoice_id, {
          stripe_payment_link: form.external_invoice_provider === 'stripe' && form.external_invoice_url ? form.external_invoice_url : undefined,
          external_invoice_url: form.external_invoice_url || undefined,
          external_invoice_provider: form.external_invoice_provider || undefined,
          external_invoice_number: form.external_invoice_number || undefined,
          portal_client_id: form.portal_client_id || undefined,
          client_visible: true,
        } as any);
      }
      if (!isIncome) {
        const expenseId = (saved as any)?.id || payload.id;
        const preparedAllocations = allocations
          .filter(a => num(a.allocated_amount) > 0)
          .map(a => ({
            allocation_type: a.allocation_type || (a.project_id ? 'project' : 'overhead'),
            project_id: a.project_id || null,
            cost_code_id: a.cost_code_id || null,
            division_id: a.division_id || null,
            phase_id: a.phase_id || null,
            sov_item_id: a.sov_item_id || null,
            milestone_id: a.milestone_id || null,
            change_order_id: a.change_order_id || null,
            allocated_amount: num(a.allocated_amount),
            allocation_percentage: totalAmount > 0 ? (num(a.allocated_amount) / totalAmount) * 100 : null,
            tax_amount: num(a.tax_amount),
            markup_amount: num(a.markup_amount),
            notes: a.notes || null,
          }));
        if (!preparedAllocations.length && (form.project_id || form.cost_code_id || form.construction_division_id || form.project_phase_id || form.scope_item_id || form.milestone_id || form.change_order_id)) {
          preparedAllocations.push({
            allocation_type: form.project_id ? 'project' : 'overhead',
            project_id: form.project_id || null,
            cost_code_id: form.cost_code_id || null,
            division_id: form.construction_division_id || null,
            phase_id: form.project_phase_id || null,
            sov_item_id: form.scope_item_id || null,
            milestone_id: form.milestone_id || null,
            change_order_id: form.change_order_id || null,
            allocated_amount: totalAmount,
            allocation_percentage: 100,
            tax_amount: taxAmount,
            markup_amount: num(form.markup_amount),
            notes: 'Auto allocation from expense form',
          });
        }
        if (preparedAllocations.length) {
          await allocationCreate.mutateAsync({ transactionId: expenseId, allocations: preparedAllocations });
        }
      }
      toast.success(isIncome ? 'Income saved' : 'Expense saved');
      setOpen(false);
      resetDialog();
    } catch (e: any) {
      toast.error(e?.message || 'Save failed');
    }
  };

  const filteredTxns = useMemo(
    () => txns.filter((t: any) => isInFinanceRange(t.transaction_date, timePeriod)),
    [txns, timePeriod]
  );
  const selectedRangeLabel = financeRangeLabel(timePeriod);

  /* ── Exports ── */
  const total = filteredTxns.reduce((s: number, t: any) => s + Number(t.amount), 0);
  const exportPDF = () => {
    const doc = generateTransactionReport(filteredTxns, kind, selectedRangeLabel);
    savePDF(doc, `hou-${kind}-${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success(`${isIncome ? 'Income' : 'Expense'} report exported · ${selectedRangeLabel}`);
  };
  const exportExcel = () => {
    downloadTransactionExcel(filteredTxns, kind);
    toast.success(`${isIncome ? 'Income' : 'Expense'} exported as Excel · ${selectedRangeLabel}`);
  };

  return (
    <AppShell>
      <style>{TXN_CSS}</style>
      {/* Hidden inputs for quick-scan */}
      <input ref={quickCamRef}    type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileInput} />
      <input ref={quickUploadRef} type="file" accept="image/*"                       className="hidden" onChange={handleFileInput} />

      <PageHeader
        eyebrow={isIncome ? 'Capital Inflow' : 'Capital Outflow'}
        title={isIncome ? 'Income' : 'Expenses'}
        description={isIncome ? 'Recorded receipts from clients and project funding sources.' : 'Non-check expenditures by vendor and category.'}
        actions={
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2">
              <FinanceRangePicker value={timePeriod} onChange={setTimePeriod} accentColor={entity?.color} />
              <Button variant="outline" size="sm" className="rounded-none h-9 text-xs" onClick={exportPDF}>
                <FileText className="w-3.5 h-3.5 mr-1.5" />PDF
              </Button>
              <Button variant="outline" size="sm" className="rounded-none h-9 text-xs" onClick={exportExcel}>
                <Table2 className="w-3.5 h-3.5 mr-1.5" />Excel
              </Button>
            </div>

            {/* Quick-scan receipt button */}
            <Button
              variant="outline"
              size="sm"
              className="rounded-none h-9 gap-1.5 text-xs border-accent/40 text-accent hover:bg-accent hover:text-white transition-colors"
              onClick={() => quickCamRef.current?.click()}
              disabled={scanning}
            >
              {scanning
                ? <><div className="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin" /> Scanning…</>
                : <><Camera className="w-3.5 h-3.5" /> Scan Receipt</>
              }
            </Button>

            {/* Log Income / Record Expense dialog */}
            <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) resetDialog(); }}>
              <DialogTrigger asChild>
                <Button className="rounded-none h-9 text-sm">{isIncome ? 'Log Income' : 'Record Expense'}</Button>
              </DialogTrigger>
              <DialogContent className="rounded-none sm:max-w-xl w-[calc(100%-2rem)] max-h-[90vh] overflow-y-auto p-6">
                <DialogHeader className="pb-0">
                  <DialogTitle className="text-base font-semibold">
                    {isIncome ? 'Log Income' : 'Record Expense'}
                  </DialogTitle>
                  {entity && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="w-2 h-2 rounded-full" style={{ background: entity.color }} />
                      <span className="text-[11px] text-muted-foreground">{entity.shortName} · {entity.name}</span>
                    </div>
                  )}
                </DialogHeader>

                <StepIndicator current={step} labels={STEP_LABELS} />

                <form onSubmit={submit}>

                  {/* ── Step 1: Core Details ── */}
	                  {step === 1 && (
	                    <div className="space-y-5">
	                      <div className="grid grid-cols-2 gap-4">
	                        <div>
	                          <FieldLabel label={isIncome ? 'Amount *' : 'Amount before tax *'} filled={autoFilled.has('amount')} />
	                          <CurrencyInput value={form.amount} onValueChange={v => setForm(f => ({ ...f, amount: v }))} />
	                        </div>
	                        <div>
	                          <FieldLabel label="Date" filled={autoFilled.has('transaction_date')} />
	                          <DateInput className="h-10" value={form.transaction_date} onChange={e => setForm(f => ({ ...f, transaction_date: e.target.value }))} />
	                        </div>
	                      </div>
                        {!isIncome && (
                          <>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label className="micro-label mb-1.5 block">Tax amount</Label>
                                <CurrencyInput value={form.tax_amount} onValueChange={v => setForm(f => ({ ...f, tax_amount: v }))} />
                              </div>
                              <div>
                                <Label className="micro-label mb-1.5 block">Total amount</Label>
                                <div className="h-10 border border-border bg-secondary/30 px-3 flex items-center font-mono-tab text-sm">
                                  {fmtUSD(totalAmount)}
                                </div>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div>
                                <Label className="micro-label mb-1.5 block">Transaction / expense #</Label>
                                <Input className="rounded-none h-10" placeholder="Auto if blank" value={form.transaction_number} onChange={e => setForm(f => ({ ...f, transaction_number: e.target.value }))} />
                              </div>
                              <div>
                                <Label className="micro-label mb-1.5 block">Reference #</Label>
                                <Input className="rounded-none h-10" placeholder="Receipt, card, ACH..." value={form.external_reference} onChange={e => setForm(f => ({ ...f, external_reference: e.target.value }))} />
                              </div>
                              <div>
                                <Label className="micro-label mb-1.5 block">Currency</Label>
                                <Select value={form.currency} onValueChange={v => setForm(f => ({ ...f, currency: v }))}>
                                  <SelectTrigger className="rounded-none h-10"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="USD">USD</SelectItem>
                                    <SelectItem value="CAD">CAD</SelectItem>
                                    <SelectItem value="EUR">EUR</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div>
                                <Label className="micro-label mb-1.5 block">Posting date</Label>
                                <DateInput className="h-10" value={form.posting_date} onChange={e => setForm(f => ({ ...f, posting_date: e.target.value }))} />
                              </div>
                              <div>
                                <Label className="micro-label mb-1.5 block">Due date</Label>
                                <DateInput className="h-10" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
                              </div>
                              <div>
                                <Label className="micro-label mb-1.5 block">Paid date</Label>
                                <DateInput className="h-10" value={form.paid_date} onChange={e => setForm(f => ({ ...f, paid_date: e.target.value }))} />
                              </div>
                            </div>
                          </>
                        )}
	                      {isIncome ? (
                        <div>
                          <FieldLabel label="Source / Client" filled={autoFilled.has('source_name')} />
                          <div className="space-y-2">
                            <QuickCreateSelect
                              value={form.portal_client_id}
                              onValueChange={v => {
                                const client = portalClients.find(c => c.id === v);
                                setForm(f => ({ ...f, portal_client_id: v, source_name: client?.name || f.source_name }));
                              }}
                              options={portalClients.map(c => ({ id: c.id, name: c.email ? `${c.name} · ${c.email}` : c.name }))}
                              placeholder="Select registered client"
                              entityLabel="Client"
                              onCreateNew={async (name) => {
                                const result = await createClient.mutateAsync({ name });
                                toast.success(`Client "${name}" added`);
                                return { id: result.id, name: result.name };
                              }}
                            />
                            <Input
                              placeholder="Or type client/source name"
                              className="rounded-none h-10"
                              value={form.source_name}
                              onChange={e => setForm(f => ({ ...f, source_name: e.target.value, portal_client_id: '' }))}
                            />
                          </div>
                        </div>
                      ) : (
                        <div>
                          <Label className="micro-label mb-1.5 block">Vendor</Label>
                          <QuickCreateSelect
                            value={form.vendor_id}
                            onValueChange={v => setForm(f => ({ ...f, vendor_id: v }))}
                            options={vendors}
                            placeholder="Select vendor"
                            entityLabel="Vendor"
                            onCreateNew={async (name) => {
                              const result = await createVendor.mutateAsync({ name });
                              toast.success(`Vendor "${name}" created`);
                              return result;
                            }}
                          />
                        </div>
	                      )}
                        {!isIncome && (
                          <div>
                            <Label className="micro-label mb-1.5 block">Description</Label>
                            <Input className="rounded-none h-10" placeholder="What was purchased or billed?" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                          </div>
                        )}
                      <div className="bg-secondary/30 border border-border px-4 py-3">
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          {isIncome
                            ? 'Enter the gross amount received. Retainage and holdback amounts can be recorded on the final step.'
                            : 'Enter the total amount of this expense. Vendor, category, and project details follow in the next steps.'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* ── Step 2: Payment ── */}
                  {step === 2 && (
                    <div className="space-y-5">
                      <div>
                        <Label className="micro-label mb-1.5 block">Payment Method</Label>
                        <Select value={form.payment_method} onValueChange={v => setForm(f => ({ ...f, payment_method: v, check_reference: '' }))}>
                          <SelectTrigger className="rounded-none h-10"><SelectValue placeholder="Select method" /></SelectTrigger>
                          <SelectContent>
                            {(isIncome ? INCOME_PAYMENT_METHODS : EXPENSE_PAYMENT_METHODS).map(m => (
                              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
	                      {REF_REQUIRED_METHODS.has(form.payment_method) && (
                        <div>
                          <Label className="micro-label mb-1.5 block">
                            {form.payment_method === 'check' ? 'Check Number' : 'Reference / Trace #'}
                          </Label>
                          <Input
                            className="rounded-none h-10"
                            placeholder={form.payment_method === 'check' ? 'e.g. 1042' : 'Wire / ACH trace #'}
                            value={form.check_reference}
                            onChange={e => setForm(f => ({ ...f, check_reference: e.target.value }))}
                          />
                        </div>
	                      )}
                        {!isIncome && (
                          <>
                            <div>
                              <Label className="micro-label mb-1.5 block">Paid-from account</Label>
                              <Select value={form.bank_account_id} onValueChange={v => setForm(f => ({ ...f, bank_account_id: v }))}>
                                <SelectTrigger className="rounded-none h-10"><SelectValue placeholder="Select bank / card / cash account" /></SelectTrigger>
                                <SelectContent>
                                  {bankAccounts.map((acct: any) => (
                                    <SelectItem key={acct.id} value={acct.id}>
                                      {acct.account_name}{acct.bank_name ? ` · ${acct.bank_name}` : ''}{acct.masked_account ? ` · ${acct.masked_account}` : ''}
                                    </SelectItem>
                                  ))}
                                  {bankAccounts.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">No bank accounts configured</div>}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div>
                                <Label className="micro-label mb-1.5 block">Payment status</Label>
                                <Select value={form.payment_status} onValueChange={v => setForm(f => ({ ...f, payment_status: v }))}>
                                  <SelectTrigger className="rounded-none h-10"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="unpaid">Unpaid</SelectItem>
                                    <SelectItem value="partial">Partially paid</SelectItem>
                                    <SelectItem value="paid">Paid</SelectItem>
                                    <SelectItem value="voided">Voided</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="micro-label mb-1.5 block">Approval status</Label>
                                <Select value={form.approval_status} onValueChange={v => setForm(f => ({ ...f, approval_status: v }))}>
                                  <SelectTrigger className="rounded-none h-10"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="draft">Draft</SelectItem>
                                    <SelectItem value="submitted">Submitted</SelectItem>
                                    <SelectItem value="under_review">Under review</SelectItem>
                                    <SelectItem value="approved">Approved</SelectItem>
                                    <SelectItem value="rejected">Rejected</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="micro-label mb-1.5 block">Reconciliation</Label>
                                <Select value={form.reconciliation_status} onValueChange={v => setForm(f => ({ ...f, reconciliation_status: v }))}>
                                  <SelectTrigger className="rounded-none h-10"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="unreconciled">Unreconciled</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="reconciled">Reconciled</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div>
                                <Label className="micro-label mb-1.5 block">Receipt status</Label>
                                <Select value={form.receipt_status} onValueChange={v => setForm(f => ({ ...f, receipt_status: v }))}>
                                  <SelectTrigger className="rounded-none h-10"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="not_provided">Not provided</SelectItem>
                                    <SelectItem value="attached">Attached</SelectItem>
                                    <SelectItem value="pending_review">Pending review</SelectItem>
                                    <SelectItem value="verified">Verified</SelectItem>
                                    <SelectItem value="rejected">Rejected</SelectItem>
                                    <SelectItem value="missing">Missing</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="micro-label mb-1.5 block">Billable</Label>
                                <Select value={form.billable_status} onValueChange={v => setForm(f => ({ ...f, billable_status: v }))}>
                                  <SelectTrigger className="rounded-none h-10"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="not_billable">Not billable</SelectItem>
                                    <SelectItem value="billable">Billable</SelectItem>
                                    <SelectItem value="billed">Billed</SelectItem>
                                    <SelectItem value="partially_billed">Partially billed</SelectItem>
                                    <SelectItem value="written_off">Written off</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="micro-label mb-1.5 block">Reimbursable</Label>
                                <Select value={form.reimbursable_status} onValueChange={v => setForm(f => ({ ...f, reimbursable_status: v }))}>
                                  <SelectTrigger className="rounded-none h-10"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="not_reimbursable">Not reimbursable</SelectItem>
                                    <SelectItem value="reimbursable">Reimbursable</SelectItem>
                                    <SelectItem value="submitted">Submitted</SelectItem>
                                    <SelectItem value="reimbursed">Reimbursed</SelectItem>
                                    <SelectItem value="rejected">Rejected</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <Label className="micro-label mb-1.5 block">Approval notes</Label>
                                <Input className="rounded-none h-10" value={form.approval_notes} onChange={e => setForm(f => ({ ...f, approval_notes: e.target.value }))} />
                              </div>
                              {form.approval_status === 'rejected' && (
                                <div>
                                  <Label className="micro-label mb-1.5 block">Rejection reason</Label>
                                  <Input className="rounded-none h-10" value={form.rejection_reason} onChange={e => setForm(f => ({ ...f, rejection_reason: e.target.value }))} />
                                </div>
                              )}
                            </div>
                          </>
                        )}
	                      {isIncome && (
	                        <div className="border border-border bg-secondary/15 p-3 space-y-3">
                          <div>
                            <Label className="micro-label mb-1.5 block">Attach invoice record <span className="text-muted-foreground font-normal normal-case">(optional)</span></Label>
                            <Select value={form.invoice_id} onValueChange={v => {
                              const invoice = invoices.find((inv: any) => inv.id === v);
                              setForm(f => ({
                                ...f,
                                invoice_id: v,
                                external_invoice_url: invoice?.external_invoice_url || invoice?.stripe_payment_link || f.external_invoice_url,
                                external_invoice_number: invoice?.external_invoice_number || invoice?.invoice_number || f.external_invoice_number,
                                external_invoice_provider: invoice?.external_invoice_provider || (invoice?.stripe_payment_link ? 'stripe' : f.external_invoice_provider),
                              }));
                            }}>
                              <SelectTrigger className="rounded-none h-10 bg-background"><SelectValue placeholder="Select invoice (optional)" /></SelectTrigger>
                              <SelectContent>
                                {invoices.filter((inv: any) => inv.status !== 'paid').map((inv: any) => (
                                  <SelectItem key={inv.id} value={inv.id}>
                                    {inv.invoice_number} — {inv.client_name} ({inv.status})
                                  </SelectItem>
                                ))}
                                {invoices.filter((inv: any) => inv.status !== 'paid').length === 0 && (
                                  <div className="px-3 py-2 text-sm text-muted-foreground">No open invoices</div>
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-[0.75fr_1.25fr] gap-3">
                            <div>
                              <Label className="micro-label mb-1.5 block">Invoice source</Label>
                              <Select value={form.external_invoice_provider} onValueChange={v => setForm(f => ({ ...f, external_invoice_provider: v }))}>
                                <SelectTrigger className="rounded-none h-10 bg-background"><SelectValue placeholder="Stripe, QuickBooks..." /></SelectTrigger>
                                <SelectContent>
                                  {INVOICE_LINK_PROVIDERS.map(provider => <SelectItem key={provider.value} value={provider.value}>{provider.label}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="micro-label mb-1.5 block">Invoice / payment link</Label>
                              <Input
                                className="rounded-none h-10 bg-background"
                                placeholder="https://invoice.stripe.com/... or QuickBooks invoice URL"
                                value={form.external_invoice_url}
                                onChange={e => setForm(f => ({ ...f, external_invoice_url: e.target.value }))}
                              />
                            </div>
                          </div>
                          <div>
                            <Label className="micro-label mb-1.5 block">Invoice number / confirmation</Label>
                            <Input
                              className="rounded-none h-10 bg-background"
                              placeholder="INV-1042, Stripe invoice ID, QuickBooks invoice number..."
                              value={form.external_invoice_number}
                              onChange={e => setForm(f => ({ ...f, external_invoice_number: e.target.value }))}
                            />
                          </div>
                          <p className="text-[10px] text-muted-foreground leading-relaxed">
                            Add a Stripe or QuickBooks invoice link here and it will stay attached to this income record. If you choose an invoice above, the link is also saved to that invoice for portal visibility.
                          </p>
                        </div>
                      )}
                      {!form.payment_method && (
                        <div className="bg-secondary/30 border border-border px-4 py-3">
                          <p className="text-[11px] text-muted-foreground">Payment method is optional — you can skip this step if not applicable.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Step 3: Classification ── */}
                  {step === 3 && (
                    <div className="space-y-5">
                      <div>
                        <FieldLabel label="Category" filled={autoFilled.has('category')} />
                        <CategorySelect
                          value={form.category}
                          onChange={v => setForm(f => ({ ...f, category: v }))}
                          options={isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES}
                        />
                      </div>

	                      {!isIncome && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <Label className="micro-label mb-1.5 block">Expense type</Label>
                              <Select value={form.expense_type} onValueChange={v => setForm(f => ({ ...f, expense_type: v }))}>
                                <SelectTrigger className="rounded-none h-10"><SelectValue placeholder="Materials, labor, fuel..." /></SelectTrigger>
                                <SelectContent>
                                  {EXPENSE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="micro-label mb-1.5 block">Labor/material/equipment/subcontract</Label>
                              <Select value={form.cost_type} onValueChange={v => setForm(f => ({ ...f, cost_type: v }))}>
                                <SelectTrigger className="rounded-none h-10"><SelectValue placeholder="Classification" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="labor">Labor</SelectItem>
                                  <SelectItem value="material">Materials</SelectItem>
                                  <SelectItem value="subcontract">Subcontract</SelectItem>
                                  <SelectItem value="equipment">Equipment</SelectItem>
                                  <SelectItem value="overhead">Overhead</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
	                      )}

                      <div>
                        <Label className="micro-label mb-1.5 block">Cost Phase / Code <span className="text-muted-foreground font-normal normal-case">(optional)</span></Label>
                        <Select value={form.cost_phase} onValueChange={v => setForm(f => ({ ...f, cost_phase: v }))}>
                          <SelectTrigger className="rounded-none h-10"><SelectValue placeholder="Select phase (optional)" /></SelectTrigger>
                          <SelectContent>
                            {COST_PHASES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

	                      <div>
	                        <Label className="micro-label mb-1.5 block">Project</Label>
                        <QuickCreateSelect
                          value={form.project_id}
                          onValueChange={v => setForm(f => ({ ...f, project_id: v }))}
                          options={projects}
                          placeholder="Assign to project (optional)"
                          entityLabel="Project"
                          onCreateNew={async (name) => {
                            const result = await createProject.mutateAsync({ name });
                            toast.success(`Project "${name}" created`);
                            return result;
                          }}
                        />
	                      </div>

                        {!isIncome && (
                          <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <Label className="micro-label mb-1.5 block">Construction division</Label>
                                <Select value={form.construction_division_id} onValueChange={v => setForm(f => ({ ...f, construction_division_id: v }))}>
                                  <SelectTrigger className="rounded-none h-10"><SelectValue placeholder="CSI division" /></SelectTrigger>
                                  <SelectContent>
                                    {divisions.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.code} · {d.name}</SelectItem>)}
                                    {divisions.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">No divisions configured</div>}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="micro-label mb-1.5 block">Cost code</Label>
                                <Select value={form.cost_code_id} onValueChange={v => setForm(f => ({ ...f, cost_code_id: v }))}>
                                  <SelectTrigger className="rounded-none h-10"><SelectValue placeholder="Cost code" /></SelectTrigger>
                                  <SelectContent>
                                    {costCodes.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.code} · {c.name}</SelectItem>)}
                                    {costCodes.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">No cost codes configured</div>}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <Label className="micro-label mb-1.5 block">Project phase</Label>
                                <Select value={form.project_phase_id} onValueChange={v => setForm(f => ({ ...f, project_phase_id: v }))}>
                                  <SelectTrigger className="rounded-none h-10"><SelectValue placeholder="Phase" /></SelectTrigger>
                                  <SelectContent>
                                    {projectPhases.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.code ? `${p.code} · ` : ''}{p.name}</SelectItem>)}
                                    {projectPhases.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">No phases for selected project</div>}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="micro-label mb-1.5 block">Scope / SOV item</Label>
                                <Select value={form.scope_item_id} onValueChange={v => setForm(f => ({ ...f, scope_item_id: v }))}>
                                  <SelectTrigger className="rounded-none h-10"><SelectValue placeholder="SOV item" /></SelectTrigger>
                                  <SelectContent>
                                    {sovItems.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name || s.title || s.description || s.id}</SelectItem>)}
                                    {sovItems.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">No SOV items for selected project</div>}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <Label className="micro-label mb-1.5 block">Milestone</Label>
                                <Select value={form.milestone_id} onValueChange={v => setForm(f => ({ ...f, milestone_id: v }))}>
                                  <SelectTrigger className="rounded-none h-10"><SelectValue placeholder="Milestone" /></SelectTrigger>
                                  <SelectContent>
                                    {milestones.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.name || m.title || m.description || m.id}</SelectItem>)}
                                    {milestones.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">No milestones for selected project</div>}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="micro-label mb-1.5 block">Change order</Label>
                                <Select value={form.change_order_id} onValueChange={v => setForm(f => ({ ...f, change_order_id: v }))}>
                                  <SelectTrigger className="rounded-none h-10"><SelectValue placeholder="Change order" /></SelectTrigger>
                                  <SelectContent>
                                    {changeOrders.map((co: any) => <SelectItem key={co.id} value={co.id}>{co.title || co.description || co.id}</SelectItem>)}
                                    {changeOrders.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">No change orders for selected project</div>}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div><Label className="micro-label mb-1.5 block">Purchase order</Label><Input className="rounded-none h-10" value={form.purchase_order_ref} onChange={e => setForm(f => ({ ...f, purchase_order_ref: e.target.value }))} /></div>
                              <div><Label className="micro-label mb-1.5 block">Vendor bill</Label><Input className="rounded-none h-10" value={form.vendor_bill_ref} onChange={e => setForm(f => ({ ...f, vendor_bill_ref: e.target.value }))} /></div>
                              <div><Label className="micro-label mb-1.5 block">Commitment / subcontract</Label><Input className="rounded-none h-10" value={form.commitment_ref} onChange={e => setForm(f => ({ ...f, commitment_ref: e.target.value }))} /></div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                              <div><Label className="micro-label mb-1.5 block">Quantity</Label><Input className="rounded-none h-10" inputMode="decimal" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} /></div>
                              <div><Label className="micro-label mb-1.5 block">Unit</Label><Input className="rounded-none h-10" placeholder="ea, hr, sf..." value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} /></div>
                              <div><Label className="micro-label mb-1.5 block">Unit cost</Label><CurrencyInput className="h-10" value={form.unit_cost} onValueChange={v => setForm(f => ({ ...f, unit_cost: v }))} /></div>
                              <div><Label className="micro-label mb-1.5 block">Markup</Label><CurrencyInput className="h-10" value={form.markup_amount} onValueChange={v => setForm(f => ({ ...f, markup_amount: v }))} /></div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div><Label className="micro-label mb-1.5 block">Budget category</Label><Input className="rounded-none h-10" value={form.budget_category} onChange={e => setForm(f => ({ ...f, budget_category: e.target.value }))} /></div>
                              <div><Label className="micro-label mb-1.5 block">Budget line item</Label><Input className="rounded-none h-10" value={form.budget_line_item} onChange={e => setForm(f => ({ ...f, budget_line_item: e.target.value }))} /></div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div><Label className="micro-label mb-1.5 block">Billable amount</Label><CurrencyInput className="h-10" value={form.billable_amount} onValueChange={v => setForm(f => ({ ...f, billable_amount: v }))} /></div>
                              <div><Label className="micro-label mb-1.5 block">Sub retainage withheld</Label><CurrencyInput className="h-10" value={form.subcontractor_retainage_withheld} onValueChange={v => setForm(f => ({ ...f, subcontractor_retainage_withheld: v }))} /></div>
                              <div><Label className="micro-label mb-1.5 block">Sub retainage released</Label><CurrencyInput className="h-10" value={form.subcontractor_retainage_released} onValueChange={v => setForm(f => ({ ...f, subcontractor_retainage_released: v }))} /></div>
                            </div>
                          </>
                        )}

                      {isIncome && (
                        <div>
                          <Label className="micro-label mb-1.5 block">Retainage / Holdback <span className="text-muted-foreground font-normal normal-case">(optional)</span></Label>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="relative">
                              <Input
                                type="number" min="0" max="100" step="0.1"
                                className="rounded-none h-10 pr-7"
                                placeholder="e.g. 10"
                                value={form.retainage_percent}
                                onChange={e => {
                                  const pct = e.target.value;
                                  const computed = pct && form.amount ? String(Math.round(parseFloat(form.amount) * parseFloat(pct) / 100 * 100) / 100) : '';
                                  setForm(f => ({ ...f, retainage_percent: pct, retainage_amount: computed }));
                                }}
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">%</span>
                            </div>
                            <div className="relative">
                              <CurrencyInput
                                className="h-10"
                                placeholder="e.g. 10,000"
                                value={form.retainage_amount}
                                onValueChange={amt => {
                                  const computed = amt && form.amount ? String(Math.round(parseFloat(amt) / parseFloat(form.amount) * 100 * 100) / 100) : '';
                                  setForm(f => ({ ...f, retainage_amount: amt, retainage_percent: computed }));
                                }}
                              />
                            </div>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1.5">Enter % or $ — the other calculates automatically.</p>
	                        </div>
	                      )}

                        {!isIncome && (
                          <div className="border border-border bg-secondary/20 p-3 space-y-3">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <Label className="micro-label block">Split allocations</Label>
                                <p className="text-[10px] text-muted-foreground mt-1">
                                  Allocated {fmtUSD(allocationTotal)} · Remainder {fmtUSD(unallocatedAmount)}
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                className="rounded-none h-8 px-2 text-xs shrink-0"
                                onClick={() => setAllocations(prev => [...prev, blankAllocation()])}
                              >
                                <Plus className="w-3 h-3 mr-1" /> Split
                              </Button>
                            </div>

                            <div className="space-y-3">
                              {allocations.map((allocation, index) => (
                                <div key={index} className="border border-border bg-background p-3 space-y-3">
                                  <div className="flex items-center justify-between">
                                    <div className="text-[10px] uppercase tracking-[0.18em] font-bold text-muted-foreground">Allocation {index + 1}</div>
                                    {allocations.length > 1 && (
                                      <button
                                        type="button"
                                        className="text-[10px] text-muted-foreground hover:text-destructive"
                                        onClick={() => setAllocations(prev => prev.filter((_, i) => i !== index))}
                                      >
                                        Remove
                                      </button>
                                    )}
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <Select value={allocation.project_id} onValueChange={v => setAllocations(prev => prev.map((a, i) => i === index ? { ...a, project_id: v } : a))}>
                                      <SelectTrigger className="rounded-none h-9 text-xs"><SelectValue placeholder="Project" /></SelectTrigger>
                                      <SelectContent>{projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <Select value={allocation.cost_code_id} onValueChange={v => setAllocations(prev => prev.map((a, i) => i === index ? { ...a, cost_code_id: v } : a))}>
                                      <SelectTrigger className="rounded-none h-9 text-xs"><SelectValue placeholder="Cost code" /></SelectTrigger>
                                      <SelectContent>{costCodes.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.code} · {c.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <Select value={allocation.division_id} onValueChange={v => setAllocations(prev => prev.map((a, i) => i === index ? { ...a, division_id: v } : a))}>
                                      <SelectTrigger className="rounded-none h-9 text-xs"><SelectValue placeholder="Division" /></SelectTrigger>
                                      <SelectContent>{divisions.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.code} · {d.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <Select value={allocation.phase_id} onValueChange={v => setAllocations(prev => prev.map((a, i) => i === index ? { ...a, phase_id: v } : a))}>
                                      <SelectTrigger className="rounded-none h-9 text-xs"><SelectValue placeholder="Phase" /></SelectTrigger>
                                      <SelectContent>{projectPhases.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <Select value={allocation.sov_item_id} onValueChange={v => setAllocations(prev => prev.map((a, i) => i === index ? { ...a, sov_item_id: v } : a))}>
                                      <SelectTrigger className="rounded-none h-9 text-xs"><SelectValue placeholder="SOV item" /></SelectTrigger>
                                      <SelectContent>{sovItems.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name || s.title || s.description || s.id}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <Select value={allocation.change_order_id} onValueChange={v => setAllocations(prev => prev.map((a, i) => i === index ? { ...a, change_order_id: v } : a))}>
                                      <SelectTrigger className="rounded-none h-9 text-xs"><SelectValue placeholder="Change order" /></SelectTrigger>
                                      <SelectContent>{changeOrders.map((co: any) => <SelectItem key={co.id} value={co.id}>{co.title || co.description || co.id}</SelectItem>)}</SelectContent>
                                    </Select>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    <CurrencyInput className="h-9 text-xs" placeholder="Allocation amount" value={allocation.allocated_amount} onValueChange={v => setAllocations(prev => prev.map((a, i) => i === index ? { ...a, allocated_amount: v } : a))} />
                                    <CurrencyInput className="h-9 text-xs" placeholder="Tax allocation" value={allocation.tax_amount} onValueChange={v => setAllocations(prev => prev.map((a, i) => i === index ? { ...a, tax_amount: v } : a))} />
                                    <CurrencyInput className="h-9 text-xs" placeholder="Markup" value={allocation.markup_amount} onValueChange={v => setAllocations(prev => prev.map((a, i) => i === index ? { ...a, markup_amount: v } : a))} />
                                  </div>
                                  <Input
                                    className="rounded-none h-9 text-xs"
                                    placeholder="Allocation notes"
                                    value={allocation.notes}
                                    onChange={e => setAllocations(prev => prev.map((a, i) => i === index ? { ...a, notes: e.target.value } : a))}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

	                      <div>
	                        <FieldLabel label="Notes" filled={autoFilled.has('notes')} />
	                        <Textarea className="rounded-none" rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
	                      </div>
                        {!isIncome && (
                          <div>
                            <Label className="micro-label mb-1.5 block">Internal memo</Label>
                            <Textarea className="rounded-none" rows={2} value={form.internal_memo} onChange={e => setForm(f => ({ ...f, internal_memo: e.target.value }))} />
                          </div>
                        )}
	                    </div>
	                  )}

                  <FormNav
                    step={step}
                    total={TOTAL_STEPS}
                    onBack={() => setStep(s => s - 1)}
                    onNext={() => { if (validateStep()) setStep(s => s + 1); }}
                    submitLabel={isIncome ? 'Save Income' : 'Save Expense'}
                    isPending={upsert.isPending}
                  />
                </form>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      {/* Mobile export bar */}
      <div className="sm:hidden px-4 py-3 border-b border-border grid grid-cols-2 gap-2">
        <FinanceRangePicker value={timePeriod} onChange={setTimePeriod} accentColor={entity?.color} className="col-span-2" />
        <Button variant="outline" size="sm" className="rounded-none text-xs flex-1" onClick={exportPDF}><FileText className="w-3.5 h-3.5 mr-1.5" />PDF</Button>
        <Button variant="outline" size="sm" className="rounded-none text-xs flex-1" onClick={exportExcel}><Table2 className="w-3.5 h-3.5 mr-1.5" />Excel</Button>
      </div>

      {/* Mobile quick-scan banner */}
      <div className="sm:hidden px-4 py-3 border-b border-border">
        <button
          type="button"
          onClick={() => quickCamRef.current?.click()}
          disabled={scanning}
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-accent/40 text-accent text-sm font-medium hover:bg-accent/5 transition-colors"
        >
          {scanning
            ? <><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> Scanning receipt…</>
            : <><Camera className="w-4 h-4" /> Tap to scan a receipt</>
          }
        </button>
      </div>

      <div className="px-4 sm:px-8 py-5 border-b border-border flex items-center gap-6 overflow-x-auto txn-stat">
        <div className="shrink-0"><div className="micro-label">Total</div><div className="stat-value mt-1 text-lg sm:text-2xl">{fmtUSD(total)}</div></div>
        <div className="shrink-0"><div className="micro-label">Records</div><div className="stat-value mt-1 text-lg sm:text-2xl">{filteredTxns.length}</div></div>
        <div className="shrink-0"><div className="micro-label">Range</div><div className="stat-value mt-1 text-lg sm:text-2xl">{selectedRangeLabel}</div></div>
      </div>

      <div className="px-4 sm:px-8 py-6">
        {/* Mobile cards */}
        <div className="sm:hidden space-y-3">
          {filteredTxns.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">No records.</div>
          ) : filteredTxns.map((t: any) => (
            <div key={t.id} className="border border-border p-4 space-y-2 cursor-pointer" onClick={() => setDetailRow(t)}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{fmtDate(t.transaction_date)}</span>
                <span className={`text-sm font-semibold font-mono-tab ${isIncome ? 'text-positive' : 'text-destructive'}`}>{isIncome ? '+' : '−'}{fmtUSD(t.amount)}</span>
              </div>
              <div className="text-sm font-medium">{isIncome ? (t.source_name || t.vendors?.name || '—') : (t.vendors?.name || '—')}</div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{t.projects?.name || 'No project'}</span>
                <span>{isIncome ? (t.notes || '') : (t.category || '')}</span>
              </div>
              <div className="flex justify-end" onClick={e => e.stopPropagation()}>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="rounded-none h-7 text-xs text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-3.5 h-3.5 mr-1" />Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-none w-[calc(100%-2rem)]">
                    <AlertDialogHeader><AlertDialogTitle>Delete record?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                      <AlertDialogCancel className="rounded-none w-full sm:w-auto">Cancel</AlertDialogCancel>
                      <AlertDialogAction className="rounded-none bg-destructive text-destructive-foreground w-full sm:w-auto" onClick={() => del.mutate(t.id)}>Confirm</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block border border-border">
          <div className="grid grid-cols-12 gap-4 px-4 py-2.5 border-b border-border bg-secondary/40 text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium">
            <div className="col-span-2">Date</div>
            <div className="col-span-3">{isIncome ? 'Source' : 'Vendor'}</div>
            <div className="col-span-3">Project</div>
            <div className="col-span-2">{isIncome ? 'Notes' : 'Category'}</div>
            <div className="col-span-1 text-right">Amount</div>
            <div className="col-span-1 text-right">—</div>
          </div>
          {filteredTxns.length === 0 ? (
            <div className="px-4 py-16 text-center text-sm text-muted-foreground">No records.</div>
          ) : filteredTxns.map((t: any) => (
            <div key={t.id} className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-border last:border-b-0 text-sm font-mono-tab txn-row items-center cursor-pointer" onClick={() => setDetailRow(t)}>
              <div className="col-span-2 text-muted-foreground">{fmtDate(t.transaction_date)}</div>
              <div className="col-span-3 truncate">{isIncome ? (t.source_name || t.vendors?.name || '—') : (t.vendors?.name || '—')}</div>
              <div className="col-span-3 truncate text-muted-foreground">{t.projects?.name || '—'}</div>
              <div className="col-span-2 truncate text-muted-foreground">{isIncome ? (t.notes || '—') : (t.category || '—')}</div>
              <div className={`col-span-1 text-right font-semibold ${isIncome ? 'text-positive' : 'text-destructive'}`}>{isIncome ? '+' : '−'}{fmtUSD(t.amount)}</div>
              <div className="col-span-1 flex justify-end" onClick={e => e.stopPropagation()}>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-none text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-none">
                    <AlertDialogHeader><AlertDialogTitle>Delete record?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-none">Cancel</AlertDialogCancel>
                      <AlertDialogAction className="rounded-none bg-destructive text-destructive-foreground" onClick={() => del.mutate(t.id)}>Confirm</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      </div>
      <FinanceDetailDrawer open={!!detailRow} onClose={() => setDetailRow(null)} kind={kind === 'income' ? 'income' : 'expense'} data={detailRow} />
    </AppShell>
  );
}
