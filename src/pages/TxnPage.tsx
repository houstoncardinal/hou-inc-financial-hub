import { useState, useRef, useCallback } from 'react';
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
import { Trash2, FileText, Table2, Plus, Upload, Camera, X, CheckCircle2, Sparkles, ScanLine } from 'lucide-react';
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

function AutoLabel({ label, filled }: { label: string; filled: boolean }) {
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

/* ── Receipt Scanner ─────────────────────────────────────────────────────── */

interface ReceiptScannerProps {
  preview: string | null;
  scanning: boolean;
  scanned: boolean;
  scanError: string | null;
  onCamera: () => void;
  onUpload: () => void;
  onClear: () => void;
}

function ReceiptScanner({ preview, scanning, scanned, scanError, onCamera, onUpload, onClear }: ReceiptScannerProps) {
  if (!preview) {
    return (
      <div className="border-2 border-dashed border-border hover:border-accent/40 transition-colors rounded-none">
        <div className="flex flex-col items-center justify-center py-7 px-4 gap-3">
          <div className="w-11 h-11 flex items-center justify-center bg-accent/8 rounded-full">
            <ScanLine className="w-5 h-5 text-accent" strokeWidth={1.5} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium leading-tight">Scan a receipt</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">AI reads amount, date, merchant & category</p>
          </div>
          <div className="flex gap-2 w-full max-w-[260px]">
            <Button type="button" onClick={onCamera} className="flex-1 rounded-none h-9 gap-1.5 text-xs">
              <Camera className="w-3.5 h-3.5" /> Camera
            </Button>
            <Button type="button" variant="outline" onClick={onUpload} className="flex-1 rounded-none h-9 gap-1.5 text-xs">
              <Upload className="w-3.5 h-3.5" /> Upload
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative border border-border overflow-hidden">
      <img src={preview} alt="Receipt" className="w-full max-h-44 object-contain bg-secondary/10" />

      {/* Scanning overlay */}
      {scanning && (
        <div className="absolute inset-0 bg-background/85 flex flex-col items-center justify-center gap-2.5">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-muted-foreground font-medium">Reading receipt…</span>
        </div>
      )}

      {/* Success badge */}
      {scanned && !scanning && (
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-emerald-600 text-white text-[10px] font-semibold px-2 py-1">
          <CheckCircle2 className="w-3 h-3" /> Fields filled
        </div>
      )}

      {/* Error badge */}
      {scanError && !scanning && (
        <div className="absolute top-2 right-8 bg-destructive text-destructive-foreground text-[9px] px-2 py-1 max-w-[65%] text-right leading-tight">
          {scanError}
        </div>
      )}

      {/* Clear button */}
      {!scanning && (
        <button
          type="button"
          onClick={onClear}
          className="absolute top-2 left-2 w-6 h-6 bg-background/90 border border-border flex items-center justify-center hover:bg-secondary transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────────────────── */

export default function TxnPage({ kind }: { kind: 'income' | 'expense' }) {
  const { data: txns = [] } = useTransactions(kind);
  const { data: projects = [] } = useProjects();
  const { data: vendors = [] } = useVendors();
  const upsert = useUpsert('transactions', [['transactions']]);
  const del = useDelete('transactions', [['transactions']]);
  const createVendor = useQuickCreate('vendors');
  const createProject = useQuickCreate('projects');

  const isIncome = kind === 'income';

  /* ── Dialog + form state ── */
  const [open, setOpen] = useState(false);
  const blankForm = {
    amount: '', transaction_date: new Date().toISOString().slice(0, 10),
    vendor_id: '', source_name: '', project_id: '',
    category: '', notes: '', payment_method: '',
  };
  const [form, setForm] = useState(blankForm);
  const [autoFilled, setAutoFilled] = useState<Set<string>>(new Set());

  /* ── Receipt scanner state ── */
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  /* Hidden inputs */
  const dialogCamRef = useRef<HTMLInputElement>(null);
  const dialogUploadRef = useRef<HTMLInputElement>(null);
  const quickCamRef = useRef<HTMLInputElement>(null);
  const quickUploadRef = useRef<HTMLInputElement>(null);

  const applyResult = useCallback((result: ScannedReceipt, previewDataUrl: string) => {
    const filled = new Set<string>();
    const patch: Partial<typeof blankForm> = {};

    if (result.amount)   { patch.amount = result.amount;               filled.add('amount'); }
    if (result.date)     { patch.transaction_date = result.date;       filled.add('transaction_date'); }
    if (result.category) { patch.category = result.category;           filled.add('category'); }
    if (result.notes)    { patch.notes = result.notes;                 filled.add('notes'); }
    if (result.merchant && isIncome) {
      patch.source_name = result.merchant;
      filled.add('source_name');
    }
    if (result.merchant && !isIncome && !patch.notes) {
      patch.notes = result.merchant;
      filled.add('notes');
    }

    setForm(f => ({ ...f, ...patch }));
    setAutoFilled(filled);
    setReceiptPreview(previewDataUrl);
    setScanned(true);
  }, [isIncome]);

  const processImage = useCallback(async (file: File, context: 'dialog' | 'quick') => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    const dataUrl: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = ev => resolve(ev.target!.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    if (context === 'quick') {
      // Pre-fill then open dialog
      setReceiptPreview(dataUrl);
      setScanning(true);
      setScanError(null);
      setScanned(false);
      if (!open) setOpen(true);
    } else {
      setReceiptPreview(dataUrl);
      setScanning(true);
      setScanError(null);
      setScanned(false);
    }

    try {
      const result = await scanReceipt(dataUrl);
      applyResult(result, dataUrl);
      toast.success('Receipt scanned — review and save');
    } catch (e: any) {
      const msg = e.message === 'OPENAI_API_KEY_MISSING'
        ? 'Add VITE_OPENAI_API_KEY to .env to enable AI scanning'
        : (e.message || 'Could not read receipt');
      setScanError(msg);
      if (e.message === 'OPENAI_API_KEY_MISSING') toast.error(msg);
    } finally {
      setScanning(false);
    }
  }, [open, applyResult]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>, context: 'dialog' | 'quick') => {
    const f = e.target.files?.[0];
    if (f) processImage(f, context);
    e.target.value = '';
  };

  const clearReceipt = () => {
    setReceiptPreview(null);
    setScanned(false);
    setScanError(null);
  };

  const resetDialog = () => {
    setForm(blankForm);
    setAutoFilled(new Set());
    clearReceipt();
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
      };
      if (isIncome) {
        payload.source_name = form.source_name || null;
        payload.vendor_id = null;
      } else {
        payload.source_name = null;
        payload.vendor_id = form.vendor_id || null;
        if (form.payment_method) payload.payment_method = form.payment_method;
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
      {/* Hidden inputs for quick-scan (page-level) */}
      <input ref={quickCamRef}    type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleFileInput(e, 'quick')} />
      <input ref={quickUploadRef} type="file" accept="image/*,.pdf"                  className="hidden" onChange={e => handleFileInput(e, 'quick')} />

      {/* Hidden inputs for in-dialog scanner */}
      <input ref={dialogCamRef}    type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleFileInput(e, 'dialog')} />
      <input ref={dialogUploadRef} type="file" accept="image/*,.pdf"                  className="hidden" onChange={e => handleFileInput(e, 'dialog')} />

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

            {/* Manual entry dialog */}
            <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) resetDialog(); }}>
              <DialogTrigger asChild>
                <Button className="rounded-none">{isIncome ? 'Log Income' : 'Record Expense'}</Button>
              </DialogTrigger>
              <DialogContent className="rounded-none sm:max-w-lg w-[calc(100%-2rem)] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-lg">{isIncome ? 'Log Income' : 'Record Expense'}</DialogTitle>
                </DialogHeader>

                <form onSubmit={submit} className="space-y-4">

                  {/* ── Receipt scanner — top of form ── */}
                  <div className="space-y-1.5">
                    <Label className="micro-label">Receipt (optional · AI extracts fields)</Label>
                    <ReceiptScanner
                      preview={receiptPreview}
                      scanning={scanning}
                      scanned={scanned}
                      scanError={scanError}
                      onCamera={() => dialogCamRef.current?.click()}
                      onUpload={() => dialogUploadRef.current?.click()}
                      onClear={clearReceipt}
                    />
                  </div>

                  {/* Divider */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                      {autoFilled.size > 0 ? 'Review & confirm' : 'Or fill manually'}
                    </span>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  {/* ── Form fields ── */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <AutoLabel label="Amount" filled={autoFilled.has('amount')} />
                      <CurrencyInput value={form.amount} onChange={v => setForm(f => ({ ...f, amount: v }))} />
                    </div>
                    <div>
                      <AutoLabel label="Date" filled={autoFilled.has('transaction_date')} />
                      <Input type="date" className="rounded-none h-10" value={form.transaction_date} onChange={e => setForm(f => ({ ...f, transaction_date: e.target.value }))} />
                    </div>
                  </div>

                  {isIncome ? (
                    <div>
                      <AutoLabel label="Source" filled={autoFilled.has('source_name')} />
                      <Input placeholder="Client / source name" className="rounded-none h-10" value={form.source_name} onChange={e => setForm(f => ({ ...f, source_name: e.target.value }))} />
                    </div>
                  ) : (
                    <>
                      <div className="space-y-1.5">
                        <Label className="micro-label">Vendor</Label>
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
                      <div className="space-y-1.5">
                        <Label className="micro-label">Payment Method</Label>
                        <Select value={form.payment_method} onValueChange={v => setForm(f => ({ ...f, payment_method: v }))}>
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

                  <div>
                    <AutoLabel label="Category" filled={autoFilled.has('category')} />
                    <CategorySelect
                      value={form.category}
                      onChange={v => setForm(f => ({ ...f, category: v }))}
                      options={isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="micro-label">Project</Label>
                    <QuickCreateSelect
                      value={form.project_id}
                      onValueChange={v => setForm(f => ({ ...f, project_id: v }))}
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

                  <div>
                    <AutoLabel label="Notes" filled={autoFilled.has('notes')} />
                    <Textarea className="rounded-none" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                  </div>

                  <Button type="submit" className="rounded-none w-full h-10" disabled={upsert.isPending}>
                    {upsert.isPending ? 'Saving…' : (isIncome ? 'Save Income' : 'Save Expense')}
                  </Button>
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

      <div className="px-4 sm:px-8 py-5 border-b border-border flex items-center gap-6 overflow-x-auto">
        <div className="shrink-0"><div className="micro-label">Total</div><div className="stat-value mt-1 text-lg sm:text-2xl">{fmtUSD(total)}</div></div>
        <div className="shrink-0"><div className="micro-label">Records</div><div className="stat-value mt-1 text-lg sm:text-2xl">{txns.length}</div></div>
      </div>

      <div className="px-4 sm:px-8 py-6">
        {/* Mobile cards */}
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
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="rounded-none h-7 text-xs text-muted-foreground hover:text-accent">
                      <Trash2 className="w-3.5 h-3.5 mr-1" />Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-none w-[calc(100%-2rem)]">
                    <AlertDialogHeader><AlertDialogTitle>Delete record?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                      <AlertDialogCancel className="rounded-none w-full sm:w-auto">Cancel</AlertDialogCancel>
                      <AlertDialogAction className="rounded-none bg-accent w-full sm:w-auto" onClick={() => del.mutate(t.id)}>Confirm</AlertDialogAction>
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
            <div key={t.id} className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-border last:border-b-0 text-sm font-mono-tab hover:bg-secondary/20 items-center">
              <div className="col-span-2 text-muted-foreground">{fmtDate(t.transaction_date)}</div>
              <div className="col-span-3 truncate">{isIncome ? (t.source_name || t.vendors?.name || '—') : (t.vendors?.name || '—')}</div>
              <div className="col-span-3 truncate text-muted-foreground">{t.projects?.name || '—'}</div>
              <div className="col-span-2 truncate text-muted-foreground">{isIncome ? (t.notes || '—') : (t.category || '—')}</div>
              <div className={`col-span-1 text-right font-semibold ${isIncome ? 'text-positive' : ''}`}>{isIncome ? '+' : '−'}{fmtUSD(t.amount)}</div>
              <div className="col-span-1 flex justify-end">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-none text-muted-foreground hover:text-accent">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-none">
                    <AlertDialogHeader><AlertDialogTitle>Delete record?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-none">Cancel</AlertDialogCancel>
                      <AlertDialogAction className="rounded-none bg-accent" onClick={() => del.mutate(t.id)}>Confirm</AlertDialogAction>
                    </AlertDialogFooter>
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
