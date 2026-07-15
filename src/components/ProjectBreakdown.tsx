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
  Layers, TrendingUp, Receipt, Calendar, History,
  ClipboardCheck, FileSpreadsheet, CreditCard, MessageSquare, ShieldCheck,
} from 'lucide-react';
import { CurrencyInput } from '@/components/ui/currency-input';
import { DateInput } from '@/components/ui/date-input';
import { generateProjectReconciliationReport, savePDF } from '@/lib/reports';

/* ── Types ─────────────────────────────────────────────────────────────────── */
type SubTab = 'overview' | 'sov' | 'milestones' | 'draws' | 'cos' | 'payments' | 'reconciliation' | 'notes' | 'audit';

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

/* ── Constants ─────────────────────────────────────────────────────────────── */
const SUB_TABS: { key: SubTab; label: string; short: string; desc: string; icon: any; group: string }[] = [
  { key: 'overview',       label: 'Reconciliation Summary', short: 'Summary', desc: 'Contract, billing, balance', icon: ShieldCheck, group: 'Control' },
  { key: 'sov',            label: 'Scope / SOV', short: 'SOV', desc: 'Line-item scope values', icon: FileSpreadsheet, group: 'Scope' },
  { key: 'milestones',     label: 'Milestones', short: 'Milestones', desc: 'Schedule and progress', icon: ClipboardCheck, group: 'Scope' },
  { key: 'draws',          label: 'Draws & Billing', short: 'Draws', desc: 'Funding and billing dates', icon: Calendar, group: 'Money' },
  { key: 'cos',            label: 'Change Orders', short: 'COs', desc: 'Additions, credits, approvals', icon: TrendingUp, group: 'Money' },
  { key: 'payments',       label: 'Payments', short: 'Payments', desc: 'Client receipts and collections', icon: CreditCard, group: 'Money' },
  { key: 'reconciliation', label: 'Reconciliation', short: 'Reconcile', desc: 'Per-line over/under status', icon: Layers, group: 'Control' },
  { key: 'notes',          label: 'Notes', short: 'Notes', desc: 'Client and internal notes', icon: MessageSquare, group: 'Records' },
  { key: 'audit',          label: 'Audit', short: 'Audit', desc: 'System activity log', icon: History, group: 'Records' },
];

