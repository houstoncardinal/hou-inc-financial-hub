import { useMemo, useState } from 'react';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useChecks, useProjects, useTransactions, useUpsert, useDelete, useQuickCreate, useVendors } from '@/hooks/useFinance';
import { fmtDate, fmtUSD } from '@/lib/format';
import { generateLedgerReport, savePDF, downloadLedgerExcel } from '@/lib/reports';
import { FileText, Table2, Plus, Trash2, CheckSquare, Square } from 'lucide-react';
import { toast } from 'sonner';
import { QuickCreateSelect } from '@/components/QuickCreateSelect';
import FinanceDetailDrawer from '@/components/FinanceDetailDrawer';

const EXPENSE_CATEGORIES = [
  'Materials & Supplies', 'Labor & Subcontractors', 'Permits & Fees',
  'Equipment Rental', 'Transportation & Freight', 'Office & Admin',
  'Insurance', 'Utilities', 'Marketing & Advertising',
  'Professional Services', 'Travel & Meals', 'Software & Subscriptions',
  'Maintenance & Repairs', 'Taxes & Licenses', 'Miscellaneous',
];

const INCOME_CATEGORIES = [
  'Client Payment', 'Retainer', 'Project Milestone', 'Consulting Fee',
  'Reimbursement', 'Interest Income', 'Grant', 'Investment', 'Refund', 'Other Income',
];

const COST_PHASES = [
  'Phase 1: Site Prep & Demo', 'Phase 2: Foundation & Concrete', 'Phase 3: Framing & Structure',
  'Phase 4: Rough-Ins (MEP)', 'Phase 5: Exterior & Roofing', 'Phase 6: Insulation & Drywall',
  'Phase 7: Finishes & Fixtures', 'Phase 8: Landscaping & Final', 'General / Overhead',
];

const INCOME_METHODS  = [{ v:'check',label:'Check' },{ v:'ach_wire',label:'ACH / Wire' },{ v:'credit_card',label:'Credit Card' },{ v:'financing_draw',label:'Financing Draw' },{ v:'cash',label:'Cash' },{ v:'other',label:'Other' }];
const EXPENSE_METHODS = [{ v:'check',label:'Check' },{ v:'credit_card',label:'Credit Card' },{ v:'ach',label:'ACH' },{ v:'net_30',label:'NET 30' },{ v:'net_60',label:'NET 60' },{ v:'net_90',label:'NET 90' },{ v:'cash',label:'Cash' },{ v:'wire',label:'Wire' },{ v:'other',label:'Other' }];
const REF_METHODS = new Set(['check','ach_wire','ach','wire']);

function CurrencyInput({ value, onChange, className = '' }: { value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-mono-tab text-muted-foreground pointer-events-none select-none z-10">$</span>
      <Input type="text" inputMode="decimal" value={value}
        onChange={e => { const raw = e.target.value.replace(/[^0-9.]/g, ''); const p = raw.split('.'); onChange(p.length > 2 ? p[0] + '.' + p.slice(1).join('') : raw); }}
        className={`pl-7 font-mono-tab text-right rounded-none h-10 ${className}`} />
    </div>
  );
}

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

