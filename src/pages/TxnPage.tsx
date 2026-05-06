import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useDelete, useProjects, useTransactions, useUpsert, useVendors, useQuickCreate } from '@/hooks/useFinance';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fmtDate, fmtUSD } from '@/lib/format';
import { toast } from 'sonner';
import { Trash2, Download, FileText, Plus, Upload, Camera, X } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { QuickCreateSelect } from '@/components/QuickCreateSelect';
import { generateTransactionReport, savePDF, downloadCSV } from '@/lib/reports';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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

function ReceiptUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const captureRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    if (f.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => setPreview(ev.target?.result as string);
      reader.readAsDataURL(f);
    } else {
      setPreview('/placeholder.svg');
    }
    e.target.value = '';
  };

  return (
    <div className="space-y-2">
      <Label className="micro-label">Receipt (optional)</Label>
      <input ref={inputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFile} />
      <input ref={captureRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
      {preview ? (
        <div className="relative border border-border p-2 bg-secondary/20">
          <img src={preview} alt="Receipt" className="max-h-28 w-full object-contain" />
          <button onClick={() => { setFile(null); setPreview(null); }} className="absolute top-2 right-2 w-6 h-6 bg-background/90 border border-border flex items-center justify-center hover:bg-accent hover:text-white transition-colors">
            <X className="w-3 h-3" />
          </button>
          {file && <div className="text-[10px] text-muted-foreground mt-1 font-mono-tab truncate px-1">{(file.size / 1024 / 1024).toFixed(1)} MB · {file.name}</div>}
        </div>
      ) : (
        <div className="flex gap-2">
          <button type="button" onClick={() => inputRef.current?.click()} className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-border hover:bg-secondary/50 transition-colors text-xs text-muted-foreground hover:text-foreground">
            <Upload className="w-3.5 h-3.5" strokeWidth={1.5} /> Upload
          </button>
          <button type="button" onClick={() => captureRef.current?.click()} className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-border hover:bg-secondary/50 transition-colors text-xs text-muted-foreground hover:text-foreground">
            <Camera className="w-3.5 h-3.5" strokeWidth={1.5} /> Camera
          </button>
        </div>
      )}
      <div className="text-[9px] text-muted-foreground">PDF, JPG, PNG · No size limit</div>
    </div>
  );
}

