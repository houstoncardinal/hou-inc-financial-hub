import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTransactions, useChecks, useVendors, useProjects, useUpsert, useQuickCreate } from '@/hooks/useFinance';
import { useEntity } from '@/contexts/EntityContext';
import { fmtUSD } from '@/lib/format';
import { toast } from 'sonner';
import {
  ArrowDownToLine, ArrowUpFromLine, FileText, Users, FolderKanban,
  BookOpen, ChevronRight, Camera, Upload, X, Plus,
  PartyPopper, Check, ArrowLeft, DollarSign, Building2, User,
  Hash, CreditCard, FileSpreadsheet, MessageSquare, Calendar,
  Sparkles, RefreshCw,
} from 'lucide-react';

/* ─── TYPES ─── */
type ServiceType = 'income' | 'expense' | 'check' | 'vendor' | 'project';

interface Question {
  id: string;
  label: string;
  placeholder?: string;
  type: string;
  options?: string[];
  required?: boolean;
  icon?: any;
  helper?: string;
}

interface ServiceDef {
  icon: any;
  label: string;
  description: string;
  accent?: boolean;
  questions: Question[];
  submitLabel: string;
}

const SERVICE_DEFS: Record<ServiceType, ServiceDef> = {
  income: {
    icon: ArrowDownToLine, label: 'Log Income', description: 'Record new revenue with source, category, and project.', accent: true, submitLabel: 'Save Income',
    questions: [
      { id: 'amount', label: 'How much was received?', placeholder: '0.00', type: 'number', required: true, icon: DollarSign },
      { id: 'date', label: 'When was it received?', type: 'date', required: true, icon: Calendar },
      { id: 'source_name', label: 'Who sent this payment?', placeholder: 'Client or source name', type: 'text', icon: User },
      { id: 'category', label: 'What type of income is this?', type: 'category', options: ['Client Payment', 'Retainer', 'Project Milestone', 'Consulting Fee', 'Reimbursement', 'Interest Income', 'Grant', 'Investment', 'Refund', 'Other Income'], icon: FileSpreadsheet },
      { id: 'project_id', label: 'Assign to a project?', type: 'project', icon: FolderKanban },
      { id: 'notes', label: 'Any notes?', placeholder: 'Optional notes…', type: 'textarea', icon: MessageSquare },
    ],
  },
  expense: {
    icon: ArrowUpFromLine, label: 'Record Expense', description: 'Log an outgoing payment with vendor and receipt.', submitLabel: 'Save Expense',
    questions: [
      { id: 'amount', label: 'How much was spent?', placeholder: '0.00', type: 'number', required: true, icon: DollarSign },
      { id: 'date', label: 'When did it occur?', type: 'date', required: true, icon: Calendar },
      { id: 'vendor_id', label: 'Which vendor?', type: 'vendor', icon: Building2 },
      { id: 'category', label: 'What category?', type: 'category', options: ['Materials & Supplies', 'Labor & Subcontractors', 'Permits & Fees', 'Equipment Rental', 'Transportation & Freight', 'Office & Admin', 'Insurance', 'Utilities', 'Marketing & Advertising', 'Professional Services', 'Travel & Meals', 'Software & Subscriptions', 'Maintenance & Repairs', 'Taxes & Licenses', 'Miscellaneous'], icon: FileSpreadsheet },
      { id: 'payment_method', label: 'How was it paid?', type: 'payment', icon: CreditCard },
      { id: 'project_id', label: 'Link to a project?', type: 'project', icon: FolderKanban },
      { id: 'receipt', label: 'Upload receipt (optional)', type: 'receipt', icon: Camera },
      { id: 'notes', label: 'Any notes?', placeholder: 'Optional notes…', type: 'textarea', icon: MessageSquare },
    ],
  },
  check: {
    icon: FileText, label: 'Create Check', description: 'Issue a new check with payee, amount, and memo.', submitLabel: 'Create Check',
    questions: [
      { id: 'payee_name', label: 'Payee name?', placeholder: 'Who should this check be made out to?', type: 'text', required: true, icon: User },
      { id: 'amount', label: 'Check amount?', placeholder: '0.00', type: 'number', required: true, icon: DollarSign },
      { id: 'check_number', label: 'Check number?', placeholder: 'e.g. 1024', type: 'text', icon: Hash },
      { id: 'date', label: 'Date on check?', type: 'date', required: true, icon: Calendar },
      { id: 'project_id', label: 'Assign to a project?', type: 'project', icon: FolderKanban },
      { id: 'memo', label: 'Add a memo?', placeholder: 'Optional memo…', type: 'text', icon: MessageSquare },
    ],
  },
  vendor: {
    icon: Users, label: 'Add Vendor', description: 'Add a new vendor to your directory.', submitLabel: 'Add Vendor',
    questions: [
      { id: 'vendor_name', label: 'Business name?', placeholder: 'Full business name', type: 'text', required: true, icon: Building2 },
      { id: 'vendor_email', label: 'Email address?', placeholder: 'contact@vendor.com', type: 'email', icon: User },
      { id: 'vendor_phone', label: 'Phone number?', placeholder: '(555) 123-4567', type: 'phone', icon: Hash },
    ],
  },
  project: {
    icon: FolderKanban, label: 'Create Project', description: 'Start a new project with code and budget.', submitLabel: 'Create Project',
    questions: [
      { id: 'project_name', label: 'Project name?', placeholder: 'Project name', type: 'text', required: true, icon: FolderKanban },
      { id: 'project_code', label: 'Project code?', placeholder: 'e.g. PRJ-001', type: 'text', icon: Hash },
      { id: 'project_budget', label: 'Budget?', placeholder: '0.00', type: 'number', icon: DollarSign },
    ],
  },
};

