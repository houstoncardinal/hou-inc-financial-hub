import { useState, useRef, useCallback } from 'react';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useDelete, useProjects, useTransactions, useUpsert, useVendors, useQuickCreate } from '@/hooks/useFinance';
import { useEntity } from '@/contexts/EntityContext';
import { useInvoices } from '@/hooks/useInvoices';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fmtDate, fmtUSD } from '@/lib/format';
import { toast } from 'sonner';
import { Trash2, FileText, Table2, Plus, Camera, X, Sparkles } from 'lucide-react';
import FinanceDetailDrawer from '@/components/FinanceDetailDrawer';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { QuickCreateSelect } from '@/components/QuickCreateSelect';
import { generateTransactionReport, savePDF, downloadTransactionExcel } from '@/lib/reports';
import { scanReceipt, type ScannedReceipt } from '@/lib/receiptScan';

const EXPENSE_CATEGORIES = [
  'Materials & Supplies', 'Labor & Subcontractors', 'Permits & Fees',
  'Equipment Rental', 'Transportation & Freight', 'Office & Admin',
  'Insurance', 'Utilities', 'Marketing & Advertising',
  'Professional Services', 'Travel & Meals', 'Software & Subscriptions',
  'Maintenance & Repairs', 'Taxes & Licenses', 'Miscellaneous',
];

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