const PB_CSS = `
.pb-shell{background:linear-gradient(180deg,hsl(var(--secondary)/0.18),transparent 190px);}
.pb-nav-card{background:hsl(var(--background));border:1px solid hsl(var(--border));box-shadow:0 1px 3px rgba(10,10,10,0.045),0 1px 0 rgba(255,255,255,0.45) inset;transition:transform .16s,border-color .16s,box-shadow .16s,background .16s;}
.pb-nav-card:hover{transform:translateY(-1px);border-color:hsl(var(--foreground)/0.22);box-shadow:0 8px 22px rgba(10,10,10,0.08);}
.pb-nav-active{border-color:rgba(157,126,63,0.52);background:linear-gradient(180deg,rgba(157,126,63,0.105),hsl(var(--background)));}
.pb-panel{background:hsl(var(--background));border:1px solid hsl(var(--border));box-shadow:0 1px 3px rgba(10,10,10,0.05),0 1px 2px rgba(10,10,10,0.03);}
.dark .pb-nav-card,.dark .pb-panel{background:hsl(var(--card));box-shadow:0 1px 4px rgba(0,0,0,0.28),0 1px 0 rgba(255,255,255,0.05) inset;}
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

/* ── Blank form defaults ───────────────────────────────────────────────────── */
const blankSOV  = () => ({ name: '', cost_code: '', category: '', description: '', contract_amount: '', change_order_amount: '0', approved_credit_amount: '0', percent_complete: '0', total_billed: '0', payment_status: 'not_billed', work_status: 'not_started', notes: '', internal_notes: '', client_visible_notes: '' });
const blankCO   = () => ({ co_number: '', title: '', description: '', type: 'addition', amount: '', status: 'pending', requested_date: '', approved_date: '', approval_method: '', client_visible_notes: '', internal_notes: '', notes: '' });
const blankMS   = () => ({ title: '', description: '', planned_start_date: '', planned_completion_date: '', actual_completion_date: '', percent_complete: '0', status: 'not_started', billing_eligible: false, billing_amount: '0', client_visible: true, client_visible_notes: '', internal_notes: '' });
const blankDraw = () => ({ milestone_name: '', draw_amount: '', scheduled_date: '', status: 'pending', notes: '', invoice_number: '', billing_period_start: '', billing_period_end: '' });

/* ── Shared mini-components ────────────────────────────────────────────────── */
function KpiGrid({ items }: { items: { label: string; value: string; sub?: string; accent?: boolean }[] }) {
  return (
    <div className={`grid grid-cols-2 sm:grid-cols-${items.length <= 4 ? items.length : 4} gap-px bg-border`}>
      {items.map(item => (
        <div key={item.label} className="bg-background px-4 sm:px-5 py-3.5">
          <div className="text-[9px] uppercase tracking-[0.18em] font-bold text-muted-foreground mb-1 leading-tight">{item.label}</div>
          <div className={`text-base font-bold font-mono-tab leading-tight ${item.accent ? 'text-accent' : 'text-foreground'}`}>{item.value}</div>
          {item.sub && <div className="text-[10px] text-muted-foreground mt-0.5">{item.sub}</div>}
        </div>
      ))}
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

function PanelHeader({ label, action }: { label: string; action?: React.ReactNode }) {
  return (
    <div className="px-4 py-2.5 border-b border-border bg-secondary/40 flex items-center justify-between">
      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium">{label}</div>
      {action}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="px-4 py-12 text-center text-sm text-muted-foreground">{text}</div>;
}

function GuidedEntryIntro({ title, intent, steps }: { title: string; intent: string; steps: string[] }) {
  return (
    <div className="border border-border bg-background px-3.5 py-3 sm:px-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.16em] text-[#9D7E3F] font-bold">{title}</div>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed max-w-2xl">{intent}</p>
        </div>
        <div className="grid grid-cols-3 gap-1.5 sm:min-w-[300px]">
          {steps.map((step, index) => (
            <div key={step} className="border border-border bg-secondary/30 px-2.5 py-2">
              <div className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground font-bold">Step {index + 1}</div>
              <div className="text-[11px] font-semibold text-foreground leading-snug mt-0.5">{step}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════════════ */
export default function ProjectBreakdown({ project, enriched }: { project: any; enriched: any }) {
  const { user } = useAuth();
  const { entity } = useEntity();
  const entityId  = entity?.id ?? 'houston-enterprise';
  const projectId = project?.id;

  /* ── navigation ──────────────────────────────────────────────────────────── */
  const [subTab, setSubTab] = useState<SubTab>('overview');

  /* ── data ────────────────────────────────────────────────────────────────── */
  const [scopeItems,   setScopeItems]   = useState<ScopeItem[]>([]);
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([]);
  const [milestones,   setMilestones]   = useState<Milestone[]>([]);
  const [draws,        setDraws]        = useState<DrawSchedule[]>([]);
  const [loading,      setLoading]      = useState(true);

  /* ── notes ───────────────────────────────────────────────────────────────── */
  const [notes,       setNotes]       = useState<string>(project?.notes ?? '');
  const [savingNotes, setSavingNotes] = useState(false);

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

  /* ── load ────────────────────────────────────────────────────────────────── */
  const load = async () => {
    if (!projectId) return;
    setLoading(true);
    const [s, c, m, d] = await Promise.all([
      (supabase as any).from('project_scope_items').select('*').eq('project_id', projectId).order('sort_order'),
      (supabase as any).from('project_change_orders').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
      (supabase as any).from('project_milestones').select('*').eq('project_id', projectId).order('sort_order'),
      (supabase as any).from('draw_schedules').select('*').eq('project_id', projectId).order('scheduled_date'),
    ]);
    setScopeItems((s.data ?? []) as ScopeItem[]);
    setChangeOrders((c.data ?? []) as ChangeOrder[]);
    setMilestones((m.data ?? []) as Milestone[]);
    setDraws((d.data ?? []) as DrawSchedule[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, [projectId]);

  /* ── calculation engine ──────────────────────────────────────────────────── */
  const fin = useMemo(() => {
    const originalContractValue = scopeItems.reduce((s, i) => s + Number(i.contract_amount), 0);
    const approvd    = changeOrders.filter(co => co.status === 'approved');
    const additions  = approvd.filter(co => co.type === 'addition' || co.type === 'allowance').reduce((s, co) => s + Number(co.amount), 0);
    const credits    = approvd.filter(co => co.type === 'deduction' || co.type === 'credit').reduce((s, co) => s + Number(co.amount), 0);
    const net        = additions - credits;
    const revised    = originalContractValue + net;
    const earned     = scopeItems.reduce((s, i) => {
      const r = Number(i.contract_amount) + Number(i.change_order_amount) - Number(i.approved_credit_amount || 0);
      return s + (r * Number(i.percent_complete) / 100);
    }, 0);
    const pctDone    = revised > 0 ? Math.min(100, earned / revised * 100) : 0;
    const billed     = draws.filter(d => d.status === 'funded').reduce((s, d) => s + Number(d.draw_amount), 0);
    const paid       = (enriched?.incomeList ?? []).reduce((s: number, t: any) => s + Number(t.amount), 0);
    const pending    = changeOrders.filter(co => co.status === 'pending').reduce((s, co) => s + Number(co.amount), 0);
    return {
      originalContractValue, additions, credits, net, revised, earned, pctDone,
      billed, paid,
      ar:            billed - paid,
      unbilled:      earned - billed,
      remainToBill:  revised - billed,
      balance:       revised - paid,
      collectPct:    revised > 0 ? Math.min(100, paid / revised * 100) : 0,
      billedPct:     revised > 0 ? Math.min(100, billed / revised * 100) : 0,
      pendingCOs:    pending,
    };
  }, [scopeItems, changeOrders, draws, enriched?.incomeList]);

  const exportReconciliationPDF = () => {
    const doc = generateProjectReconciliationReport({
      project,
      scopeItems,
      changeOrders,
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

  /* ── CRUD helpers ────────────────────────────────────────────────────────── */
  const sov  = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setSovForm(p => ({ ...p, [k]: e.target.value }));
  const co   = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setCoForm(p => ({ ...p, [k]: e.target.value }));
  const ms   = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setMsForm(p => ({ ...p, [k]: e.target.value }));
  const dr   = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setDrawForm(p => ({ ...p, [k]: e.target.value }));
  const dbError = (label: string, error: any) => {
    console.error(label, error);
    toast.error(label, {
      description: error?.message || error?.details || 'The database rejected this save. Confirm the latest repair migration is applied.',
    });
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
  const saveDraw = async () => {
    if (!drawForm.milestone_name.trim()) return toast.error('Draw name is required');
    if (!projectId) return toast.error('Open an active project before saving');
    setSavingDraw(true);
    try {
      const p = { project_id: projectId, milestone_name: drawForm.milestone_name.trim(), draw_amount: parseFloat(drawForm.draw_amount) || 0, scheduled_date: drawForm.scheduled_date || null, status: drawForm.status, notes: drawForm.notes || null, invoice_number: drawForm.invoice_number || null, billing_period_start: drawForm.billing_period_start || null, billing_period_end: drawForm.billing_period_end || null };
      const { error } = editDrawId ? await (supabase as any).from('draw_schedules').update(p).eq('id', editDrawId) : await (supabase as any).from('draw_schedules').insert(p);
      if (error) dbError('Draw request save failed', error); else { toast.success(editDrawId ? 'Draw request updated' : 'Draw request added'); setShowDraw(false); await load(); }
    } finally {
      setSavingDraw(false);
    }
  };
  const deleteDraw = async (id: string) => { if (!confirm('Delete this draw?')) return; await (supabase as any).from('draw_schedules').delete().eq('id', id); toast.success('Deleted'); load(); };

  /* Notes */
  const saveNotes = async () => {
    if (!projectId) return toast.error('Open an active project before saving notes');
    setSavingNotes(true);
    try {
      const { error } = await (supabase as any).from('projects').update({ notes }).eq('id', projectId);
      if (error) dbError('Project notes save failed', error);
      else toast.success('Notes saved');
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

  const activeSubTab = SUB_TABS.find(t => t.key === subTab) ?? SUB_TABS[0];
  const ActiveSubIcon = activeSubTab.icon;
  const contextualAction = (() => {
    if (subTab === 'sov') return { label: 'Add Scope Item', onClick: openAddSOV };
    if (subTab === 'milestones') return { label: 'Add Milestone', onClick: openAddMS };
    if (subTab === 'draws') return { label: 'Add Draw', onClick: openAddDraw };
    if (subTab === 'cos') return { label: 'Add Change Order', onClick: openAddCO };
    if (subTab === 'notes') return { label: savingNotes ? 'Saving Notes...' : 'Save Notes', onClick: saveNotes, disabled: savingNotes };
    return null;
  })();

  return (
    <div className="pb-shell">
      <style>{PB_CSS}</style>
      {/* ── Sub-tab navigation ────────────────────────────────────────────── */}
      <div className="sm:hidden px-4 pt-4 pb-2">
        <div className="relative">
          <select
            value={subTab}
            onChange={e => setSubTab(e.target.value as SubTab)}
            className={`${F} pr-8 appearance-none`}
          >
            {SUB_TABS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      <div className="px-4 sm:px-8 py-3 border-b border-border bg-secondary/20 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[9px] uppercase tracking-[0.24em] text-[#9D7E3F] font-bold">Houston Enterprise Reconciliation</div>
          <div className="flex items-start gap-2.5 mt-1 max-w-3xl">
            <span className="hidden sm:flex w-7 h-7 border border-border bg-background items-center justify-center shrink-0">
              <ActiveSubIcon className="w-3.5 h-3.5" strokeWidth={1.7} style={{ color: '#9D7E3F' }} />
            </span>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-foreground">{activeSubTab.label}</div>
              <div className="text-[10px] text-muted-foreground leading-snug">{activeSubTab.desc}</div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
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
      </div>

      <div className="hidden sm:block px-4 sm:px-8 py-2.5 border-b border-border">
        <div className="flex overflow-x-auto gap-1.5 pb-0.5">
          {SUB_TABS.map(t => {
            const Icon = t.icon;
            const active = subTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setSubTab(t.key)}
                className={`h-9 px-3 border text-[9px] uppercase tracking-[0.14em] font-bold flex items-center gap-2 whitespace-nowrap transition-all ${
                  active ? 'border-foreground bg-foreground text-background' : 'border-border text-muted-foreground hover:text-foreground hover:bg-secondary/45'
                }`}
              >
                <Icon className="w-3.5 h-3.5" strokeWidth={1.7} />
                {t.short}
              </button>
            );
          })}
        </div>
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
            {subTab === 'overview' && (
              <div className="space-y-5">
                {/* KPIs row 1 */}
                <div className="border border-border">
                  <KpiGrid items={[
                    { label: 'Original Contract',  value: fmtUSD(fin.originalContractValue) },
                    { label: 'Net Change Orders',  value: fmtUSD(fin.net), sub: fin.net >= 0 ? 'net addition' : 'net credit' },
                    { label: 'Revised Total',      value: fmtUSD(fin.revised), accent: true },
                    { label: 'Pending COs',        value: fmtUSD(fin.pendingCOs), sub: 'awaiting approval' },
                  ]} />
                </div>
                {/* KPIs row 2 */}
                <div className="border border-border">
                  <KpiGrid items={[
                    { label: 'Total Billed',       value: fmtUSD(fin.billed),   sub: `${fin.billedPct.toFixed(1)}% of contract` },
                    { label: 'Payments Received',  value: fmtUSD(fin.paid),     sub: `${fin.collectPct.toFixed(1)}% collected` },
                    { label: 'Accounts Receivable', value: fmtUSD(fin.ar),      sub: fin.ar > 0 ? 'billed, unpaid' : 'fully collected' },
                    { label: 'Balance Remaining',  value: fmtUSD(fin.balance),  accent: true },
                  ]} />
                </div>

                {/* Progress section */}
                <div className="border border-border">
                  <PanelHeader label="Project Progress" />
                  <div className="p-5 space-y-4">
                    {[
                      { label: 'Work Completed',  pct: fin.pctDone,      value: fin.earned,  hex: '#3b82f6' },
                      { label: 'Billed to Date',  pct: fin.billedPct,    value: fin.billed,  hex: '#f59e0b' },
                      { label: 'Collected',        pct: fin.collectPct,   value: fin.paid,    hex: '#10b981' },
                    ].map(row => (
                      <div key={row.label}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="micro-label">{row.label}</span>
                          <span className="text-xs font-mono-tab text-muted-foreground">
                            {fmtUSD(row.value)} · {row.pct.toFixed(1)}%
                          </span>
                        </div>
                        <Bar value={row.value} max={fin.revised} hex={row.hex} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* SOV quick summary */}
                {scopeItems.length > 0 && (
                  <div className="border border-border">
                    <PanelHeader
                      label={`Scope Items — ${scopeItems.length} Line${scopeItems.length !== 1 ? 's' : ''}`}
                      action={
                        <button onClick={() => setSubTab('sov')} className="text-[10px] text-accent hover:opacity-80 font-bold">
                          View All →
                        </button>
                      }
                    />
                    <div className="divide-y divide-border">
                      {scopeItems.slice(0, 6).map(item => {
                        const revised = Number(item.contract_amount) + Number(item.change_order_amount) - Number(item.approved_credit_amount || 0);
                        return (
                          <div key={item.id} className="px-4 py-3 flex items-center gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-foreground truncate">{item.name}</div>
                              {item.category && <div className="micro-label mt-0.5">{item.category}</div>}
                            </div>
                            <div className="w-20 hidden sm:block">
                              <Bar value={item.percent_complete} max={100} hex="#9D7E3F" />
                              <div className="micro-label text-right mt-1">{item.percent_complete}%</div>
                            </div>
                            <div className="text-sm font-mono-tab text-foreground text-right shrink-0">{fmtUSD(revised)}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Milestone chips */}
                {milestones.length > 0 && (
                  <div className="border border-border">
                    <PanelHeader label={`Milestones — ${milestones.length}`} action={<button onClick={() => setSubTab('milestones')} className="text-[10px] text-accent hover:opacity-80 font-bold">View All →</button>} />
                    <div className="p-4 flex flex-wrap gap-2">
                      {milestones.map(m => {
                        const meta = MS_STATUS[m.status] ?? MS_STATUS.not_started;
                        return (
                          <div key={m.id} className="flex items-center gap-1.5 px-2.5 py-1 border border-border text-[10px] font-medium">
                            <span className={meta.color}>●</span>
                            <span className="text-foreground">{m.title}</span>
                            <span className="text-muted-foreground">{m.percent_complete}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                SCOPE / SCHEDULE OF VALUES
            ══════════════════════════════════════════════════════════════ */}
            {subTab === 'sov' && (
              <div className="space-y-5">
                <div className="border border-border">
                  <KpiGrid items={[
                    { label: 'Original Contract', value: fmtUSD(fin.originalContractValue) },
                    { label: 'Revised Total',     value: fmtUSD(fin.revised), accent: true },
                    { label: 'Total Earned',      value: fmtUSD(fin.earned), sub: `${fin.pctDone.toFixed(1)}% complete` },
                    { label: 'Remaining to Bill', value: fmtUSD(fin.remainToBill) },
                  ]} />
                </div>

	                <div className="border border-border">
	                  <PanelHeader
	                    label={`Schedule of Values — ${scopeItems.length} Line Item${scopeItems.length !== 1 ? 's' : ''}`}
	                  />

                  {/* Inline form */}
                  {showSOV && (
                    <div className="p-5 border-b border-border bg-secondary/20 space-y-4">
                      <GuidedEntryIntro
                        title={`${editSOVId ? 'Edit' : 'New'} Scope Item`}
                        intent="Create a clean SOV line that ties scope, cost code, contract value, billing progress, and internal notes into one finance-ready record."
                        steps={['Identify scope', 'Set value', 'Track billing']}
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="sm:col-span-2 space-y-1">
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
                        <div className="sm:col-span-2 space-y-1">
                          <div className="micro-label">Client Notes</div>
                          <textarea className={TA} rows={2} value={sovForm.client_visible_notes} onChange={sov('client_visible_notes')} />
                        </div>
                        <div className="sm:col-span-2 space-y-1">
                          <div className="micro-label">Internal Notes</div>
                          <textarea className={TA} rows={2} value={sovForm.internal_notes} onChange={sov('internal_notes')} />
                        </div>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button onClick={saveSOV} disabled={savingSOV} className={saveBtn}>{savingSOV ? 'Saving…' : 'Save'}</button>
                        <button onClick={() => setShowSOV(false)} className={cancelBtn}><X className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
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
                        <span className="font-mono-tab text-sm font-bold text-foreground">{fmtUSD(fin.revised)}</span>
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
                            <td className="px-4 py-3 text-right font-mono-tab text-muted-foreground font-semibold">{fmtUSD(fin.originalContractValue)}</td>
                            <td className="px-4 py-3 text-right font-mono-tab text-foreground font-bold">{fmtUSD(fin.revised)}</td>
                            <td className="px-4 py-3 text-right font-mono-tab text-foreground">{fin.pctDone.toFixed(1)}%</td>
                            <td className="px-4 py-3 text-right font-mono-tab text-accent font-bold">{fmtUSD(fin.earned)}</td>
                            <td className="px-4 py-3 text-right font-mono-tab text-muted-foreground font-semibold">{fmtUSD(fin.billed)}</td>
                            <td className="px-4 py-3 text-right font-mono-tab text-foreground font-bold">{fmtUSD(fin.remainToBill)}</td>
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
	              <div className="border border-border">
	                <PanelHeader
	                  label={`Milestones — ${milestones.length}`}
	                />

                {showMS && (
                  <div className="p-5 border-b border-border bg-secondary/20 space-y-4">
                    <GuidedEntryIntro
                      title={`${editMSId ? 'Edit' : 'New'} Milestone`}
                      intent="Capture the work marker, schedule target, completion status, and billing eligibility so project progress and draw timing stay aligned."
                      steps={['Name marker', 'Schedule dates', 'Billing rules']}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2 space-y-1">
                        <div className="micro-label">Title</div>
                        <input className={F} value={msForm.title} onChange={ms('title')} placeholder="e.g. Foundation Complete" />
                      </div>
                      <div className="sm:col-span-2 space-y-1">
                        <div className="micro-label">Description</div>
                        <textarea className={TA} rows={2} value={msForm.description} onChange={ms('description')} />
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
                      <div className="sm:col-span-2 space-y-1">
                        <div className="micro-label">Internal Notes</div>
                        <textarea className={TA} rows={2} value={msForm.internal_notes} onChange={ms('internal_notes')} />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button onClick={saveMS} disabled={savingMS} className={saveBtn}>{savingMS ? 'Saving…' : 'Save'}</button>
                      <button onClick={() => setShowMS(false)} className={cancelBtn}><X className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
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
            )}

            {/* ══════════════════════════════════════════════════════════════
                DRAWS & BILLING
            ══════════════════════════════════════════════════════════════ */}
            {subTab === 'draws' && (
              <div className="space-y-5">
                <div className="border border-border">
                  <KpiGrid items={[
                    { label: 'Total Draw Requests', value: fmtUSD(draws.reduce((s, d) => s + Number(d.draw_amount), 0)) },
                    { label: 'Funded',               value: fmtUSD(fin.billed), sub: `${draws.filter(d => d.status === 'funded').length} funded`, accent: true },
                    { label: 'Remaining to Bill',    value: fmtUSD(fin.remainToBill) },
                    { label: 'Unbilled Earned Work', value: fmtUSD(fin.unbilled) },
                  ]} />
                </div>

	                <div className="border border-border">
	                  <PanelHeader
	                    label={`Draw Schedule — ${draws.length} Request${draws.length !== 1 ? 's' : ''}`}
	                  />

                  {showDraw && (
                    <div className="p-5 border-b border-border bg-secondary/20 space-y-4">
                      <GuidedEntryIntro
                        title={`${editDrawId ? 'Edit' : 'New'} Draw Request`}
                        intent="Log the draw request with invoice details, billing window, scheduled date, and funded status for reconciliation and portfolio reporting."
                        steps={['Name draw', 'Attach invoice', 'Confirm status']}
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="sm:col-span-2 space-y-1">
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
                        <div className="sm:col-span-2 space-y-1">
                          <div className="micro-label">Notes</div>
                          <textarea className={TA} rows={2} value={drawForm.notes} onChange={dr('notes')} />
                        </div>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button onClick={saveDraw} disabled={savingDraw} className={saveBtn}>{savingDraw ? 'Saving…' : 'Save'}</button>
                        <button onClick={() => setShowDraw(false)} className={cancelBtn}><X className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
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
              <div className="space-y-5">
                <div className="border border-border">
                  <KpiGrid items={[
                    { label: 'Approved Additions', value: fmtUSD(fin.additions) },
                    { label: 'Approved Credits',   value: fmtUSD(fin.credits) },
                    { label: 'Net Change Orders',  value: fmtUSD(fin.net), accent: true },
                    { label: 'Pending Value',      value: fmtUSD(fin.pendingCOs), sub: 'awaiting approval' },
                  ]} />
                </div>

	                <div className="border border-border">
	                  <PanelHeader
	                    label={`Change Orders — ${changeOrders.length}`}
	                  />

                  {showCO && (
                    <div className="p-5 border-b border-border bg-secondary/20 space-y-4">
                      <GuidedEntryIntro
                        title={`${editCOId ? 'Edit' : 'New'} Change Order`}
                        intent="Record additions, deductions, credits, and allowances with approval timing so revised contract value remains defensible."
                        steps={['Classify CO', 'Set amount', 'Document approval']}
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                        <div className="sm:col-span-2 space-y-1">
                          <div className="micro-label">Title</div>
                          <input className={F} value={coForm.title} onChange={co('title')} placeholder="e.g. Add electrical panel upgrade" />
                        </div>
                        <div className="sm:col-span-2 space-y-1">
                          <div className="micro-label">Description</div>
                          <textarea className={TA} rows={2} value={coForm.description} onChange={co('description')} />
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
                        <div className="sm:col-span-2 space-y-1">
                          <div className="micro-label">Approval Method</div>
                          <input className={F} value={coForm.approval_method} onChange={co('approval_method')} placeholder="e.g. Signed CO, Email, Verbal" />
                        </div>
                        <div className="sm:col-span-2 space-y-1">
                          <div className="micro-label">Internal Notes</div>
                          <textarea className={TA} rows={2} value={coForm.internal_notes} onChange={co('internal_notes')} />
                        </div>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button onClick={saveCO} disabled={savingCO} className={saveBtn}>{savingCO ? 'Saving…' : 'Save'}</button>
                        <button onClick={() => setShowCO(false)} className={cancelBtn}><X className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
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
                PAYMENTS RECEIVED
            ══════════════════════════════════════════════════════════════ */}
            {subTab === 'payments' && (
              <div className="space-y-5">
                <div className="border border-border">
                  <KpiGrid items={[
                    { label: 'Total Received',    value: fmtUSD(fin.paid), accent: true },
                    { label: 'Accounts Receivable', value: fmtUSD(fin.ar), sub: fin.ar > 0 ? 'billed, not yet collected' : 'fully collected' },
                    { label: 'Balance Remaining', value: fmtUSD(fin.balance), sub: `${fin.collectPct.toFixed(1)}% of contract collected` },
                  ]} />
                </div>

                <div className="border border-border">
                  <PanelHeader label={`Client Payments — ${(enriched?.incomeList ?? []).length} Record${(enriched?.incomeList ?? []).length !== 1 ? 's' : ''}`} />
                  {(enriched?.incomeList ?? []).length === 0 ? (
                    <EmptyState text="No payments recorded yet. Record client payments through the Income section." />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm" style={{ minWidth: 440 }}>
                        <thead>
                          <tr className="border-b border-border">
                            {['Date', 'Source / Reference', 'SOV Line', 'Amount'].map(h => (
                              <th key={h} className={`px-4 py-2.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-medium ${h === 'Amount' ? 'text-right' : 'text-left'}`}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(enriched.incomeList as any[]).map((t: any) => {
                            const linked = t.scope_item_id ? scopeItems.find(i => i.id === t.scope_item_id) : null;
                            return (
                              <tr key={t.id} className="border-b border-border pd-row">
                                <td className="px-4 py-3 text-muted-foreground font-mono-tab">{fmtDate(t.transaction_date)}</td>
                                <td className="px-4 py-3 text-foreground">{t.source_name || t.description || '—'}</td>
                                <td className="px-4 py-3 text-muted-foreground">{linked?.name ?? '—'}</td>
                                <td className="px-4 py-3 text-right font-mono-tab font-semibold text-emerald-600 dark:text-emerald-400">{fmtUSD(Number(t.amount))}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-border">
                            <td colSpan={3} className="px-4 py-3 text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-bold">Total Received</td>
                            <td className="px-4 py-3 text-right font-mono-tab font-bold text-foreground">{fmtUSD(fin.paid)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                RECONCILIATION
            ══════════════════════════════════════════════════════════════ */}
            {subTab === 'reconciliation' && (
              <div className="space-y-5">
                {/* Waterfall */}
                <div className="border border-border">
                  <PanelHeader label="Contract Reconciliation" />
                  <div className="divide-y divide-border">
                    {[
                      { label: 'Original Contract Value',        value: fin.originalContractValue, indent: false, bold: false },
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
                    ].map((row, i) => (
                      <div key={i} className={`px-4 sm:px-5 py-3 flex items-center justify-between ${row.indent ? 'pl-8 sm:pl-10 bg-secondary/20' : ''}`}>
                        <span className={`text-sm ${row.bold ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>{row.label}</span>
                        {row.value !== undefined && row.value !== null ? (
                          <span className={`font-mono-tab ${row.bold ? 'font-bold text-lg' : 'text-sm'} ${row.accent ? 'text-accent' : row.bold ? 'text-foreground' : 'text-foreground'}`}>
                            {row.sign ? `${row.sign} ` : ''}{fmtUSD(Math.abs(row.value))}
                          </span>
                        ) : (
                          <span className="font-mono-tab text-sm text-foreground">{row.pct?.toFixed(1)}%</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Per-SOV breakdown */}
                {scopeItems.length > 0 && (
                  <div className="border border-border">
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
                            <td className="px-4 py-3 text-right font-mono-tab font-bold text-foreground">{fmtUSD(fin.revised)}</td>
                            <td className="px-4 py-3 text-right font-mono-tab font-bold text-accent">{fmtUSD(fin.earned)}</td>
                            <td className="px-4 py-3 text-right font-mono-tab font-bold text-muted-foreground">{fmtUSD(fin.billed)}</td>
                            <td className="px-4 py-3 text-right font-mono-tab font-bold text-emerald-600 dark:text-emerald-400">{fmtUSD(fin.paid)}</td>
                            <td className="px-4 py-3 text-right font-mono-tab font-bold text-foreground">{fmtUSD(fin.balance)}</td>
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
              <div className="border border-border">
                <PanelHeader label="Project Notes" />
                <div className="p-5 space-y-4">
                  <textarea
                    className={`${TA} min-h-[240px]`}
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Add project notes, field observations, client communications, scope details…"
                  />
                  <button onClick={saveNotes} disabled={savingNotes} className={saveBtn}>
                    {savingNotes ? 'Saving…' : 'Save Notes'}
                  </button>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                AUDIT
            ══════════════════════════════════════════════════════════════ */}
            {subTab === 'audit' && (() => {
              type AuditEntry = {
                id: string;
                created_at: string;
                kind: 'sov' | 'milestone' | 'co' | 'draw';
                title: string;
                subtitle: string | null;
                status: string;
                statusColor: string;
                value: string;
                icon: React.ReactNode;
                badge: string;
                badgeBg: string;
              };

              const entries: AuditEntry[] = [
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
              ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

              const fmtTs = (iso: string) => {
                const d = new Date(iso);
                return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
              };

              return (
                <div className="border border-border">
                  <PanelHeader label="Record Audit Log" />

                  {/* Summary strip */}
                  {entries.length > 0 && (
                    <div className="grid grid-cols-4 gap-px bg-border border-b border-border">
                      {[
                        { label: 'SOV Lines',    val: scopeItems.length },
                        { label: 'Milestones',   val: milestones.length },
                        { label: 'Change Orders', val: changeOrders.length },
                        { label: 'Draws',        val: draws.length },
                      ].map(s => (
                        <div key={s.label} className="bg-secondary/40 px-3 py-2.5 text-center">
                          <div className="font-mono-tab text-base font-bold text-foreground">{s.val}</div>
                          <div className="micro-label mt-0.5">{s.label}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {entries.length === 0 ? (
                    <div className="py-16 text-center space-y-2">
                      <History className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                      <p className="text-sm text-muted-foreground">No records yet.</p>
                      <p className="text-xs text-muted-foreground/60 max-w-xs mx-auto">Add scope items, milestones, change orders, or draw requests to see the audit log.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {entries.map(e => (
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

                  {entries.length > 0 && (
                    <div className="px-4 py-2.5 border-t border-border bg-secondary/30">
                      <p className="text-[10px] text-muted-foreground/60">
                        {entries.length} record{entries.length !== 1 ? 's' : ''} · sorted by created date (newest first)
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