function FormNav({ step, total, onBack, onNext, submitLabel, isPending }: {
  step: number; total: number; onBack: () => void; onNext: () => void; submitLabel: string; isPending?: boolean;
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

const LDG_CSS = `
.ldg-stat{background:rgba(255,255,255,0.86)!important;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);transition:background 0.22s,box-shadow 0.22s;}
.ldg-stat:hover{background:rgba(255,255,255,0.97)!important;box-shadow:0 4px 22px rgba(10,10,10,0.08);}
.ldg-row:hover{background-color:rgba(157,126,63,0.032)!important;}
.ldg-badge{border-radius:9999px!important;padding:2px 9px!important;font-weight:700!important;letter-spacing:.18em!important;}
.ldg-type-check{background:rgba(157,126,63,0.07)!important;border-color:rgba(157,126,63,0.28)!important;color:#9D7E3F!important;}
.ldg-type-income{background:rgba(34,197,94,0.07)!important;border-color:rgba(34,197,94,0.28)!important;color:rgb(21,128,61)!important;}
.ldg-type-expense{background:rgba(239,68,68,0.07)!important;border-color:rgba(239,68,68,0.28)!important;color:rgb(185,28,28)!important;}
.dark .ldg-stat{background:hsl(var(--card))!important;backdrop-filter:none;-webkit-backdrop-filter:none;}
.dark .ldg-stat:hover{background:hsl(var(--secondary))!important;box-shadow:0 4px 22px rgba(0,0,0,0.25);}
.dark .ldg-row:hover{background-color:hsl(var(--accent) / 0.07)!important;}
.dark .ldg-type-income{color:hsl(142 72% 55%)!important;}
.dark .ldg-type-expense{color:hsl(0 84% 70%)!important;}
`;

export default function Ledger() {
  const { data: checks = [] } = useChecks();
  const { data: income = [] } = useTransactions('income');
  const { data: expenses = [] } = useTransactions('expense');
  const { data: projects = [] } = useProjects();
  const { data: vendors = [] } = useVendors();
  const deleteCheck = useDelete('checks', [['checks']]);
  const deleteTxn   = useDelete('transactions', [['transactions']]);
  const txnUpsert   = useUpsert('transactions', [['transactions']]);
  const checkUpsert = useUpsert('checks', [['checks']]);
  const createVendor  = useQuickCreate('vendors');
  const createProject = useQuickCreate('projects');

  const [q, setQ] = useState('');
  const [project, setProject] = useState('all');
  const [type, setType] = useState('all');
  const [addOpen, setAddOpen] = useState<'income' | 'expense' | 'check' | null>(null);
  const [detailRow, setDetailRow] = useState<any>(null);
  const [reconcileMode, setReconcileMode] = useState(false);

  /* ── Per-form step state ── */
  const [incomeStep,  setIncomeStep]  = useState(1);
  const [expenseStep, setExpenseStep] = useState(1);
  const [checkStep,   setCheckStep]   = useState(1);

  const blankIncome  = { amount: '', transaction_date: new Date().toISOString().slice(0, 10), source_name: '', project_id: '', category: '', notes: '', payment_method: '', check_reference: '', retainage_percent: '', retainage_amount: '', cost_phase: '' };
  const blankExpense = { amount: '', transaction_date: new Date().toISOString().slice(0, 10), vendor_id: '', project_id: '', category: '', notes: '', payment_method: '', cost_type: '', check_reference: '', cost_phase: '' };
  const blankCheck   = { amount: '', issue_date: new Date().toISOString().slice(0, 10), payee_name: '', check_number: '', memo: '', project_id: '' };

  const [formIncome,  setFormIncome]  = useState(blankIncome);
  const [formExpense, setFormExpense] = useState(blankExpense);
  const [formCheck,   setFormCheck]   = useState(blankCheck);

  const openAdd = (kind: 'income' | 'expense' | 'check') => {
    if (kind === 'income')  { setFormIncome(blankIncome);   setIncomeStep(1); }
    if (kind === 'expense') { setFormExpense(blankExpense); setExpenseStep(1); }
    if (kind === 'check')   { setFormCheck(blankCheck);     setCheckStep(1); }
    setAddOpen(kind);
  };

  const closeAdd = () => setAddOpen(null);

  const rows = useMemo(() => {
    const a = [
      ...checks.map((c: any) => ({ id: c.id, rowId: 'c'+c.id, date: c.issue_date, type: 'Check',   ref: c.check_number,   party: c.payee_name,                     project: c.projects?.name, project_id: c.project_id, amount: -Number(c.amount), status: c.status, reconciled: c.reconciled, _kind: 'check' as const })),
      ...income.map((t: any) => ({ id: t.id, rowId: 'i'+t.id, date: t.transaction_date, type: 'Income',  ref: '—',             party: t.source_name || t.vendors?.name || '—', project: t.projects?.name, project_id: t.project_id, amount:  Number(t.amount), status: '—', reconciled: t.reconciled, _kind: 'income' as const })),
      ...expenses.map((t: any) => ({ id: t.id, rowId: 'e'+t.id, date: t.transaction_date, type: 'Expense', ref: t.category || '—', party: t.vendors?.name || '—',         project: t.projects?.name, project_id: t.project_id, amount: -Number(t.amount), status: '—', reconciled: t.reconciled, _kind: 'expense' as const })),
    ];
    return a.filter(r => {
      if (project !== 'all' && r.project_id !== project) return false;
      if (type !== 'all' && r.type.toLowerCase() !== type) return false;
      if (q && !(r.party?.toLowerCase().includes(q.toLowerCase()) || r.ref?.toString().toLowerCase().includes(q.toLowerCase()))) return false;
      return true;
    }).sort((x, y) => y.date.localeCompare(x.date));
  }, [checks, income, expenses, project, type, q]);

  const totals = useMemo(() => {
    const inflow  = rows.filter(r => r.amount > 0).reduce((s, r) => s + r.amount, 0);
    const outflow = rows.filter(r => r.amount < 0).reduce((s, r) => s + Math.abs(r.amount), 0);
    return { inflow, outflow, net: inflow - outflow };
  }, [rows]);

  const exportPDF = () => {
    const proj = project !== 'all' ? projects.find((p: any) => p.id === project)?.name : undefined;
    const doc = generateLedgerReport(income, expenses, checks, proj, type !== 'all' ? type : undefined);
    savePDF(doc, `hou-general-ledger-${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success('Ledger exported as PDF');
  };

  const exportExcel = () => { downloadLedgerExcel(income, expenses, checks); toast.success('Ledger exported as Excel (4 sheets)'); };

  const submitIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formIncome.amount) { toast.error('Amount required'); return; }
    await txnUpsert.mutateAsync({
      type: 'income', amount: parseFloat(formIncome.amount), transaction_date: formIncome.transaction_date,
      source_name: formIncome.source_name || null, project_id: formIncome.project_id || null,
      category: formIncome.category || null, notes: formIncome.notes || null,
      payment_method: formIncome.payment_method || null, check_reference: formIncome.check_reference || null,
      retainage_percent: formIncome.retainage_percent ? parseFloat(formIncome.retainage_percent) : null,
      retainage_amount:  formIncome.retainage_amount  ? parseFloat(formIncome.retainage_amount)  : null,
      cost_phase: formIncome.cost_phase || null,
    } as any);
    toast.success('Income logged'); closeAdd();
  };

  const submitExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formExpense.amount) { toast.error('Amount required'); return; }
    await txnUpsert.mutateAsync({
      type: 'expense', amount: parseFloat(formExpense.amount), transaction_date: formExpense.transaction_date,
      vendor_id: formExpense.vendor_id || null, project_id: formExpense.project_id || null,
      category: formExpense.category || null, notes: formExpense.notes || null,
      payment_method: formExpense.payment_method || null, cost_type: formExpense.cost_type || null,
      check_reference: formExpense.check_reference || null, cost_phase: formExpense.cost_phase || null,
    } as any);
    toast.success('Expense recorded'); closeAdd();
  };

  const submitCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCheck.amount || !formCheck.payee_name) { toast.error('Amount and payee required'); return; }
    await checkUpsert.mutateAsync({ amount: parseFloat(formCheck.amount), payee_name: formCheck.payee_name, issue_date: formCheck.issue_date, check_number: formCheck.check_number || null, memo: formCheck.memo || null, project_id: formCheck.project_id || null, status: 'pending' } as any);
    toast.success('Check created'); closeAdd();
  };

  const toggleReconcile = async (r: any) => {
    const now = new Date().toISOString();
    const payload = { id: r.id, reconciled: !r.reconciled, reconciled_at: !r.reconciled ? now : null };
    try {
      if (r._kind === 'check') await checkUpsert.mutateAsync(payload as any);
      else await txnUpsert.mutateAsync({ ...payload, type: r.type.toLowerCase() } as any);
      toast.success(payload.reconciled ? 'Marked reconciled' : 'Unmarked');
    } catch { toast.error('Failed to update'); }
  };

  const fld = (label: string) => <Label className="micro-label mb-1.5 block">{label}</Label>;

  return (
    <AppShell>
      <style>{LDG_CSS}</style>
      <PageHeader eyebrow="Unified Ledger" title="Transaction Ledger" description="Complete chronological record of all capital movement."
        actions={
          <div className="hidden sm:flex items-center gap-2">
            <div className="flex items-center gap-1 mr-1 border-r border-border pr-3">
              <button onClick={() => openAdd('income')}  className="flex items-center gap-1 px-2.5 h-8 text-[10px] uppercase tracking-[0.1em] bg-positive/10 text-positive hover:bg-positive/20 transition-colors font-medium"><Plus className="w-3 h-3" /> Income</button>
              <button onClick={() => openAdd('expense')} className="flex items-center gap-1 px-2.5 h-8 text-[10px] uppercase tracking-[0.1em] bg-accent/10 text-accent hover:bg-accent/20 transition-colors font-medium"><Plus className="w-3 h-3" /> Expense</button>
              <button onClick={() => openAdd('check')}   className="flex items-center gap-1 px-2.5 h-8 text-[10px] uppercase tracking-[0.1em] bg-foreground/10 text-foreground hover:bg-foreground/20 transition-colors font-medium"><Plus className="w-3 h-3" /> Check</button>
            </div>
            <Button variant="outline" size="icon" className="rounded-none h-8 w-8" onClick={exportPDF}><FileText className="w-3.5 h-3.5" /></Button>
            <Button variant="outline" size="icon" className="rounded-none h-8 w-8" onClick={exportExcel}><Table2 className="w-3.5 h-3.5" /></Button>
            <button onClick={() => setReconcileMode(m => !m)} className={`flex items-center gap-1.5 px-2.5 h-8 text-[10px] uppercase tracking-[0.1em] font-medium border transition-colors ${reconcileMode ? 'bg-positive/10 text-positive border-positive/30' : 'border-border text-muted-foreground hover:text-foreground'}`}>
              <CheckSquare className="w-3 h-3" /> Reconcile
            </button>
          </div>
        } />

      {/* Mobile add + export */}
      <div className="sm:hidden px-4 py-3 border-b border-border flex gap-2 flex-wrap">
        <button onClick={() => openAdd('income')}  className="flex items-center gap-1 px-3 h-8 text-[10px] uppercase tracking-[0.1em] bg-positive/10 text-positive font-medium"><Plus className="w-3 h-3" /> Income</button>
        <button onClick={() => openAdd('expense')} className="flex items-center gap-1 px-3 h-8 text-[10px] uppercase tracking-[0.1em] bg-accent/10 text-accent font-medium"><Plus className="w-3 h-3" /> Expense</button>
        <button onClick={() => openAdd('check')}   className="flex items-center gap-1 px-3 h-8 text-[10px] uppercase tracking-[0.1em] bg-foreground/10 text-foreground font-medium"><Plus className="w-3 h-3" /> Check</button>
        <div className="flex-1" />
        <Button variant="outline" size="sm" className="rounded-none h-8 text-[10px] px-2" onClick={exportPDF}><FileText className="w-3 h-3 mr-1" />PDF</Button>
        <Button variant="outline" size="sm" className="rounded-none h-8 text-[10px] px-2" onClick={exportExcel}><Table2 className="w-3 h-3 mr-1" />Excel</Button>
      </div>

      <div className="px-4 sm:px-8 py-4 border-b border-border grid grid-cols-3 gap-px bg-border/50">
        {[{ l:'Inflow', v:fmtUSD(totals.inflow), c:'text-positive' },{ l:'Outflow', v:fmtUSD(totals.outflow), c:'text-destructive' },{ l:'Net Position', v:fmtUSD(totals.net), c:totals.net>=0?'text-positive':'text-destructive' }].map(s => (
          <div key={s.l} className="ldg-stat px-4 sm:px-5 py-3"><div className="micro-label">{s.l}</div><div className={`text-base sm:text-xl font-semibold font-mono-tab mt-1 ${s.c}`}>{s.v}</div></div>
        ))}
      </div>

      <div className="px-4 sm:px-8 py-3 border-b border-border flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
        <Input placeholder="Search counterparty or reference…" value={q} onChange={e => setQ(e.target.value)} className="rounded-none max-w-xs h-9 w-full sm:w-auto text-sm" />
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="rounded-none w-full sm:w-32 h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All types</SelectItem><SelectItem value="check">Checks</SelectItem><SelectItem value="income">Income</SelectItem><SelectItem value="expense">Expenses</SelectItem></SelectContent>
        </Select>
        <Select value={project} onValueChange={setProject}>
          <SelectTrigger className="rounded-none w-full sm:w-44 h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All projects</SelectItem>{projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
        </Select>
        <div className="sm:ml-auto text-[10px] text-muted-foreground font-mono-tab">{rows.length} entries</div>
      </div>

      <div className="px-4 sm:px-8 py-6">
        {/* Mobile card view */}
        <div className="sm:hidden space-y-3">
          {rows.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">No entries match.</div>
          ) : rows.map(r => (
            <div key={r.rowId} className="border border-border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className={`text-[10px] uppercase tracking-[0.14em] px-1.5 py-0.5 border ldg-badge ${r.type==='Check'?'ldg-type-check':r.type==='Income'?'ldg-type-income':'ldg-type-expense'}`}>{r.type}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold font-mono-tab ${r.amount>=0?'text-positive':'text-destructive'}`}>{r.amount>=0?'+':'−'}{fmtUSD(Math.abs(r.amount))}</span>
                  <AlertDialog>
                    <AlertDialogTrigger asChild><button className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-3.5 h-3.5" /></button></AlertDialogTrigger>
                    <AlertDialogContent className="rounded-none w-[calc(100%-2rem)]">
                      <AlertDialogHeader><AlertDialogTitle>Delete this {r.type.toLowerCase()}?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                        <AlertDialogCancel className="rounded-none w-full sm:w-auto">Cancel</AlertDialogCancel>
                        <AlertDialogAction className="rounded-none bg-destructive text-destructive-foreground w-full sm:w-auto" onClick={async () => { try { if (r._kind==='check') await deleteCheck.mutateAsync(r.id); else await deleteTxn.mutateAsync(r.id); toast.success('Deleted'); } catch(err:any){toast.error(err.message);} }}>Confirm</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              <div className="text-sm font-medium">{r.party}</div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{r.project||'—'}</span><span className="font-mono-tab">{fmtDate(r.date)}</span>
              </div>
              <div className="text-[10px] text-muted-foreground">Ref: {r.ref}</div>
            </div>
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block border border-border">
          {reconcileMode && (
            <div className="px-4 py-2 border-b border-border bg-positive/5 text-[10px] font-medium text-positive flex items-center gap-2">
              <CheckSquare className="w-3 h-3" /> Reconcile mode — click the checkbox to mark entries as reconciled
            </div>
          )}
          <div className="grid grid-cols-[2fr_1fr_1.5fr_2.5fr_2fr_1.5fr_36px] gap-3 px-4 py-2.5 border-b border-border bg-secondary/40 text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium items-center">
            <div>Date</div><div>Type</div><div>Ref</div><div>Counterparty</div><div>Project</div><div className="text-right">Amount</div><div />
          </div>
          {rows.length === 0 ? <div className="px-4 py-16 text-center text-sm text-muted-foreground">No entries match.</div> :
            rows.map(r => (
              <div key={r.rowId} className={`grid grid-cols-[2fr_1fr_1.5fr_2.5fr_2fr_1.5fr_36px] gap-3 px-4 py-3 border-b border-border last:border-b-0 text-sm font-mono-tab items-center group ldg-row cursor-pointer ${r.reconciled ? 'opacity-50' : ''}`} onClick={() => setDetailRow(r)}>
                <div className="text-muted-foreground">{fmtDate(r.date)}</div>
                <div><span className={`text-[10px] uppercase tracking-[0.14em] px-1.5 py-0.5 border ldg-badge ${r.type==='Check'?'ldg-type-check':r.type==='Income'?'ldg-type-income':'ldg-type-expense'}`}>{r.type}</span></div>
                <div className="truncate text-muted-foreground">{r.ref}</div>
                <div className="truncate">{r.party}</div>
                <div className="truncate text-muted-foreground">{r.project||'—'}</div>
                <div className={`text-right font-semibold ${r.amount>=0?'text-positive':'text-destructive'}`}>{r.amount>=0?'+':'−'}{fmtUSD(Math.abs(r.amount))}</div>
                <div className="flex justify-end" onClick={e => e.stopPropagation()}>
                  {reconcileMode ? (
                    <button onClick={() => toggleReconcile(r)} className="text-muted-foreground hover:text-positive transition-colors">
                      {r.reconciled ? <CheckSquare className="w-3.5 h-3.5 text-positive" /> : <Square className="w-3.5 h-3.5" />}
                    </button>
                  ) : (
                    <AlertDialog>
                      <AlertDialogTrigger asChild><button className="text-muted-foreground/0 group-hover:text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} /></button></AlertDialogTrigger>
                      <AlertDialogContent className="rounded-none">
                        <AlertDialogHeader><AlertDialogTitle>Delete this {r.type.toLowerCase()}?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="rounded-none">Cancel</AlertDialogCancel>
                          <AlertDialogAction className="rounded-none bg-destructive text-destructive-foreground" onClick={async () => { try { if (r._kind==='check') await deleteCheck.mutateAsync(r.id); else await deleteTxn.mutateAsync(r.id); toast.success('Deleted'); } catch(err:any){toast.error(err.message);} }}>Confirm</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* ── Add dialogs ── */}
      <Dialog open={!!addOpen} onOpenChange={o => { if (!o) closeAdd(); }}>
        <DialogContent className="rounded-none sm:max-w-xl w-[calc(100%-2rem)] max-h-[90vh] overflow-y-auto p-6">

          {/* ══ INCOME FORM ══ */}
          {addOpen === 'income' && (
            <>
              <DialogHeader className="pb-0">
                <DialogTitle className="text-base font-semibold">Log Income</DialogTitle>
              </DialogHeader>
              <StepIndicator current={incomeStep} labels={['Core Details', 'Payment', 'Classification']} />
              <form onSubmit={submitIncome}>

                {incomeStep === 1 && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div>{fld('Amount *')}<CurrencyInput value={formIncome.amount} onChange={v => setFormIncome(f => ({...f, amount: v}))} /></div>
                      <div>{fld('Date')}<Input type="date" className="rounded-none h-10" value={formIncome.transaction_date} onChange={e => setFormIncome(f => ({...f, transaction_date: e.target.value}))} /></div>
                    </div>
                    <div>
                      {fld('Source / Client')}
                      <Input placeholder="Client name or funding source" className="rounded-none h-10" value={formIncome.source_name} onChange={e => setFormIncome(f => ({...f, source_name: e.target.value}))} />
                    </div>
                    <div className="bg-secondary/30 border border-border px-4 py-3">
                      <p className="text-[11px] text-muted-foreground">Enter the gross amount received. Retainage details can be added in the final step.</p>
                    </div>
                  </div>
                )}

                {incomeStep === 2 && (
                  <div className="space-y-5">
                    <div>
                      {fld('Payment Method')}
                      <Select value={formIncome.payment_method} onValueChange={v => setFormIncome(f => ({...f, payment_method: v, check_reference: ''}))}>
                        <SelectTrigger className="rounded-none h-10"><SelectValue placeholder="Select method" /></SelectTrigger>
                        <SelectContent>{INCOME_METHODS.map(m => <SelectItem key={m.v} value={m.v}>{m.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    {REF_METHODS.has(formIncome.payment_method) && (
                      <div>
                        {fld(formIncome.payment_method === 'check' ? 'Check Number' : 'Reference / Trace #')}
                        <Input className="rounded-none h-10" placeholder={formIncome.payment_method === 'check' ? 'e.g. 1042' : 'Wire / ACH trace #'} value={formIncome.check_reference} onChange={e => setFormIncome(f => ({...f, check_reference: e.target.value}))} />
                      </div>
                    )}
                    {!formIncome.payment_method && (
                      <div className="bg-secondary/30 border border-border px-4 py-3">
                        <p className="text-[11px] text-muted-foreground">Payment method is optional — you can skip this step.</p>
                      </div>
                    )}
                  </div>
                )}

                {incomeStep === 3 && (
                  <div className="space-y-5">
                    <div>
                      {fld('Category')}
                      <Select value={formIncome.category} onValueChange={v => setFormIncome(f => ({...f, category: v}))}>
                        <SelectTrigger className="rounded-none h-10"><SelectValue placeholder="Select category" /></SelectTrigger>
                        <SelectContent>{INCOME_CATEGORIES.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      {fld('Cost Phase / Code (optional)')}
                      <Select value={formIncome.cost_phase} onValueChange={v => setFormIncome(f => ({...f, cost_phase: v}))}>
                        <SelectTrigger className="rounded-none h-10"><SelectValue placeholder="Select phase (optional)" /></SelectTrigger>
                        <SelectContent>{COST_PHASES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      {fld('Project')}
                      <QuickCreateSelect value={formIncome.project_id} onValueChange={v => setFormIncome(f => ({...f, project_id: v}))} options={projects} placeholder="Assign to project (optional)" entityLabel="Project" onCreateNew={async name => { const r = await createProject.mutateAsync({ name }); toast.success(`Project "${name}" created`); return r; }} />
                    </div>
                    <div>
                      {fld('Retainage / Holdback (optional)')}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="relative">
                          <Input type="number" min="0" max="100" step="0.1" className="rounded-none h-10 pr-7" placeholder="e.g. 10" value={formIncome.retainage_percent}
                            onChange={e => { const pct = e.target.value; const computed = pct && formIncome.amount ? String(Math.round(parseFloat(formIncome.amount)*parseFloat(pct)/100*100)/100) : ''; setFormIncome(f => ({...f, retainage_percent: pct, retainage_amount: computed})); }} />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">%</span>
                        </div>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">$</span>
                          <Input type="number" min="0" step="0.01" className="rounded-none h-10 pl-6" placeholder="e.g. 10,000" value={formIncome.retainage_amount}
                            onChange={e => { const amt = e.target.value; const computed = amt && formIncome.amount ? String(Math.round(parseFloat(amt)/parseFloat(formIncome.amount)*100*100)/100) : ''; setFormIncome(f => ({...f, retainage_amount: amt, retainage_percent: computed})); }} />
                        </div>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1.5">Enter % or $ — the other calculates automatically.</p>
                    </div>
                    <div>
                      {fld('Notes')}
                      <Textarea className="rounded-none" rows={3} value={formIncome.notes} onChange={e => setFormIncome(f => ({...f, notes: e.target.value}))} />
                    </div>
                  </div>
                )}

                <FormNav step={incomeStep} total={3} onBack={() => setIncomeStep(s => s-1)} onNext={() => { if (incomeStep===1 && !formIncome.amount){toast.error('Amount required');return;} setIncomeStep(s=>s+1); }} submitLabel="Save Income" isPending={txnUpsert.isPending} />
              </form>
            </>
          )}

          {/* ══ EXPENSE FORM ══ */}
          {addOpen === 'expense' && (
            <>
              <DialogHeader className="pb-0">
                <DialogTitle className="text-base font-semibold">Record Expense</DialogTitle>
              </DialogHeader>
              <StepIndicator current={expenseStep} labels={['Core Details', 'Payment', 'Classification']} />
              <form onSubmit={submitExpense}>

                {expenseStep === 1 && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div>{fld('Amount *')}<CurrencyInput value={formExpense.amount} onChange={v => setFormExpense(f => ({...f, amount: v}))} /></div>
                      <div>{fld('Date')}<Input type="date" className="rounded-none h-10" value={formExpense.transaction_date} onChange={e => setFormExpense(f => ({...f, transaction_date: e.target.value}))} /></div>
                    </div>
                    <div>
                      {fld('Vendor')}
                      <QuickCreateSelect value={formExpense.vendor_id} onValueChange={v => setFormExpense(f => ({...f, vendor_id: v}))} options={vendors} placeholder="Select vendor" entityLabel="Vendor" onCreateNew={async name => { const r = await createVendor.mutateAsync({ name }); toast.success(`Vendor "${name}" created`); return r; }} />
                    </div>
                    <div className="bg-secondary/30 border border-border px-4 py-3">
                      <p className="text-[11px] text-muted-foreground">Enter the total amount. Category and project details follow in the next steps.</p>
                    </div>
                  </div>
                )}

                {expenseStep === 2 && (
                  <div className="space-y-5">
                    <div>
                      {fld('Payment Method')}
                      <Select value={formExpense.payment_method} onValueChange={v => setFormExpense(f => ({...f, payment_method: v, check_reference: ''}))}>
                        <SelectTrigger className="rounded-none h-10"><SelectValue placeholder="Select method" /></SelectTrigger>
                        <SelectContent>{EXPENSE_METHODS.map(m => <SelectItem key={m.v} value={m.v}>{m.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    {REF_METHODS.has(formExpense.payment_method) && (
                      <div>
                        {fld(formExpense.payment_method === 'check' ? 'Check Number' : 'Trace / Reference #')}
                        <Input className="rounded-none h-10" placeholder={formExpense.payment_method === 'check' ? 'e.g. 1024' : 'ACH/wire trace #'} value={formExpense.check_reference} onChange={e => setFormExpense(f => ({...f, check_reference: e.target.value}))} />
                      </div>
                    )}
                    {!formExpense.payment_method && (
                      <div className="bg-secondary/30 border border-border px-4 py-3">
                        <p className="text-[11px] text-muted-foreground">Payment method is optional — you can skip this step.</p>
                      </div>
                    )}
                  </div>
                )}

                {expenseStep === 3 && (
                  <div className="space-y-5">
                    <div>
                      {fld('Category')}
                      <Select value={formExpense.category} onValueChange={v => setFormExpense(f => ({...f, category: v}))}>
                        <SelectTrigger className="rounded-none h-10"><SelectValue placeholder="Select category" /></SelectTrigger>
                        <SelectContent>{EXPENSE_CATEGORIES.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      {fld('Cost Type')}
                      <Select value={formExpense.cost_type} onValueChange={v => setFormExpense(f => ({...f, cost_type: v}))}>
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
                    <div>
                      {fld('Cost Phase / Code (optional)')}
                      <Select value={formExpense.cost_phase} onValueChange={v => setFormExpense(f => ({...f, cost_phase: v}))}>
                        <SelectTrigger className="rounded-none h-10"><SelectValue placeholder="Select phase (optional)" /></SelectTrigger>
                        <SelectContent>{COST_PHASES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      {fld('Project')}
                      <QuickCreateSelect value={formExpense.project_id} onValueChange={v => setFormExpense(f => ({...f, project_id: v}))} options={projects} placeholder="Assign to project (optional)" entityLabel="Project" onCreateNew={async name => { const r = await createProject.mutateAsync({ name }); toast.success(`Project "${name}" created`); return r; }} />
                    </div>
                    <div>
                      {fld('Notes')}
                      <Textarea className="rounded-none" rows={3} value={formExpense.notes} onChange={e => setFormExpense(f => ({...f, notes: e.target.value}))} />
                    </div>
                  </div>
                )}

                <FormNav step={expenseStep} total={3} onBack={() => setExpenseStep(s => s-1)} onNext={() => { if (expenseStep===1 && !formExpense.amount){toast.error('Amount required');return;} setExpenseStep(s=>s+1); }} submitLabel="Save Expense" isPending={txnUpsert.isPending} />
              </form>
            </>
          )}

          {/* ══ CHECK FORM ══ */}
          {addOpen === 'check' && (
            <>
              <DialogHeader className="pb-0">
                <DialogTitle className="text-base font-semibold">Create Check</DialogTitle>
              </DialogHeader>
              <StepIndicator current={checkStep} labels={['Payment Details', 'Reference & Project']} />
              <form onSubmit={submitCheck}>

                {checkStep === 1 && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div>{fld('Amount *')}<CurrencyInput value={formCheck.amount} onChange={v => setFormCheck(f => ({...f, amount: v}))} /></div>
                      <div>{fld('Date')}<Input type="date" className="rounded-none h-10" value={formCheck.issue_date} onChange={e => setFormCheck(f => ({...f, issue_date: e.target.value}))} /></div>
                    </div>
                    <div>
                      {fld('Payee *')}
                      <Input required className="rounded-none h-10" value={formCheck.payee_name} onChange={e => setFormCheck(f => ({...f, payee_name: e.target.value}))} placeholder="Payee name" />
                    </div>
                    <div className="bg-secondary/30 border border-border px-4 py-3">
                      <p className="text-[11px] text-muted-foreground">Checks are created with a pending status. Mark them cleared once they have been processed by the bank.</p>
                    </div>
                  </div>
                )}

                {checkStep === 2 && (
                  <div className="space-y-5">
                    <div>
                      {fld('Check Number')}
                      <Input className="rounded-none h-10" value={formCheck.check_number} onChange={e => setFormCheck(f => ({...f, check_number: e.target.value}))} placeholder="e.g. 1024" />
                    </div>
                    <div>
                      {fld('Project')}
                      <QuickCreateSelect value={formCheck.project_id} onValueChange={v => setFormCheck(f => ({...f, project_id: v}))} options={projects} placeholder="Assign to project (optional)" entityLabel="Project" onCreateNew={async name => { const r = await createProject.mutateAsync({ name }); toast.success(`Project "${name}" created`); return r; }} />
                    </div>
                    <div>
                      {fld('Memo')}
                      <Input className="rounded-none h-10" value={formCheck.memo} onChange={e => setFormCheck(f => ({...f, memo: e.target.value}))} placeholder="Optional memo" />
                    </div>
                  </div>
                )}

                <FormNav step={checkStep} total={2} onBack={() => setCheckStep(s => s-1)} onNext={() => { if (!formCheck.amount || !formCheck.payee_name){toast.error('Amount and payee required');return;} setCheckStep(s=>s+1); }} submitLabel="Create Check" isPending={checkUpsert.isPending} />
              </form>
            </>
          )}

        </DialogContent>
      </Dialog>

      <FinanceDetailDrawer open={!!detailRow} onClose={() => setDetailRow(null)} kind="ledger" data={detailRow} />
    </AppShell>
  );
}