const REF_REQUIRED_METHODS = new Set(['check', 'ach_wire', 'ach', 'wire']);

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function CurrencyInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-mono-tab text-muted-foreground pointer-events-none select-none z-10">$</span>
      <Input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={e => {
          const raw = e.target.value.replace(/[^0-9.]/g, '');
          const parts = raw.split('.');
          const cleaned = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : raw;
          onChange(cleaned);
        }}
        className="pl-7 font-mono-tab text-right rounded-none h-10"
      />
    </div>
  );
}

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
  const { data: txns = [] } = useTransactions(kind);
  const { data: projects = [] } = useProjects();
  const { data: vendors = [] } = useVendors();
  const upsert = useUpsert('transactions', [['transactions']]);
  const del = useDelete('transactions', [['transactions']]);
  const createVendor = useQuickCreate('vendors');
  const createProject = useQuickCreate('projects');

  const isIncome = kind === 'income';
  const { invoices } = useInvoices();

  const STEP_LABELS = isIncome ? INCOME_STEPS : EXPENSE_STEPS;
  const TOTAL_STEPS = 3;

  /* ── Dialog + form state ── */
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [detailRow, setDetailRow] = useState<any>(null);

  const blankForm = {
    amount: '', transaction_date: new Date().toISOString().slice(0, 10),
    vendor_id: '', source_name: '', project_id: '',
    category: '', notes: '', payment_method: '',
    check_reference: '', retainage_percent: '', retainage_amount: '',
    invoice_id: '', cost_phase: '', cost_type: '',
  };
  const [form, setForm] = useState(blankForm);
  const [autoFilled, setAutoFilled] = useState<Set<string>>(new Set());

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

  /* ── Submit ── */
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || !parseFloat(form.amount)) { toast.error('Amount required'); return; }
    try {
      const payload: Record<string, any> = {
        type: kind,
        amount: parseFloat(form.amount),
        transaction_date: form.transaction_date,
        category: form.category || null,
        notes: form.notes || null,
        project_id: form.project_id || null,
        payment_method: form.payment_method || null,
        check_reference: form.check_reference || null,
        cost_phase: form.cost_phase || null,
      };
      if (isIncome) {
        payload.source_name = form.source_name || null;
        payload.vendor_id = null;
        payload.invoice_id = form.invoice_id || null;
        payload.retainage_percent = form.retainage_percent ? parseFloat(form.retainage_percent) : null;
        payload.retainage_amount  = form.retainage_amount  ? parseFloat(form.retainage_amount)  : null;
      } else {
        payload.source_name = null;
        payload.vendor_id = form.vendor_id || null;
        payload.cost_type = form.cost_type || null;
      }
      await upsert.mutateAsync(payload as any);
      toast.success(isIncome ? 'Income saved' : 'Expense saved');
      setOpen(false);
      resetDialog();
    } catch (e: any) {
      toast.error(e?.message || 'Save failed');
    }
  };

  /* ── Exports ── */
  const total = txns.reduce((s: number, t: any) => s + Number(t.amount), 0);
  const exportPDF = () => {
    const doc = generateTransactionReport(txns, kind);
    savePDF(doc, `hou-${kind}-${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success(`${isIncome ? 'Income' : 'Expense'} report exported`);
  };
  const exportExcel = () => {
    downloadTransactionExcel(txns, kind);
    toast.success(`${isIncome ? 'Income' : 'Expense'} exported as Excel`);
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
                          <FieldLabel label="Amount *" filled={autoFilled.has('amount')} />
                          <CurrencyInput value={form.amount} onChange={v => setForm(f => ({ ...f, amount: v }))} />
                        </div>
                        <div>
                          <FieldLabel label="Date" filled={autoFilled.has('transaction_date')} />
                          <Input type="date" className="rounded-none h-10" value={form.transaction_date} onChange={e => setForm(f => ({ ...f, transaction_date: e.target.value }))} />
                        </div>
                      </div>
                      {isIncome ? (
                        <div>
                          <FieldLabel label="Source / Client" filled={autoFilled.has('source_name')} />
                          <Input placeholder="Client name or funding source" className="rounded-none h-10" value={form.source_name} onChange={e => setForm(f => ({ ...f, source_name: e.target.value }))} />
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
                      {isIncome && (
                        <div>
                          <Label className="micro-label mb-1.5 block">Link to Invoice <span className="text-muted-foreground font-normal normal-case">(marks it paid)</span></Label>
                          <Select value={form.invoice_id} onValueChange={v => setForm(f => ({ ...f, invoice_id: v }))}>
                            <SelectTrigger className="rounded-none h-10"><SelectValue placeholder="Select invoice (optional)" /></SelectTrigger>
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
                        <div>
                          <Label className="micro-label mb-1.5 block">Cost Type</Label>
                          <Select value={form.cost_type} onValueChange={v => setForm(f => ({ ...f, cost_type: v }))}>
                            <SelectTrigger className="rounded-none h-10"><SelectValue placeholder="Labor / Material / …" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="labor">Labor</SelectItem>
                              <SelectItem value="material">Materials</SelectItem>
                              <SelectItem value="subcontract">Subcontract</SelectItem>
                              <SelectItem value="permit">Permits & Fees</SelectItem>
                              <SelectItem value="equipment">Equipment</SelectItem>
                              <SelectItem value="overhead">Overhead</SelectItem>
                            </SelectContent>
                          </Select>
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
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">$</span>
                              <Input
                                type="number" min="0" step="0.01"
                                className="rounded-none h-10 pl-6"
                                placeholder="e.g. 10,000"
                                value={form.retainage_amount}
                                onChange={e => {
                                  const amt = e.target.value;
                                  const computed = amt && form.amount ? String(Math.round(parseFloat(amt) / parseFloat(form.amount) * 100 * 100) / 100) : '';
                                  setForm(f => ({ ...f, retainage_amount: amt, retainage_percent: computed }));
                                }}
                              />
                            </div>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1.5">Enter % or $ — the other calculates automatically.</p>
                        </div>
                      )}

                      <div>
                        <FieldLabel label="Notes" filled={autoFilled.has('notes')} />
                        <Textarea className="rounded-none" rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                      </div>
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
      <div className="sm:hidden px-4 py-3 border-b border-border flex gap-2">
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
        <div className="shrink-0"><div className="micro-label">Records</div><div className="stat-value mt-1 text-lg sm:text-2xl">{txns.length}</div></div>
      </div>

      <div className="px-4 sm:px-8 py-6">
        {/* Mobile cards */}
        <div className="sm:hidden space-y-3">
          {txns.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">No records.</div>
          ) : txns.map((t: any) => (
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
          {txns.length === 0 ? (
            <div className="px-4 py-16 text-center text-sm text-muted-foreground">No records.</div>
          ) : txns.map((t: any) => (
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