/* ─── INPUT RENDERERS ─── */
function SimpleInput({ type, value, onChange, placeholder, options }: { type: string; value: string; onChange: (v: string) => void; placeholder?: string; options?: string[] }) {
  switch (type) {
    case 'number':
      return <Input type="number" step="0.01" className="rounded-none h-12 text-right font-mono-tab text-xl" placeholder={placeholder || '0.00'} value={value} onChange={e => onChange(e.target.value)} autoFocus />;
    case 'date':
      return <Input type="date" className="rounded-none h-12 text-base" value={value} onChange={e => onChange(e.target.value)} autoFocus />;
    case 'email':
      return <Input type="email" className="rounded-none h-12 text-base" placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} autoFocus />;
    case 'phone':
      return <Input type="tel" className="rounded-none h-12 text-base" placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} autoFocus />;
    case 'textarea':
      return <Textarea className="rounded-none text-base" rows={3} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} autoFocus />;
    case 'category':
      return (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="rounded-none h-12 text-base"><SelectValue placeholder="Select a category" /></SelectTrigger>
          <SelectContent>
            {(options || []).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    case 'payment':
      return (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="rounded-none h-12 text-base"><SelectValue placeholder="Select payment method" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="credit_card">Credit Card</SelectItem>
            <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
            <SelectItem value="net30">NET30</SelectItem>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="wire">Wire</SelectItem>
            <SelectItem value="check">Check</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      );
    default:
      return <Input className="rounded-none h-12 text-base" placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} autoFocus />;
  }
}

