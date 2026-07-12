import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

function CurrencyInput({ value, onChange, className = '', ...rest }: { value: string; onChange: (v: string) => void; className?: string; [k: string]: any }) {
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
        className={`pl-7 font-mono-tab text-right rounded-none h-10 ${className}`}
        {...rest}
      />
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
`;

export default function Ledger() {
  const navigate = useNavigate();
  const { data: checks = [] } = useChecks();
  const { data: income = [] } = useTransactions('income');
  const { data: expenses = [] } = useTransactions('expense');
  const { data: projects = [] } = useProjects();
  const { data: vendors = [] } = useVendors();
  const deleteCheck = useDelete('checks', [['checks']]);
  const deleteTxn = useDelete('transactions', [['transactions']]);
  const txnUpsert = useUpsert('transactions', [['transactions']]);
  const checkUpsert = useUpsert('checks', [['checks']]);
  const createVendor = useQuickCreate('vendors');
  const createProject = useQuickCreate('projects');

  const [q, setQ] = useState('');
  const [project, setProject] = useState('all');
  const [type, setType] = useState('all');
  const [addOpen, setAddOpen] = useState<'income' | 'expense' | 'check' | null>(null);
  const [reconcileMode, setReconcileMode] = useState(false);

  const blankIncome = { amount: '', transaction_date: new Date().toISOString().slice(0, 10), source_name: '', project_id: '', category: '', notes: '' };
  const blankExpense = { amount: '', transaction_date: new Date().toISOString().slice(0, 10), vendor_id: '', project_id: '', category: '', notes: '', payment_method: '', cost_type: '' };
  const blankCheck = { amount: '', issue_date: new Date().toISOString().slice(0, 10), payee_name: '', check_number: '', memo: '', project_id: '' };

  const [formIncome, setFormIncome] = useState(blankIncome);
  const [formExpense, setFormExpense] = useState(blankExpense);
  const [formCheck, setFormCheck] = useState(blankCheck);

  const rows = useMemo(() => {
    const a = [
      ...checks.map((c: any) => ({ id: c.id, rowId: 'c' + c.id, date: c.issue_date, type: 'Check', ref: c.check_number, party: c.payee_name, project: c.projects?.name, project_id: c.project_id, amount: -Number(c.amount), status: c.status, _kind: 'check' as const })),
      ...income.map((t: any) => ({ id: t.id, rowId: 'i' + t.id, date: t.transaction_date, type: 'Income', ref: '—', party: t.source_name || t.vendors?.name || '—', project: t.projects?.name, project_id: t.project_id, amount: Number(t.amount), status: '—', _kind: 'income' as const })),
      ...expenses.map((t: any) => ({ id: t.id, rowId: 'e' + t.id, date: t.transaction_date, type: 'Expense', ref: t.category || '—', party: t.vendors?.name || '—', project: t.projects?.name, project_id: t.project_id, amount: -Number(t.amount), status: '—', _kind: 'expense' as const })),
    ];
    return a.filter(r => {
      if (project !== 'all' && r.project_id !== project) return false;
      if (type !== 'all' && r.type.toLowerCase() !== type) return false;
      if (q && !(r.party?.toLowerCase().includes(q.toLowerCase()) || r.ref?.toString().toLowerCase().includes(q.toLowerCase()))) return false;
      return true;
    }).sort((x, y) => y.date.localeCompare(x.date));
  }, [checks, income, expenses, project, type, q]);

  const totals = useMemo(() => {
    const inflow = rows.filter(r => r.amount > 0).reduce((s, r) => s + r.amount, 0);
    const outflow = rows.filter(r => r.amount < 0).reduce((s, r) => s + Math.abs(r.amount), 0);
    return { inflow, outflow, net: inflow - outflow };
  }, [rows]);

  const exportPDF = () => {
    const proj = project !== 'all' ? projects.find((p: any) => p.id === project)?.name : undefined;
    const doc = generateLedgerReport(income, expenses, checks, proj, type !== 'all' ? type : undefined);
    savePDF(doc, `hou-general-ledger-${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success('Ledger exported as PDF');
  };

  const exportExcel = () => {
    downloadLedgerExcel(income, expenses, checks);
    toast.success('Ledger exported as Excel (4 sheets)');
  };

  const submitIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formIncome.amount) { toast.error('Amount required'); return; }
    await txnUpsert.mutateAsync({ type: 'income', amount: parseFloat(formIncome.amount), transaction_date: formIncome.transaction_date, source_name: formIncome.source_name || null, project_id: formIncome.project_id || null, category: formIncome.category || null, notes: formIncome.notes || null } as any);
    toast.success('Income logged'); setAddOpen(null); setFormIncome(blankIncome);
  };

  const submitExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formExpense.amount) { toast.error('Amount required'); return; }
    await txnUpsert.mutateAsync({ type: 'expense', amount: parseFloat(formExpense.amount), transaction_date: formExpense.transaction_date, vendor_id: formExpense.vendor_id || null, project_id: formExpense.project_id || null, category: formExpense.category || null, notes: formExpense.notes || null, payment_method: formExpense.payment_method || null, cost_type: formExpense.cost_type || null } as any);
    toast.success('Expense recorded'); setAddOpen(null); setFormExpense(blankExpense);
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

  const submitCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCheck.amount || !formCheck.payee_name) { toast.error('Amount and payee required'); return; }
    await checkUpsert.mutateAsync({ amount: parseFloat(formCheck.amount), payee_name: formCheck.payee_name, issue_date: formCheck.issue_date, check_number: formCheck.check_number || null, memo: formCheck.memo || null, project_id: formCheck.project_id || null, status: 'pending' } as any);
    toast.success('Check created'); setAddOpen(null); setFormCheck(blankCheck);
  };

  const is = addOpen === 'income';
  const isE = addOpen === 'expense';

  return (
    <AppShell>
      <style>{LDG_CSS}</style>
      <PageHeader eyebrow="Unified Ledger" title="Transaction Ledger" description="Complete chronological record of all capital movement."
        actions={
          <div className="hidden sm:flex items-center gap-2">
            <div className="flex items-center gap-1 mr-1 border-r border-border pr-3">
              <button onClick={() => { setAddOpen('income'); setFormIncome(blankIncome); }} className="flex items-center gap-1 px-2.5 h-8 text-[10px] uppercase tracking-[0.1em] bg-positive/10 text-positive hover:bg-positive/20 transition-colors font-medium"><Plus className="w-3 h-3" /> Income</button>
              <button onClick={() => { setAddOpen('expense'); setFormExpense(blankExpense); }} className="flex items-center gap-1 px-2.5 h-8 text-[10px] uppercase tracking-[0.1em] bg-accent/10 text-accent hover:bg-accent/20 transition-colors font-medium"><Plus className="w-3 h-3" /> Expense</button>
              <button onClick={() => { setAddOpen('check'); setFormCheck(blankCheck); }} className="flex items-center gap-1 px-2.5 h-8 text-[10px] uppercase tracking-[0.1em] bg-foreground/10 text-foreground hover:bg-foreground/20 transition-colors font-medium"><Plus className="w-3 h-3" /> Check</button>
            </div>
            <Button variant="outline" size="icon" className="rounded-none h-8 w-8" onClick={exportPDF}><FileText className="w-3.5 h-3.5" /></Button>
            <Button variant="outline" size="icon" className="rounded-none h-8 w-8" onClick={exportExcel}><Table2 className="w-3.5 h-3.5" /></Button>
            <button
              onClick={() => setReconcileMode(m => !m)}
              className={`flex items-center gap-1.5 px-2.5 h-8 text-[10px] uppercase tracking-[0.1em] font-medium border transition-colors ${reconcileMode ? 'bg-positive/10 text-positive border-positive/30' : 'border-border text-muted-foreground hover:text-foreground'}`}
            >
              <CheckSquare className="w-3 h-3" /> Reconcile
            </button>
          </div>
        } />

      {/* Mobile add + export */}
      <div className="sm:hidden px-4 py-3 border-b border-border flex gap-2 flex-wrap">
        <button onClick={() => { setAddOpen('income'); setFormIncome(blankIncome); }} className="flex items-center gap-1 px-3 h-8 text-[10px] uppercase tracking-[0.1em] bg-positive/10 text-positive font-medium"><Plus className="w-3 h-3" /> Income</button>
        <button onClick={() => { setAddOpen('expense'); setFormExpense(blankExpense); }} className="flex items-center gap-1 px-3 h-8 text-[10px] uppercase tracking-[0.1em] bg-accent/10 text-accent font-medium"><Plus className="w-3 h-3" /> Expense</button>
        <button onClick={() => { setAddOpen('check'); setFormCheck(blankCheck); }} className="flex items-center gap-1 px-3 h-8 text-[10px] uppercase tracking-[0.1em] bg-foreground/10 text-foreground font-medium"><Plus className="w-3 h-3" /> Check</button>
        <div className="flex-1" />
        <Button variant="outline" size="sm" className="rounded-none h-8 text-[10px] px-2" onClick={exportPDF}><FileText className="w-3 h-3 mr-1" />PDF</Button>
        <Button variant="outline" size="sm" className="rounded-none h-8 text-[10px] px-2" onClick={exportExcel}><Table2 className="w-3 h-3 mr-1" />Excel</Button>
      </div>

      <div className="px-4 sm:px-8 py-4 border-b border-border grid grid-cols-3 gap-px" style={{ background: 'rgba(220,214,204,0.45)' }}>
        {[{ l: 'Inflow', v: fmtUSD(totals.inflow), c: 'text-positive' }, { l: 'Outflow', v: fmtUSD(totals.outflow), c: '' }, { l: 'Net Position', v: fmtUSD(totals.net), c: totals.net >= 0 ? 'text-positive' : 'text-accent' }].map(s => (
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
                <span className={`text-[10px] uppercase tracking-[0.14em] px-1.5 py-0.5 border ldg-badge ${r.type === 'Check' ? 'ldg-type-check' : r.type === 'Income' ? 'ldg-type-income' : 'ldg-type-expense'}`}>{r.type}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold font-mono-tab ${r.amount >= 0 ? 'text-positive' : ''}`}>{r.amount >= 0 ? '+' : '−'}{fmtUSD(Math.abs(r.amount))}</span>
                  <AlertDialog>
                    <AlertDialogTrigger asChild><button className="text-muted-foreground hover:text-accent transition-colors"><Trash2 className="w-3.5 h-3.5" /></button></AlertDialogTrigger>
                    <AlertDialogContent className="rounded-none w-[calc(100%-2rem)]">
                      <AlertDialogHeader><AlertDialogTitle>Delete this {r.type.toLowerCase()}?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                        <AlertDialogCancel className="rounded-none w-full sm:w-auto">Cancel</AlertDialogCancel>
                        <AlertDialogAction className="rounded-none bg-accent w-full sm:w-auto" onClick={async () => { try { if (r._kind === 'check') await deleteCheck.mutateAsync(r.id); else await deleteTxn.mutateAsync(r.id); toast.success('Deleted'); } catch (err: any) { toast.error(err.message); } }}>Confirm</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              <div className="text-sm font-medium">{r.party}</div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{r.project || '—'}</span>
                <span className="font-mono-tab">{fmtDate(r.date)}</span>
              </div>
              <div className="text-[10px] text-muted-foreground">Ref: {r.ref}</div>
            </div>
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block border border-border">
          {reconcileMode && (
            <div className="px-4 py-2 border-b border-border bg-positive/5 text-[10px] font-medium text-positive flex items-center gap-2">
              <CheckSquare className="w-3 h-3" /> Reconcile mode — click the checkbox to mark entries as reconciled against your bank statement
            </div>
          )}
          <div className="grid grid-cols-[2fr_1fr_1.5fr_2.5fr_2fr_1.5fr_36px] gap-3 px-4 py-2.5 border-b border-border bg-secondary/40 text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium items-center">
            <div>Date</div><div>Type</div><div>Ref</div><div>Counterparty</div><div>Project</div><div className="text-right">Amount</div><div />
          </div>
          {rows.length === 0 ? <div className="px-4 py-16 text-center text-sm text-muted-foreground">No entries match.</div> :
            rows.map(r => (
              <div key={r.rowId} className={`grid grid-cols-[2fr_1fr_1.5fr_2.5fr_2fr_1.5fr_36px] gap-3 px-4 py-3 border-b border-border last:border-b-0 text-sm font-mono-tab items-center group ldg-row ${(r as any).reconciled ? 'opacity-50' : ''}`}>
                <div className="text-muted-foreground">{fmtDate(r.date)}</div>
                <div><span className={`text-[10px] uppercase tracking-[0.14em] px-1.5 py-0.5 border ldg-badge ${r.type === 'Check' ? 'ldg-type-check' : r.type === 'Income' ? 'ldg-type-income' : 'ldg-type-expense'}`}>{r.type}</span></div>
                <div className="truncate text-muted-foreground">{r.ref}</div>
                <div className="truncate">{r.party}</div>
                <div className="truncate text-muted-foreground">{r.project || '—'}</div>
                <div className={`text-right font-semibold ${r.amount >= 0 ? 'text-positive' : ''}`}>{r.amount >= 0 ? '+' : '−'}{fmtUSD(Math.abs(r.amount))}</div>
                <div className="flex justify-end">
                  {reconcileMode ? (
                    <button onClick={() => toggleReconcile(r)} className="text-muted-foreground hover:text-positive transition-colors">
                      {(r as any).reconciled
                        ? <CheckSquare className="w-3.5 h-3.5 text-positive" />
                        : <Square className="w-3.5 h-3.5" />}
                    </button>
                  ) : (
                    <AlertDialog>
                      <AlertDialogTrigger asChild><button className="text-muted-foreground/0 group-hover:text-muted-foreground hover:text-accent transition-colors"><Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} /></button></AlertDialogTrigger>
                      <AlertDialogContent className="rounded-none">
                        <AlertDialogHeader><AlertDialogTitle>Delete this {r.type.toLowerCase()}?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="rounded-none">Cancel</AlertDialogCancel>
                          <AlertDialogAction className="rounded-none bg-accent" onClick={async () => { try { if (r._kind === 'check') await deleteCheck.mutateAsync(r.id); else await deleteTxn.mutateAsync(r.id); toast.success('Deleted'); } catch (err: any) { toast.error(err.message); } }}>Confirm</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Inline dialog — NOT a nested component so state doesn't reset on re-render */}
      <Dialog open={!!addOpen} onOpenChange={o => { if (!o) setAddOpen(null); }}>
        <DialogContent className="rounded-none sm:max-w-lg w-[calc(100%-2rem)] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-lg">{is ? 'Log Income' : isE ? 'Record Expense' : 'Create Check'}</DialogTitle></DialogHeader>
          <form onSubmit={is ? submitIncome : isE ? submitExpense : submitCheck} className="space-y-4">
            {addOpen === 'check' && <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="micro-label">Amount</Label>
                  <CurrencyInput value={formCheck.amount} onChange={v => setFormCheck(f => ({ ...f, amount: v }))} placeholder="0.00" />
                </div>
                <div className="space-y-1.5"><Label className="micro-label">Date</Label><Input type="date" className="rounded-none h-10" value={formCheck.issue_date} onChange={e => setFormCheck(f => ({ ...f, issue_date: e.target.value }))} /></div>
              </div>
              <div className="space-y-1.5"><Label className="micro-label">Payee</Label><Input required className="rounded-none h-10" value={formCheck.payee_name} onChange={e => setFormCheck(f => ({ ...f, payee_name: e.target.value }))} placeholder="Payee name" /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label className="micro-label">Check #</Label><Input className="rounded-none h-10" value={formCheck.check_number} onChange={e => setFormCheck(f => ({ ...f, check_number: e.target.value }))} placeholder="e.g. 1024" /></div>
                <div className="space-y-1.5"><Label className="micro-label">Project</Label><QuickCreateSelect value={formCheck.project_id} onValueChange={v => setFormCheck(f => ({ ...f, project_id: v }))} options={projects} placeholder="Assign (optional)" entityLabel="Project" onCreateNew={async (name) => { const r = await createProject.mutateAsync({ name }); toast.success(`Project "${name}" created`); return r; }} /></div>
              </div>
              <div className="space-y-1.5"><Label className="micro-label">Memo</Label><Input className="rounded-none h-10" value={formCheck.memo} onChange={e => setFormCheck(f => ({ ...f, memo: e.target.value }))} placeholder="Optional memo" /></div>
              <Button type="submit" className="rounded-none w-full h-10 bg-foreground text-background">Create Check</Button>
            </>}
            {(is || isE) && <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="micro-label">Amount</Label>
                  <CurrencyInput
                    value={is ? formIncome.amount : formExpense.amount}
                    onChange={v => is ? setFormIncome(f => ({ ...f, amount: v })) : setFormExpense(f => ({ ...f, amount: v }))}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-1.5"><Label className="micro-label">Date</Label><Input type="date" className="rounded-none h-10" value={is ? formIncome.transaction_date : formExpense.transaction_date} onChange={e => is ? setFormIncome(f => ({ ...f, transaction_date: e.target.value })) : setFormExpense(f => ({ ...f, transaction_date: e.target.value }))} /></div>
              </div>
              {is && <div className="space-y-1.5"><Label className="micro-label">Source</Label><Input className="rounded-none h-10" value={formIncome.source_name} onChange={e => setFormIncome(f => ({ ...f, source_name: e.target.value }))} placeholder="Client or source name" /></div>}
              {isE && <div className="space-y-1.5"><Label className="micro-label">Vendor</Label><QuickCreateSelect value={formExpense.vendor_id} onValueChange={v => setFormExpense(f => ({ ...f, vendor_id: v }))} options={vendors} placeholder="Select vendor" entityLabel="Vendor" onCreateNew={async (name) => { const r = await createVendor.mutateAsync({ name }); toast.success(`Vendor "${name}" created`); return r; }} /></div>}
              <div className="space-y-1.5"><Label className="micro-label">Category</Label>
                <Select value={is ? formIncome.category : formExpense.category} onValueChange={v => is ? setFormIncome(f => ({ ...f, category: v })) : setFormExpense(f => ({ ...f, category: v }))}>
                  <SelectTrigger className="rounded-none h-10"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>{(is ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {isE && <>
                <div className="space-y-1.5"><Label className="micro-label">Cost Type</Label>
                  <Select value={formExpense.cost_type} onValueChange={v => setFormExpense(f => ({ ...f, cost_type: v }))}>
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
                <div className="space-y-1.5"><Label className="micro-label">Payment Method</Label>
                  <Select value={formExpense.payment_method} onValueChange={v => setFormExpense(f => ({ ...f, payment_method: v }))}>
                    <SelectTrigger className="rounded-none h-10"><SelectValue placeholder="Select method" /></SelectTrigger>
                    <SelectContent><SelectItem value="credit_card">Credit Card</SelectItem><SelectItem value="bank_transfer">Bank Transfer</SelectItem><SelectItem value="net30">NET30</SelectItem><SelectItem value="cash">Cash</SelectItem><SelectItem value="wire">Wire</SelectItem><SelectItem value="check">Check</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent>
                  </Select>
                </div>
              </>}
              <div className="space-y-1.5"><Label className="micro-label">Project</Label>
                <QuickCreateSelect value={is ? formIncome.project_id : formExpense.project_id} onValueChange={v => is ? setFormIncome(f => ({ ...f, project_id: v })) : setFormExpense(f => ({ ...f, project_id: v }))} options={projects} placeholder="Assign (optional)" entityLabel="Project" onCreateNew={async (name) => { const r = await createProject.mutateAsync({ name }); toast.success(`Project "${name}" created`); return r; }} />
              </div>
              <div className="space-y-1.5"><Label className="micro-label">Notes</Label><Textarea className="rounded-none" rows={2} value={is ? formIncome.notes : formExpense.notes} onChange={e => is ? setFormIncome(f => ({ ...f, notes: e.target.value })) : setFormExpense(f => ({ ...f, notes: e.target.value }))} /></div>
              <Button type="submit" className="rounded-none w-full h-10 bg-foreground text-background">{is ? 'Save Income' : 'Save Expense'}</Button>
            </>}
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
