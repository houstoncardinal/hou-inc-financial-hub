import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { DateInput } from '@/components/ui/date-input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTransactions, useChecks, useVendors, useProjects, useUpsert, useQuickCreate, useFinanceClientAccounts } from '@/hooks/useFinance';
import { useUploadDocument } from '@/hooks/useDocuments';
import { useInvoices } from '@/hooks/useInvoices';
import { usePortalClients, useCreatePortalClient } from '@/hooks/usePortalClients';
import { useEntity } from '@/contexts/EntityContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { fmtUSD, todayLocalDate } from '@/lib/format';
import { toast } from 'sonner';
import {
  ArrowDownToLine, ArrowUpFromLine, FileText, Users, FolderKanban,
  BookOpen, ChevronRight, Camera, Upload, X, Plus,
  PartyPopper, Check, ArrowLeft, DollarSign, Building2, User,
  Hash, CreditCard, FileSpreadsheet, MessageSquare, Calendar,
  Sparkles, RefreshCw, Zap,
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
  skipIf?: (data: Record<string, string>) => boolean;
}

const REF_METHODS_INCOME = new Set(['check', 'ach_wire']);
const REF_METHODS_EXPENSE = new Set(['check', 'ach', 'wire']);

const detectInvoiceProvider = (url: string) => {
  const normalized = url.toLowerCase();
  if (normalized.includes('stripe.com') || normalized.includes('stripe')) return 'stripe';
  if (normalized.includes('quickbooks') || normalized.includes('intuit')) return 'quickbooks';
  return url.trim() ? 'other' : '';
};

