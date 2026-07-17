/**
 * ProjectBreakdown — Client-facing project reconciliation & progress tool.
 * CONTRACT → SCOPE → PROGRESS → BILLING → CLIENT PAYMENTS → RECONCILIATION
 */

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEntity } from '@/contexts/EntityContext';
import { fmtUSD, fmtDate } from '@/lib/format';
import { toast } from 'sonner';
import {
  Plus, Trash2, Edit3, Check, X, ChevronDown,
  Layers, TrendingUp, Receipt, Calendar, History, PackagePlus,
  ClipboardCheck, FileSpreadsheet, CreditCard, MessageSquare, ShieldCheck,
  RefreshCw, Wallet, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import { CurrencyInput } from '@/components/ui/currency-input';
import { DateInput } from '@/components/ui/date-input';
import { generateProjectReconciliationReport, savePDF } from '@/lib/reports';
import { invoiceTotal } from '@/hooks/useInvoices';
import { PDV2_CSS } from '@/components/project-detail/cardStyles';
import { ProgressRing } from '@/components/project-detail/ProgressRing';
import { TrendLineChart } from '@/components/project-detail/TrendLineChart';
import { MiniTable } from '@/components/project-detail/MiniTable';
import { ActivityFeedCard } from '@/components/project-detail/ActivityFeedCard';
import { DocumentsCard } from '@/components/project-detail/DocumentsCard';
import { ProjectDetailsCard } from '@/components/project-detail/ProjectDetailsCard';
import { KpiGrid, PanelHeader, EmptyState, GuidedEntryIntro, WorkflowDialog } from '@/components/project-detail/formPrimitives';
import { FlushTabs } from '@/components/project-detail/FlushTabs';
import { ProjectTransactionLedger } from '@/components/project-detail/ProjectTransactionLedger';

/* ── Types ─────────────────────────────────────────────────────────────────── */
type SubTab = 'overview' | 'sov' | 'milestones' | 'draws' | 'cos' | 'addons' | 'payments' | 'expenses' | 'reconciliation' | 'notes' | 'audit';

type ScopeItem = {
  id: string;
  name: string;
  cost_code: string | null;
  category: string | null;
  description: string | null;
  contract_amount: number;
  change_order_amount: number;
  approved_credit_amount: number;
  percent_complete: number;
  total_billed: number;
  payment_status: string;
  work_status: string;
  milestone_id: string | null;
  client_visible_notes: string | null;
  internal_notes: string | null;
  sort_order: number;
  notes: string | null;
  created_at: string;
};

type ChangeOrder = {
  id: string;
  co_number: string | null;
  title: string;
  description: string | null;
  type: 'addition' | 'deduction' | 'credit' | 'allowance';
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  requested_date: string | null;
  approved_date: string | null;
  approval_method: string | null;
  amount_billed: number;
  amount_paid: number;
  client_visible_notes: string | null;
  internal_notes: string | null;
  notes: string | null;
  created_at: string;
};

type AddOn = {
  id: string;
  line_item: string;
  kind: 'addition' | 'credit';
  unit_cost: number | null;
  unit_quantity: number | null;
  unit_label: string | null;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  approval_method: string | null;
  requested_date: string | null;
  approved_date: string | null;
  client_visible: boolean;
  client_visible_notes: string | null;
  internal_notes: string | null;
  custom_fields: Record<string, string>;
  created_at: string;
};

type Milestone = {
  id: string;
  title: string;
  description: string | null;
  planned_start_date: string | null;
  planned_completion_date: string | null;
  actual_completion_date: string | null;
  percent_complete: number;
  status: string;
  billing_eligible: boolean;
  billing_amount: number;
  client_visible: boolean;
  client_visible_notes: string | null;
  internal_notes: string | null;
  sort_order: number;
  created_at: string;
};

type DrawSchedule = {
  id: string;
  milestone_name: string;
  draw_amount: number;
  scheduled_date: string | null;
  status: 'pending' | 'requested' | 'funded';
  notes: string | null;
  invoice_number: string | null;
  billing_period_start: string | null;
  billing_period_end: string | null;
  created_at: string;
};

type SavedDraw = DrawSchedule & {
  project_id?: string;
};

/* ── Constants ─────────────────────────────────────────────────────────────── */
const SUB_TABS: { key: SubTab; label: string; short: string; icon: any }[] = [
  { key: 'overview',       label: 'Reconciliation Summary', short: 'Summary', icon: ShieldCheck },
  { key: 'sov',            label: 'Scope / SOV', short: 'SOV', icon: FileSpreadsheet },
  { key: 'milestones',     label: 'Milestones', short: 'Milestones', icon: ClipboardCheck },
  { key: 'draws',          label: 'Draws & Billing', short: 'Draws', icon: Calendar },
  { key: 'cos',            label: 'Change Orders', short: 'COs', icon: TrendingUp },
  { key: 'addons',         label: 'Add Ons', short: 'Add Ons', icon: PackagePlus },
  { key: 'payments',       label: 'Payments', short: 'Payments', icon: CreditCard },
  { key: 'expenses',       label: 'Project Expenses', short: 'Expenses', icon: Receipt },
  { key: 'reconciliation', label: 'Reconciliation', short: 'Reconcile', icon: Layers },
  { key: 'notes',          label: 'Notes', short: 'Notes', icon: MessageSquare },
  { key: 'audit',          label: 'Audit', short: 'Audit', icon: History },
];

const PB_CSS = `
.pb-shell{background:linear-gradient(180deg,hsl(var(--secondary)/0.14),transparent 150px);}
.pb-panel{background:hsl(var(--background));border:1px solid hsl(var(--border));box-shadow:0 1px 3px rgba(10,10,10,0.05),0 1px 2px rgba(10,10,10,0.03);}
.pb-entry-panel{padding:10px;border-bottom:1px solid hsl(var(--border));background:hsl(var(--secondary)/0.14);}
.pb-entry-grid{display:grid;grid-template-columns:1fr;gap:8px;}
.pb-advanced{border:1px solid hsl(var(--border));background:hsl(var(--background));box-shadow:0 1px 0 rgba(255,255,255,0.42) inset;}
.pb-advanced summary{cursor:pointer;padding:8px 10px;font-size:8px;text-transform:uppercase;letter-spacing:.18em;font-weight:800;color:hsl(var(--muted-foreground));}
.pb-advanced[open] summary{border-bottom:1px solid hsl(var(--border));color:hsl(var(--foreground));}
.pb-workflow-dialog{width:calc(100vw - 18px);max-width:1040px;max-height:calc(100vh - 18px);overflow:hidden;padding:0;background:hsl(var(--background));border:1px solid hsl(var(--border));box-shadow:0 30px 100px rgba(10,10,10,0.3),0 1px 0 rgba(255,255,255,0.58) inset;}
.pb-workflow-dialog:before{content:"";position:absolute;inset:0 0 auto 0;height:3px;background:linear-gradient(90deg,#0f0f0f,#9D7E3F,#0f0f0f);}
.pb-workflow-head{padding:15px 16px 12px;border-bottom:1px solid hsl(var(--border));background:linear-gradient(180deg,hsl(var(--secondary)/0.34),hsl(var(--background)));position:relative;}
.pb-workflow-body{max-height:calc(100vh - 138px);overflow:auto;padding:10px;background:linear-gradient(180deg,hsl(var(--secondary)/0.12),transparent 130px);}
.pb-workflow-body .micro-label{font-size:7.5px;letter-spacing:.18em;}
@media(min-width:640px){.pb-entry-grid{grid-template-columns:repeat(4,minmax(0,1fr));}.pb-span-2{grid-column:span 2 / span 2}.pb-span-4{grid-column:span 4 / span 4}.pb-workflow-body{padding:12px;}.pb-entry-panel{padding:12px;}}
@media(max-width:639px){.pb-workflow-head{padding:13px 12px 10px}.pb-workflow-body{max-height:calc(100vh - 128px)}.pb-entry-panel{padding:9px}.pb-entry-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:7px 8px}.pb-span-2,.pb-span-4{grid-column:span 2 / span 2}.pb-entry-grid input,.pb-entry-grid select{height:34px;font-size:12px}.pb-entry-grid textarea{font-size:12px}.pb-advanced summary{padding:7px 9px}.pb-workflow-body button{min-height:34px}}
.dark .pb-panel{background:hsl(var(--card));box-shadow:0 1px 4px rgba(0,0,0,0.28),0 1px 0 rgba(255,255,255,0.05) inset;}
`;

const SOV_CATEGORIES = [
  'General Conditions', 'Project Management', 'Supervision & Field Engineering',
  'Mobilization & Demobilization', 'Temporary Facilities & Utilities',
  'Bonds, Insurance & Permits', 'Permits & Fees', 'Testing, Inspections & Reports',
  'As-Built Drawings & Closeout', 'Architecture & Engineering', 'Contingency', 'Overhead & Profit',
  'Demo & Selective Demolition', 'Demo & Prep', 'Earthwork & Grading', 'Site Work',
  'Paving & Concrete Flatwork', 'Drainage & Utilities', 'Landscaping & Irrigation', 'Fencing & Gates',
  'Concrete Work', 'Foundation', 'Slab on Grade', 'Tilt-Up / Precast', 'Masonry & Block',
  'Steel & Structural Metal', 'Structural Steel', 'Framing & Rough Carpentry',
  'Finish Carpentry & Millwork', 'Casework & Cabinets', 'Roofing',
  'Roof Repair & Replacement', 'Waterproofing & Dampproofing',
  'Doors, Frames & Hardware', 'Windows & Glazing', 'Storefront & Curtainwall',
  'Overhead Doors & Grilles', 'Glass & Glazing', 'Drywall & Metal Stud',
  'Plaster & Stucco', 'Insulation', 'Flooring', 'Tile & Stone', 'Carpet',
  'Hardwood & Laminate', 'Epoxy & Specialty Floors', 'Acoustical Ceilings',
  'Painting & Coatings', 'Wall Coverings', 'Specialties & Accessories',
  'Plumbing', 'Plumbing Rough-In', 'Plumbing Fixtures & Trim', 'Mechanical / HVAC',
  'HVAC Equipment', 'Ductwork & Distribution', 'Controls & BAS', 'Fire Suppression',
  'Fire Alarm & Detection', 'Electrical', 'Electrical Rough-In', 'Electrical Devices & Trim',
  'Lighting Fixtures', 'Panel & Service Upgrade', 'Generator & Transfer Switch',
  'Low Voltage / Data / AV', 'Security Systems', 'Access Control',
  'Elevator & Conveying', 'Kitchen Equipment', 'FF&E', 'Signage',
  'Site Cleaning & Final Clean', 'Punch List & Warranty', 'Other',
];

const MS_STATUS: Record<string, { label: string; color: string }> = {
  not_started:       { label: 'Not Started',      color: 'text-muted-foreground' },
  scheduled:         { label: 'Scheduled',         color: 'text-blue-500' },
  in_progress:       { label: 'In Progress',       color: 'text-amber-500' },
  awaiting_approval: { label: 'Awaiting Approval', color: 'text-purple-500' },
  completed:         { label: 'Completed',         color: 'text-emerald-500' },
  delayed:           { label: 'Delayed',           color: 'text-destructive' },
  on_hold:           { label: 'On Hold',           color: 'text-muted-foreground' },
};

const DRAW_STATUS: Record<string, { label: string; color: string }> = {
  pending:   { label: 'Pending',   color: 'text-muted-foreground' },
  requested: { label: 'Requested', color: 'text-amber-500' },
  funded:    { label: 'Funded',    color: 'text-emerald-500' },
};

const CO_SIGN: Record<string, number> = {
  addition: 1, allowance: 1, deduction: -1, credit: -1,
};
const AO_SIGN: Record<string, number> = {
  addition: 1, credit: -1,
};

/* ── Blank form defaults ───────────────────────────────────────────────────── */
const blankSOV   = () => ({ name: '', cost_code: '', category: '', description: '', contract_amount: '', change_order_amount: '0', approved_credit_amount: '0', percent_complete: '0', total_billed: '0', payment_status: 'not_billed', work_status: 'not_started', notes: '', internal_notes: '', client_visible_notes: '' });
const blankCO    = () => ({ co_number: '', title: '', description: '', type: 'addition', amount: '', status: 'pending', requested_date: '', approved_date: '', approval_method: '', client_visible_notes: '', internal_notes: '', notes: '' });
const blankMS    = () => ({ title: '', description: '', planned_start_date: '', planned_completion_date: '', actual_completion_date: '', percent_complete: '0', status: 'not_started', billing_eligible: false, billing_amount: '0', client_visible: true, client_visible_notes: '', internal_notes: '' });
const blankDraw  = () => ({ milestone_name: '', draw_amount: '', scheduled_date: '', status: 'pending', notes: '', invoice_number: '', billing_period_start: '', billing_period_end: '' });
const blankAddOn = () => ({ line_item: '', kind: 'addition', unit_cost: '', unit_quantity: '', unit_label: '', amount: '', status: 'pending', approval_method: '', requested_date: '', approved_date: '', client_visible: true, client_visible_notes: '', internal_notes: '', custom_fields: [] as { key: string; value: string }[] });

/* ── Shared mini-components ────────────────────────────────────────────────── */
/* ── SOV ↔ Contract reconciliation banner ─────────────────────────────────────
   The Schedule of Values is a BREAKDOWN of the signed contract, not a
   replacement for it — SOV coverage should climb toward 100% as line items
   are added, while the contract value itself stays fixed. This surfaces
   that relationship explicitly instead of letting an incomplete SOV read
   as "the contract shrank." ── */
function SOVReconciliationBanner({ fin }: { fin: any }) {
  const { originalContractValue, sovAllocated, sovVariance, sovCoveragePct, sovStatus } = fin;

  if (sovStatus === 'no-contract') {
    return (
      <div className="border border-border bg-secondary/30 px-4 py-3 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          <span className="font-semibold text-foreground">No contract value set on this project.</span>{' '}
          Set a Budget or Original Contract Value on the project record so the Schedule of Values can be validated against it.
        </p>
      </div>
    );
  }

  const meta = {
    reconciled: {
      border: 'border-emerald-500/30', bg: 'bg-emerald-500/5', text: 'text-emerald-600 dark:text-emerald-400', bar: '#10b981',
      headline: 'Schedule of Values is fully reconciled with the contract.',
      sub: `${fmtUSD(sovAllocated)} allocated across scope lines — matches the ${fmtUSD(originalContractValue)} contract.`,
    },
    under: {
      border: 'border-amber-500/30', bg: 'bg-amber-500/5', text: 'text-amber-600 dark:text-amber-400', bar: '#f59e0b',
      headline: `${fmtUSD(sovVariance)} of the contract is not yet broken into scope lines.`,
      sub: `Schedule of Values covers ${fmtUSD(sovAllocated)} of the ${fmtUSD(originalContractValue)} contract (${sovCoveragePct.toFixed(1)}%). Add scope items to fully account for the remaining value.`,
    },
    over: {
      border: 'border-destructive/30', bg: 'bg-destructive/5', text: 'text-destructive', bar: 'hsl(var(--destructive))',
      headline: `Schedule of Values exceeds the contract by ${fmtUSD(Math.abs(sovVariance))}.`,
      sub: `Scope lines total ${fmtUSD(sovAllocated)} against a ${fmtUSD(originalContractValue)} contract. Review line items for duplicates, or log a change order to capture the difference.`,
    },
  }[sovStatus];

  return (
    <div className={`border ${meta.border} ${meta.bg} px-4 py-3`}>
      <div className="flex items-start gap-3">
        {sovStatus === 'reconciled'
          ? <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${meta.text}`} />
          : <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${meta.text}`} />}
        <div className="min-w-0 flex-1">
          <div className={`text-xs font-semibold ${meta.text}`}>{meta.headline}</div>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{meta.sub}</p>
        </div>
        <div className="hidden sm:flex flex-col items-end gap-1 shrink-0 w-28">
          <span className={`text-sm font-bold font-mono-tab ${meta.text}`}>{sovCoveragePct.toFixed(0)}%</span>
          <div className="w-full h-1.5 bg-border overflow-hidden rounded-full">
            <div className="h-full rounded-full" style={{ width: `${Math.min(100, sovCoveragePct)}%`, backgroundColor: meta.bar }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Bar({ value, max, hex }: { value: number; max: number; hex?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-1.5 bg-secondary overflow-hidden">
      <div className="h-full transition-all" style={{ width: `${pct}%`, backgroundColor: hex ?? 'hsl(var(--foreground))' }} />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════════════ */
export default function ProjectBreakdown({ project, enriched, projectDocs = [] }: { project: any; enriched: any; projectDocs?: any[] }) {
  const { user } = useAuth();
  const { entity } = useEntity();
  const entityId  = entity?.id ?? 'houston-enterprise';
  const projectId = project?.id;

  /* ── navigation ──────────────────────────────────────────────────────────── */
  const [subTab, setSubTab] = useState<SubTab>('overview');

  /* ── data ────────────────────────────────────────────────────────────────── */
  const [scopeItems,   setScopeItems]   = useState<ScopeItem[]>([]);
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([]);
  const [addOns,       setAddOns]       = useState<AddOn[]>([]);
  const [milestones,   setMilestones]   = useState<Milestone[]>([]);
  const [draws,        setDraws]        = useState<DrawSchedule[]>([]);
  const [invoices,     setInvoices]     = useState<any[]>([]);
  const [loading,      setLoading]      = useState(true);

  /* ── notes ───────────────────────────────────────────────────────────────── */
  const [notes,       setNotes]       = useState<string>(project?.notes ?? '');
  const [savingNotes, setSavingNotes] = useState(false);
  const [showNotes,   setShowNotes]   = useState(false);

  /* ── Payments / Expenses — lets Quick Actions open the log dialog immediately
     after switching tabs, instead of navigating away to a separate page ── */
  const [autoOpenLog, setAutoOpenLog] = useState<'income' | 'expense' | null>(null);

  /* ── SOV form ────────────────────────────────────────────────────────────── */
  const [sovForm,    setSovForm]    = useState(blankSOV());
  const [editSOVId,  setEditSOVId]  = useState<string | null>(null);
  const [showSOV,    setShowSOV]    = useState(false);
  const [savingSOV,  setSavingSOV]  = useState(false);

  /* ── CO form ─────────────────────────────────────────────────────────────── */
  const [coForm,     setCoForm]     = useState(blankCO());
  const [editCOId,   setEditCOId]   = useState<string | null>(null);
  const [showCO,     setShowCO]     = useState(false);
  const [savingCO,   setSavingCO]   = useState(false);

  /* ── Milestone form ──────────────────────────────────────────────────────── */
  const [msForm,     setMsForm]     = useState(blankMS());
  const [editMSId,   setEditMSId]   = useState<string | null>(null);
  const [showMS,     setShowMS]     = useState(false);
  const [savingMS,   setSavingMS]   = useState(false);

  /* ── Draw form ───────────────────────────────────────────────────────────── */
  const [drawForm,   setDrawForm]   = useState(blankDraw());
  const [editDrawId, setEditDrawId] = useState<string | null>(null);
  const [showDraw,   setShowDraw]   = useState(false);
  const [savingDraw, setSavingDraw] = useState(false);

  /* ── Add-On form ─────────────────────────────────────────────────────────── */
  const [addOnForm,   setAddOnForm]   = useState(blankAddOn());
  const [editAddOnId, setEditAddOnId] = useState<string | null>(null);
  const [showAddOn,   setShowAddOn]   = useState(false);
  const [savingAddOn, setSavingAddOn] = useState(false);

  /* ── load ────────────────────────────────────────────────────────────────── */
  const load = async (silent = false) => {
    if (!projectId) return;
    if (!silent) setLoading(true);
    const [s, c, ao, m, d, inv] = await Promise.all([
      (supabase as any).from('project_scope_items').select('*').eq('project_id', projectId).order('sort_order'),
      (supabase as any).from('project_change_orders').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
      (supabase as any).from('project_add_ons').select('*').eq('project_id', projectId).order('sort_order'),
      (supabase as any).from('project_milestones').select('*').eq('project_id', projectId).order('sort_order'),
      (supabase as any).from('draw_schedules').select('*').eq('project_id', projectId).order('scheduled_date'),
      (supabase as any).from('invoices').select('id, status, due_date, line_items, tax_rate, amount_paid').eq('project_id', projectId),
    ]);
    setScopeItems((s.data ?? []) as ScopeItem[]);
    setChangeOrders((c.data ?? []) as ChangeOrder[]);
    setAddOns((ao.data ?? []) as AddOn[]);
    setMilestones((m.data ?? []) as Milestone[]);
    setDraws((d.data ?? []) as DrawSchedule[]);
    setInvoices(inv.data ?? []);
    if (!silent) setLoading(false);
  };
  useEffect(() => { load(); }, [projectId]);

  /* ── Live sync: refresh scope/CO/add-on/milestone/draw/invoice data when
     anyone changes it for this project, so reconciliation never goes stale. ── */
  useEffect(() => {
    if (!projectId) return;
    const channel = supabase
      .channel(`project-breakdown-${projectId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_scope_items', filter: `project_id=eq.${projectId}` }, () => load(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_change_orders', filter: `project_id=eq.${projectId}` }, () => load(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_add_ons', filter: `project_id=eq.${projectId}` }, () => load(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_milestones', filter: `project_id=eq.${projectId}` }, () => load(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'draw_schedules', filter: `project_id=eq.${projectId}` }, () => load(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices', filter: `project_id=eq.${projectId}` }, () => load(true))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [projectId]);

  /* ── calculation engine ───────────────────────────────────────────────────
     The ORIGINAL CONTRACT VALUE is the signed contract amount stored on the
     project record — it is never derived from the Schedule of Values. SOV
     line items are a breakdown OF the contract, not a substitute for it: as
     scope lines get added over time the SOV total climbs toward the
     contract value, but the contract value itself must never move just
     because the SOV isn't fully built out yet. (Falls back to `budget`
     exactly like the get_project_financial_summary RPC that feeds the
     Overview tab, so the two views always agree.)                        ── */
  const fin = useMemo(() => {
    const originalContractValue = Number(project?.original_contract_value) || Number(project?.budget) || 0;

    /* Schedule of Values coverage — how much of the contract has actually
       been broken into scope lines so far. A coverage metric, distinct
       from the contract value itself, with an intelligent status + a
       floating-point-safe tolerance so near-exact matches read as
       "reconciled" rather than off by a fraction of a cent. */
    const sovAllocated   = scopeItems.reduce((s, i) => s + Number(i.contract_amount), 0);
    const sovVariance     = originalContractValue - sovAllocated; // + = under-allocated, − = over-allocated
    const sovCoveragePct  = originalContractValue > 0 ? Math.min(100, (sovAllocated / originalContractValue) * 100) : 0;
    const sovStatus: 'no-contract' | 'reconciled' | 'under' | 'over' =
      originalContractValue <= 0 ? 'no-contract'
      : Math.abs(sovVariance) < 1 ? 'reconciled'
      : sovVariance > 0 ? 'under' : 'over';

    /* Column-sum totals for the SOV / Reconciliation tables — each is the
       literal sum of the scope-item rows displayed above it, so a table
       footer can never show a number its own rows don't add up to. */
    const sovRevisedTotal = scopeItems.reduce((s, i) => s + Number(i.contract_amount) + Number(i.change_order_amount) - Number(i.approved_credit_amount || 0), 0);
    const sovBilledTotal  = scopeItems.reduce((s, i) => s + Number(i.total_billed || 0), 0);
    const sovRemainingTotal = sovRevisedTotal - sovBilledTotal;
    const sovEarnedTotal = scopeItems.reduce((s, i) => {
      const r = Number(i.contract_amount) + Number(i.change_order_amount) - Number(i.approved_credit_amount || 0);
      return s + (r * Number(i.percent_complete) / 100);
    }, 0);
    const sovPctDone = sovRevisedTotal > 0 ? Math.min(100, sovEarnedTotal / sovRevisedTotal * 100) : 0;

    const approvd    = changeOrders.filter(co => co.status === 'approved');
    const additions  = approvd.filter(co => co.type === 'addition' || co.type === 'allowance').reduce((s, co) => s + Number(co.amount), 0);
    const credits    = approvd.filter(co => co.type === 'deduction' || co.type === 'credit').reduce((s, co) => s + Number(co.amount), 0);
    const net        = additions - credits;
    const approvedAddOns   = addOns.filter(a => a.status === 'approved');
    const addOnsAdditions  = approvedAddOns.filter(a => a.kind === 'addition').reduce((s, a) => s + Number(a.amount), 0);
    const addOnsCredits    = approvedAddOns.filter(a => a.kind === 'credit').reduce((s, a) => s + Number(a.amount), 0);
    const addOnsNet        = addOnsAdditions - addOnsCredits;
    const pendingAddOns    = addOns.filter(a => a.status === 'pending').reduce((s, a) => s + Number(a.amount), 0);
    /* Revised Project Total is built from the TRUE contract value, so it is
       accurate the moment a project is created — before a single scope
       line exists — and never appears to shrink as SOV entry catches up. */
    const revised    = originalContractValue + net + addOnsNet;
    const earned     = sovEarnedTotal;
    /* % complete is earned work measured against the FULL contract, so an
       incomplete SOV correctly shows a lower % rather than a misleading
       100% for the sliver of scope that happens to be entered so far. */
    const pctDone    = revised > 0 ? Math.min(100, earned / revised * 100) : 0;
    const billed     = draws.filter(d => d.status === 'funded').reduce((s, d) => s + Number(d.draw_amount), 0);
    const paid       = (enriched?.incomeList ?? []).reduce((s: number, t: any) => s + Number(t.amount), 0);
    const pending    = changeOrders.filter(co => co.status === 'pending').reduce((s, co) => s + Number(co.amount), 0);
    return {
      originalContractValue, additions, credits, net, revised, earned, pctDone,
      addOnsAdditions, addOnsCredits, addOnsNet, pendingAddOns,
      billed, paid,
      ar:            billed - paid,
      unbilled:      earned - billed,
      remainToBill:  revised - billed,
      balance:       revised - paid,
      collectPct:    revised > 0 ? Math.min(100, paid / revised * 100) : 0,
      billedPct:     revised > 0 ? Math.min(100, billed / revised * 100) : 0,
      pendingCOs:    pending,
      /* Schedule of Values reconciliation intelligence */
      sovAllocated, sovVariance, sovCoveragePct, sovStatus,
      sovRevisedTotal, sovBilledTotal, sovRemainingTotal, sovPctDone,
    };
  }, [project?.original_contract_value, project?.budget, scopeItems, changeOrders, addOns, draws, enriched?.incomeList]);

  /* ── Unified activity feed — shared by the Audit sub-tab and the Reconciliation ── */
  /* ── Summary sub-tab's Project Activity card (single source, no duplication).   ── */
  type AuditEntry = {
    id: string;
    created_at: string;
    kind: 'sov' | 'milestone' | 'co' | 'addon' | 'draw' | 'payment' | 'expense';
    title: string;
    subtitle: string | null;
    status: string;
    statusColor: string;
    value: string;
    icon: React.ReactNode;
    badge: string;
    badgeBg: string;
  };

  const auditEntries: AuditEntry[] = useMemo(() => [
    ...scopeItems.map(item => ({
      id: item.id,
      created_at: item.created_at,
      kind: 'sov' as const,
      title: item.name,
      subtitle: item.category ?? null,
      status: (item.work_status ?? 'not_started').replace(/_/g, ' '),
      statusColor: (item.work_status ?? '') === 'completed' ? 'text-emerald-500' : (item.work_status ?? '') === 'in_progress' ? 'text-amber-500' : 'text-muted-foreground',
      value: fmtUSD(item.contract_amount),
      icon: <Layers className="w-3.5 h-3.5" />,
      badge: 'SOV',
      badgeBg: 'bg-blue-500/10 text-blue-400',
    })),
    ...milestones.map(m => {
      const meta = MS_STATUS[m.status] ?? MS_STATUS.not_started;
      return {
        id: m.id,
        created_at: m.created_at,
        kind: 'milestone' as const,
        title: m.title,
        subtitle: m.planned_completion_date ? `Due ${fmtDate(m.planned_completion_date)}` : null,
        status: meta.label,
        statusColor: meta.color,
        value: `${m.percent_complete}%`,
        icon: <Calendar className="w-3.5 h-3.5" />,
        badge: 'Milestone',
        badgeBg: 'bg-violet-500/10 text-violet-400',
      };
    }),
    ...changeOrders.map(c => ({
      id: c.id,
      created_at: c.created_at,
      kind: 'co' as const,
      title: c.title,
      subtitle: c.co_number ? `CO #${c.co_number}` : null,
      status: c.status,
      statusColor: c.status === 'approved' ? 'text-emerald-500' : c.status === 'rejected' ? 'text-destructive' : 'text-amber-500',
      value: fmtUSD(c.amount),
      icon: <TrendingUp className="w-3.5 h-3.5" />,
      badge: 'Change Order',
      badgeBg: 'bg-amber-500/10 text-amber-400',
    })),
    ...addOns.map(a => ({
      id: a.id,
      created_at: a.created_at,
      kind: 'addon' as const,
      title: a.line_item,
      subtitle: a.approval_method || null,
      status: a.status,
      statusColor: a.status === 'approved' ? 'text-emerald-500' : a.status === 'rejected' ? 'text-destructive' : 'text-amber-500',
      value: fmtUSD(a.amount),
      icon: <PackagePlus className="w-3.5 h-3.5" />,
      badge: 'Add On',
      badgeBg: 'bg-rose-500/10 text-rose-400',
    })),
    ...draws.map(d => {
      const meta = DRAW_STATUS[d.status];
      return {
        id: d.id,
        created_at: d.created_at,
        kind: 'draw' as const,
        title: d.milestone_name,
        subtitle: d.invoice_number ? `Invoice ${d.invoice_number}` : null,
        status: meta.label,
        statusColor: meta.color,
        value: fmtUSD(d.draw_amount),
        icon: <Receipt className="w-3.5 h-3.5" />,
        badge: 'Draw',
        badgeBg: 'bg-emerald-500/10 text-emerald-400',
      };
    }),
    ...(enriched?.incomeList ?? []).map((t: any) => ({
      id: t.id,
      created_at: t.transaction_date ?? t.created_at,
      kind: 'payment' as const,
      title: t.source_name || 'Client payment',
      subtitle: t.category ?? null,
      status: (t.reconciliation_status ?? (t.reconciled ? 'reconciled' : 'unreconciled')).replace(/_/g, ' '),
      statusColor: t.reconciled || t.reconciliation_status === 'reconciled' ? 'text-emerald-500' : t.reconciliation_status === 'pending' ? 'text-amber-500' : 'text-muted-foreground',
      value: fmtUSD(t.amount),
      icon: <Wallet className="w-3.5 h-3.5" />,
      badge: 'Payment',
      badgeBg: 'bg-emerald-500/10 text-emerald-400',
    })),
    ...(enriched?.expenseList ?? []).map((t: any) => ({
      id: t.id,
      created_at: t.transaction_date ?? t.created_at,
      kind: 'expense' as const,
      title: t.source_name || 'Project expense',
      subtitle: t.category ?? null,
      status: (t.reconciliation_status ?? (t.reconciled ? 'reconciled' : 'unreconciled')).replace(/_/g, ' '),
      statusColor: t.reconciled || t.reconciliation_status === 'reconciled' ? 'text-emerald-500' : t.reconciliation_status === 'pending' ? 'text-amber-500' : 'text-muted-foreground',
      value: fmtUSD(t.amount),
      icon: <CreditCard className="w-3.5 h-3.5" />,
      badge: 'Expense',
      badgeBg: 'bg-destructive/10 text-destructive',
    })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()), [scopeItems, milestones, changeOrders, addOns, draws, enriched?.incomeList, enriched?.expenseList]);

  /* ── Monthly billed-vs-paid series (last 12 months) for the Billing vs Payments chart. ── */
  const billingVsPaymentsSeries = useMemo(() => {
    const months: { key: string; period: string }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, period: d.toLocaleDateString('en-US', { month: 'short' }) });
    }
    const buckets: Record<string, { billed: number; paid: number }> = {};
    months.forEach(m => { buckets[m.key] = { billed: 0, paid: 0 }; });
    const bucketKey = (dateStr: string | null) => dateStr?.slice(0, 7);
    draws.forEach(d => { const k = bucketKey(d.scheduled_date || d.created_at); if (k && buckets[k]) buckets[k].billed += Number(d.draw_amount) || 0; });
    (enriched?.incomeList ?? []).forEach((t: any) => { const k = bucketKey(t.transaction_date); if (k && buckets[k]) buckets[k].paid += Number(t.amount) || 0; });
    return months.map(m => ({ period: m.period, billed: buckets[m.key].billed, paid: buckets[m.key].paid }));
  }, [draws, enriched?.incomeList]);

  /* ── Reconciliation Center: real overdue amount + pending-approvals count. ── */
  const overdueAmount = useMemo(() => (
    invoices.filter((i: any) => i.status === 'overdue').reduce((s: number, i: any) => s + invoiceTotal(i), 0)
  ), [invoices]);

  const pendingApprovalsCount = useMemo(() => (
    changeOrders.filter(c => c.status === 'pending').length
    + addOns.filter(a => a.status === 'pending').length
    + draws.filter(d => d.status === 'pending' || d.status === 'requested').length
  ), [changeOrders, addOns, draws]);

  const exportReconciliationPDF = () => {
    const doc = generateProjectReconciliationReport({
      project,
      scopeItems,
      changeOrders,
      addOns,
      draws,
      payments: enriched?.incomeList ?? [],
      fin,
    });
    savePDF(doc, `houston-enterprise-reconciliation-${(project?.name || 'project').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success('Houston Enterprise Reconciliation exported');
  };

  const incomeByScope = useMemo(() => {
    const map: Record<string, number> = {};
    (enriched?.incomeList ?? []).forEach((t: any) => {
      if (t.scope_item_id) map[t.scope_item_id] = (map[t.scope_item_id] || 0) + Number(t.amount);
    });
    return map;
  }, [enriched?.incomeList]);

  /* Per-line "Collected" is only payments explicitly tied to a scope item —
     narrower than fin.paid (every payment on the project, linked or not) —
     so the Reconciliation table's own footer must sum only what its own
     "Collected" column shows, not the wider project-level total. */
  const sovCollectedTotal = useMemo(
    () => Object.values(incomeByScope).reduce((s, v) => s + v, 0),
    [incomeByScope]
  );
  const sovBalanceTotal = fin.sovRevisedTotal - sovCollectedTotal;

  /* ── CRUD helpers ────────────────────────────────────────────────────────── */
  const sov  = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setSovForm(p => ({ ...p, [k]: e.target.value }));
  const co   = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setCoForm(p => ({ ...p, [k]: e.target.value }));
  const ms   = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setMsForm(p => ({ ...p, [k]: e.target.value }));
  const dr   = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setDrawForm(p => ({ ...p, [k]: e.target.value }));
  const aof  = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setAddOnForm(p => ({ ...p, [k]: e.target.value }));
  const dbError = (label: string, error: any) => {
    console.error(label, error);
    const missing = error?.message?.match(/Could not find the '([^']+)' column/)?.[1];
    const description = missing
      ? `The "${missing}" column is missing from the database. Run supabase/migrations/20260716000007_change_order_draw_column_repair.sql in the Supabase SQL editor, then reload the app.`
      : error?.message || error?.details || 'The database rejected this save. Confirm the latest repair migration is applied.';
    toast.error(label, { description });
  };

  /* SOV */
  const openAddSOV = () => { setSovForm(blankSOV()); setEditSOVId(null); setShowSOV(true); };
  const openEditSOV = (i: ScopeItem) => {
    setSovForm({ name: i.name, cost_code: i.cost_code ?? '', category: i.category ?? '', description: i.description ?? '', contract_amount: String(i.contract_amount), change_order_amount: String(i.change_order_amount), approved_credit_amount: String(i.approved_credit_amount || 0), percent_complete: String(i.percent_complete), total_billed: String(i.total_billed || 0), payment_status: i.payment_status ?? 'not_billed', work_status: i.work_status ?? 'not_started', notes: i.notes ?? '', internal_notes: i.internal_notes ?? '', client_visible_notes: i.client_visible_notes ?? '' });
    setEditSOVId(i.id); setShowSOV(true);
  };
  const saveSOV = async () => {
    if (!sovForm.name.trim()) return toast.error('Scope item name is required');
    if (!user || !projectId) return toast.error('Sign in and open an active project before saving');
    setSavingSOV(true);
    try {
      const p = { project_id: projectId, entity_id: entityId, user_id: user.id, name: sovForm.name.trim(), cost_code: sovForm.cost_code || null, category: sovForm.category || null, description: sovForm.description || null, contract_amount: parseFloat(sovForm.contract_amount) || 0, change_order_amount: parseFloat(sovForm.change_order_amount) || 0, approved_credit_amount: parseFloat(sovForm.approved_credit_amount) || 0, percent_complete: parseFloat(sovForm.percent_complete) || 0, total_billed: parseFloat(sovForm.total_billed) || 0, payment_status: sovForm.payment_status, work_status: sovForm.work_status, notes: sovForm.notes || null, internal_notes: sovForm.internal_notes || null, client_visible_notes: sovForm.client_visible_notes || null };
      const { error } = editSOVId ? await (supabase as any).from('project_scope_items').update(p).eq('id', editSOVId) : await (supabase as any).from('project_scope_items').insert(p);
      if (error) dbError('Scope item save failed', error); else { toast.success(editSOVId ? 'Scope item updated' : 'Scope item added'); setShowSOV(false); await load(); }
    } finally {
      setSavingSOV(false);
    }
  };
  const deleteSOV = async (id: string) => { if (!confirm('Delete this scope item?')) return; await (supabase as any).from('project_scope_items').delete().eq('id', id); toast.success('Deleted'); load(); };

  /* CO */
  const openAddCO = () => { setCoForm(blankCO()); setEditCOId(null); setShowCO(true); };
  const openEditCO = (c: ChangeOrder) => { setCoForm({ co_number: c.co_number ?? '', title: c.title, description: c.description ?? '', type: c.type, amount: String(c.amount), status: c.status, requested_date: c.requested_date ?? '', approved_date: c.approved_date ?? '', approval_method: c.approval_method ?? '', client_visible_notes: c.client_visible_notes ?? '', internal_notes: c.internal_notes ?? '', notes: c.notes ?? '' }); setEditCOId(c.id); setShowCO(true); };
  const saveCO = async () => {
    if (!coForm.title.trim()) return toast.error('Change order title is required');
    if (!user || !projectId) return toast.error('Sign in and open an active project before saving');
    setSavingCO(true);
    try {
      const p = { project_id: projectId, entity_id: entityId, user_id: user.id, co_number: coForm.co_number || null, title: coForm.title.trim(), description: coForm.description || null, type: coForm.type, amount: parseFloat(coForm.amount) || 0, status: coForm.status, requested_date: coForm.requested_date || null, approved_date: coForm.approved_date || null, approval_method: coForm.approval_method || null, client_visible_notes: coForm.client_visible_notes || null, internal_notes: coForm.internal_notes || null, notes: coForm.notes || null };
      const { error } = editCOId ? await (supabase as any).from('project_change_orders').update(p).eq('id', editCOId) : await (supabase as any).from('project_change_orders').insert(p);
      if (error) dbError('Change order save failed', error); else { toast.success(editCOId ? 'Change order updated' : 'Change order added'); setShowCO(false); await load(); }
    } finally {
      setSavingCO(false);
    }
  };
  const deleteCO = async (id: string) => { if (!confirm('Delete this change order?')) return; await (supabase as any).from('project_change_orders').delete().eq('id', id); toast.success('Deleted'); load(); };

  /* Add-On */
  const openAddAddOn = () => { setAddOnForm(blankAddOn()); setEditAddOnId(null); setShowAddOn(true); };
  const openEditAddOn = (a: AddOn) => {
    setAddOnForm({
      line_item: a.line_item, kind: a.kind,
      unit_cost: a.unit_cost != null ? String(a.unit_cost) : '',
      unit_quantity: a.unit_quantity != null ? String(a.unit_quantity) : '',
      unit_label: a.unit_label ?? '', amount: String(a.amount), status: a.status,
      approval_method: a.approval_method ?? '', requested_date: a.requested_date ?? '', approved_date: a.approved_date ?? '',
      client_visible: a.client_visible, client_visible_notes: a.client_visible_notes ?? '', internal_notes: a.internal_notes ?? '',
      custom_fields: Object.entries(a.custom_fields ?? {}).map(([key, value]) => ({ key, value: String(value) })),
    });
    setEditAddOnId(a.id); setShowAddOn(true);
  };
  const applyUnitMath = () => {
    const cost = parseFloat(addOnForm.unit_cost);
    const qty  = parseFloat(addOnForm.unit_quantity);
    if (!Number.isFinite(cost) || !Number.isFinite(qty)) return toast.error('Set both unit cost and quantity first');
    setAddOnForm(p => ({ ...p, amount: String(cost * qty) }));
  };
  const saveAddOn = async () => {
    if (!addOnForm.line_item.trim()) return toast.error('Line item name is required');
    if (!user || !projectId) return toast.error('Sign in and open an active project before saving');
    setSavingAddOn(true);
    try {
      const customFields = Object.fromEntries(
        addOnForm.custom_fields.filter(f => f.key.trim()).map(f => [f.key.trim(), f.value])
      );
      const p = {
        project_id: projectId, entity_id: entityId, user_id: user.id,
        line_item: addOnForm.line_item.trim(), kind: addOnForm.kind,
        unit_cost: addOnForm.unit_cost !== '' ? parseFloat(addOnForm.unit_cost) : null,
        unit_quantity: addOnForm.unit_quantity !== '' ? parseFloat(addOnForm.unit_quantity) : null,
        unit_label: addOnForm.unit_label || null,
        amount: parseFloat(addOnForm.amount) || 0, status: addOnForm.status,
        approval_method: addOnForm.approval_method || null,
        requested_date: addOnForm.requested_date || null, approved_date: addOnForm.approved_date || null,
        client_visible: addOnForm.client_visible, client_visible_notes: addOnForm.client_visible_notes || null,
        internal_notes: addOnForm.internal_notes || null, custom_fields: customFields,
      };
      const { error } = editAddOnId ? await (supabase as any).from('project_add_ons').update(p).eq('id', editAddOnId) : await (supabase as any).from('project_add_ons').insert(p);
      if (error) dbError('Add-on save failed', error); else { toast.success(editAddOnId ? 'Add-on updated' : 'Add-on added'); setShowAddOn(false); await load(); }
    } finally {
      setSavingAddOn(false);
    }
  };
  const deleteAddOn = async (id: string) => { if (!confirm('Delete this add-on?')) return; await (supabase as any).from('project_add_ons').delete().eq('id', id); toast.success('Deleted'); load(); };
  const addCustomField = () => setAddOnForm(p => ({ ...p, custom_fields: [...p.custom_fields, { key: '', value: '' }] }));
  const updateCustomField = (i: number, field: 'key' | 'value', v: string) =>
    setAddOnForm(p => ({ ...p, custom_fields: p.custom_fields.map((f, idx) => idx === i ? { ...f, [field]: v } : f) }));
  const removeCustomField = (i: number) => setAddOnForm(p => ({ ...p, custom_fields: p.custom_fields.filter((_, idx) => idx !== i) }));

  /* Milestone */
  const openAddMS = () => { setMsForm(blankMS()); setEditMSId(null); setShowMS(true); };
  const openEditMS = (m: Milestone) => { setMsForm({ title: m.title, description: m.description ?? '', planned_start_date: m.planned_start_date ?? '', planned_completion_date: m.planned_completion_date ?? '', actual_completion_date: m.actual_completion_date ?? '', percent_complete: String(m.percent_complete), status: m.status, billing_eligible: m.billing_eligible, billing_amount: String(m.billing_amount), client_visible: m.client_visible, client_visible_notes: m.client_visible_notes ?? '', internal_notes: m.internal_notes ?? '' }); setEditMSId(m.id); setShowMS(true); };
  const saveMS = async () => {
    if (!msForm.title.trim()) return toast.error('Milestone title is required');
    if (!user || !projectId) return toast.error('Sign in and open an active project before saving');
    setSavingMS(true);
    try {
      const p = { project_id: projectId, entity_id: entityId, user_id: user.id, title: msForm.title.trim(), description: msForm.description || null, planned_start_date: msForm.planned_start_date || null, planned_completion_date: msForm.planned_completion_date || null, actual_completion_date: msForm.actual_completion_date || null, percent_complete: parseFloat(msForm.percent_complete) || 0, status: msForm.status, billing_eligible: msForm.billing_eligible, billing_amount: parseFloat(msForm.billing_amount) || 0, client_visible: msForm.client_visible, client_visible_notes: msForm.client_visible_notes || null, internal_notes: msForm.internal_notes || null };
      const { error } = editMSId ? await (supabase as any).from('project_milestones').update(p).eq('id', editMSId) : await (supabase as any).from('project_milestones').insert(p);
      if (error) dbError('Milestone save failed', error); else { toast.success(editMSId ? 'Milestone updated' : 'Milestone added'); setShowMS(false); await load(); }
    } finally {
      setSavingMS(false);
    }
  };
  const deleteMS = async (id: string) => { if (!confirm('Delete this milestone?')) return; await (supabase as any).from('project_milestones').delete().eq('id', id); toast.success('Deleted'); load(); };

  /* Draw */
  const openAddDraw = () => { setDrawForm(blankDraw()); setEditDrawId(null); setShowDraw(true); };
  const openEditDraw = (d: DrawSchedule) => { setDrawForm({ milestone_name: d.milestone_name, draw_amount: String(d.draw_amount), scheduled_date: d.scheduled_date ?? '', status: d.status, notes: d.notes ?? '', invoice_number: d.invoice_number ?? '', billing_period_start: d.billing_period_start ?? '', billing_period_end: d.billing_period_end ?? '' }); setEditDrawId(d.id); setShowDraw(true); };
  const syncFundedDrawIncome = async (draw: SavedDraw) => {
    if (!user?.id || !projectId) throw new Error('Sign in and open an active project before syncing funded draw income');

    const externalReference = `draw_schedule:${draw.id}`;
    const { data: existing, error: lookupError } = await (supabase as any)
      .from('transactions')
      .select('id')
      .eq('external_reference', externalReference)
      .maybeSingle();
    if (lookupError) throw lookupError;

    if (draw.status !== 'funded') {
      if (existing?.id) {
        const { error } = await (supabase as any)
          .from('transactions')
          .update({
            status: 'voided',
            payment_status: 'voided',
            notes: `Draw request changed to ${draw.status}; linked income voided to prevent revenue overstatement.`,
            updated_by: user.id,
          })
          .eq('id', existing.id);
        if (error) throw error;
      }
      return;
    }

    const amount = Number(draw.draw_amount || 0);
    if (amount <= 0) throw new Error('Funded draw amount must be greater than zero to create income');

    const transactionDate = draw.scheduled_date || draw.billing_period_end || new Date().toISOString().slice(0, 10);
    const payload = {
      user_id: user.id,
      entity_id: entityId,
      type: 'income',
      amount,
      amount_before_tax: amount,
      tax_amount: 0,
      total_amount: amount,
      net_amount: amount,
      transaction_date: transactionDate,
      posting_date: transactionDate,
      source_name: project?.client_name || project?.customer_name || project?.name || 'Project draw funding',
      project_id: projectId,
      category: 'Project Draw Funding',
      description: `Funded draw request: ${draw.milestone_name}`,
      notes: draw.notes || `Auto-created from funded draw request${draw.invoice_number ? ` ${draw.invoice_number}` : ''}.`,
      payment_method: 'financing_draw',
      status: 'posted',
      approval_status: 'approved',
      payment_status: 'paid',
      reconciliation_status: 'unreconciled',
      external_reference: externalReference,
      external_invoice_number: draw.invoice_number || null,
      created_by: user.id,
      updated_by: user.id,
    };

    const result = existing?.id
      ? await (supabase as any).from('transactions').update(payload).eq('id', existing.id)
      : await (supabase as any).from('transactions').insert(payload);
    if (result.error) throw result.error;
  };
  const saveDraw = async () => {
    if (!drawForm.milestone_name.trim()) return toast.error('Draw name is required');
    if (!user?.id || !projectId) return toast.error('Sign in and open an active project before saving');
    setSavingDraw(true);
    try {
      const p = { project_id: projectId, milestone_name: drawForm.milestone_name.trim(), draw_amount: parseFloat(drawForm.draw_amount) || 0, scheduled_date: drawForm.scheduled_date || null, status: drawForm.status, notes: drawForm.notes || null, invoice_number: drawForm.invoice_number || null, billing_period_start: drawForm.billing_period_start || null, billing_period_end: drawForm.billing_period_end || null };
      const { data, error } = editDrawId
        ? await (supabase as any).from('draw_schedules').update(p).eq('id', editDrawId).select('*').single()
        : await (supabase as any).from('draw_schedules').insert(p).select('*').single();
      if (error) dbError('Draw request save failed', error);
      else {
        await syncFundedDrawIncome(data as SavedDraw);
        toast.success(drawForm.status === 'funded' ? 'Draw saved and income ledger updated' : editDrawId ? 'Draw request updated' : 'Draw request added');
        setShowDraw(false);
        await load();
      }
    } finally {
      setSavingDraw(false);
    }
  };
  const deleteDraw = async (id: string) => {
    if (!confirm('Delete this draw?')) return;
    const { error: txnError } = await (supabase as any)
      .from('transactions')
      .update({
        status: 'voided',
        payment_status: 'voided',
        notes: 'Linked draw request was deleted; income voided to prevent revenue overstatement.',
        updated_by: user?.id ?? null,
      })
      .eq('external_reference', `draw_schedule:${id}`);
    if (txnError) return dbError('Linked income void failed', txnError);
    const { error } = await (supabase as any).from('draw_schedules').delete().eq('id', id);
    if (error) return dbError('Draw delete failed', error);
    toast.success('Deleted and linked income voided');
    load();
  };

  /* Notes */
  const saveNotes = async () => {
    if (!projectId) return toast.error('Open an active project before saving notes');
    setSavingNotes(true);
    try {
      const { error } = await (supabase as any).from('projects').update({ notes }).eq('id', projectId);
      if (error) dbError('Project notes save failed', error);
      else { toast.success('Notes saved'); setShowNotes(false); }
    } finally {
      setSavingNotes(false);
    }
  };

  /* ── shared field styles (match existing Input component look) ───────────── */
  const F = 'w-full h-9 rounded-none border border-border bg-background text-foreground text-sm px-3 focus:outline-none focus:border-foreground/40 placeholder:text-muted-foreground';
  const TA = 'w-full rounded-none border border-border bg-background text-foreground text-sm px-3 py-2 resize-none focus:outline-none focus:border-foreground/40 placeholder:text-muted-foreground';
  const saveBtn = 'h-9 px-5 rounded-none bg-foreground text-background text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-40';
  const cancelBtn = 'h-9 px-4 rounded-none border border-border text-xs text-muted-foreground hover:text-foreground transition-colors';
  const iconBtn   = 'p-1.5 text-muted-foreground hover:text-foreground transition-colors';
  const delBtn    = 'p-1.5 text-muted-foreground hover:text-destructive transition-colors';

  if (!project) return null;

  const contextualAction = (() => {
    if (subTab === 'sov') return { label: 'Add Scope Item', onClick: openAddSOV };
    if (subTab === 'milestones') return { label: 'Add Milestone', onClick: openAddMS };
    if (subTab === 'draws') return { label: 'Add Draw', onClick: openAddDraw };
    if (subTab === 'cos') return { label: 'Add Change Order', onClick: openAddCO };
    if (subTab === 'addons') return { label: 'Add Add-On', onClick: openAddAddOn };
    if (subTab === 'notes') return { label: 'Edit Notes', onClick: () => setShowNotes(true), disabled: savingNotes };
    return null;
  })();

  return (
    <div className="pb-shell">
      <style>{PB_CSS}</style>
      <style>{PDV2_CSS}</style>

      {/* ── Sub-tab navigation ────────────────────────────────────────────── */}
      <div className="px-4 sm:px-8">
        <FlushTabs
          items={SUB_TABS.map(t => ({ key: t.key, label: t.short, icon: t.icon }))}
          activeKey={subTab}
          onChange={key => setSubTab(key as SubTab)}
          size="sm"
          layoutId="pb-inner-tab-line"
        />
      </div>

      <div className="px-4 sm:px-8 py-2.5 border-b border-border bg-secondary/20 flex items-center justify-end gap-2">
        {contextualAction && (
          <button
            onClick={contextualAction.onClick}
            disabled={contextualAction.disabled}
            className="h-9 px-3 border border-foreground bg-foreground text-background hover:opacity-90 text-[9px] uppercase tracking-[0.14em] font-bold transition-opacity disabled:opacity-45"
          >
            <Plus className="inline w-3 h-3 mr-1" /> {contextualAction.label}
          </button>
        )}
        <button
          onClick={exportReconciliationPDF}
          className="h-9 px-3 border border-border bg-background hover:bg-secondary/60 text-[9px] uppercase tracking-[0.14em] font-bold text-foreground transition-colors"
        >
          Export PDF
        </button>
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div className="p-4 sm:p-8">
        {loading && (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading project data…</div>
        )}

        {!loading && (
          <>
            {/* ══════════════════════════════════════════════════════════════
                OVERVIEW
            ══════════════════════════════════════════════════════════════ */}
            {subTab === 'overview' && (() => {
              const clientName = enriched?.client_name_snapshot || null;
              const lastActivityTs = auditEntries[0]?.created_at ? fmtDate(auditEntries[0].created_at) : null;
              return (
              <div className="space-y-3">
                {/* ── Reconciliation Center / Quick Actions / Key Metrics / Project Details ── */}
                <div className="grid grid-cols-1 xl:grid-cols-4 gap-3 items-stretch">
                  <div className="pdv2-card overflow-hidden">
                    <div className="pdv2-card-header"><div className="text-[11px] font-bold uppercase tracking-wide">Reconciliation Center</div></div>
                    <div className="p-4">
                      <div className="flex items-center gap-4">
                        <ProgressRing pct={fin.billed > 0 ? (fin.paid / fin.billed) * 100 : 0} />
                        <div className="min-w-0">
                          <div className="text-[11px] font-semibold">Reconciliation Progress</div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">{fmtUSD(fin.paid)} collected of {fmtUSD(fin.billed)}</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-border text-center">
                        <div>
                          <div className="text-[9px] uppercase tracking-wide text-muted-foreground">Cleared</div>
                          <div className="text-[12px] font-bold font-mono-tab text-positive mt-0.5">{fmtUSD(fin.paid)}</div>
                        </div>
                        <div>
                          <div className="text-[9px] uppercase tracking-wide text-muted-foreground">Open</div>
                          <div className="text-[12px] font-bold font-mono-tab mt-0.5">{fmtUSD(Math.max(fin.ar, 0))}</div>
                        </div>
                        <div>
                          <div className="text-[9px] uppercase tracking-wide text-muted-foreground">Overdue</div>
                          <div className="text-[12px] font-bold font-mono-tab text-accent mt-0.5">{fmtUSD(overdueAmount)}</div>
                        </div>
                      </div>
                      {lastActivityTs && (
                        <div className="text-[10px] text-muted-foreground mt-3 pt-3 border-t border-border">Last updated {lastActivityTs}</div>
                      )}
                    </div>
                  </div>

                  <div className="pdv2-card overflow-hidden">
                    <div className="pdv2-card-header"><div className="text-[11px] font-bold uppercase tracking-wide">Quick Actions</div></div>
                    <div className="p-2 space-y-1">
                      {[
                        { label: 'Reconcile Now', sub: 'Match transactions', icon: RefreshCw, color: '#3b82f6', onClick: () => setSubTab('reconciliation') },
                        { label: 'Create Draw', sub: 'New draw request', icon: Wallet, color: '#9D7E3F', onClick: () => { setSubTab('draws'); openAddDraw(); } },
                        { label: 'Create CO', sub: 'New change order', icon: TrendingUp, color: '#f59e0b', onClick: () => { setSubTab('cos'); openAddCO(); } },
                        { label: 'Record Payment', sub: 'Log incoming payment', icon: Receipt, color: '#10b981', onClick: () => { setSubTab('payments'); setAutoOpenLog('income'); } },
                        { label: 'Record Expense', sub: 'Log project expense', icon: Wallet, color: '#ef4444', onClick: () => { setSubTab('expenses'); setAutoOpenLog('expense'); } },
                      ].map(a => (
                        <button key={a.label} onClick={a.onClick} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-secondary/50 rounded-md transition-colors group">
                          <span className="pdv2-icon-chip" style={{ backgroundColor: `${a.color}1a` }}>
                            <a.icon className="w-3.5 h-3.5" style={{ color: a.color }} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="text-[12px] font-semibold">{a.label}</div>
                            <div className="text-[10px] text-muted-foreground">{a.sub}</div>
                          </div>
                          <ChevronDown className="w-3.5 h-3.5 -rotate-90 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pdv2-card overflow-hidden">
                    <div className="pdv2-card-header"><div className="text-[11px] font-bold uppercase tracking-wide">Key Metrics</div></div>
                    <div className="p-4 space-y-3">
                      {[
                        ['Billings to Date', fmtUSD(fin.billed)],
                        ['Change Orders', fmtUSD(fin.net)],
                        ['Retainage Held', fmtUSD((enriched?.checksList ?? []).reduce((s: number, c: any) => s + (Number(c.retainage_held) || 0), 0))],
                        ['Pending Approvals', `${pendingApprovalsCount} item${pendingApprovalsCount !== 1 ? 's' : ''}`],
                      ].map(([label, value]) => (
                        <div key={label} className="flex justify-between items-baseline text-[12px]">
                          <span className="text-muted-foreground">{label}</span>
                          <span className="font-mono-tab font-semibold">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <ProjectDetailsCard
                    data={{
                      name: project?.name, code: project?.code, clientName,
                      projectManager: project?.project_manager,
                      status: (project?.status || 'active').replace('_', ' '),
                      statusColor: project?.status === 'active' ? 'bg-positive/15 text-positive' : project?.status === 'on_hold' ? 'bg-warning/15 text-warning' : 'bg-secondary text-foreground',
                      contractType: project?.contract_type,
                      startDate: project?.start_date, endDate: project?.end_date,
                      location: project?.location, department: project?.department,
                    }}
                  />
                </div>

                {/* ── Financial Summary / Billing vs Payments ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <div className="pdv2-card overflow-hidden">
                    <div className="pdv2-card-header"><div className="text-[11px] font-bold uppercase tracking-wide">Financial Summary</div></div>
                    <div className="grid grid-cols-2 gap-px bg-border">
                      {[
                        { label: 'Original Contract', value: fmtUSD(fin.originalContractValue) },
                        { label: 'SOV Allocated', value: fmtUSD(fin.sovAllocated), sub: `${fin.sovCoveragePct.toFixed(1)}% of contract` },
                        { label: 'Change Orders', value: fmtUSD(fin.net), sub: `${fin.originalContractValue > 0 ? (fin.net / fin.originalContractValue * 100).toFixed(1) : '0.0'}% of contract` },
                        { label: 'Revised Contract', value: fmtUSD(fin.revised), accent: true },
                        { label: 'Pending Change Orders', value: fmtUSD(fin.pendingCOs), sub: 'awaiting approval' },
                        { label: 'Total Billed', value: fmtUSD(fin.billed), sub: `${fin.billedPct.toFixed(1)}% of contract` },
                        { label: 'Payments Received', value: fmtUSD(fin.paid), sub: `${fin.collectPct.toFixed(1)}% of billed` },
                        { label: 'Accounts Receivable', value: fmtUSD(fin.ar), sub: fin.billed > 0 ? `${(fin.ar / fin.billed * 100).toFixed(1)}% of billed` : undefined },
                        { label: 'Balance Remaining', value: fmtUSD(fin.balance), accent: true },
                      ].map(card => (
                        <div key={card.label} className="bg-background px-4 py-3">
                          <div className="text-[9px] uppercase tracking-wide text-muted-foreground font-bold leading-tight">{card.label}</div>
                          <div className={`text-[15px] font-bold font-mono-tab mt-1 ${card.accent ? 'text-[#9D7E3F]' : ''}`}>{card.value}</div>
                          {card.sub && <div className="text-[10px] text-muted-foreground mt-0.5 font-mono-tab">{card.sub}</div>}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pdv2-card overflow-hidden">
                    <div className="pdv2-card-header"><div className="text-[11px] font-bold uppercase tracking-wide">Billing vs Payments</div></div>
                    <div className="p-4">
                      <TrendLineChart
                        data={billingVsPaymentsSeries}
                        series={[
                          { key: 'billed', label: 'Billed Amount', color: '#3b82f6' },
                          { key: 'paid', label: 'Payments Received', color: '#10b981' },
                        ]}
                      />
                    </div>
                  </div>
                </div>

                {/* ── Recent Draws / Change Orders / Payments + sidebar ── */}
                <div className="grid grid-cols-1 xl:grid-cols-4 gap-3 items-start">
                  <div className="xl:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <MiniTable
                      title="Recent Draw Requests"
                      onViewAll={() => setSubTab('draws')}
                      emptyText="No draws recorded yet."
                      columns={[
                        { key: 'name', label: 'Draw', render: (d: any) => d.milestone_name },
                        { key: 'amount', label: 'Amount', align: 'right', render: (d: any) => fmtUSD(d.draw_amount) },
                        { key: 'status', label: 'Status', render: (d: any) => (
                          <span className={`text-[9px] font-bold uppercase ${d.status === 'funded' ? 'text-positive' : d.status === 'requested' ? 'text-warning' : 'text-muted-foreground'}`}>{d.status}</span>
                        ) },
                      ]}
                      rows={[...draws].sort((a, b) => (b.scheduled_date || b.created_at || '').localeCompare(a.scheduled_date || a.created_at || '')).slice(0, 3)}
                    />
                    <MiniTable
                      title="Change Orders"
                      onViewAll={() => setSubTab('cos')}
                      emptyText="No change orders have been added to this project."
                      emptyAction={<button onClick={() => { setSubTab('cos'); openAddCO(); }} className={saveBtn}>+ New Change Order</button>}
                      columns={[
                        { key: 'title', label: 'Title', render: (c: any) => c.title },
                        { key: 'amount', label: 'Amount', align: 'right', render: (c: any) => fmtUSD(c.amount) },
                        { key: 'status', label: 'Status', render: (c: any) => (
                          <span className={`text-[9px] font-bold uppercase ${c.status === 'approved' ? 'text-positive' : c.status === 'rejected' ? 'text-destructive' : 'text-warning'}`}>{c.status}</span>
                        ) },
                      ]}
                      rows={[...changeOrders].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 3)}
                    />
                    <MiniTable
                      title="Recent Payments"
                      onViewAll={() => setSubTab('payments')}
                      emptyText="No payments recorded yet."
                      columns={[
                        { key: 'date', label: 'Date', render: (p: any) => fmtDate(p.transaction_date) },
                        { key: 'amount', label: 'Amount', align: 'right', render: (p: any) => fmtUSD(p.amount) },
                        { key: 'status', label: 'Status', render: () => <span className="text-[9px] font-bold uppercase text-positive">Cleared</span> },
                      ]}
                      rows={[...(enriched?.incomeList ?? [])].sort((a: any, b: any) => b.transaction_date.localeCompare(a.transaction_date)).slice(0, 3)}
                    />
                  </div>

                  <div className="space-y-3">
                    <ActivityFeedCard
                      onViewAll={() => setSubTab('audit')}
                      entries={auditEntries.slice(0, 5).map(e => ({
                        id: e.id,
                        title: `${e.badge}: ${e.title}`,
                        amount: e.value,
                        timestamp: fmtDate(e.created_at),
                        dotColor: e.statusColor.replace('text-', 'bg-'),
                        icon: e.icon,
                        iconClassName: e.badgeBg,
                      }))}
                    />
                    <DocumentsCard documents={projectDocs} />
                  </div>
                </div>
              </div>
              );
            })()}

            {/* ══════════════════════════════════════════════════════════════
                SCOPE / SCHEDULE OF VALUES
            ══════════════════════════════════════════════════════════════ */}
            {subTab === 'sov' && (
              <div className="space-y-4">
                <div className="border border-border">
                  <KpiGrid items={[
                    { label: 'Original Contract', value: fmtUSD(fin.originalContractValue) },
                    { label: 'SOV Allocated',     value: fmtUSD(fin.sovAllocated), sub: `${fin.sovCoveragePct.toFixed(1)}% of contract` },
                    { label: 'Revised Total',     value: fmtUSD(fin.revised), accent: true },
                    { label: 'Total Earned',      value: fmtUSD(fin.earned), sub: `${fin.pctDone.toFixed(1)}% complete` },
                    { label: 'Remaining to Bill', value: fmtUSD(fin.remainToBill) },
                  ]} />
                </div>

                <SOVReconciliationBanner fin={fin} />

	                <div className="border border-border">
	                  <PanelHeader
	                    label={`Schedule of Values — ${scopeItems.length} Line Item${scopeItems.length !== 1 ? 's' : ''}`}
	                  />

                  {/* Guided modal form */}
                  {showSOV && (
                    <WorkflowDialog
                      open={showSOV}
                      onOpenChange={setShowSOV}
                      kicker="Schedule of Values"
                      title={`${editSOVId ? 'Edit' : 'New'} Scope Item`}
                      description="Add or correct one SOV line without disrupting the project view. Core scope, money, billing progress, and optional notes stay organized in one focused workflow."
                    >
                    <div className="pb-entry-panel space-y-3 border border-border bg-background">
                      <GuidedEntryIntro
                        title={`${editSOVId ? 'Edit' : 'New'} Scope Item`}
                        intent="Create a clean SOV line that ties scope, cost code, contract value, billing progress, and internal notes into one finance-ready record."
                        steps={['Identify scope', 'Set value', 'Track billing']}
                      />
                      <div className="pb-entry-grid">
                        <div className="pb-span-4 space-y-1">
                          <div className="micro-label">Line Item Name</div>
                          <input className={F} value={sovForm.name} onChange={sov('name')} placeholder="e.g. Electrical Rough-In" />
                        </div>
                        <div className="space-y-1">
                          <div className="micro-label">Category</div>
                          <select className={F} value={sovForm.category} onChange={sov('category')}>
                            <option value="">— select —</option>
                            {SOV_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <div className="micro-label">Cost Code</div>
                          <input className={F} value={sovForm.cost_code} onChange={sov('cost_code')} placeholder="e.g. 16-100" />
                        </div>
                        <div className="space-y-1">
                          <div className="micro-label">Contract Amount ($)</div>
                          <CurrencyInput value={sovForm.contract_amount} onValueChange={v => setSovForm(p => ({ ...p, contract_amount: v }))} placeholder="0.00" className={F} />
                        </div>
                        <div className="space-y-1">
                          <div className="micro-label">CO Amount ($)</div>
                          <CurrencyInput value={sovForm.change_order_amount} onValueChange={v => setSovForm(p => ({ ...p, change_order_amount: v }))} placeholder="0.00" className={F} />
                        </div>
                        <div className="space-y-1">
                          <div className="micro-label">Approved Credit ($)</div>
                          <CurrencyInput value={sovForm.approved_credit_amount} onValueChange={v => setSovForm(p => ({ ...p, approved_credit_amount: v }))} placeholder="0.00" className={F} />
                        </div>
                        <div className="space-y-1">
                          <div className="micro-label">% Complete</div>
                          <input type="number" min="0" max="100" className={`${F} font-mono-tab`} value={sovForm.percent_complete} onChange={sov('percent_complete')} />
                        </div>
                        <div className="space-y-1">
                          <div className="micro-label">Total Billed ($)</div>
                          <CurrencyInput value={sovForm.total_billed} onValueChange={v => setSovForm(p => ({ ...p, total_billed: v }))} placeholder="0.00" className={F} />
                        </div>
                        <div className="space-y-1">
                          <div className="micro-label">Work Status</div>
                          <select className={F} value={sovForm.work_status} onChange={sov('work_status')}>
                            <option value="not_started">Not Started</option>
                            <option value="scheduled">Scheduled</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="on_hold">On Hold</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <div className="micro-label">Payment Status</div>
                          <select className={F} value={sovForm.payment_status} onChange={sov('payment_status')}>
                            <option value="not_billed">Not Billed</option>
                            <option value="billed">Billed</option>
                            <option value="unpaid">Unpaid</option>
                            <option value="partially_paid">Partially Paid</option>
                            <option value="paid">Paid</option>
                            <option value="past_due">Past Due</option>
                            <option value="disputed">Disputed</option>
                            <option value="credited">Credited</option>
                          </select>
                        </div>
                      </div>
                      <details className="pb-advanced">
                        <summary>Advanced notes and client/internal context</summary>
                        <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <div className="micro-label">Client Notes</div>
                            <textarea className={TA} rows={2} value={sovForm.client_visible_notes} onChange={sov('client_visible_notes')} />
                          </div>
                          <div className="space-y-1">
                            <div className="micro-label">Internal Notes</div>
                            <textarea className={TA} rows={2} value={sovForm.internal_notes} onChange={sov('internal_notes')} />
                          </div>
                        </div>
                      </details>
                      <div className="flex gap-2 pt-1">
                        <button onClick={saveSOV} disabled={savingSOV} className={saveBtn}>{savingSOV ? 'Saving…' : 'Save'}</button>
                        <button onClick={() => setShowSOV(false)} className={cancelBtn}><X className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                    </WorkflowDialog>
                  )}

                  {/* Table */}
                  {scopeItems.length === 0 ? (
                    <EmptyState text="No scope items yet — add your first line item above." />
                  ) : (
                    <>
                    {/* Mobile card view */}
                    <div className="sm:hidden divide-y divide-border">
                      {scopeItems.map(item => {
                        const rev  = Number(item.contract_amount) + Number(item.change_order_amount) - Number(item.approved_credit_amount || 0);
                        const earn = rev * Number(item.percent_complete) / 100;
                        const ws = item.work_status ?? 'not_started';
                        const statusColor = ws === 'completed' ? 'text-emerald-500' : ws === 'in_progress' ? 'text-amber-500' : 'text-muted-foreground';
                        return (
                          <div key={item.id} className="px-4 py-4 pd-row space-y-2.5">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-foreground text-sm">{item.name}</div>
                                {item.category && <div className="micro-label mt-0.5">{item.category}</div>}
                              </div>
                              <div className="flex items-center gap-0.5 shrink-0">
                                <button onClick={() => openEditSOV(item)} className={iconBtn}><Edit3 className="w-3.5 h-3.5" /></button>
                                <button onClick={() => deleteSOV(item.id)} className={delBtn}><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-center">
                              {[
                                { l: 'Revised', v: fmtUSD(rev), bold: true },
                                { l: 'Earned',  v: fmtUSD(earn), accent: true },
                                { l: 'Billed',  v: fmtUSD(item.total_billed) },
                              ].map(c => (
                                <div key={c.l} className="border border-border py-1.5 px-2">
                                  <div className="micro-label">{c.l}</div>
                                  <div className={`text-xs font-mono-tab font-semibold mt-0.5 ${c.accent ? 'text-accent' : 'text-foreground'}`}>{c.v}</div>
                                </div>
                              ))}
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex-1"><Bar value={item.percent_complete} max={100} hex="#9D7E3F" /></div>
                              <span className="micro-label shrink-0">{item.percent_complete}%</span>
                              <span className={`text-[10px] font-bold uppercase shrink-0 ${statusColor}`}>{ws.replace(/_/g, ' ')}</span>
                            </div>
                          </div>
                        );
                      })}
                      <div className="px-4 py-3 border-t-2 border-border bg-secondary/30 flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-bold">{scopeItems.length} line item{scopeItems.length !== 1 ? 's' : ''}</span>
                        <span className="font-mono-tab text-sm font-bold text-foreground">{fmtUSD(fin.sovRevisedTotal)}</span>
                      </div>
                    </div>

                    {/* Desktop table */}
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="w-full text-sm" style={{ minWidth: 700 }}>
                        <thead>
                          <tr className="border-b border-border">
                            {['Line Item', 'Contract', 'Revised', '% Done', 'Earned', 'Billed', 'Remaining', ''].map(h => (
                              <th key={h} className={`px-4 py-2.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-medium ${h === 'Line Item' || h === '' ? 'text-left' : 'text-right'}`}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {scopeItems.map(item => {
                            const rev  = Number(item.contract_amount) + Number(item.change_order_amount) - Number(item.approved_credit_amount || 0);
                            const earn = rev * Number(item.percent_complete) / 100;
                            const rem  = rev - Number(item.total_billed);
                            return (
                              <tr key={item.id} className="border-b border-border pd-row">
                                <td className="px-4 py-3">
                                  <div className="font-medium text-foreground">{item.name}</div>
                                  {item.category && <div className="micro-label mt-0.5">{item.category}</div>}
                                </td>
                                <td className="px-4 py-3 text-right font-mono-tab text-muted-foreground">{fmtUSD(item.contract_amount)}</td>
                                <td className="px-4 py-3 text-right font-mono-tab text-foreground font-medium">{fmtUSD(rev)}</td>
                                <td className="px-4 py-3 text-right">
                                  <div className="font-mono-tab text-foreground">{item.percent_complete}%</div>
                                  <div className="w-16 ml-auto mt-1"><Bar value={item.percent_complete} max={100} hex="#9D7E3F" /></div>
                                </td>
                                <td className="px-4 py-3 text-right font-mono-tab text-accent font-semibold">{fmtUSD(earn)}</td>
                                <td className="px-4 py-3 text-right font-mono-tab text-muted-foreground">{fmtUSD(item.total_billed)}</td>
                                <td className="px-4 py-3 text-right font-mono-tab text-foreground">{fmtUSD(rem)}</td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-0.5 justify-end">
                                    <button onClick={() => openEditSOV(item)} className={iconBtn}><Edit3 className="w-3.5 h-3.5" /></button>
                                    <button onClick={() => deleteSOV(item.id)} className={delBtn}><Trash2 className="w-3.5 h-3.5" /></button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-border">
                            <td className="px-4 py-3 text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-bold">Totals</td>
                            <td className="px-4 py-3 text-right font-mono-tab text-muted-foreground font-semibold">{fmtUSD(fin.sovAllocated)}</td>
                            <td className="px-4 py-3 text-right font-mono-tab text-foreground font-bold">{fmtUSD(fin.sovRevisedTotal)}</td>
                            <td className="px-4 py-3 text-right font-mono-tab text-foreground">{fin.sovPctDone.toFixed(1)}%</td>
                            <td className="px-4 py-3 text-right font-mono-tab text-accent font-bold">{fmtUSD(fin.earned)}</td>
                            <td className="px-4 py-3 text-right font-mono-tab text-muted-foreground font-semibold">{fmtUSD(fin.sovBilledTotal)}</td>
                            <td className="px-4 py-3 text-right font-mono-tab text-foreground font-bold">{fmtUSD(fin.sovRemainingTotal)}</td>
                            <td />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                MILESTONES
            ══════════════════════════════════════════════════════════════ */}
            {subTab === 'milestones' && (
              <div className="space-y-4">
                <div className="pdv2-card overflow-hidden">
                  <KpiGrid items={[
                    { label: 'Total Milestones', value: String(milestones.length) },
                    { label: 'Completed', value: String(milestones.filter(m => m.status === 'completed').length), accent: true },
                    { label: 'In Progress', value: String(milestones.filter(m => m.status === 'in_progress').length) },
                    { label: 'Overdue', value: String(milestones.filter(m => m.status !== 'completed' && m.planned_completion_date && new Date(m.planned_completion_date) < new Date()).length), sub: 'past planned completion' },
                  ]} />
                </div>

                <div className="pdv2-card overflow-hidden">
                <PanelHeader
                  label={`Milestones — ${milestones.length}`}
                />

                {showMS && (
                  <WorkflowDialog
                    open={showMS}
                    onOpenChange={setShowMS}
                    kicker="Project Milestones"
                    title={`${editMSId ? 'Edit' : 'New'} Milestone`}
                    description="Track the marker, schedule, billing eligibility, and client visibility from a compact guided workspace built for field and office use."
                  >
                  <div className="pb-entry-panel space-y-3 border border-border bg-background">
                    <GuidedEntryIntro
                      title={`${editMSId ? 'Edit' : 'New'} Milestone`}
                      intent="Capture the work marker, schedule target, completion status, and billing eligibility so project progress and draw timing stay aligned."
                      steps={['Name marker', 'Schedule dates', 'Billing rules']}
                    />
                      <div className="pb-entry-grid">
                      <div className="pb-span-2 space-y-1">
                        <div className="micro-label">Title</div>
                        <input className={F} value={msForm.title} onChange={ms('title')} placeholder="e.g. Foundation Complete" />
                      </div>
                      <div className="space-y-1">
                        <div className="micro-label">Status</div>
                        <select className={F} value={msForm.status} onChange={ms('status')}>
                          {Object.entries(MS_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <div className="micro-label">% Complete</div>
                        <input type="number" min="0" max="100" className={`${F} font-mono-tab`} value={msForm.percent_complete} onChange={ms('percent_complete')} />
                      </div>
                      <div className="space-y-1">
                        <div className="micro-label">Planned Start</div>
                        <DateInput className={F} value={msForm.planned_start_date} onChange={ms('planned_start_date')} />
                      </div>
                      <div className="space-y-1">
                        <div className="micro-label">Planned Completion</div>
                        <DateInput className={F} value={msForm.planned_completion_date} onChange={ms('planned_completion_date')} />
                      </div>
                      <div className="space-y-1">
                        <div className="micro-label">Actual Completion</div>
                        <DateInput className={F} value={msForm.actual_completion_date} onChange={ms('actual_completion_date')} />
                      </div>
                      <div className="space-y-1">
                        <div className="micro-label">Billing Amount ($)</div>
                        <CurrencyInput value={msForm.billing_amount} onValueChange={v => setMsForm(p => ({ ...p, billing_amount: v }))} placeholder="0.00" className={F} />
                      </div>
                      <div className="flex items-center gap-2 pt-2">
                        <input type="checkbox" id="ms-be" checked={msForm.billing_eligible} onChange={e => setMsForm(p => ({ ...p, billing_eligible: e.target.checked }))} className="accent-foreground w-3.5 h-3.5" />
                        <label htmlFor="ms-be" className="micro-label cursor-pointer">Billing Eligible</label>
                      </div>
                      <div className="flex items-center gap-2 pt-2">
                        <input type="checkbox" id="ms-cv" checked={msForm.client_visible} onChange={e => setMsForm(p => ({ ...p, client_visible: e.target.checked }))} className="accent-foreground w-3.5 h-3.5" />
                        <label htmlFor="ms-cv" className="micro-label cursor-pointer">Client Visible</label>
                      </div>
                    </div>
                    <details className="pb-advanced">
                      <summary>Description and internal/client notes</summary>
                      <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <div className="micro-label">Description</div>
                          <textarea className={TA} rows={2} value={msForm.description} onChange={ms('description')} />
                        </div>
                        <div className="space-y-1">
                          <div className="micro-label">Internal Notes</div>
                          <textarea className={TA} rows={2} value={msForm.internal_notes} onChange={ms('internal_notes')} />
                        </div>
                      </div>
                    </details>
                    <div className="flex gap-2 pt-1">
                      <button onClick={saveMS} disabled={savingMS} className={saveBtn}>{savingMS ? 'Saving…' : 'Save'}</button>
                      <button onClick={() => setShowMS(false)} className={cancelBtn}><X className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  </WorkflowDialog>
                )}

                {milestones.length === 0 ? (
                  <EmptyState text="No milestones yet — add your first milestone above." />
                ) : (
                  <div className="divide-y divide-border">
                    {milestones.map(m => {
                      const meta = MS_STATUS[m.status] ?? MS_STATUS.not_started;
                      return (
                        <div key={m.id} className="px-4 py-4 pd-row">
                          <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <span className="text-sm font-semibold text-foreground">{m.title}</span>
                                <span className={`text-[10px] font-bold uppercase tracking-[0.1em] ${meta.color}`}>{meta.label}</span>
                                {m.billing_eligible && (
                                  <span className="text-[10px] text-accent font-bold">Billable · {fmtUSD(m.billing_amount)}</span>
                                )}
                              </div>
                              {m.description && <p className="text-sm text-muted-foreground mb-2">{m.description}</p>}
                              <div className="flex flex-wrap gap-4 micro-label mb-2">
                                {m.planned_start_date && <span>Start: {fmtDate(m.planned_start_date)}</span>}
                                {m.planned_completion_date && <span>Due: {fmtDate(m.planned_completion_date)}</span>}
                                {m.actual_completion_date && <span className="text-emerald-500">Completed: {fmtDate(m.actual_completion_date)}</span>}
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="flex-1"><Bar value={m.percent_complete} max={100} /></div>
                                <span className="micro-label shrink-0">{m.percent_complete}%</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-0.5 shrink-0">
                              <button onClick={() => openEditMS(m)} className={iconBtn}><Edit3 className="w-3.5 h-3.5" /></button>
                              <button onClick={() => deleteMS(m.id)} className={delBtn}><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                DRAWS & BILLING
            ══════════════════════════════════════════════════════════════ */}
            {subTab === 'draws' && (
              <div className="space-y-4">
                <div className="pdv2-card overflow-hidden">
                  <KpiGrid items={[
                    { label: 'Total Draw Requests', value: fmtUSD(draws.reduce((s, d) => s + Number(d.draw_amount), 0)) },
                    { label: 'Funded',               value: fmtUSD(fin.billed), sub: `${draws.filter(d => d.status === 'funded').length} funded`, accent: true },
                    { label: 'Remaining to Bill',    value: fmtUSD(fin.remainToBill) },
                    { label: 'Unbilled Earned Work', value: fmtUSD(fin.unbilled) },
                  ]} />
                </div>

                <div className="pdv2-card overflow-hidden">
	                  <PanelHeader
	                    label={`Draw Schedule — ${draws.length} Request${draws.length !== 1 ? 's' : ''}`}
	                  />

                  {showDraw && (
                    <WorkflowDialog
                      open={showDraw}
                      onOpenChange={setShowDraw}
                      kicker="Draw Schedule"
                      title={`${editDrawId ? 'Edit' : 'New'} Draw Request`}
                      description="Prepare draw requests with invoice references, billing windows, funding status, and notes in one focused process."
                    >
                    <div className="pb-entry-panel space-y-3 border border-border bg-background">
                      <GuidedEntryIntro
                        title={`${editDrawId ? 'Edit' : 'New'} Draw Request`}
                        intent="Log the draw request with invoice details, billing window, scheduled date, and funded status for reconciliation and portfolio reporting."
                        steps={['Name draw', 'Attach invoice', 'Confirm status']}
                      />
                      <div className="pb-entry-grid">
                        <div className="pb-span-4 space-y-1">
                          <div className="micro-label">Draw / Milestone Name</div>
                          <input className={F} value={drawForm.milestone_name} onChange={dr('milestone_name')} placeholder="e.g. Draw #1 — Foundation" />
                        </div>
                        <div className="space-y-1">
                          <div className="micro-label">Invoice Number</div>
                          <input className={F} value={drawForm.invoice_number} onChange={dr('invoice_number')} placeholder="INV-001" />
                        </div>
                        <div className="space-y-1">
                          <div className="micro-label">Draw Amount ($)</div>
                          <CurrencyInput value={drawForm.draw_amount} onValueChange={v => setDrawForm(p => ({ ...p, draw_amount: v }))} placeholder="0.00" className={F} />
                        </div>
                        <div className="space-y-1">
                          <div className="micro-label">Billing Period Start</div>
                          <DateInput className={F} value={drawForm.billing_period_start} onChange={dr('billing_period_start')} />
                        </div>
                        <div className="space-y-1">
                          <div className="micro-label">Billing Period End</div>
                          <DateInput className={F} value={drawForm.billing_period_end} onChange={dr('billing_period_end')} />
                        </div>
                        <div className="space-y-1">
                          <div className="micro-label">Scheduled Date</div>
                          <DateInput className={F} value={drawForm.scheduled_date} onChange={dr('scheduled_date')} />
                        </div>
                        <div className="space-y-1">
                          <div className="micro-label">Status</div>
                          <select className={F} value={drawForm.status} onChange={dr('status')}>
                            <option value="pending">Pending</option>
                            <option value="requested">Requested</option>
                            <option value="funded">Funded</option>
                          </select>
                        </div>
                      </div>
                      <details className="pb-advanced">
                        <summary>Optional draw notes</summary>
                        <div className="p-3">
                          <div className="micro-label">Notes</div>
                          <textarea className={TA} rows={2} value={drawForm.notes} onChange={dr('notes')} />
                        </div>
                      </details>
                      <div className="flex gap-2 pt-1">
                        <button onClick={saveDraw} disabled={savingDraw} className={saveBtn}>{savingDraw ? 'Saving…' : 'Save'}</button>
                        <button onClick={() => setShowDraw(false)} className={cancelBtn}><X className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                    </WorkflowDialog>
                  )}

                  {draws.length === 0 ? (
                    <EmptyState text="No draws recorded yet." />
                  ) : (
                    <>
                    {/* Mobile card view */}
                    <div className="sm:hidden divide-y divide-border">
                      {draws.map(d => {
                        const meta = DRAW_STATUS[d.status];
                        return (
                          <div key={d.id} className="px-4 py-4 pd-row space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-foreground text-sm">{d.milestone_name}</div>
                                {d.invoice_number && <div className="micro-label mt-0.5">Invoice {d.invoice_number}</div>}
                              </div>
                              <div className="flex items-center gap-0.5 shrink-0">
                                <button onClick={() => openEditDraw(d)} className={iconBtn}><Edit3 className="w-3.5 h-3.5" /></button>
                                <button onClick={() => deleteDraw(d.id)} className={delBtn}><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="font-mono-tab font-bold text-foreground">{fmtUSD(d.draw_amount)}</span>
                              <span className={`text-[10px] font-bold uppercase tracking-[0.1em] ${meta.color}`}>{meta.label}</span>
                            </div>
                            {(d.billing_period_start || d.scheduled_date) && (
                              <div className="micro-label">
                                {d.billing_period_start ? `${fmtDate(d.billing_period_start)}${d.billing_period_end ? ' – ' + fmtDate(d.billing_period_end) : ''}` : `Scheduled ${fmtDate(d.scheduled_date!)}`}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      <div className="px-4 py-3 border-t-2 border-border bg-secondary/30 flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-bold">{draws.length} draw{draws.length !== 1 ? 's' : ''}</span>
                        <span className="font-mono-tab text-sm font-bold text-foreground">{fmtUSD(draws.reduce((s, d) => s + Number(d.draw_amount), 0))}</span>
                      </div>
                    </div>

                    {/* Desktop table */}
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="w-full text-sm" style={{ minWidth: 560 }}>
                        <thead>
                          <tr className="border-b border-border">
                            {['Draw', 'Invoice', 'Period', 'Amount', 'Status', ''].map(h => (
                              <th key={h} className={`px-4 py-2.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-medium ${h === 'Amount' ? 'text-right' : 'text-left'}`}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {draws.map(d => {
                            const meta = DRAW_STATUS[d.status];
                            return (
                              <tr key={d.id} className="border-b border-border pd-row">
                                <td className="px-4 py-3">
                                  <div className="font-medium text-foreground">{d.milestone_name}</div>
                                  {d.scheduled_date && <div className="micro-label mt-0.5">{fmtDate(d.scheduled_date)}</div>}
                                </td>
                                <td className="px-4 py-3 text-muted-foreground">{d.invoice_number ?? '—'}</td>
                                <td className="px-4 py-3 text-muted-foreground text-xs">
                                  {d.billing_period_start ? `${fmtDate(d.billing_period_start)}${d.billing_period_end ? ' – ' + fmtDate(d.billing_period_end) : ''}` : '—'}
                                </td>
                                <td className="px-4 py-3 text-right font-mono-tab font-semibold text-foreground">{fmtUSD(d.draw_amount)}</td>
                                <td className="px-4 py-3">
                                  <span className={`text-[10px] font-bold uppercase tracking-[0.1em] ${meta.color}`}>{meta.label}</span>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-0.5 justify-end">
                                    <button onClick={() => openEditDraw(d)} className={iconBtn}><Edit3 className="w-3.5 h-3.5" /></button>
                                    <button onClick={() => deleteDraw(d.id)} className={delBtn}><Trash2 className="w-3.5 h-3.5" /></button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-border">
                            <td colSpan={3} className="px-4 py-3 text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-bold">Total</td>
                            <td className="px-4 py-3 text-right font-mono-tab font-bold text-foreground">{fmtUSD(draws.reduce((s, d) => s + Number(d.draw_amount), 0))}</td>
                            <td colSpan={2} />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                CHANGE ORDERS
            ══════════════════════════════════════════════════════════════ */}
            {subTab === 'cos' && (
              <div className="space-y-4">
                <div className="pdv2-card overflow-hidden">
                  <KpiGrid items={[
                    { label: 'Approved Additions', value: fmtUSD(fin.additions) },
                    { label: 'Approved Credits',   value: fmtUSD(fin.credits) },
                    { label: 'Net Change Orders',  value: fmtUSD(fin.net), accent: true },
                    { label: 'Pending Value',      value: fmtUSD(fin.pendingCOs), sub: 'awaiting approval' },
                  ]} />
                </div>

                <div className="pdv2-card overflow-hidden">
	                  <PanelHeader
	                    label={`Change Orders — ${changeOrders.length}`}
	                  />

                  {showCO && (
                    <WorkflowDialog
                      open={showCO}
                      onOpenChange={setShowCO}
                      kicker="Change Orders"
                      title={`${editCOId ? 'Edit' : 'New'} Change Order`}
                      description="Document additions, deductions, credits, approval timing, and internal context while keeping revised contract totals defensible."
                    >
                    <div className="pb-entry-panel space-y-3 border border-border bg-background">
                      <GuidedEntryIntro
                        title={`${editCOId ? 'Edit' : 'New'} Change Order`}
                        intent="Record additions, deductions, credits, and allowances with approval timing so revised contract value remains defensible."
                        steps={['Classify CO', 'Set amount', 'Document approval']}
                      />
                      <div className="pb-entry-grid">
                        <div className="space-y-1">
                          <div className="micro-label">CO Number</div>
                          <input className={F} value={coForm.co_number} onChange={co('co_number')} placeholder="CO-001" />
                        </div>
                        <div className="space-y-1">
                          <div className="micro-label">Type</div>
                          <select className={F} value={coForm.type} onChange={co('type')}>
                            <option value="addition">Addition</option>
                            <option value="allowance">Allowance</option>
                            <option value="deduction">Deduction</option>
                            <option value="credit">Credit</option>
                          </select>
                        </div>
                        <div className="pb-span-4 space-y-1">
                          <div className="micro-label">Title</div>
                          <input className={F} value={coForm.title} onChange={co('title')} placeholder="e.g. Add electrical panel upgrade" />
                        </div>
                        <div className="space-y-1">
                          <div className="micro-label">Amount ($)</div>
                          <CurrencyInput value={coForm.amount} onValueChange={v => setCoForm(p => ({ ...p, amount: v }))} placeholder="0.00" className={F} />
                        </div>
                        <div className="space-y-1">
                          <div className="micro-label">Status</div>
                          <select className={F} value={coForm.status} onChange={co('status')}>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <div className="micro-label">Date Requested</div>
                          <DateInput className={F} value={coForm.requested_date} onChange={co('requested_date')} />
                        </div>
                        <div className="space-y-1">
                          <div className="micro-label">Date Approved</div>
                          <DateInput className={F} value={coForm.approved_date} onChange={co('approved_date')} />
                        </div>
                        <div className="pb-span-4 space-y-1">
                          <div className="micro-label">Approval Method</div>
                          <input className={F} value={coForm.approval_method} onChange={co('approval_method')} placeholder="e.g. Signed CO, Email, Verbal" />
                        </div>
                      </div>
                      <details className="pb-advanced">
                        <summary>Description and approval notes</summary>
                        <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <div className="micro-label">Description</div>
                            <textarea className={TA} rows={2} value={coForm.description} onChange={co('description')} />
                          </div>
                          <div className="space-y-1">
                            <div className="micro-label">Internal Notes</div>
                            <textarea className={TA} rows={2} value={coForm.internal_notes} onChange={co('internal_notes')} />
                          </div>
                        </div>
                      </details>
                      <div className="flex gap-2 pt-1">
                        <button onClick={saveCO} disabled={savingCO} className={saveBtn}>{savingCO ? 'Saving…' : 'Save'}</button>
                        <button onClick={() => setShowCO(false)} className={cancelBtn}><X className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                    </WorkflowDialog>
                  )}

                  {changeOrders.length === 0 ? (
                    <EmptyState text="No change orders yet." />
                  ) : (
                    <>
                    {/* Mobile card view */}
                    <div className="sm:hidden divide-y divide-border">
                      {changeOrders.map(c => {
                        const signed = CO_SIGN[c.type] * Number(c.amount);
                        const statusColor = c.status === 'approved' ? 'text-emerald-500' : c.status === 'rejected' ? 'text-destructive' : 'text-amber-500';
                        return (
                          <div key={c.id} className="px-4 py-4 pd-row space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-foreground text-sm">{c.title}</div>
                                {c.co_number && <div className="micro-label mt-0.5">{c.co_number}</div>}
                              </div>
                              <div className="flex items-center gap-0.5 shrink-0">
                                <button onClick={() => openEditCO(c)} className={iconBtn}><Edit3 className="w-3.5 h-3.5" /></button>
                                <button onClick={() => deleteCO(c.id)} className={delBtn}><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-secondary border border-border capitalize">{c.type}</span>
                              <span className={`font-mono-tab font-bold text-sm ${signed >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                                {signed >= 0 ? '+' : ''}{fmtUSD(Math.abs(signed))}
                              </span>
                              <span className={`text-[10px] font-bold uppercase ${statusColor} ml-auto`}>{c.status}</span>
                            </div>
                            {c.requested_date && <div className="micro-label">Requested {fmtDate(c.requested_date)}</div>}
                          </div>
                        );
                      })}
                    </div>

                    {/* Desktop table */}
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="w-full text-sm" style={{ minWidth: 560 }}>
                        <thead>
                          <tr className="border-b border-border">
                            {['CO', 'Type', 'Amount', 'Status', 'Requested', ''].map(h => (
                              <th key={h} className={`px-4 py-2.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-medium ${h === 'Amount' ? 'text-right' : 'text-left'}`}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {changeOrders.map(c => {
                            const signed = CO_SIGN[c.type] * Number(c.amount);
                            const statusColor = c.status === 'approved' ? 'text-emerald-500' : c.status === 'rejected' ? 'text-destructive' : 'text-amber-500';
                            return (
                              <tr key={c.id} className="border-b border-border pd-row">
                                <td className="px-4 py-3">
                                  <div className="font-medium text-foreground">{c.title}</div>
                                  {c.co_number && <div className="micro-label mt-0.5">{c.co_number}</div>}
                                </td>
                                <td className="px-4 py-3 text-muted-foreground capitalize">{c.type}</td>
                                <td className={`px-4 py-3 text-right font-mono-tab font-semibold ${signed >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                                  {signed >= 0 ? '+' : ''}{fmtUSD(signed)}
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`text-[10px] font-bold uppercase tracking-[0.1em] capitalize ${statusColor}`}>{c.status}</span>
                                </td>
                                <td className="px-4 py-3 text-muted-foreground">{c.requested_date ? fmtDate(c.requested_date) : '—'}</td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-0.5 justify-end">
                                    <button onClick={() => openEditCO(c)} className={iconBtn}><Edit3 className="w-3.5 h-3.5" /></button>
                                    <button onClick={() => deleteCO(c.id)} className={delBtn}><Trash2 className="w-3.5 h-3.5" /></button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                ADD ONS
            ══════════════════════════════════════════════════════════════ */}
            {subTab === 'addons' && (
              <div className="space-y-4">
                <div className="pdv2-card overflow-hidden">
                  <KpiGrid items={[
                    { label: 'Approved Add-Ons', value: fmtUSD(fin.addOnsAdditions) },
                    { label: 'Approved Credits', value: fmtUSD(fin.addOnsCredits) },
                    { label: 'Net Add-Ons',      value: fmtUSD(fin.addOnsNet), accent: true },
                    { label: 'Pending Value',    value: fmtUSD(fin.pendingAddOns), sub: 'awaiting approval' },
                  ]} />
                </div>

                <div className="pdv2-card overflow-hidden">
                  <PanelHeader label={`Add Ons — ${addOns.length}`} />

                  {showAddOn && (
                    <WorkflowDialog
                      open={showAddOn}
                      onOpenChange={setShowAddOn}
                      kicker="Add Ons"
                      title={`${editAddOnId ? 'Edit' : 'New'} Add-On`}
                      description="Log extra-work items and credits outside the formal Change Order process — approved by text/verbal, priced flat or by unit cost × quantity."
                    >
                    <div className="pb-entry-panel space-y-3 border border-border bg-background">
                      <GuidedEntryIntro
                        title={`${editAddOnId ? 'Edit' : 'New'} Add-On`}
                        intent="Capture the line item, how it's priced, and its approval status so it flows into the revised contract total once approved."
                        steps={['Describe item', 'Price it', 'Confirm approval']}
                      />
                      <div className="pb-entry-grid">
                        <div className="pb-span-4 space-y-1">
                          <div className="micro-label">Line Item</div>
                          <input className={F} value={addOnForm.line_item} onChange={aof('line_item')} placeholder="e.g. Door Locks, AC Unit, Flooring Credit" />
                        </div>
                        <div className="space-y-1">
                          <div className="micro-label">Kind</div>
                          <select className={F} value={addOnForm.kind} onChange={aof('kind')}>
                            <option value="addition">Addition</option>
                            <option value="credit">Credit</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <div className="micro-label">Status</div>
                          <select className={F} value={addOnForm.status} onChange={aof('status')}>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <div className="micro-label">Unit Cost ($)</div>
                          <CurrencyInput value={addOnForm.unit_cost} onValueChange={v => setAddOnForm(p => ({ ...p, unit_cost: v }))} placeholder="0.00" className={F} />
                        </div>
                        <div className="space-y-1">
                          <div className="micro-label">Unit Quantity</div>
                          <input type="number" step="any" className={`${F} font-mono-tab`} value={addOnForm.unit_quantity} onChange={aof('unit_quantity')} placeholder="e.g. 2600" />
                        </div>
                        <div className="space-y-1">
                          <div className="micro-label">Unit Label</div>
                          <input className={F} value={addOnForm.unit_label} onChange={aof('unit_label')} placeholder="e.g. Sq Ft, Unit, Linear Ft" />
                        </div>
                        <div className="pb-span-2 space-y-1">
                          <div className="micro-label flex items-center justify-between">
                            <span>Amount ($)</span>
                            <button type="button" onClick={applyUnitMath} className="text-[9px] text-accent hover:opacity-80 font-bold normal-case tracking-normal">
                              = Unit Cost × Qty
                            </button>
                          </div>
                          <CurrencyInput value={addOnForm.amount} onValueChange={v => setAddOnForm(p => ({ ...p, amount: v }))} placeholder="0.00" className={F} />
                        </div>
                        <div className="space-y-1">
                          <div className="micro-label">Approval Method</div>
                          <input className={F} value={addOnForm.approval_method} onChange={aof('approval_method')} placeholder="e.g. Approved via WhatsApp" />
                        </div>
                        <div className="space-y-1">
                          <div className="micro-label">Date Requested</div>
                          <DateInput className={F} value={addOnForm.requested_date} onChange={aof('requested_date')} />
                        </div>
                        <div className="space-y-1">
                          <div className="micro-label">Date Approved</div>
                          <DateInput className={F} value={addOnForm.approved_date} onChange={aof('approved_date')} />
                        </div>
                        <div className="flex items-center gap-2 pt-2">
                          <input type="checkbox" id="ao-cv" checked={addOnForm.client_visible} onChange={e => setAddOnForm(p => ({ ...p, client_visible: e.target.checked }))} className="accent-foreground w-3.5 h-3.5" />
                          <label htmlFor="ao-cv" className="micro-label cursor-pointer">Client Visible</label>
                        </div>
                      </div>
                      <details className="pb-advanced">
                        <summary>Notes and custom fields</summary>
                        <div className="p-3 space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <div className="micro-label">Client Notes</div>
                              <textarea className={TA} rows={2} value={addOnForm.client_visible_notes} onChange={aof('client_visible_notes')} placeholder="e.g. HE to connect and power units." />
                            </div>
                            <div className="space-y-1">
                              <div className="micro-label">Internal Notes</div>
                              <textarea className={TA} rows={2} value={addOnForm.internal_notes} onChange={aof('internal_notes')} />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <div className="micro-label">Custom Fields</div>
                              <button type="button" onClick={addCustomField} className="text-[9px] text-accent hover:opacity-80 font-bold">
                                + Add Field
                              </button>
                            </div>
                            {addOnForm.custom_fields.length === 0 ? (
                              <p className="text-[10px] text-muted-foreground">No custom fields yet — add one for anything that doesn't fit the fields above.</p>
                            ) : (
                              <div className="space-y-1.5">
                                {addOnForm.custom_fields.map((f, i) => (
                                  <div key={i} className="flex gap-1.5">
                                    <input className={F} value={f.key} onChange={e => updateCustomField(i, 'key', e.target.value)} placeholder="Field name" />
                                    <input className={F} value={f.value} onChange={e => updateCustomField(i, 'value', e.target.value)} placeholder="Value" />
                                    <button type="button" onClick={() => removeCustomField(i)} className={delBtn}><X className="w-3.5 h-3.5" /></button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </details>
                      <div className="flex gap-2 pt-1">
                        <button onClick={saveAddOn} disabled={savingAddOn} className={saveBtn}>{savingAddOn ? 'Saving…' : 'Save'}</button>
                        <button onClick={() => setShowAddOn(false)} className={cancelBtn}><X className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                    </WorkflowDialog>
                  )}

                  {addOns.length === 0 ? (
                    <EmptyState text="No add-ons yet." />
                  ) : (
                    <>
                    {/* Mobile card view */}
                    <div className="sm:hidden divide-y divide-border">
                      {addOns.map(a => {
                        const signed = AO_SIGN[a.kind] * Number(a.amount);
                        const statusColor = a.status === 'approved' ? 'text-emerald-500' : a.status === 'rejected' ? 'text-destructive' : 'text-amber-500';
                        return (
                          <div key={a.id} className="px-4 py-4 pd-row space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-foreground text-sm">{a.line_item}</div>
                                {a.unit_cost != null && a.unit_quantity != null && (
                                  <div className="micro-label mt-0.5">{a.unit_quantity} {a.unit_label || 'units'} @ {fmtUSD(a.unit_cost)}</div>
                                )}
                              </div>
                              <div className="flex items-center gap-0.5 shrink-0">
                                <button onClick={() => openEditAddOn(a)} className={iconBtn}><Edit3 className="w-3.5 h-3.5" /></button>
                                <button onClick={() => deleteAddOn(a.id)} className={delBtn}><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-secondary border border-border capitalize">{a.kind}</span>
                              <span className={`font-mono-tab font-bold text-sm ${signed >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                                {signed >= 0 ? '+' : ''}{fmtUSD(Math.abs(signed))}
                              </span>
                              <span className={`text-[10px] font-bold uppercase ${statusColor} ml-auto`}>{a.status}</span>
                            </div>
                            {a.approval_method && <div className="micro-label">{a.approval_method}</div>}
                          </div>
                        );
                      })}
                    </div>

                    {/* Desktop table */}
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="w-full text-sm" style={{ minWidth: 620 }}>
                        <thead>
                          <tr className="border-b border-border">
                            {['Line Item', 'Pricing', 'Amount', 'Status', 'Approval', ''].map(h => (
                              <th key={h} className={`px-4 py-2.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-medium ${h === 'Amount' ? 'text-right' : 'text-left'}`}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {addOns.map(a => {
                            const signed = AO_SIGN[a.kind] * Number(a.amount);
                            const statusColor = a.status === 'approved' ? 'text-emerald-500' : a.status === 'rejected' ? 'text-destructive' : 'text-amber-500';
                            return (
                              <tr key={a.id} className="border-b border-border pd-row">
                                <td className="px-4 py-3">
                                  <div className="font-medium text-foreground">{a.line_item}</div>
                                  <div className="micro-label mt-0.5 capitalize">{a.kind}</div>
                                </td>
                                <td className="px-4 py-3 text-muted-foreground">
                                  {a.unit_cost != null && a.unit_quantity != null ? `${a.unit_quantity} ${a.unit_label || 'units'} @ ${fmtUSD(a.unit_cost)}` : '—'}
                                </td>
                                <td className={`px-4 py-3 text-right font-mono-tab font-semibold ${signed >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                                  {signed >= 0 ? '+' : ''}{fmtUSD(signed)}
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`text-[10px] font-bold uppercase tracking-[0.1em] capitalize ${statusColor}`}>{a.status}</span>
                                </td>
                                <td className="px-4 py-3 text-muted-foreground">{a.approval_method || '—'}</td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-0.5 justify-end">
                                    <button onClick={() => openEditAddOn(a)} className={iconBtn}><Edit3 className="w-3.5 h-3.5" /></button>
                                    <button onClick={() => deleteAddOn(a.id)} className={delBtn}><Trash2 className="w-3.5 h-3.5" /></button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                PAYMENTS RECEIVED
            ══════════════════════════════════════════════════════════════ */}
            {subTab === 'payments' && (
              <ProjectTransactionLedger
                kind="income"
                projectId={projectId!}
                transactions={enriched?.incomeList ?? []}
                scopeItems={scopeItems.map(s => ({ id: s.id, name: s.name }))}
                autoOpenLog={autoOpenLog === 'income'}
                onAutoOpenLogHandled={() => setAutoOpenLog(null)}
              />
            )}

            {/* ══════════════════════════════════════════════════════════════
                PROJECT EXPENSES
            ══════════════════════════════════════════════════════════════ */}
            {subTab === 'expenses' && (
              <ProjectTransactionLedger
                kind="expense"
                projectId={projectId!}
                transactions={enriched?.expenseList ?? []}
                scopeItems={scopeItems.map(s => ({ id: s.id, name: s.name }))}
                autoOpenLog={autoOpenLog === 'expense'}
                onAutoOpenLogHandled={() => setAutoOpenLog(null)}
              />
            )}

            {/* ══════════════════════════════════════════════════════════════
                RECONCILIATION
            ══════════════════════════════════════════════════════════════ */}
            {subTab === 'reconciliation' && (
              <div className="space-y-4">
                <div className="pdv2-card overflow-hidden">
                  <KpiGrid items={[
                    { label: 'Revised Contract', value: fmtUSD(fin.revised), accent: true },
                    { label: 'Total Earned',     value: fmtUSD(fin.earned), sub: `${fin.pctDone.toFixed(1)}% complete` },
                    { label: 'Total Collected',  value: fmtUSD(fin.paid), sub: `${fin.collectPct.toFixed(1)}% of contract` },
                    { label: 'Balance Remaining', value: fmtUSD(fin.balance) },
                  ]} />
                </div>

                {/* Waterfall */}
                <div className="pdv2-card overflow-hidden">
                  <PanelHeader label="Contract Reconciliation" />
                  <div className="divide-y divide-border">
                    {([
                      { label: 'Original Contract Value',        value: fin.originalContractValue, indent: false, bold: false },
                      { label: 'Schedule of Values Allocated',   value: fin.sovAllocated,           indent: true,  bold: false,
                        sub: `${fin.sovCoveragePct.toFixed(1)}% of contract broken into ${scopeItems.length} scope line${scopeItems.length !== 1 ? 's' : ''}` },
                      ...(fin.sovStatus === 'under' ? [{
                        label: 'Unallocated to Schedule of Values', value: fin.sovVariance, indent: true, bold: false, warn: 'amber' as const,
                        sub: 'Not yet broken into scope lines — add SOV items to fully account for the contract.',
                      }] : []),
                      ...(fin.sovStatus === 'over' ? [{
                        label: 'Schedule of Values Exceeds Contract', value: Math.abs(fin.sovVariance), indent: true, bold: false, warn: 'destructive' as const,
                        sub: 'Scope lines total more than the signed contract — review for duplicates or log a change order.',
                      }] : []),
                      { label: '+ Approved CO Additions',        value: fin.additions,             indent: true,  bold: false, sign: '+' },
                      { label: '− Approved CO Credits',          value: fin.credits,               indent: true,  bold: false, sign: '−' },
                      { label: 'Revised Project Total',          value: fin.revised,               indent: false, bold: true },
                      { label: 'Total Work Completed (Earned)',  value: fin.earned,                indent: false, bold: false },
                      { label: '% Completion',                   value: null, pct: fin.pctDone,    indent: true,  bold: false },
                      { label: 'Total Billed to Date',           value: fin.billed,                indent: false, bold: false },
                      { label: 'Unbilled Completed Work',        value: fin.unbilled,              indent: true,  bold: false },
                      { label: 'Remaining to Bill',              value: fin.remainToBill,          indent: true,  bold: false },
                      { label: 'Total Client Payments Received', value: fin.paid,                  indent: false, bold: false },
                      { label: 'Accounts Receivable (AR)',       value: fin.ar,                    indent: true,  bold: false },
                      { label: 'Project Balance Remaining',      value: fin.balance,               indent: false, bold: true, accent: true },
                      { label: 'Collection %',                   value: null, pct: fin.collectPct, indent: true,  bold: false },
                    ] as any[]).map((row, i) => (
                      <div key={i} className={`px-4 sm:px-5 py-3 ${row.indent ? 'pl-8 sm:pl-10 bg-secondary/20' : ''}`}>
                        <div className="flex items-center justify-between gap-3">
                          <span className={`text-sm ${
                            row.warn === 'amber' ? 'font-semibold text-amber-600 dark:text-amber-400'
                            : row.warn === 'destructive' ? 'font-semibold text-destructive'
                            : row.bold ? 'font-semibold text-foreground' : 'text-muted-foreground'
                          }`}>
                            {row.label}
                          </span>
                          {row.value !== undefined && row.value !== null ? (
                            <span className={`font-mono-tab shrink-0 ${row.bold ? 'font-bold text-lg' : 'text-sm'} ${
                              row.warn === 'amber' ? 'text-amber-600 dark:text-amber-400 font-semibold'
                              : row.warn === 'destructive' ? 'text-destructive font-semibold'
                              : row.accent ? 'text-accent' : 'text-foreground'
                            }`}>
                              {row.sign ? `${row.sign} ` : ''}{fmtUSD(Math.abs(row.value))}
                            </span>
                          ) : (
                            <span className="font-mono-tab text-sm text-foreground shrink-0">{row.pct?.toFixed(1)}%</span>
                          )}
                        </div>
                        {row.sub && <div className="text-[10.5px] text-muted-foreground mt-1">{row.sub}</div>}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Per-SOV breakdown */}
                {scopeItems.length > 0 && (
                  <div className="pdv2-card overflow-hidden">
                    <PanelHeader label="Per-Line Reconciliation" />
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm" style={{ minWidth: 620 }}>
                        <thead>
                          <tr className="border-b border-border">
                            {['Line Item', 'Revised', 'Earned', 'Billed', 'Collected', 'Balance'].map(h => (
                              <th key={h} className={`px-4 py-2.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-medium ${h === 'Line Item' ? 'text-left' : 'text-right'}`}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {scopeItems.map(item => {
                            const rev  = Number(item.contract_amount) + Number(item.change_order_amount) - Number(item.approved_credit_amount || 0);
                            const earn = rev * Number(item.percent_complete) / 100;
                            const paid = incomeByScope[item.id] || 0;
                            const bal  = rev - paid;
                            return (
                              <tr key={item.id} className="border-b border-border pd-row">
                                <td className="px-4 py-3 text-foreground">{item.name}</td>
                                <td className="px-4 py-3 text-right font-mono-tab text-muted-foreground">{fmtUSD(rev)}</td>
                                <td className="px-4 py-3 text-right font-mono-tab text-accent font-semibold">{fmtUSD(earn)}</td>
                                <td className="px-4 py-3 text-right font-mono-tab text-muted-foreground">{fmtUSD(Number(item.total_billed))}</td>
                                <td className="px-4 py-3 text-right font-mono-tab text-emerald-600 dark:text-emerald-400 font-semibold">{fmtUSD(paid)}</td>
                                <td className="px-4 py-3 text-right font-mono-tab text-foreground font-bold">{fmtUSD(bal)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-border">
                            <td className="px-4 py-3 text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-bold">Totals</td>
                            <td className="px-4 py-3 text-right font-mono-tab font-bold text-foreground">{fmtUSD(fin.sovRevisedTotal)}</td>
                            <td className="px-4 py-3 text-right font-mono-tab font-bold text-accent">{fmtUSD(fin.earned)}</td>
                            <td className="px-4 py-3 text-right font-mono-tab font-bold text-muted-foreground">{fmtUSD(fin.sovBilledTotal)}</td>
                            <td className="px-4 py-3 text-right font-mono-tab font-bold text-emerald-600 dark:text-emerald-400">{fmtUSD(sovCollectedTotal)}</td>
                            <td className="px-4 py-3 text-right font-mono-tab font-bold text-foreground">{fmtUSD(sovBalanceTotal)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                NOTES
            ══════════════════════════════════════════════════════════════ */}
            {subTab === 'notes' && (
              <div className="pdv2-card overflow-hidden">
                <PanelHeader
                  label="Project Notes"
                  action={<button onClick={() => setShowNotes(true)} className="text-[10px] text-accent hover:opacity-80 font-bold">Edit Notes</button>}
                />
                <div className="p-4">
                  <div className="border border-border bg-background p-4">
                    <div className="micro-label mb-2">Current Project Narrative</div>
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {notes?.trim() || 'No project notes have been added yet. Use Edit Notes to capture field observations, client decisions, scope context, and internal reconciliation details.'}
                    </p>
                  </div>
                </div>
                <WorkflowDialog
                  open={showNotes}
                  onOpenChange={setShowNotes}
                  kicker="Project Notes"
                  title="Edit Project Notes"
                  description="Capture client context, field observations, scope decisions, and internal reconciliation notes without turning the project page into a spreadsheet."
                >
                  <div className="pb-entry-panel space-y-3 border border-border bg-background">
                    <GuidedEntryIntro
                      title="Project Notes"
                      intent="Keep concise client context, field observations, scope decisions, and internal reconciliation notes attached to the project record."
                      steps={['Capture context', 'Confirm accuracy', 'Save record']}
                    />
                    <textarea
                      className={`${TA} min-h-[132px]`}
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Add project notes, field observations, client communications, scope details..."
                    />
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="text-[10px] text-muted-foreground">Saved notes update the project record and remain part of the project operating history.</div>
                      <div className="flex gap-2">
                        <button onClick={saveNotes} disabled={savingNotes} className={saveBtn}>
                          {savingNotes ? 'Saving...' : 'Save Notes'}
                        </button>
                        <button onClick={() => setShowNotes(false)} className={cancelBtn}><X className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  </div>
                </WorkflowDialog>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                AUDIT
            ══════════════════════════════════════════════════════════════ */}
            {subTab === 'audit' && (() => {
              const fmtTs = (iso: string) => {
                const d = new Date(iso);
                return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
              };

              return (
                <div className="pdv2-card overflow-hidden">
                  <PanelHeader label="Record Audit Log" />

                  {/* Summary strip */}
                  {auditEntries.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-7 gap-px bg-border border-b border-border">
                      {[
                        { label: 'SOV Lines',    val: scopeItems.length },
                        { label: 'Milestones',   val: milestones.length },
                        { label: 'Change Orders', val: changeOrders.length },
                        { label: 'Add Ons',      val: addOns.length },
                        { label: 'Draws',        val: draws.length },
                        { label: 'Payments',     val: (enriched?.incomeList ?? []).length },
                        { label: 'Expenses',     val: (enriched?.expenseList ?? []).length },
                      ].map(s => (
                        <div key={s.label} className="bg-secondary/40 px-3 py-2.5 text-center">
                          <div className="font-mono-tab text-base font-bold text-foreground">{s.val}</div>
                          <div className="micro-label mt-0.5">{s.label}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {auditEntries.length === 0 ? (
                    <div className="py-16 text-center space-y-2">
                      <History className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                      <p className="text-sm text-muted-foreground">No records yet.</p>
                      <p className="text-xs text-muted-foreground/60 max-w-xs mx-auto">Add scope items, milestones, change orders, or draw requests to see the audit log.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {auditEntries.map(e => (
                        <div key={e.id} className="pd-row flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-4 py-3">
                          {/* icon + badge */}
                          <div className="flex items-center gap-2 sm:shrink-0">
                            <span className="text-muted-foreground">{e.icon}</span>
                            <span className={`inline-flex items-center px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-sm ${e.badgeBg} sm:w-[80px] sm:justify-center`}>
                              {e.badge}
                            </span>
                          </div>

                          {/* title + subtitle */}
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-foreground leading-tight truncate block">{e.title}</span>
                            {e.subtitle && <span className="text-[11px] text-muted-foreground">{e.subtitle}</span>}
                          </div>

                          {/* value + status + date — stack on mobile, inline on sm+ */}
                          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                            <span className="font-mono-tab text-sm text-foreground font-medium">{e.value}</span>
                            <span className={`text-[10px] font-bold uppercase min-w-[60px] text-right sm:text-center ${e.statusColor}`}>{e.status}</span>
                            <span className="text-[11px] text-muted-foreground/70 font-mono-tab min-w-[80px] text-right hidden sm:block">{fmtTs(e.created_at)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {auditEntries.length > 0 && (
                    <div className="px-4 py-2.5 border-t border-border bg-secondary/30">
                      <p className="text-[10px] text-muted-foreground/60">
                        {auditEntries.length} record{auditEntries.length !== 1 ? 's' : ''} · sorted by created date (newest first)
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}
          </>
        )}
      </div>

      <style>{`.pd-row:hover td,.pd-row:hover{background-color:rgba(157,126,63,0.032)!important;}`}</style>
    </div>
  );
}