export default function TxnPage({ kind }: { kind: 'income' | 'expense' }) {
  const nav = useNavigate();
  const { data: txns = [] } = useTransactions(kind);
  const { data: projects = [] } = useProjects();
  const { data: vendors = [] } = useVendors();
  const upsert = useUpsert('transactions', [['transactions']]);
  const del = useDelete('transactions', [['transactions']]);
  const createVendor = useQuickCreate('vendors');
  const createProject = useQuickCreate('projects');
  const [open, setOpen] = useState(false);
  const blankForm = { amount: '', transaction_date: new Date().toISOString().slice(0, 10), vendor_id: '', source_name: '', project_id: '', category: '', notes: '', payment_method: '' };
  const [form, setForm] = useState(blankForm);
  const isIncome = kind === 'income';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || !parseFloat(form.amount)) {
      toast.error('Amount required');
      return;
    }
    try {
      const payload: Record<string, any> = {
        type: kind,
        amount: parseFloat(form.amount),
        transaction_date: form.transaction_date,
        category: form.category || null,
        notes: form.notes || null,
        project_id: form.project_id || null,
      };
      if (isIncome) {
        payload.source_name = form.source_name || null;
        payload.vendor_id = null;
      } else {
        payload.source_name = null;
        payload.vendor_id = form.vendor_id || null;
        if (form.payment_method) {
          payload.payment_method = form.payment_method;
        }
      }
      await upsert.mutateAsync(payload as any);
      toast.success(isIncome ? 'Income saved' : 'Expense saved');
      setOpen(false);
      setForm(blankForm);
    } catch (e: any) {
      console.error('Save error:', e);
      toast.error(e?.message || 'Save failed. Check your connection.');
    }
  };

  const total = txns.reduce((s: number, t: any) => s + Number(t.amount), 0);

  /* ── PDF Export ── */
  const exportPDF = () => {
    const doc = generateTransactionReport(txns, kind);
    savePDF(doc, `hou-${kind}-${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success(`${isIncome ? 'Income' : 'Expense'} report exported as PDF`);
  };

  /* ── CSV Export ── */
  const exportCSV = () => {
    downloadCSV(
      txns,
      `hou-${kind}-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Date', isIncome ? 'Source' : 'Vendor', 'Project', isIncome ? 'Notes' : 'Category', 'Amount'],
      (t: any) => [
        t.transaction_date?.slice(0, 10),
        isIncome ? (t.source_name || t.vendors?.name || '') : (t.vendors?.name || ''),
        t.projects?.name || '',
        isIncome ? (t.notes || '') : (t.category || ''),
        t.amount,
      ]
    );
    toast.success(`${isIncome ? 'Income' : 'Expense'} data exported as CSV`);
  };

  return (
    <AppShell>
      <PageHeader eyebrow={isIncome ? 'Capital Inflow' : 'Capital Outflow'} title={isIncome ? 'Income' : 'Expenses'} description={isIncome ? 'Recorded receipts from clients and project funding sources.' : 'Non-check expenditures by vendor and category.'}
        actions={
          <div className="flex items-center gap-2">
            {/* Export buttons - visible on tablet+ */}
            <div className="hidden sm:flex items-center gap-2">
              <Button variant="outline" size="sm" className="rounded-none h-9 text-xs" onClick={exportPDF}>
                <FileText className="w-3.5 h-3.5 mr-1.5" />PDF
              </Button>
              <Button variant="outline" size="sm" className="rounded-none h-9 text-xs" onClick={exportCSV}>
                <Download className="w-3.5 h-3.5 mr-1.5" />CSV
              </Button>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button className="rounded-none">{isIncome ? 'Log Income' : 'Record Expense'}</Button></DialogTrigger>
              <DialogContent className="rounded-none sm:max-w-lg w-[calc(100%-2rem)] max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle className="text-lg">{isIncome ? 'Log Income' : 'Record Expense'}</DialogTitle></DialogHeader>
                <form onSubmit={submit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5"><Label className="micro-label">Amount</Label>
                      <Input type="number" step="0.01" required className="rounded-none font-mono-tab text-right h-10" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
                    <div className="space-y-1.5"><Label className="micro-label">Date</Label>
                      <Input type="date" className="rounded-none h-10" value={form.transaction_date} onChange={e => setForm({ ...form, transaction_date: e.target.value })} /></div>
                  </div>
                  {isIncome ? (
                    <div className="space-y-1.5"><Label className="micro-label">Source</Label>
                      <Input placeholder="Client / source name" className="rounded-none h-10" value={form.source_name} onChange={e => setForm({ ...form, source_name: e.target.value })} /></div>
                  ) : (
                    <>
                      <div className="space-y-1.5"><Label className="micro-label">Vendor</Label>
                        <QuickCreateSelect
                          value={form.vendor_id}
                          onValueChange={v => setForm({ ...form, vendor_id: v })}
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
                      <div className="space-y-1.5"><Label className="micro-label">Payment Method</Label>
                        <Select value={form.payment_method} onValueChange={v => setForm({ ...form, payment_method: v })}>
                          <SelectTrigger className="rounded-none h-10"><SelectValue placeholder="Select payment method" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="check">Check</SelectItem>
                            <SelectItem value="credit_card">Credit Card</SelectItem>
                            <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                            <SelectItem value="net30">NET30</SelectItem>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="wire">Wire</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                  <div className="space-y-1.5"><Label className="micro-label">{isIncome ? 'Category' : 'Category'}</Label>
                    <CategorySelect
                      value={form.category}
                      onChange={v => setForm({ ...form, category: v })}
                      options={isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES}
                    />
                  </div>
                  <div className="space-y-1.5"><Label className="micro-label">Project</Label>
                    <QuickCreateSelect
                      value={form.project_id}
                      onValueChange={v => setForm({ ...form, project_id: v })}
                      options={projects}
                      placeholder="Assign to project"
                      entityLabel="Project"
                      onCreateNew={async (name) => {
                        const result = await createProject.mutateAsync({ name });
                        toast.success(`Project "${name}" created`);
                        return result;
                      }}
                    />
                  </div>
                  {!isIncome && <ReceiptUpload />}
                  <div className="space-y-1.5"><Label className="micro-label">Notes</Label>
                    <Textarea className="rounded-none" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
                  <Button type="submit" className="rounded-none w-full h-10">Save</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        } />

      {/* Mobile export bar */}
      <div className="sm:hidden px-4 py-3 border-b border-border flex gap-2">
        <Button variant="outline" size="sm" className="rounded-none text-xs flex-1" onClick={exportPDF}>
          <FileText className="w-3.5 h-3.5 mr-1.5" />Export PDF
        </Button>
        <Button variant="outline" size="sm" className="rounded-none text-xs flex-1" onClick={exportCSV}>
          <Download className="w-3.5 h-3.5 mr-1.5" />Export CSV
        </Button>
      </div>

      <div className="px-4 sm:px-8 py-5 border-b border-border flex items-center gap-6 overflow-x-auto">
        <div className="shrink-0"><div className="micro-label">Total</div><div className="stat-value mt-1 text-lg sm:text-2xl">{fmtUSD(total)}</div></div>
        <div className="shrink-0"><div className="micro-label">Records</div><div className="stat-value mt-1 text-lg sm:text-2xl">{txns.length}</div></div>
      </div>

      <div className="px-4 sm:px-8 py-6">
        {/* Mobile card view */}
        <div className="sm:hidden space-y-3">
          {txns.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">No records.</div>
          ) : txns.map((t: any) => (
            <div key={t.id} className="border border-border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{fmtDate(t.transaction_date)}</span>
                <span className={`text-sm font-semibold font-mono-tab ${isIncome ? 'text-positive' : ''}`}>{isIncome ? '+' : '−'}{fmtUSD(t.amount)}</span>
              </div>
              <div className="text-sm font-medium">{isIncome ? (t.source_name || t.vendors?.name || '—') : (t.vendors?.name || '—')}</div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{t.projects?.name || 'No project'}</span>
                <span>{isIncome ? (t.notes || '') : (t.category || '')}</span>
              </div>
              <div className="flex justify-end">
                <AlertDialog>
                  <AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="rounded-none h-7 text-xs text-muted-foreground hover:text-accent"><Trash2 className="w-3.5 h-3.5 mr-1" />Delete</Button></AlertDialogTrigger>
                  <AlertDialogContent className="rounded-none w-[calc(100%-2rem)]">
                    <AlertDialogHeader><AlertDialogTitle>Delete record?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter className="flex-col sm:flex-row gap-2"><AlertDialogCancel className="rounded-none w-full sm:w-auto">Cancel</AlertDialogCancel><AlertDialogAction className="rounded-none bg-accent w-full sm:w-auto" onClick={() => del.mutate(t.id)}>Confirm</AlertDialogAction></AlertDialogFooter>
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
            <div key={t.id} className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-border last:border-b-0 text-sm font-mono-tab hover:bg-secondary/20 items-center">
              <div className="col-span-2 text-muted-foreground">{fmtDate(t.transaction_date)}</div>
              <div className="col-span-3 truncate">{isIncome ? (t.source_name || t.vendors?.name || '—') : (t.vendors?.name || '—')}</div>
              <div className="col-span-3 truncate text-muted-foreground">{t.projects?.name || '—'}</div>
              <div className="col-span-2 truncate text-muted-foreground">{isIncome ? (t.notes || '—') : (t.category || '—')}</div>
              <div className={`col-span-1 text-right font-semibold ${isIncome ? 'text-positive' : ''}`}>{isIncome ? '+' : '−'}{fmtUSD(t.amount)}</div>
              <div className="col-span-1 flex justify-end">
                <AlertDialog>
                  <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 rounded-none text-muted-foreground hover:text-accent"><Trash2 className="w-3.5 h-3.5" /></Button></AlertDialogTrigger>
                  <AlertDialogContent className="rounded-none">
                    <AlertDialogHeader><AlertDialogTitle>Delete record?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel className="rounded-none">Cancel</AlertDialogCancel><AlertDialogAction className="rounded-none bg-accent" onClick={() => del.mutate(t.id)}>Confirm</AlertDialogAction></AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}