const invoiceProviderLabel = (provider: string) => {
  if (provider === 'stripe') return 'Stripe';
  if (provider === 'quickbooks') return 'QuickBooks';
  if (provider === 'other') return 'External invoice';
  return '';
};
const txnAmount = (t: any) => Number(t?.total_amount ?? t?.amount ?? 0);

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
      { id: 'payment_method', label: 'How was this payment received?', type: 'payment_income', icon: CreditCard },
      { id: 'check_reference', label: 'Check or reference number?', placeholder: 'e.g. 1042', type: 'text', icon: Hash, helper: 'For bank reconciliation — matches your bank statement', skipIf: d => !REF_METHODS_INCOME.has(d.payment_method) },
      { id: 'retainage', label: 'Any retainage / holdback?', type: 'retainage', icon: DollarSign, helper: 'Enter the holdback % or $ amount — leave blank to skip' },
      { id: 'category', label: 'What type of income is this?', type: 'category', options: ['Client Payment', 'Retainer', 'Project Milestone', 'Consulting Fee', 'Reimbursement', 'Interest Income', 'Grant', 'Financing Draw', 'Refund', 'Other Income'], icon: FileSpreadsheet },
      { id: 'invoice_id', label: 'Link to an invoice?', type: 'invoice', icon: FileText, helper: 'Optional — marks the invoice as paid' },
      { id: 'cost_phase', label: 'Construction phase?', type: 'phase', icon: FolderKanban, helper: 'Optional — assign to a project phase for cost tracking' },
      { id: 'project_id', label: 'Assign to a project?', type: 'project', icon: FolderKanban },
      { id: 'notes', label: 'Any notes?', placeholder: 'Optional notes…', type: 'textarea', icon: MessageSquare },
    ],
  },
  expense: {
    icon: ArrowUpFromLine, label: 'Record Expense', description: 'Log an outgoing payment with vendor and receipt.', submitLabel: 'Save Expense',
    questions: [
      { id: 'amount', label: 'How much was spent?', placeholder: '0.00', type: 'number', required: true, icon: DollarSign },
      { id: 'date', label: 'When did it occur?', type: 'date', required: true, icon: Calendar },
      { id: 'source_name', label: 'Link to a finance client account?', placeholder: 'Client account, site, or payer relationship', type: 'text', icon: User, helper: 'Optional — links this cost to a client account while staying separate from portal access.' },
      { id: 'vendor_id', label: 'Which vendor?', type: 'vendor', icon: Building2 },
      { id: 'category', label: 'What category?', type: 'category', options: ['Materials & Supplies', 'Labor & Subcontractors', 'Permits & Fees', 'Equipment Rental', 'Transportation & Freight', 'Office & Admin', 'Insurance', 'Utilities', 'Marketing & Advertising', 'Professional Services', 'Travel & Meals', 'Software & Subscriptions', 'Maintenance & Repairs', 'Taxes & Licenses', 'Miscellaneous'], icon: FileSpreadsheet },
      { id: 'payment_method', label: 'How was it paid?', type: 'payment_expense', icon: CreditCard },
      { id: 'check_reference', label: 'Check or reference number?', placeholder: 'Trace # or check #', type: 'text', icon: Hash, helper: 'For bank reconciliation — matches your bank statement', skipIf: d => !REF_METHODS_EXPENSE.has(d.payment_method) },
      { id: 'cost_phase', label: 'Construction phase?', type: 'phase', icon: FolderKanban, helper: 'Optional — assign to a project phase for cost tracking' },
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
      { id: 'check_number', label: 'Check number?', placeholder: 'e.g. 1024', type: 'text', required: true, icon: Hash },
      { id: 'date', label: 'Date on check?', type: 'date', required: true, icon: Calendar },
      { id: 'project_id', label: 'Assign to a project?', type: 'project', icon: FolderKanban },
      { id: 'status', label: 'What is the check status?', type: 'check_status', icon: FileSpreadsheet, helper: 'Most new checks should stay pending until the bank clears them.' },
      { id: 'retainage_pct', label: 'Retainage withheld?', placeholder: '0.00', type: 'percent', icon: DollarSign, helper: 'Optional percentage (0-100) retained from subcontractor/vendor payment.' },
      { id: 'lien_waiver_status', label: 'Lien waiver status?', type: 'lien_waiver', icon: FileText, helper: 'Track whether lien waiver documentation is needed.' },
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

const HGP_SERVICE_DEFS: Record<ServiceType, ServiceDef> = {
  income: {
    ...SERVICE_DEFS.income,
    label: 'Log Generator Income',
    description: 'Record generator sale deposits, install payments, maintenance plans, emergency service, or warranty reimbursement.',
    questions: SERVICE_DEFS.income.questions.map(q => {
      if (q.id === 'source_name') return { ...q, label: 'Which HGP client or property paid?', placeholder: 'Customer, builder, property manager, or warranty source' };
      if (q.id === 'payment_method') return { ...q, label: 'How did HGP receive this payment?' };
      if (q.id === 'category') return {
        ...q,
        label: 'What type of HGP income is this?',
        options: [
          'Generator Sale', 'Generator Deposit', 'Installation Payment', 'Final Payment',
          'Service Maintenance', 'Maintenance Plan', 'Emergency Service',
          'Warranty Reimbursement', 'Financing Payment', 'Parts Sale', 'Other Income',
        ],
      };
      if (q.id === 'cost_phase') return { ...q, label: 'Generator job phase?', type: 'hgp_phase', helper: 'Optional — classify sale, install, service, permit, or warranty work.' };
      if (q.id === 'project_id') return { ...q, label: 'Link to an install/service job?', type: 'project', icon: Zap };
      if (q.id === 'notes') return { ...q, placeholder: 'Generator model, site address, utility provider, service summary, warranty claim, or install notes…' };
      return q;
    }),
  },
  expense: {
    ...SERVICE_DEFS.expense,
    label: 'Record HGP Expense',
    description: 'Log generator equipment, distributor invoices, electrical labor, permits, warranty/service parts, trucks, fuel, and service overhead.',
    questions: SERVICE_DEFS.expense.questions.map(q => {
      if (q.id === 'source_name') return { ...q, label: 'Which HGP client / generator site is this cost tied to?', placeholder: 'Customer, property, service account, or install job relationship' };
      if (q.id === 'vendor_id') return { ...q, label: 'Which supplier / distributor / subcontractor?', icon: Building2 };
      if (q.id === 'category') return {
        ...q,
        label: 'What HGP cost category?',
        options: [
          'Generator Equipment Purchase', 'Distributor Invoice', 'Install Materials',
          'Electrical Labor', 'Subcontract Labor', 'Permit Fees', 'Inspection Fees',
          'Warranty Parts', 'Service Parts', 'Truck & Fuel', 'Marketing Leads',
          'Software', 'Insurance', 'Payroll', 'Office Overhead', 'Other',
        ],
      };
      if (q.id === 'cost_phase') return { ...q, label: 'Generator job phase?', type: 'hgp_phase', helper: 'Optional — assign to survey, permit, equipment, install, inspection, service, or warranty.' };
      if (q.id === 'project_id') return { ...q, label: 'Link to an install/service job?', icon: Zap };
      if (q.id === 'receipt') return { ...q, label: 'Upload supplier invoice / receipt?', helper: 'Distributor invoices, Home Depot runs, fuel, permits, parts, or warranty documentation.' };
      if (q.id === 'notes') return { ...q, placeholder: 'PO number, generator model/serial, job address, technician, truck, or service notes…' };
      return q;
    }),
  },
  check: {
    ...SERVICE_DEFS.check,
    label: 'Issue HGP Check',
    description: 'Create a supplier, distributor, permit, subcontractor, warranty-parts, or service vendor check.',
    questions: SERVICE_DEFS.check.questions.map(q => {
      if (q.id === 'payee_name') return { ...q, label: 'Supplier / payee name?', placeholder: 'Distributor, electrician, permit office, or service vendor' };
      if (q.id === 'project_id') return { ...q, label: 'Assign to an install/service job?', icon: Zap };
      if (q.id === 'retainage_pct') return { ...q, label: 'Any subcontractor retainage?', helper: 'Optional retainage withheld from electrical or install subcontractors.' };
      if (q.id === 'lien_waiver_status') return { ...q, label: 'Lien waiver / supplier paperwork?', helper: 'Useful for electrical subcontractors and larger equipment/vendor payments.' };
      if (q.id === 'memo') return { ...q, placeholder: 'Generator equipment, permit, electrical labor, service parts, warranty work…' };
      return q;
    }),
  },
  vendor: {
    ...SERVICE_DEFS.vendor,
    label: 'Add Supplier',
    description: 'Add generator distributors, electrical suppliers, subcontract electricians, permit offices, and service vendors.',
    submitLabel: 'Add Supplier',
    questions: SERVICE_DEFS.vendor.questions.map(q => {
      if (q.id === 'vendor_name') return { ...q, label: 'Supplier / business name?', placeholder: 'Generac distributor, electrical supplier, subcontractor…' };
      return q;
    }),
  },
  project: {
    ...SERVICE_DEFS.project,
    label: 'Create Install Job',
    description: 'Start a generator install, service, maintenance, emergency, warranty, or site-survey job.',
    submitLabel: 'Create Job',
    questions: SERVICE_DEFS.project.questions.map(q => {
      if (q.id === 'project_name') return { ...q, label: 'Job / customer name?', placeholder: 'Customer - generator install / service job' };
      if (q.id === 'project_code') return { ...q, label: 'Job code?', placeholder: 'HGP-001 or customer/job number' };
      if (q.id === 'project_budget') return { ...q, label: 'Quoted amount / job budget?', placeholder: '0.00' };
      return q;
    }),
  },
};

/* ─── INPUT RENDERERS ─── */
function SimpleInput({ type, value, onChange, placeholder, options }: { type: string; value: string; onChange: (v: string) => void; placeholder?: string; options?: string[] }) {
  switch (type) {
    case 'number':
      return <CurrencyInput className="h-12 text-xl" placeholder={placeholder || '0.00'} value={value} onValueChange={onChange} autoFocus />;
    case 'percent':
      return (
        <div className="relative">
          <Input
            type="number" min="0" max="100" step="0.5" inputMode="decimal"
            className="rounded-none h-12 text-xl pr-9" placeholder={placeholder || '0.00'}
            value={value} onChange={e => onChange(e.target.value)} autoFocus
          />
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-base text-muted-foreground pointer-events-none">%</span>
        </div>
      );
    case 'date':
      return <DateInput className="h-12 text-base" value={value} onChange={e => onChange(e.target.value)} autoFocus />;
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
    case 'payment_income':
      return (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="rounded-none h-12 text-base"><SelectValue placeholder="Select payment method" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="check">Check</SelectItem>
            <SelectItem value="ach_wire">ACH / Wire</SelectItem>
            <SelectItem value="credit_card">Credit Card</SelectItem>
            <SelectItem value="financing_draw">Financing Draw</SelectItem>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      );
    case 'payment_expense':
      return (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="rounded-none h-12 text-base"><SelectValue placeholder="Select payment method" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="check">Check</SelectItem>
            <SelectItem value="credit_card">Credit Card</SelectItem>
            <SelectItem value="ach">ACH</SelectItem>
            <SelectItem value="net_30">NET 30</SelectItem>
            <SelectItem value="net_60">NET 60</SelectItem>
            <SelectItem value="net_90">NET 90</SelectItem>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="wire">Wire</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      );
    case 'phase':
      return (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="rounded-none h-12 text-base"><SelectValue placeholder="Select phase (optional)" /></SelectTrigger>
          <SelectContent>
            {['Phase 1: Site Prep & Demo','Phase 2: Foundation & Concrete','Phase 3: Framing & Structure','Phase 4: Rough-Ins (MEP)','Phase 5: Exterior & Roofing','Phase 6: Insulation & Drywall','Phase 7: Finishes & Fixtures','Phase 8: Landscaping & Final','General / Overhead'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    case 'hgp_phase':
      return (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="rounded-none h-12 text-base"><SelectValue placeholder="Select HGP phase (optional)" /></SelectTrigger>
          <SelectContent>
            {[
              'Lead / Proposal', 'Site Survey', 'Load Calculation', 'Permit',
              'Equipment Order', 'Equipment Delivery', 'Install Labor',
              'Inspection', 'Commissioning', 'Maintenance Plan',
              'Emergency Service', 'Warranty Work', 'Service Parts',
              'Truck / Dispatch', 'General Overhead',
            ].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    case 'check_status':
      return (
        <Select value={value || 'pending'} onValueChange={onChange}>
          <SelectTrigger className="rounded-none h-12 text-base"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="cleared">Cleared</SelectItem>
            <SelectItem value="voided">Voided</SelectItem>
          </SelectContent>
        </Select>
      );
    case 'lien_waiver':
      return (
        <Select value={value || 'not_required'} onValueChange={onChange}>
          <SelectTrigger className="rounded-none h-12 text-base"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="not_required">Not Required</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="received">Received</SelectItem>
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
  const [searchParams, setSearchParams] = useSearchParams();
  const { entity } = useEntity();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const inputFileRef = useRef<HTMLInputElement>(null);
  const captureFileRef = useRef<HTMLInputElement>(null);
  const guidedFormRef = useRef<HTMLFormElement>(null);
  const appliedProjectPrefillRef = useRef(false);

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
  const [savingEntry, setSavingEntry] = useState(false);
  const isHgp = entity?.id === 'houston-generator-pros';
  const isHE = entity?.id === 'houston-enterprise';
  const activeServiceDefs = isHgp ? HGP_SERVICE_DEFS : SERVICE_DEFS;

  // Client portal clients — HE-only income source picker (portal_clients is
  // deliberately separate from finance_client_accounts, migration
  // 20260718000009_finance_client_portal_separation.sql).
  const { data: portalClients = [] } = usePortalClients();
  const createPortalClient = useCreatePortalClient();
  const [quickPortalClientOpen, setQuickPortalClientOpen] = useState(false);
  const [quickPortalClientName, setQuickPortalClientName] = useState('');
  const [creatingPortalClient, setCreatingPortalClient] = useState(false);

  // Inline quick-create forms (replaces browser prompt())
  const [quickVendorOpen, setQuickVendorOpen] = useState(false);
  const [quickVendorName, setQuickVendorName] = useState('');
  const [quickProjectOpen, setQuickProjectOpen] = useState(false);
  const [quickProjectName, setQuickProjectName] = useState('');
  const [quickProjectCode, setQuickProjectCode] = useState('');
  const [quickProjectBudget, setQuickProjectBudget] = useState('');
  const [quickClientOpen, setQuickClientOpen] = useState(false);
  const [quickClientName, setQuickClientName] = useState('');
  const [quickClientEmail, setQuickClientEmail] = useState('');
  const [quickClientPhone, setQuickClientPhone] = useState('');
  const [quickClientProjectType, setQuickClientProjectType] = useState('');
  const [quickClientReference, setQuickClientReference] = useState('');

  const incomeUpsert = useUpsert('transactions', [['transactions']]);
  const expenseUpsert = useUpsert('transactions', [['transactions']]);
  const checkUpsert = useUpsert('checks', [['checks']]);
  const vendorCreate = useQuickCreate('vendors');
  const projectCreate = useQuickCreate('projects');
  const uploadDocument = useUploadDocument();

  const { data: vendorsRaw = [] } = useVendors();
  const { data: projectsRaw = [] } = useProjects();
  // Inline-created vendors/projects merge in immediately so the picker can
  // show + auto-select the new one before the underlying query refetches —
  // otherwise the Select's value points at an id with no matching item yet.
  const [extraVendors, setExtraVendors] = useState<any[]>([]);
  const [extraProjects, setExtraProjects] = useState<any[]>([]);
  const vendors = useMemo(() => {
    const byId = new Map<string, any>();
    [...vendorsRaw, ...extraVendors].forEach(v => v?.id && byId.set(v.id, v));
    return Array.from(byId.values());
  }, [vendorsRaw, extraVendors]);
  const projects = useMemo(() => {
    const byId = new Map<string, any>();
    [...projectsRaw, ...extraProjects].forEach(p => p?.id && byId.set(p.id, p));
    return Array.from(byId.values());
  }, [projectsRaw, extraProjects]);
  const { data: financeClients = [] } = useFinanceClientAccounts();
  const { invoices = [], update: updateInvoice } = useInvoices();
  const { data: income = [] } = useTransactions('income');
  const { data: expenses = [] } = useTransactions('expense');
  const { data: checks = [] } = useChecks();

  const service = serviceType ? activeServiceDefs[serviceType] : null;
  const questions = service?.questions || [];
  const currentQuestion = questions[step] || null;
  const isLast = service && questions.slice(step + 1).every(q => q.skipIf?.(data));

  const mtd = useMemo(() => {
    const start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0);
    const inMonth = (d: string) => new Date(d) >= start;
    const inflow = income.filter((t: any) => inMonth(t.transaction_date)).reduce((s: number, t: any) => s + txnAmount(t), 0);
    const outflow = expenses.filter((t: any) => inMonth(t.transaction_date)).reduce((s: number, t: any) => s + txnAmount(t), 0) + checks.filter((c: any) => inMonth(c.issue_date) && c.status === 'cleared').reduce((s: number, c: any) => s + Number(c.amount), 0);
    const totalIn = income.reduce((s: number, t: any) => s + txnAmount(t), 0);
    const totalOut = expenses.reduce((s: number, t: any) => s + txnAmount(t), 0) + checks.filter((c: any) => c.status === 'cleared').reduce((s: number, c: any) => s + Number(c.amount), 0);
    return { inflow, outflow, net: inflow - outflow, balance: totalIn - totalOut };
  }, [income, expenses, checks]);

  const getVal = (id: string) => data[id] || '';
  const setVal = (id: string, v: string) => setData(prev => ({ ...prev, [id]: v }));

  // checks.check_number is NOT NULL in the DB — mirror CheckNew.tsx's
  // auto-numbering so the guided flow can't submit a blank one.
  const nextCheckNumber = useMemo(() => {
    const nums = checks.map((c: any) => parseInt(c.check_number, 10)).filter((n: number) => !isNaN(n));
    return String((nums.length ? Math.max(...nums) : 1000) + 1);
  }, [checks]);

  const startService = (type: ServiceType) => {
    const def = activeServiceDefs[type];
    const defaults: Record<string, string> = {};
    def.questions.forEach(q => {
      if (q.type === 'date') defaults[q.id] = todayLocalDate();
      else if (q.id === 'check_number') defaults[q.id] = nextCheckNumber;
      else defaults[q.id] = '';
      const preset = searchParams.get(q.id);
      if (preset !== null) defaults[q.id] = preset;
    });
    const categoryPreset = searchParams.get('category');
    const phasePreset = searchParams.get('cost_phase');
    const paymentPreset = searchParams.get('payment_method');
    if (categoryPreset) defaults.category = categoryPreset;
    if (phasePreset) defaults.cost_phase = phasePreset;
    if (paymentPreset) defaults.payment_method = paymentPreset;
    setData(defaults);
    setStep(0);
    setServiceType(type);
    setReceiptFile(null);
    setReceiptPreview(null);
    setCreatingVendor(false);
    setCreatingProject(false);
    setQuickClientOpen(false);
    setQuickClientName('');
    setQuickClientEmail('');
    setQuickClientPhone('');
    setQuickClientProjectType('');
    setQuickClientReference('');
    setCustomCat(false);
    setCustomCatVal('');
    setPhase('guided');
  };

  useEffect(() => {
    const start = searchParams.get('start') as ServiceType | null;
    if (!start || !(start in activeServiceDefs)) return;
    startService(start);
    const next = new URLSearchParams(searchParams);
    ['start', 'category', 'cost_phase', 'payment_method', 'project_id', 'source_name', 'vendor_id'].forEach(k => next.delete(k));
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, activeServiceDefs]);

  // Intelligent prefill: a project detail page can deep-link here with ?project=<id>
  // to pin the guided form to that project and pull in its known client name.
  useEffect(() => {
    if (appliedProjectPrefillRef.current || phase !== 'guided') return;
    const projectId = searchParams.get('project');
    if (!projectId) return;
    const proj = projects.find((p: any) => p.id === projectId);
    if (!proj) return; // projects query hasn't resolved yet — try again next render
    appliedProjectPrefillRef.current = true;
    setVal('project_id', proj.id);
    if (serviceType === 'income' && proj.client_name_snapshot && !getVal('source_name')) {
      setVal('source_name', proj.client_name_snapshot);
    }
    searchParams.delete('project');
    setSearchParams(searchParams, { replace: true });
  }, [searchParams, setSearchParams, projects, phase, serviceType]);

  const goNext = () => {
    if (!currentQuestion) return;
    if (currentQuestion.required && !getVal(currentQuestion.id)) {
      toast.error('Please fill in this field');
      return;
    }
    let nextStep = step + 1;
    while (nextStep < questions.length && questions[nextStep].skipIf?.(data)) nextStep++;
    if (nextStep >= questions.length) { setPhase('summary'); }
    else { setStep(nextStep); setCustomCat(false); setCustomCatVal(''); }
  };

  const goBack = () => {
    if (step === 0) { setPhase('welcome'); return; }
    let prevStep = step - 1;
    while (prevStep > 0 && questions[prevStep].skipIf?.(data)) prevStep--;
    setStep(prevStep); setCustomCat(false); setCustomCatVal('');
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
      setExtraVendors(prev => [...prev.filter(v => v.id !== result.id), result]);
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
      setExtraProjects(prev => [...prev.filter(p => p.id !== result.id), result]);
      setVal('project_id', result.id);
      setQuickProjectOpen(false);
      setQuickProjectName(''); setQuickProjectCode(''); setQuickProjectBudget('');
    } catch (err: any) { toast.error(err.message || 'Failed'); }
    setCreatingProject(false);
  };

  const createPortalClientNow = async () => {
    if (!quickPortalClientName.trim()) { toast.error('Enter a client name'); return; }
    setCreatingPortalClient(true);
    try {
      const result = await createPortalClient.mutateAsync({ name: quickPortalClientName.trim() });
      toast.success(`Client "${quickPortalClientName.trim()}" added`);
      setVal('source_name', result.name);
      setQuickPortalClientOpen(false);
      setQuickPortalClientName('');
    } catch (err: any) { toast.error(err.message || 'Failed'); }
    setCreatingPortalClient(false);
  };

  const createClientNow = async () => {
    if (!quickClientName.trim()) { toast.error('Enter a client name'); return; }
    if (!quickClientEmail.trim()) { toast.error('Enter an email so payments can be matched to this client'); return; }
    if (!user?.id || !entity?.id) { toast.error('Sign in required'); return; }
    try {
      const payload = {
        user_id: user.id,
        entity_id: entity.id,
        name: quickClientName.trim(),
        email: quickClientEmail.trim(),
        phone: quickClientPhone.trim(),
        client_type: quickClientProjectType.trim() || (isHgp ? 'residential' : 'residential'),
        status: 'active',
        construction_scope: isHgp ? null : quickClientReference.trim() || null,
        notes: quickClientReference.trim() || null,
        tags: isHgp ? ['hgp-finance-client'] : ['he-finance-client'],
      };
      const { data: result, error } = await supabase
        .from('finance_client_accounts' as never)
        .insert(payload as never)
        .select()
        .single();
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ['finance-client-accounts'] });
      const created = result as any;
      setVal('finance_client_id', created.id);
      setVal('source_name', created.name);
      toast.success(`Client "${created.name}" added`);
      setQuickClientOpen(false);
      setQuickClientName('');
      setQuickClientEmail('');
      setQuickClientPhone('');
      setQuickClientProjectType('');
      setQuickClientReference('');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to add client');
    }
  };

  const submitAll = async () => {
    if (!service || !serviceType) return;
    if (savingEntry) return;
    setSavingEntry(true);
    try {
      const paymentRef = getVal('check_reference');
      const mergedNotes = [getVal('notes'), paymentRef ? `Payment reference: ${paymentRef}` : '']
        .filter(Boolean)
        .join('\n');
      switch (serviceType) {
        case 'income':
          await incomeUpsert.mutateAsync({
            type: 'income',
            amount: parseFloat(getVal('amount')),
            amount_before_tax: parseFloat(getVal('amount')),
            total_amount: parseFloat(getVal('amount')),
            net_amount: Math.max(0, parseFloat(getVal('amount')) - (getVal('retainage_amount') ? parseFloat(getVal('retainage_amount')) : 0)),
            transaction_date: getVal('date'),
            posting_date: getVal('date'),
            source_name: getVal('source_name') || null,
            finance_client_id: getVal('finance_client_id') || null,
            vendor_id: null,
            project_id: getVal('project_id') || null,
            category: getVal('category') || null,
            description: getVal('category') || getVal('source_name') || mergedNotes || null,
            notes: mergedNotes || null,
            payment_method: getVal('payment_method') || null,
            check_reference: getVal('check_reference') || null,
            retainage_percent: getVal('retainage_percent') ? parseFloat(getVal('retainage_percent')) : null,
            retainage_amount: getVal('retainage_amount') ? parseFloat(getVal('retainage_amount')) : null,
            invoice_id: getVal('invoice_id') || null,
            external_invoice_provider: getVal('external_invoice_provider') || null,
            external_invoice_url: getVal('external_invoice_url') || null,
            external_invoice_number: getVal('external_invoice_number') || null,
            cost_phase: getVal('cost_phase') || null,
            status: 'posted',
            approval_status: 'approved',
            payment_status: 'paid',
            reconciliation_status: 'unreconciled',
            fiscal_year: new Date(getVal('date')).getFullYear(),
            accounting_period: getVal('date').slice(0, 7),
          } as any);
          if (getVal('invoice_id') && (getVal('external_invoice_url') || getVal('external_invoice_provider') || getVal('external_invoice_number') || getVal('finance_client_id'))) {
            await updateInvoice(getVal('invoice_id'), {
              status: 'paid',
              stripe_payment_link: getVal('external_invoice_provider') === 'stripe' && getVal('external_invoice_url') ? getVal('external_invoice_url') : undefined,
              external_invoice_url: getVal('external_invoice_url') || undefined,
              external_invoice_provider: getVal('external_invoice_provider') || undefined,
              external_invoice_number: getVal('external_invoice_number') || undefined,
              finance_client_id: getVal('finance_client_id') || undefined,
              client_visible: true,
            } as any);
          }
          break;
        case 'expense': {
          const txnId = crypto.randomUUID();
          await expenseUpsert.mutateAsync({
            id: txnId,
            __mode: 'insert',
            type: 'expense',
            amount: parseFloat(getVal('amount')),
            amount_before_tax: parseFloat(getVal('amount')),
            total_amount: parseFloat(getVal('amount')),
            net_amount: parseFloat(getVal('amount')),
            transaction_date: getVal('date'),
            posting_date: getVal('date'),
            vendor_id: getVal('vendor_id') || null,
            finance_client_id: getVal('finance_client_id') || null,
            project_id: getVal('project_id') || null,
            category: getVal('category') || null,
            description: getVal('category') || mergedNotes || null,
            notes: mergedNotes || null,
            payment_method: getVal('payment_method') || null,
            check_reference: getVal('check_reference') || null,
            cost_phase: getVal('cost_phase') || null,
            status: 'posted',
            approval_status: 'approved',
            payment_status: 'paid',
            reconciliation_status: 'unreconciled',
            fiscal_year: new Date(getVal('date')).getFullYear(),
            accounting_period: getVal('date').slice(0, 7),
          } as any);
          if (receiptFile) {
            uploadDocument.mutateAsync({ file: receiptFile, docType: 'receipt', runOcr: true, linked_transaction_id: txnId })
              .catch(() => toast.error('Expense saved — receipt upload failed'));
          }
          break;
        }
        case 'check': {
          const status = getVal('status') || 'pending';
          const retainagePct = parseFloat(getVal('retainage_pct') || '0') || 0;
          if (retainagePct < 0 || retainagePct > 100) {
            toast.error('Retainage must be between 0% and 100%');
            setSavingEntry(false);
            return;
          }
          if (!getVal('check_number').trim()) {
            toast.error('Check number is required');
            setSavingEntry(false);
            return;
          }
          const amount = parseFloat(getVal('amount'));
          await checkUpsert.mutateAsync({
            amount,
            payee_name: getVal('payee_name'),
            issue_date: getVal('date'),
            posting_date: getVal('date'),
            check_number: getVal('check_number'),
            memo: getVal('memo') || null,
            project_id: getVal('project_id') || null,
            status,
            reconciliation_status: status === 'cleared' ? 'reconciled' : 'unreconciled',
            cleared_date: status === 'cleared' ? getVal('date') : null,
            approval_status: 'approved',
            print_status: 'not_printed',
            delivery_status: 'not_delivered',
            retainage_pct: retainagePct,
            retainage_held: retainagePct ? amount * (retainagePct / 100) : 0,
            lien_waiver_status: getVal('lien_waiver_status') || 'not_required',
          } as any);
          break;
        }
        case 'vendor':
          await vendorCreate.mutateAsync({ name: getVal('vendor_name'), contact_email: getVal('vendor_email') || null, contact_phone: getVal('vendor_phone') || null });
          break;
        case 'project':
          if (isHgp && user?.id) {
            const { error } = await supabase
              .from('hgp_jobs' as never)
              .insert({
                user_id: user.id,
                entity_id: 'houston-generator-pros',
                customer_name: getVal('project_name'),
                job_type: 'install',
                stage: 'lead',
                quoted_amount: getVal('project_budget') ? parseFloat(getVal('project_budget')) : 0,
                notes: getVal('project_code') ? `Job code: ${getVal('project_code')}` : null,
              } as never);
            if (error) throw error;
            await queryClient.invalidateQueries({ queryKey: ['hgp-jobs'] });
          } else {
            await projectCreate.mutateAsync({ name: getVal('project_name'), code: getVal('project_code') || null, budget: getVal('project_budget') ? parseFloat(getVal('project_budget')) : null, status: 'active' });
          }
          break;
      }
      toast.success(`${service.submitLabel} — done!`);
      setPhase('done');
    } catch (err: any) {
      toast.error(err?.message || 'Something went wrong');
    } finally {
      setSavingEntry(false);
    }
  };

  /* ═════════════════════ WELCOME ═════════════════════ */
  if (phase === 'welcome') {
    return (
      <AppShell>
        <PageHeader
          eyebrow={isHgp ? 'Houston Generator Pros' : 'Concierge'}
          title={isHgp ? 'HGP Guided Entry' : 'Your Dedicated Assistant'}
          description={isHgp ? 'Generator income, supplier expenses, checks, clients, and install-job creation through mobile-friendly guided forms.' : undefined}
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
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{isHgp ? 'Choose an HGP workflow' : 'What can I help you with?'}</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {(Object.entries(activeServiceDefs) as [ServiceType, ServiceDef][]).map(([type, s]) => (
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
    const guidedPreset = isHgp
      ? [data.category, data.payment_method, data.cost_phase, data.memo].filter(Boolean).join(' · ')
      : '';

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
      // Retainage (income only) — dual % / $ inputs sharing data keys
      if (q.type === 'retainage') {
        const pct = getVal('retainage_percent');
        const amtVal = getVal('retainage_amount');
        const base = getVal('amount');
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Percent %</div>
                <div className="relative">
                  <Input type="number" min="0" max="100" step="0.1" className="rounded-none h-12 pr-7" placeholder="10"
                    value={pct} autoFocus
                    onChange={e => { const p = e.target.value; const computed = p && base ? String(Math.round(parseFloat(base) * parseFloat(p) / 100 * 100) / 100) : ''; setVal('retainage_percent', p); setVal('retainage_amount', computed); }} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">%</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Dollar Amount</div>
                <div className="relative">
                  <CurrencyInput className="h-12" placeholder="0.00"
                    value={amtVal}
                    onValueChange={a => { const computed = a && base ? String(Math.round(parseFloat(a) / parseFloat(base) * 100 * 100) / 100) : ''; setVal('retainage_amount', a); setVal('retainage_percent', computed); }} />
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">Leave both blank to skip retainage tracking.</p>
          </div>
        );
      }

      // Invoice link (income only)
      if (q.type === 'invoice') {
        const openInvoices = (invoices as any[]).filter(inv => inv.status !== 'paid');
        return (
          <div className="space-y-3">
            <div className="border border-border bg-secondary/20 p-3 space-y-3">
              <div>
                <div className="text-[9px] uppercase tracking-[0.22em] text-muted-foreground font-bold">Existing invoice</div>
                <div className="text-xs text-muted-foreground mt-1">Optional. Choose an invoice already in this finance system, then attach the payable link used by the client.</div>
              </div>
              <Select
                value={getVal('invoice_id')}
                onValueChange={v => {
                  const invoice = (invoices as any[]).find(inv => inv.id === v);
                  setVal('invoice_id', v);
                  if (invoice) {
                    const url = invoice.external_invoice_url || invoice.stripe_payment_link || getVal('external_invoice_url');
                    setVal('external_invoice_url', url || '');
                    setVal('external_invoice_number', invoice.external_invoice_number || invoice.invoice_number || getVal('external_invoice_number'));
                    setVal('external_invoice_provider', invoice.external_invoice_provider || detectInvoiceProvider(url || '') || getVal('external_invoice_provider'));
                  }
                }}
              >
              <SelectTrigger className="rounded-none h-12 text-base"><SelectValue placeholder="No invoice (skip)" /></SelectTrigger>
              <SelectContent>
                {openInvoices.map((inv: any) => (
                  <SelectItem key={inv.id} value={inv.id}>
                    {inv.invoice_number} — {inv.client_name || 'Client'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
              {openInvoices.length === 0 && <p className="text-xs text-muted-foreground">No open invoices found. You can still attach a Stripe, QuickBooks, or other payable invoice link below.</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[0.82fr_1.4fr] gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1.5">Provider</div>
                <Select value={getVal('external_invoice_provider')} onValueChange={v => setVal('external_invoice_provider', v)}>
                  <SelectTrigger className="rounded-none h-11 text-sm"><SelectValue placeholder="Auto / select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stripe">Stripe</SelectItem>
                    <SelectItem value="quickbooks">QuickBooks</SelectItem>
                    <SelectItem value="other">Other payable link</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1.5">Invoice / payment link</div>
                <Input
                  className="rounded-none h-11 text-sm"
                  inputMode="url"
                  placeholder="https://pay.stripe.com/... or QuickBooks invoice link"
                  value={getVal('external_invoice_url')}
                  onChange={e => {
                    const url = e.target.value;
                    setVal('external_invoice_url', url);
                    if (!getVal('external_invoice_provider')) setVal('external_invoice_provider', detectInvoiceProvider(url));
                  }}
                />
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1.5">Invoice / confirmation number</div>
              <Input
                className="rounded-none h-11 text-sm"
                placeholder="INV-1042, Stripe invoice ID, QuickBooks reference..."
                value={getVal('external_invoice_number')}
                onChange={e => setVal('external_invoice_number', e.target.value)}
              />
            </div>

            {(getVal('external_invoice_url') || getVal('external_invoice_number')) && (
              <div className="border border-positive/20 bg-positive/5 px-3 py-2 text-xs text-positive">
                This payable invoice detail will stay connected to the income record and the linked client-visible invoice.
              </div>
            )}
          </div>
        );
      }

      if (q.id === 'source_name') {
        const selectedFinanceClientId = getVal('finance_client_id');
        return (
          <div className="space-y-3">
            <Select
              value={selectedFinanceClientId}
              onValueChange={v => {
                const client = (financeClients as any[]).find(c => c.id === v);
                setVal('finance_client_id', v);
                setVal('source_name', client?.name || '');
                if (client?.project_id) setVal('project_id', client.project_id);
                setQuickClientOpen(false);
              }}
            >
              <SelectTrigger className="rounded-none h-12 text-base">
                <SelectValue placeholder={isHgp ? 'Select HGP client / site account' : 'Select finance client account'} />
              </SelectTrigger>
              <SelectContent>
                {(financeClients as any[]).map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}{c.company ? ` · ${c.company}` : ''}{c.email ? ` — ${c.email}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(financeClients as any[]).length === 0 && (
              <div className="text-xs text-muted-foreground">
                No finance client accounts found for this entity yet. Add one below and it will stay separate from the Houston Enterprise client portal.
              </div>
            )}

            {serviceType === 'income' && isHE && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">or a client portal client</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <Select
                  value={portalClients.some((c: any) => c.name === getVal('source_name')) ? getVal('source_name') : ''}
                  onValueChange={v => { setVal('source_name', v); setVal('finance_client_id', ''); setQuickPortalClientOpen(false); }}
                >
                  <SelectTrigger className="rounded-none h-12 text-base"><SelectValue placeholder="Select a client portal client" /></SelectTrigger>
                  <SelectContent>
                    {portalClients.map((c: any) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {quickPortalClientOpen ? (
                  <div className="border border-foreground/20 p-4 space-y-3 bg-secondary/30">
                    <div className="text-[9px] uppercase tracking-[0.24em] font-bold text-muted-foreground">New Client Portal Client</div>
                    <Input
                      autoFocus
                      className="rounded-none h-11 text-base"
                      placeholder="Client name *"
                      value={quickPortalClientName}
                      onChange={e => setQuickPortalClientName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); createPortalClientNow(); } if (e.key === 'Escape') { setQuickPortalClientOpen(false); setQuickPortalClientName(''); } }}
                    />
                    <div className="flex gap-2">
                      <Button type="button" onClick={createPortalClientNow} disabled={creatingPortalClient || !quickPortalClientName.trim()} className="rounded-none flex-1 h-10 text-xs bg-foreground text-background hover:opacity-90">
                        {creatingPortalClient ? 'Creating…' : 'Create Client'}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => { setQuickPortalClientOpen(false); setQuickPortalClientName(''); }} className="rounded-none h-10 text-xs">Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <Button type="button" variant="outline" onClick={() => setQuickPortalClientOpen(true)} className="rounded-none h-9 text-xs w-full flex items-center justify-center gap-1">
                    <Plus className="w-3 h-3" /> Add new client portal client
                  </Button>
                )}
              </div>
            )}

            <div className="relative">
              <Input
                className="rounded-none h-11 text-base"
                placeholder={isHgp ? 'Or type generator customer / warranty source' : 'Or type source / client name'}
                value={getVal('source_name')}
                onChange={e => {
                  setVal('source_name', e.target.value);
                  setVal('finance_client_id', '');
                }}
              />
            </div>

            {quickClientOpen ? (
              <div className="border border-foreground/20 p-4 space-y-3 bg-secondary/30">
                <div>
                  <div className="text-[9px] uppercase tracking-[0.24em] font-bold text-muted-foreground">New Payment Client</div>
                  <div className="text-xs text-muted-foreground mt-1">Creates a finance-tracked client record only. No portal login is created.</div>
                </div>
                <Input autoFocus className="rounded-none h-11 text-base" placeholder="Client / household / company name *" value={quickClientName} onChange={e => setQuickClientName(e.target.value)} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Input type="email" className="rounded-none h-10 text-sm" placeholder="Email for payment matching *" value={quickClientEmail} onChange={e => setQuickClientEmail(e.target.value)} />
                  <Input type="tel" className="rounded-none h-10 text-sm" placeholder="Phone / billing contact" value={quickClientPhone} onChange={e => setQuickClientPhone(e.target.value)} />
                </div>
                <Select value={quickClientProjectType} onValueChange={setQuickClientProjectType}>
                  <SelectTrigger className="rounded-none h-10 text-sm"><SelectValue placeholder="Client type / relationship" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="residential">Residential</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                    <SelectItem value="builder">Builder</SelectItem>
                    <SelectItem value="property_manager">Property Manager</SelectItem>
                    <SelectItem value="investor">Investor</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea
                  className="rounded-none text-sm min-h-[74px]"
                  placeholder={isHgp
                    ? 'Site address, utility provider, generator model, serial, service plan, invoice reference, or dispatch notes'
                    : 'Billing address, project address, invoice reference, primary contact, or payment relationship'}
                  value={quickClientReference}
                  onChange={e => setQuickClientReference(e.target.value)}
                  onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); createClientNow(); } }}
                />
                <div className="flex gap-2">
                  <Button type="button" onClick={createClientNow} disabled={!quickClientName.trim() || !quickClientEmail.trim()} className="rounded-none flex-1 h-10 text-xs bg-foreground text-background hover:opacity-90">
                    Add Client
                  </Button>
                  <Button type="button" variant="outline" onClick={() => { setQuickClientOpen(false); setQuickClientName(''); setQuickClientEmail(''); setQuickClientPhone(''); setQuickClientProjectType(''); setQuickClientReference(''); }} className="rounded-none h-10 text-xs">Cancel</Button>
                </div>
              </div>
            ) : (
              <Button type="button" variant="outline" onClick={() => setQuickClientOpen(true)} className="rounded-none h-9 text-xs w-full flex items-center justify-center gap-1">
                <Plus className="w-3 h-3" /> Add new client without portal account
              </Button>
            )}
          </div>
        );
      }

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
              <SelectTrigger className="rounded-none h-12 text-base"><SelectValue placeholder={isHgp ? 'Select supplier / distributor' : 'Select a vendor'} /></SelectTrigger>
              <SelectContent>
                {vendors.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
              </SelectContent>
            </Select>

            {/* Inline vendor quick-create */}
            {quickVendorOpen ? (
              <div className="border border-foreground/20 p-4 space-y-3 bg-secondary/30">
                <div className="text-[9px] uppercase tracking-[0.24em] font-bold text-muted-foreground">{isHgp ? 'New Supplier' : 'New Vendor'}</div>
                <Input
                  autoFocus
                  className="rounded-none h-11 text-base"
                  placeholder={isHgp ? 'Supplier, distributor, subcontractor, or permit office' : 'Business name'}
                  value={quickVendorName}
                  onChange={e => setQuickVendorName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); createVendorNow(); } if (e.key === 'Escape') { setQuickVendorOpen(false); setQuickVendorName(''); } }}
                />
                <div className="flex gap-2">
                  <Button type="button" onClick={createVendorNow} disabled={creatingVendor || !quickVendorName.trim()} className="rounded-none flex-1 h-10 text-xs bg-foreground text-background hover:opacity-90">
                    {creatingVendor ? 'Creating…' : isHgp ? 'Create Supplier' : 'Create Vendor'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => { setQuickVendorOpen(false); setQuickVendorName(''); }} className="rounded-none h-10 text-xs">Cancel</Button>
                </div>
              </div>
            ) : (
              <Button type="button" variant="outline" onClick={() => setQuickVendorOpen(true)} className="rounded-none h-9 text-xs w-full flex items-center justify-center gap-1">
                <Plus className="w-3 h-3" /> {isHgp ? 'Create new supplier' : 'Create new vendor'}
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
                  <CurrencyInput
                    className="h-10 text-sm"
                    placeholder="Budget $"
                    value={quickProjectBudget}
                    onValueChange={setQuickProjectBudget}
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
    const noAutoSubmit = new Set(['receipt','vendor','project','retainage','invoice','phase','payment_income','payment_expense']);
    const showContinue = !noAutoSubmit.has(q.type) && !(q.type === 'category' && !customCat);
    const showGuidedButton = showContinue || (
      noAutoSubmit.has(q.type) && q.type !== 'receipt'
      && !(q.type === 'vendor' && quickVendorOpen)
      && !(q.type === 'project' && quickProjectOpen)
    );
    const accent = entity?.color ?? '#9D7E3F';

    // "Next: <label of the next question>" instead of a generic "Continue" —
    // mirrors goNext()'s own skip-forward logic so the preview always names
    // the step the user will actually land on.
    let nextLabel = '';
    let peekStep = step + 1;
    while (peekStep < questions.length && questions[peekStep].skipIf?.(data)) peekStep++;
    if (peekStep < questions.length) nextLabel = questions[peekStep].label.replace(/\?+$/, '');
    const guidedButtonText = isLast ? 'Review & Save' : nextLabel ? `Next: ${nextLabel}` : 'Continue';

    return (
      <AppShell>
        <div className="min-h-screen flex flex-col" style={{ background: `linear-gradient(180deg, ${accent}08, transparent 260px)` }}>
          <div className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-20">
            <div className="px-4 sm:px-8 py-3 flex items-center justify-between gap-3">
              <button onClick={goBack} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0">
                <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
                {step === 0 ? 'All services' : 'Previous'}
              </button>
              <div className="flex items-center gap-2 min-w-0">
                <service.icon className="w-3.5 h-3.5 shrink-0" style={{ color: accent }} strokeWidth={1.5} />
                <span className="text-xs font-semibold tracking-tight truncate">{service.label}</span>
              </div>
              <div className="text-[10px] text-muted-foreground font-mono-tab shrink-0 tabular-nums">{step + 1} / {questions.length}</div>
            </div>
            <div className="h-[3px] bg-border/70">
              <div className="h-full transition-all duration-500 ease-out" style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${accent}, ${accent}cc)` }} />
            </div>
          </div>

          <div className="flex-1 flex items-start sm:items-center justify-center px-4 sm:px-8 py-8 sm:py-10">
            <div className="w-full max-w-lg mx-auto">
              <form ref={guidedFormRef} onSubmit={handleGuidedSubmit} onKeyDown={handleGuidedKeyDown}>
                <div className="flex items-center justify-center mb-7">
                  <div
                    className="w-16 h-16 sm:w-[4.5rem] sm:h-[4.5rem] rounded-full flex items-center justify-center shadow-[0_10px_28px_-10px_rgba(0,0,0,0.18)]"
                    style={{ backgroundColor: `${accent}12`, border: `1px solid ${accent}30` }}
                  >
                    <Icon className="w-7 h-7" style={{ color: accent }} strokeWidth={1.4} />
                  </div>
                </div>
                <h2 className="font-display text-[26px] sm:text-3xl font-medium tracking-tight text-center mb-2 leading-[1.15] px-2">{q.label}</h2>
                {guidedPreset && (
                  <div className="mb-4 mx-auto max-w-full border border-border bg-secondary/35 px-3 py-2 text-center text-[10px] leading-relaxed">
                    <span className="font-black uppercase tracking-[0.16em] text-muted-foreground">HGP preset</span>
                    <span className="ml-2 font-semibold">{guidedPreset}</span>
                  </div>
                )}
                {q.helper && <p className="text-xs text-muted-foreground text-center mb-7 px-2 leading-relaxed">{q.helper}</p>}
                {!q.helper && <div className="mb-7" />}
                <div className="mb-4">{renderInput()}</div>

                {showGuidedButton && (
                  <div className="flex justify-center pt-2">
                    <Button
                      type="submit"
                      title={guidedButtonText}
                      className="rounded-none h-12 sm:h-[3.1rem] w-full sm:w-auto sm:min-w-[16rem] px-6 bg-foreground text-background hover:opacity-90 text-[13px] font-semibold tracking-tight shadow-[0_14px_30px_-12px_rgba(0,0,0,0.28)] transition-opacity"
                    >
                      <span className="truncate max-w-[19rem]">{guidedButtonText}</span>
                      <ChevronRight className="w-4 h-4 ml-2 shrink-0" strokeWidth={1.75} />
                    </Button>
                  </div>
                )}

                <div className="flex items-center justify-center gap-1.5 mt-8 pb-[env(safe-area-inset-bottom)]">
                  {questions.map((_, i) => (
                    <div
                      key={i}
                      className="h-1.5 rounded-full transition-all duration-500"
                      style={{
                        width: i === step ? 20 : 6,
                        backgroundColor: i <= step ? accent : 'hsl(var(--border))',
                      }}
                    />
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
                  if (q.skipIf?.(data)) return null;
                  if (q.id === 'invoice_id') {
                    const invoiceLabel = getVal(q.id)
                      ? ((invoices as any[]).find((inv: any) => inv.id === getVal(q.id))?.invoice_number || getVal(q.id))
                      : '';
                    const label = [
                      invoiceLabel,
                      invoiceProviderLabel(getVal('external_invoice_provider')),
                      getVal('external_invoice_number'),
                    ].filter(Boolean).join(' · ') || getVal('external_invoice_url');
                    if (!label) return null;
                    return (
                      <div key={q.id} className="flex items-center justify-between px-4 py-3">
                        <span className="text-xs text-muted-foreground">{q.label}</span>
                        <span className="text-sm font-medium font-mono-tab text-right max-w-[60%] truncate ml-4">{label}</span>
                      </div>
                    );
                  }
                  if (q.type === 'retainage') {
                    const pct = getVal('retainage_percent');
                    const amt = getVal('retainage_amount');
                    if (!pct && !amt) return null;
                    return (
                      <div key="retainage" className="flex items-center justify-between px-4 py-3">
                        <span className="text-xs text-muted-foreground">Retainage</span>
                        <span className="text-sm font-medium font-mono-tab text-right ml-4">{pct ? `${pct}%` : ''}{pct && amt ? ' / ' : ''}{amt ? `$${amt}` : ''}</span>
                      </div>
                    );
                  }
                  const val = getVal(q.id);
                  if (!val) return null;
                  const label = q.id === 'vendor_id'
                    ? (vendors.find((v: any) => v.id === val)?.name || val)
                    : q.id === 'project_id'
                    ? (projects.find((p: any) => p.id === val)?.name || val)
                    : q.id === 'invoice_id'
                    ? ((invoices as any[]).find((inv: any) => inv.id === val)?.invoice_number || val)
                    : val;
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
                <Button
                  onClick={submitAll}
                  disabled={savingEntry || incomeUpsert.isPending || expenseUpsert.isPending || checkUpsert.isPending}
                  className="rounded-none h-11 px-8 bg-foreground text-background hover:opacity-90 disabled:opacity-60"
                >
                  <Sparkles className="w-4 h-4 mr-2" strokeWidth={1.5} />
                  {savingEntry ? 'Saving...' : 'Confirm & Save'}
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
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-6 sm:py-10">
        <div className="w-full max-w-md text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-positive/10 text-positive mb-5 sm:mb-8">
            <PartyPopper className="w-7 h-7 sm:w-9 sm:h-9" strokeWidth={1.5} />
          </div>
          <h2 className="text-2xl sm:text-3xl font-light tracking-tight mb-2 sm:mb-3">All done!</h2>
          <p className="text-sm text-muted-foreground mb-6 sm:mb-10 max-w-sm mx-auto leading-relaxed">
            Your {service?.submitLabel?.toLowerCase()} has been recorded successfully.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
            <Button onClick={() => setPhase('welcome')} className="rounded-none h-11 sm:h-12 w-full px-4 bg-foreground text-background hover:opacity-90">
              <Sparkles className="w-4 h-4 mr-2" strokeWidth={1.5} /> Do Another
            </Button>
            {serviceType && ['income', 'expense', 'check'].includes(serviceType) && (
              <Button
                variant="outline"
                onClick={() => navigate(serviceType === 'income' ? '/income' : serviceType === 'expense' ? '/expenses' : '/checks')}
                className="rounded-none h-11 sm:h-12 w-full px-4"
              >
                View {serviceType === 'check' ? 'Checks' : serviceType === 'expense' ? 'Expenses' : 'Income'}
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate('/finance/dashboard')} className="rounded-none h-11 sm:h-12 w-full px-4">
              Back to Overview
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