/* ─── MAIN ─── */
export default function Concierge() {
  const navigate = useNavigate();
  const { entity } = useEntity();
  const inputFileRef = useRef<HTMLInputElement>(null);
  const captureFileRef = useRef<HTMLInputElement>(null);
  const guidedFormRef = useRef<HTMLFormElement>(null);

  const [phase, setPhase] = useState<'welcome' | 'guided' | 'summary' | 'done'>('welcome');
  const [serviceType, setServiceType] = useState<ServiceType | null>(null);
  const [step, setStep] = useState(0);
  const [data, setData] = useState<Record<string, string>>({});
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [creatingVendor, setCreatingVendor] = useState(false);
  const [creatingProject, setCreatingProject] = useState(false);
  const [customCat, setCustomCat] = useState(false);
  const [customCatVal, setCustomCatVal] = useState('');

  // Inline quick-create forms (replaces browser prompt())
  const [quickVendorOpen, setQuickVendorOpen] = useState(false);
  const [quickVendorName, setQuickVendorName] = useState('');
  const [quickProjectOpen, setQuickProjectOpen] = useState(false);
  const [quickProjectName, setQuickProjectName] = useState('');
  const [quickProjectCode, setQuickProjectCode] = useState('');
  const [quickProjectBudget, setQuickProjectBudget] = useState('');

  const incomeUpsert = useUpsert('transactions', [['transactions']]);
  const expenseUpsert = useUpsert('transactions', [['transactions']]);
  const checkUpsert = useUpsert('checks', [['checks']]);
  const vendorCreate = useQuickCreate('vendors');
  const projectCreate = useQuickCreate('projects');

  const { data: vendors = [] } = useVendors();
  const { data: projects = [] } = useProjects();
  const { data: income = [] } = useTransactions('income');
  const { data: expenses = [] } = useTransactions('expense');
  const { data: checks = [] } = useChecks();

  const service = serviceType ? SERVICE_DEFS[serviceType] : null;
  const questions = service?.questions || [];
  const currentQuestion = questions[step] || null;
  const isLast = service && step === questions.length - 1;

  const mtd = useMemo(() => {
    const start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0);
    const inMonth = (d: string) => new Date(d) >= start;
    const inflow = income.filter((t: any) => inMonth(t.transaction_date)).reduce((s: number, t: any) => s + Number(t.amount), 0);
    const outflow = expenses.filter((t: any) => inMonth(t.transaction_date)).reduce((s: number, t: any) => s + Number(t.amount), 0) + checks.filter((c: any) => inMonth(c.issue_date) && c.status === 'cleared').reduce((s: number, c: any) => s + Number(c.amount), 0);
    const totalIn = income.reduce((s: number, t: any) => s + Number(t.amount), 0);
    const totalOut = expenses.reduce((s: number, t: any) => s + Number(t.amount), 0) + checks.filter((c: any) => c.status === 'cleared').reduce((s: number, c: any) => s + Number(c.amount), 0);
    return { inflow, outflow, net: inflow - outflow, balance: totalIn - totalOut };
  }, [income, expenses, checks]);

  const getVal = (id: string) => data[id] || '';
  const setVal = (id: string, v: string) => setData(prev => ({ ...prev, [id]: v }));

  const startService = (type: ServiceType) => {
    const def = SERVICE_DEFS[type];
    const defaults: Record<string, string> = {};
    def.questions.forEach(q => {
      if (q.type === 'date') defaults[q.id] = new Date().toISOString().slice(0, 10);
      else defaults[q.id] = '';
    });
    setData(defaults);
    setStep(0);
    setServiceType(type);
    setReceiptFile(null);
    setReceiptPreview(null);
    setCreatingVendor(false);
    setCreatingProject(false);
    setCustomCat(false);
    setCustomCatVal('');
    setPhase('guided');
  };

  const goNext = () => {
    if (!currentQuestion) return;
    if (currentQuestion.required && !getVal(currentQuestion.id)) {
      toast.error('Please fill in this field');
      return;
    }
    if (isLast) { setPhase('summary'); }
    else { setStep(prev => prev + 1); setCustomCat(false); setCustomCatVal(''); }
  };

  const goBack = () => {
    if (step === 0) { setPhase('welcome'); return; }
    setStep(prev => prev - 1); setCustomCat(false); setCustomCatVal('');
  };

  const commitCustomCategory = () => {
    const category = customCatVal.trim();
    if (!category) return false;
    setVal('category', category);
    setCustomCat(false);
    setCustomCatVal('');
    return true;
  };

  useEffect(() => {
    if (phase !== 'guided') return;

    const handleDocumentKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Enter' || e.defaultPrevented || e.isComposing) return;

      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'BUTTON') return;
      if (target.closest('[role="combobox"], [role="listbox"], [role="dialog"]')) return;

      e.preventDefault();
      guidedFormRef.current?.requestSubmit();
    };

    document.addEventListener('keydown', handleDocumentKeyDown);
    return () => document.removeEventListener('keydown', handleDocumentKeyDown);
  }, [phase, step]);

  const handleReceipt = useCallback((f: File | null) => {
    if (!f) { setReceiptFile(null); setReceiptPreview(null); return; }
    setReceiptFile(f);
    if (f.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setReceiptPreview(e.target?.result as string);
      reader.readAsDataURL(f);
    } else setReceiptPreview('/placeholder.svg');
  }, []);

  const createVendorNow = async () => {
    if (!quickVendorName.trim()) { toast.error('Enter a vendor name'); return; }
    setCreatingVendor(true);
    try {
      const result = await vendorCreate.mutateAsync({ name: quickVendorName.trim() });
      toast.success(`Vendor "${quickVendorName.trim()}" created`);
      setVal('vendor_id', result.id);
      setQuickVendorOpen(false);
      setQuickVendorName('');
    } catch (err: any) { toast.error(err.message || 'Failed'); }
    setCreatingVendor(false);
  };

  const createProjectNow = async () => {
    if (!quickProjectName.trim()) { toast.error('Enter a project name'); return; }
    setCreatingProject(true);
    try {
      const payload: Record<string, any> = { name: quickProjectName.trim(), status: 'active' };
      if (quickProjectCode.trim()) payload.code = quickProjectCode.trim();
      if (quickProjectBudget) payload.budget = parseFloat(quickProjectBudget) || 0;
      const result = await projectCreate.mutateAsync(payload);
      toast.success(`Project "${quickProjectName.trim()}" created`);
      setVal('project_id', result.id);
      setQuickProjectOpen(false);
      setQuickProjectName(''); setQuickProjectCode(''); setQuickProjectBudget('');
    } catch (err: any) { toast.error(err.message || 'Failed'); }
    setCreatingProject(false);
  };

  const submitAll = async () => {
    if (!service || !serviceType) return;
    try {
      switch (serviceType) {
        case 'income':
          await incomeUpsert.mutateAsync({ type: 'income', amount: parseFloat(getVal('amount')), transaction_date: getVal('date'), source_name: getVal('source_name') || null, vendor_id: null, project_id: getVal('project_id') || null, category: getVal('category') || null, notes: getVal('notes') || null } as any);
          break;
        case 'expense':
          await expenseUpsert.mutateAsync({ type: 'expense', amount: parseFloat(getVal('amount')), transaction_date: getVal('date'), vendor_id: getVal('vendor_id') || null, project_id: getVal('project_id') || null, category: getVal('category') || null, notes: getVal('notes') || null, payment_method: getVal('payment_method') || null } as any);
          break;
        case 'check':
          await checkUpsert.mutateAsync({ amount: parseFloat(getVal('amount')), payee_name: getVal('payee_name'), issue_date: getVal('date'), check_number: getVal('check_number') || null, memo: getVal('memo') || null, project_id: getVal('project_id') || null, status: 'pending' } as any);
          break;
        case 'vendor':
          await vendorCreate.mutateAsync({ name: getVal('vendor_name'), contact_email: getVal('vendor_email') || null, contact_phone: getVal('vendor_phone') || null });
          break;
        case 'project':
          await projectCreate.mutateAsync({ name: getVal('project_name'), code: getVal('project_code') || null, budget: getVal('project_budget') ? parseFloat(getVal('project_budget')) : null, status: 'active' });
          break;
      }
      toast.success(`${service.submitLabel} — done!`);
      setPhase('done');
    } catch (err: any) { toast.error(err?.message || 'Something went wrong'); }
  };

  /* ═════════════════════ WELCOME ═════════════════════ */
  if (phase === 'welcome') {
    return (
      <AppShell>
        <PageHeader
          eyebrow="Concierge"
          title="Your Dedicated Assistant"
          actions={entity && (
            <button
              onClick={() => navigate('/finance')}
              className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.18em] font-semibold px-2.5 py-1.5 border transition-opacity hover:opacity-70"
              style={{ borderColor: entity.color, color: entity.color, backgroundColor: entity.colorMuted }}
            >
              <RefreshCw className="w-2.5 h-2.5" strokeWidth={2} />
              {entity.shortName}
            </button>
          )}
        />
        <div className="px-4 sm:px-8 py-6 flex-1">
          <div className="max-w-6xl mx-auto w-full space-y-6">
            {/* Entity context banner */}
            {entity && (
              <div
                className="flex items-center gap-3 px-4 py-3 border"
                style={{ borderColor: entity.color, backgroundColor: entity.colorMuted }}
              >
                <div className="w-1 self-stretch shrink-0" style={{ backgroundColor: entity.color }} />
                <div className="flex-1 min-w-0">
                  <div className="text-[8px] uppercase tracking-[0.3em] font-bold" style={{ color: entity.color }}>Active Entity</div>
                  <div className="text-sm font-semibold truncate">{entity.name}</div>
                  <div className="text-[10px] text-muted-foreground">{entity.category} · All entries below are scoped to this entity</div>
                </div>
                <button onClick={() => navigate('/finance')} className="text-[9px] uppercase tracking-[0.18em] font-bold hover:opacity-70 transition-opacity shrink-0" style={{ color: entity.color }}>
                  Switch →
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border border border-border">
              {[
                { l: 'MTD Inflow', v: fmtUSD(mtd.inflow), c: 'text-positive' },
                { l: 'MTD Outflow', v: fmtUSD(mtd.outflow), c: '' },
                { l: 'Net MTD', v: fmtUSD(mtd.net), c: mtd.net >= 0 ? 'text-positive' : 'text-accent' },
                { l: 'Balance', v: fmtUSD(mtd.balance), c: mtd.balance >= 0 ? 'text-positive' : 'text-accent' },
              ].map(s => (
                <div key={s.l} className="bg-background px-4 py-3">
                  <div className="micro-label">{s.l}</div>
                  <div className={`text-lg font-semibold font-mono-tab mt-1 ${s.c}`}>{s.v}</div>
                </div>
              ))}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">What can I help you with?</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {(Object.entries(SERVICE_DEFS) as [ServiceType, ServiceDef][]).map(([type, s]) => (
                  <button key={type} onClick={() => startService(type)}
                    className={`group relative w-full text-left border transition-all duration-300 p-5 h-full flex flex-col ${s.accent ? 'border-foreground/20 bg-foreground/[0.02] hover:bg-foreground/[0.04] hover:border-foreground/40' : 'border-border hover:bg-secondary/50 hover:border-foreground/20'}`}
                  >
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`shrink-0 w-11 h-11 flex items-center justify-center transition-all duration-300 ${s.accent ? 'bg-foreground text-background' : 'bg-secondary text-muted-foreground group-hover:text-foreground'}`}>
                        <s.icon className="w-5 h-5" strokeWidth={1.5} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-semibold tracking-tight">{s.label}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 shrink-0" />
                        </div>
                        <div className="text-xs text-muted-foreground leading-relaxed">{s.description}</div>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-border">
                      <span className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground group-hover:text-foreground transition-colors">{s.questions.length} guided steps</span>
                    </div>
                  </button>
                ))}
                <button onClick={() => navigate('/ledger')}
                  className="group relative w-full text-left border border-border hover:bg-secondary/50 hover:border-foreground/20 transition-all duration-300 p-5 h-full flex flex-col"
                >
                  <div className="flex items-start gap-4 flex-1">
                    <div className="shrink-0 w-11 h-11 flex items-center justify-center bg-secondary text-muted-foreground group-hover:text-foreground transition-all duration-300">
                      <BookOpen className="w-5 h-5" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-semibold tracking-tight">View Ledger</span>
                      <div className="text-xs text-muted-foreground leading-relaxed mt-0.5">Review all transactions and balances.</div>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-border">
                    <span className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground">Direct navigation</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  /* ═════════════════════ GUIDED ═════════════════════ */
  if (phase === 'guided' && service && currentQuestion) {
    const q = currentQuestion;
    const Icon = q.icon || Sparkles;
    const progress = ((step + 1) / questions.length) * 100;

    const handleGuidedSubmit = (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (q.type === 'category' && customCat && !commitCustomCategory()) {
        toast.error('Please enter a category');
        return;
      }
      goNext();
    };

    const handleGuidedKeyDown = (e: KeyboardEvent<HTMLFormElement>) => {
      if (e.key !== 'Enter' || e.defaultPrevented || e.nativeEvent.isComposing) return;

      const target = e.target as HTMLElement;
      if (target.closest('[role="combobox"], [role="listbox"]')) return;
      if (target.tagName === 'TEXTAREA' && e.shiftKey) return;

      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        e.preventDefault();
        e.currentTarget.requestSubmit();
      }
    };

    const renderInput = () => {
      // Receipt
      if (q.type === 'receipt') {
        return (
          <div className="space-y-3">
            <input ref={inputFileRef} type="file" accept="*/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleReceipt(f); e.target.value = ''; }} />
            <input ref={captureFileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleReceipt(f); e.target.value = ''; }} />
            {receiptPreview ? (
              <div className="relative border border-border p-3 bg-secondary/20">
                <img src={receiptPreview} alt="Receipt" className="max-h-40 w-full object-contain" />
                <button type="button" onClick={() => handleReceipt(null)} className="absolute top-3 right-3 w-7 h-7 bg-background/90 border border-border flex items-center justify-center hover:bg-accent hover:text-white transition-colors"><X className="w-3.5 h-3.5" /></button>
                {receiptFile && <div className="text-[10px] text-muted-foreground mt-1.5 font-mono-tab truncate px-1">{(receiptFile.size / 1024 / 1024).toFixed(1)} MB · {receiptFile.name}</div>}
                <div className="flex gap-2 mt-3">
                  <Button type="button" variant="outline" onClick={() => captureFileRef.current?.click()} className="rounded-none flex-1 h-9 text-xs">Retake</Button>
                  <Button type="submit" className="rounded-none flex-1 h-9 text-xs bg-foreground text-background hover:opacity-90">Looks good</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Camera is primary — full width prominent */}
                <button type="button" onClick={() => captureFileRef.current?.click()} className="w-full flex flex-col items-center justify-center gap-2 py-10 bg-foreground text-background hover:opacity-90 transition-opacity group">
                  <Camera className="w-7 h-7" strokeWidth={1.5} />
                  <span className="text-sm font-semibold">Take Photo</span>
                  <span className="text-[9px] opacity-60 uppercase tracking-[0.15em]">Opens your camera</span>
                </button>
                {/* Upload as secondary */}
                <button type="button" onClick={() => inputFileRef.current?.click()} className="w-full flex items-center justify-center gap-2 py-3 border border-border hover:bg-secondary/50 transition-colors text-xs text-muted-foreground hover:text-foreground">
                  <Upload className="w-3.5 h-3.5" strokeWidth={1.5} />
                  Upload from device · All file types accepted
                </button>
                <Button type="submit" variant="outline" className="rounded-none w-full h-10 text-xs">Skip — no receipt</Button>
              </div>
            )}
          </div>
        );
      }

      // Vendor select
      if (q.type === 'vendor') {
        return (
          <div className="space-y-3">
            <Select value={getVal('vendor_id')} onValueChange={v => { setVal('vendor_id', v); setQuickVendorOpen(false); }}>
              <SelectTrigger className="rounded-none h-12 text-base"><SelectValue placeholder="Select a vendor" /></SelectTrigger>
              <SelectContent>
                {vendors.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
              </SelectContent>
            </Select>

            {/* Inline vendor quick-create */}
            {quickVendorOpen ? (
              <div className="border border-foreground/20 p-4 space-y-3 bg-secondary/30">
                <div className="text-[9px] uppercase tracking-[0.24em] font-bold text-muted-foreground">New Vendor</div>
                <Input
                  autoFocus
                  className="rounded-none h-11 text-base"
                  placeholder="Business name"
                  value={quickVendorName}
                  onChange={e => setQuickVendorName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); createVendorNow(); } if (e.key === 'Escape') { setQuickVendorOpen(false); setQuickVendorName(''); } }}
                />
                <div className="flex gap-2">
                  <Button type="button" onClick={createVendorNow} disabled={creatingVendor || !quickVendorName.trim()} className="rounded-none flex-1 h-10 text-xs bg-foreground text-background hover:opacity-90">
                    {creatingVendor ? 'Creating…' : 'Create Vendor'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => { setQuickVendorOpen(false); setQuickVendorName(''); }} className="rounded-none h-10 text-xs">Cancel</Button>
                </div>
              </div>
            ) : (
              <Button type="button" variant="outline" onClick={() => setQuickVendorOpen(true)} className="rounded-none h-9 text-xs w-full flex items-center justify-center gap-1">
                <Plus className="w-3 h-3" /> Create new vendor
              </Button>
            )}
          </div>
        );
      }

      // Project select
      if (q.type === 'project') {
        return (
          <div className="space-y-3">
            <Select value={getVal('project_id')} onValueChange={v => { setVal('project_id', v); setQuickProjectOpen(false); }}>
              <SelectTrigger className="rounded-none h-12 text-base"><SelectValue placeholder="No project (skip)" /></SelectTrigger>
              <SelectContent>
                {projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>

            {/* Inline project quick-create */}
            {quickProjectOpen ? (
              <div className="border border-foreground/20 p-4 space-y-3 bg-secondary/30">
                <div className="text-[9px] uppercase tracking-[0.24em] font-bold text-muted-foreground">New Project</div>
                <Input
                  autoFocus
                  className="rounded-none h-11 text-base"
                  placeholder="Project name *"
                  value={quickProjectName}
                  onChange={e => setQuickProjectName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Escape') { setQuickProjectOpen(false); setQuickProjectName(''); setQuickProjectCode(''); setQuickProjectBudget(''); } }}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    className="rounded-none h-10 text-sm font-mono-tab"
                    placeholder="Code (e.g. PRJ-001)"
                    value={quickProjectCode}
                    onChange={e => setQuickProjectCode(e.target.value)}
                  />
                  <Input
                    type="number"
                    className="rounded-none h-10 text-sm font-mono-tab text-right"
                    placeholder="Budget $"
                    value={quickProjectBudget}
                    onChange={e => setQuickProjectBudget(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); createProjectNow(); } }}
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="button" onClick={createProjectNow} disabled={creatingProject || !quickProjectName.trim()} className="rounded-none flex-1 h-10 text-xs bg-foreground text-background hover:opacity-90">
                    {creatingProject ? 'Creating…' : 'Create Project'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => { setQuickProjectOpen(false); setQuickProjectName(''); setQuickProjectCode(''); setQuickProjectBudget(''); }} className="rounded-none h-10 text-xs">Cancel</Button>
                </div>
              </div>
            ) : (
              <Button type="button" variant="outline" onClick={() => setQuickProjectOpen(true)} className="rounded-none h-9 text-xs w-full flex items-center justify-center gap-1">
                <Plus className="w-3 h-3" /> Create new project
              </Button>
            )}
          </div>
        );
      }

      // Category with custom support
      if (q.type === 'category') {
        if (customCat) {
          return (
            <div className="space-y-3">
              <Input value={customCatVal} onChange={e => setCustomCatVal(e.target.value)} placeholder="Type custom category..." className="rounded-none h-12 text-base" autoFocus />
              <div className="flex gap-2">
                <Button type="button" onClick={commitCustomCategory} className="rounded-none flex-1 h-9 text-xs bg-foreground text-background">Set</Button>
                <Button type="button" variant="outline" onClick={() => setCustomCat(false)} className="rounded-none h-9 text-xs">Cancel</Button>
              </div>
            </div>
          );
        }
        return (
          <div className="space-y-3">
            <Select value={getVal('category')} onValueChange={v => setVal('category', v)}>
              <SelectTrigger className="rounded-none h-12 text-base"><SelectValue placeholder="Select a category" /></SelectTrigger>
              <SelectContent>
                {(q.options || []).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" onClick={() => setCustomCat(true)} className="rounded-none h-9 text-xs w-full flex items-center justify-center gap-1">
              <Plus className="w-3 h-3" /> Create custom category
            </Button>
            <div className="flex justify-center mt-4">
              <Button type="submit" className="rounded-none h-12 px-10 bg-foreground text-background hover:opacity-90 text-sm">
                {isLast ? 'Review & Save' : 'Continue'}
                <ChevronRight className="w-4 h-4 ml-2" strokeWidth={1.5} />
              </Button>
            </div>
          </div>
        );
      }

      // Everything else
      return <SimpleInput type={q.type} value={getVal(q.id)} onChange={v => setVal(q.id, v)} placeholder={q.placeholder} options={q.options} />;
    };

    // Determine if we need the generic continue button
    const showContinue = q.type !== 'receipt' && q.type !== 'vendor' && q.type !== 'project' && !(q.type === 'category' && !customCat);

    return (
      <AppShell>
        <div className="min-h-screen flex flex-col">
          <div className="border-b border-border bg-background">
            <div className="px-4 sm:px-8 py-3 flex items-center justify-between">
              <button onClick={goBack} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
                {step === 0 ? 'All services' : 'Previous'}
              </button>
              <div className="flex items-center gap-2">
                <service.icon className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
                <span className="text-xs font-medium text-muted-foreground">{service.label}</span>
              </div>
              <div className="text-[10px] text-muted-foreground font-mono-tab">{step + 1} / {questions.length}</div>
            </div>
            <div className="h-0.5 bg-border">
              <div className="h-full bg-foreground transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center px-4 sm:px-8 py-8">
            <div className="w-full max-w-lg mx-auto">
              <form ref={guidedFormRef} onSubmit={handleGuidedSubmit} onKeyDown={handleGuidedKeyDown}>
                <div className="flex items-center justify-center mb-8">
                  <div className="w-16 h-16 bg-foreground/5 flex items-center justify-center">
                    <Icon className="w-7 h-7 text-foreground/60" strokeWidth={1.5} />
                  </div>
                </div>
                <h2 className="text-xl sm:text-2xl font-light tracking-tight text-center mb-2 leading-snug">{q.label}</h2>
                {q.helper && <p className="text-xs text-muted-foreground text-center mb-8">{q.helper}</p>}
                {!q.helper && <div className="mb-8" />}
                <div className="mb-6">{renderInput()}</div>

                {showContinue && (
                  <div className="flex justify-center">
                    <Button type="submit" className="rounded-none h-12 px-10 bg-foreground text-background hover:opacity-90 text-sm">
                      {isLast ? 'Review & Save' : 'Continue'}
                      <ChevronRight className="w-4 h-4 ml-2" strokeWidth={1.5} />
                    </Button>
                  </div>
                )}

                {/* Continue for vendor/project */}
                {(q.type === 'vendor' || q.type === 'project') && (
                  <div className="flex justify-center mt-4">
                    <Button type="submit" className="rounded-none h-12 px-10 bg-foreground text-background hover:opacity-90 text-sm">
                      {isLast ? 'Review & Save' : 'Continue'}
                      <ChevronRight className="w-4 h-4 ml-2" strokeWidth={1.5} />
                    </Button>
                  </div>
                )}

                <div className="flex items-center justify-center gap-1.5 mt-8">
                  {questions.map((_, i) => (
                    <div key={i} className={`w-1.5 h-1.5 transition-all duration-500 ${i <= step ? 'bg-foreground' : 'bg-border'}`} />
                  ))}
                </div>
              </form>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  /* ═════════════════════ SUMMARY ═════════════════════ */
  if (phase === 'summary' && service) {
    return (
      <AppShell>
        <div className="min-h-screen flex flex-col">
          <div className="border-b border-border bg-background">
            <div className="px-4 sm:px-8 py-3 flex items-center justify-between">
              <button onClick={() => setPhase('guided')} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} /> Back
              </button>
              <span className="text-xs font-medium text-muted-foreground">Review {service.submitLabel}</span>
              <div />
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center px-4 sm:px-8 py-8">
            <div className="w-full max-w-lg mx-auto">
              <div className="flex items-center justify-center mb-8">
                <div className="w-16 h-16 bg-positive/10 flex items-center justify-center">
                  <Check className="w-7 h-7 text-positive" strokeWidth={1.5} />
                </div>
              </div>
              <h2 className="text-xl sm:text-2xl font-light tracking-tight text-center mb-2">Ready to save</h2>
              <p className="text-xs text-muted-foreground text-center mb-8">Please review before confirming.</p>
              <div className="border border-border divide-y divide-border mb-8">
                {questions.map(q => {
                  if (q.type === 'receipt') return null;
                  const val = getVal(q.id);
                  if (!val) return null;
                  const label = q.id === 'vendor_id' ? (vendors.find((v: any) => v.id === val)?.name || val) : q.id === 'project_id' ? (projects.find((p: any) => p.id === val)?.name || val) : val;
                  return (
                    <div key={q.id} className="flex items-center justify-between px-4 py-3">
                      <span className="text-xs text-muted-foreground">{q.label}</span>
                      <span className="text-sm font-medium font-mono-tab text-right max-w-[60%] truncate ml-4">{label}</span>
                    </div>
                  );
                })}
                {receiptFile && (
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-xs text-muted-foreground">Receipt</span>
                    <span className="text-xs font-mono-tab text-right truncate max-w-[60%] ml-4">{receiptFile.name}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => setPhase('guided')} className="rounded-none h-11 px-8">Edit</Button>
                <Button onClick={submitAll} className="rounded-none h-11 px-8 bg-foreground text-background hover:opacity-90">
                  <Sparkles className="w-4 h-4 mr-2" strokeWidth={1.5} /> Confirm & Save
                </Button>
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  /* ═════════════════════ DONE ═════════════════════ */
  return (
    <AppShell>
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-positive/10 text-positive mb-8">
            <PartyPopper className="w-9 h-9" strokeWidth={1.5} />
          </div>
          <h2 className="text-3xl font-light tracking-tight mb-3">All done!</h2>
          <p className="text-sm text-muted-foreground mb-10 max-w-sm mx-auto leading-relaxed">
            Your {service?.submitLabel?.toLowerCase()} has been recorded successfully.
          </p>
          <div className="flex gap-4 justify-center">
            <Button onClick={() => setPhase('welcome')} className="rounded-none h-12 px-8 bg-foreground text-background hover:opacity-90">
              <Sparkles className="w-4 h-4 mr-2" strokeWidth={1.5} /> Do Another
            </Button>
            <Button variant="outline" onClick={() => navigate('/finance/dashboard')} className="rounded-none h-12 px-8">
              Back to Overview
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
