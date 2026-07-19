/* ── Houston Generator Pros · Generator Operations dashboard ─────────────────
   Entity-custom overview replacing the construction dashboard when HGP is the
   selected entity: equipment inventory with unit COGS/margin, model-level
   margin intelligence, maintenance/service agreements with recurring revenue
   and visit scheduling, warranty lifecycle, and revenue split from the shared
   transactions ledger. ── */
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { useChecks, useTransactions, useVendors } from '@/hooks/useFinance';
import {
  useEquipmentUnits, useServiceAgreements, useServiceVisits, useHgpFinanceSummary,
  useEntityOpsUpsert, useEntityOpsSoftDelete, useEntityOpsRealtime,
} from '@/hooks/useEntityOps';
import { fmtDate, fmtUSD, todayLocalDate } from '@/lib/format';
import { toast } from 'sonner';
import {
  Zap, Package, Wrench, CalendarClock, ShieldCheck, TrendingUp,
  Plus, Pencil, Trash2, AlertTriangle, PhoneCall, BookOpen,
  ChevronLeft, ChevronRight, ArrowDownToLine, ArrowUpFromLine, FileText, Users,
  MoreHorizontal, Search, Settings2, Check as CheckIcon, ChevronDown, ChevronUp, CalendarDays,
} from 'lucide-react';
import {
  Area, AreaChart, Bar, BarChart, Cell, ResponsiveContainer,
  Tooltip as RechartsTooltip, XAxis, YAxis,
} from 'recharts';

const HGP_BLUE = '#1B72B5';

const OPS_CSS = `
.hgp-shell{background:linear-gradient(180deg,rgba(27,114,181,0.05),transparent 180px);}
.hgp-panel{background:hsl(var(--background));border:1px solid hsl(var(--border));box-shadow:0 1px 3px rgba(10,10,10,.05),0 1px 0 rgba(255,255,255,.45) inset;}
.hgp-card{background:hsl(var(--background));border:1px solid hsl(var(--border));box-shadow:0 1px 3px rgba(10,10,10,.045);position:relative;overflow:hidden;}
.hgp-card:before{content:"";position:absolute;inset:0 0 auto 0;height:2px;background:var(--accent,#1B72B5);}
.hgp-card-button{display:block;width:100%;text-align:left;transition:box-shadow .18s ease,border-color .18s ease,transform .18s ease;}
.hgp-card-button:hover{box-shadow:0 6px 20px rgba(10,10,10,.08);border-color:hsl(var(--foreground)/.2);transform:translateY(-1px);}
.hgp-k{font-size:8px;text-transform:uppercase;letter-spacing:.18em;font-weight:900;color:hsl(var(--muted-foreground));white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.hgp-v{font-size:17px;line-height:1.05;font-weight:900;margin-top:5px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.hgp-sub{font-size:10px;color:hsl(var(--muted-foreground));margin-top:5px;line-height:1.25;}
.hgp-row{border-bottom:1px solid hsl(var(--border));padding:9px 12px;font-size:12px;}
.hgp-row:hover{background:hsl(var(--secondary)/.35);}
.hgp-primary{height:32px;background:hsl(var(--foreground));color:hsl(var(--background));padding:0 12px;font-size:9px;text-transform:uppercase;letter-spacing:.14em;font-weight:900;display:inline-flex;align-items:center;justify-content:center;gap:6px;}
.hgp-action{height:28px;border:1px solid hsl(var(--border));background:hsl(var(--background));padding:0 8px;font-size:8.5px;text-transform:uppercase;letter-spacing:.12em;font-weight:900;display:inline-flex;align-items:center;gap:5px;}
.hgp-action:hover{background:hsl(var(--secondary)/.55);}
.hgp-field{height:38px;border-radius:0;font-size:12px;}
.hgp-guided{background:linear-gradient(135deg,hsl(var(--background)) 0%,hsl(var(--secondary)/.22) 72%,rgba(27,114,181,.07) 100%);border:1px solid hsl(var(--border));box-shadow:0 1px 3px rgba(10,10,10,.05),0 1px 0 rgba(255,255,255,.45) inset;}
.hgp-guided-card{background:hsl(var(--background));border:1px solid hsl(var(--border));box-shadow:0 1px 3px rgba(10,10,10,.05);transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease,background .18s ease;text-align:left;min-height:58px;}
.hgp-guided-card:hover{transform:translateY(-1px);box-shadow:0 5px 18px rgba(10,10,10,.08);border-color:hsl(var(--foreground)/.2);background:hsl(var(--secondary)/.35);}
.hgp-guided-icon{width:32px;height:32px;display:flex;align-items:center;justify-content:center;border:1px solid rgba(27,114,181,.22);background:rgba(27,114,181,.08);flex-shrink:0;}
.hgp-guided-title{font-size:12px;font-weight:900;letter-spacing:-.01em;color:hsl(var(--foreground));}
.hgp-guided-sub{font-size:9px;line-height:1.35;color:hsl(var(--muted-foreground));margin-top:2px;}
.hgp-flow-strip{display:grid;grid-template-columns:minmax(0,1.15fr) repeat(5,minmax(118px,1fr));gap:8px;align-items:stretch;}
.hgp-flow-intro{border-right:1px solid hsl(var(--border));padding-right:12px;min-width:0;}
.hgp-flow-chip{min-height:52px;background:hsl(var(--background));border:1px solid hsl(var(--border));box-shadow:0 1px 3px rgba(10,10,10,.045);padding:8px 9px;display:flex;align-items:center;gap:8px;text-align:left;transition:transform .16s,box-shadow .16s,border-color .16s,background .16s;}
.hgp-flow-chip:hover{transform:translateY(-1px);box-shadow:0 6px 18px rgba(10,10,10,.08);border-color:hsl(var(--foreground)/.2);background:hsl(var(--secondary)/.35);}
.hgp-priority-card{position:relative;background:hsl(var(--background));border:1px solid hsl(var(--border));box-shadow:0 1px 3px rgba(10,10,10,.05),0 1px 0 rgba(255,255,255,.45) inset;min-width:0;overflow:hidden;transition:border-color .18s,box-shadow .18s,transform .18s;}
.hgp-priority-card:before{content:"";position:absolute;inset:0;background:linear-gradient(145deg,rgba(27,114,181,0.06),transparent 44%);pointer-events:none;}
.hgp-priority-card:hover{border-color:hsl(var(--foreground)/.2);box-shadow:0 8px 22px rgba(10,10,10,.08);transform:translateY(-1px);}
.hgp-priority-foot{border-top:1px solid hsl(var(--border)/.65);background:hsl(var(--secondary)/.24);}
.hgp-priority-spark{height:42px;width:68px;}
.hgp-page-btn{height:32px;min-width:32px;border:1px solid hsl(var(--border));background:hsl(var(--background));font-size:10px;font-weight:900;}
.hgp-page-btn:hover:not(:disabled){background:hsl(var(--secondary)/.6);border-color:hsl(var(--foreground)/.22);}
.hgp-page-btn:disabled{opacity:.38;cursor:not-allowed;}
.hgp-calendar{grid-template-columns:repeat(7,minmax(88px,1fr));}
.hgp-day{min-height:96px;padding:6px;}
.hgp-visit-chip{display:block;width:100%;text-align:left;font-size:10px;font-weight:850;line-height:1.15;padding:5px 6px;border:1px solid transparent;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.hgp-agenda-card{width:100%;min-height:46px;border:1px solid hsl(var(--border));background:hsl(var(--background));padding:8px 10px;text-align:left;display:flex;align-items:center;gap:9px;transition:background .16s,border-color .16s,transform .16s;}
.hgp-agenda-card:hover{background:hsl(var(--secondary)/.45);border-color:hsl(var(--foreground)/.2);transform:translateY(-1px);}
.hgp-agenda-date{min-width:42px;border-right:1px solid hsl(var(--border));font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10px;font-weight:900;color:hsl(var(--muted-foreground));line-height:1.15;text-transform:uppercase;}
.dark .hgp-panel,.dark .hgp-card,.dark .hgp-action,.dark .hgp-guided,.dark .hgp-guided-card,.dark .hgp-flow-chip{background:hsl(var(--card));box-shadow:0 1px 4px rgba(0,0,0,.28),0 1px 0 rgba(255,255,255,.05) inset;}
.dark .hgp-priority-card{background:hsl(var(--card));}
@media(max-width:1279px){.hgp-flow-strip{grid-template-columns:repeat(3,minmax(0,1fr));}.hgp-flow-intro{grid-column:1/-1;border-right:0;border-bottom:1px solid hsl(var(--border));padding-right:0;padding-bottom:8px;}}
@media(max-width:1024px){.hgp-calendar{grid-template-columns:repeat(7,minmax(74px,1fr));}.hgp-day{min-height:86px}.hgp-visit-chip{font-size:9px;padding:4px 5px}}
@media(max-width:767px){.hgp-v{font-size:14px}.hgp-panel{padding:12px!important}.hgp-calendar-scroll{overflow-x:auto;border:1px solid hsl(var(--border));background:hsl(var(--background));}.hgp-calendar{min-width:620px}.hgp-guided-card{min-height:64px}.hgp-flow-strip{grid-template-columns:1fr 1fr}.hgp-flow-intro{grid-column:1/-1}.hgp-flow-chip{min-height:46px;padding:7px}.hgp-action{min-height:36px}.hgp-page-btn{min-height:36px;min-width:42px}}
`;

const UNIT_STATUS: Record<string, { label: string; color: string }> = {
  in_stock:     { label: 'In Stock',     color: '#0891b2' },
  reserved:     { label: 'Reserved',     color: '#d97706' },
  installed:    { label: 'Installed',    color: '#059669' },
  service_only: { label: 'Service Only', color: '#7c3aed' },
  returned:     { label: 'Returned',     color: '#8A8580' },
};

const AGREEMENT_STATUS: Record<string, { label: string; color: string }> = {
  active:    { label: 'Active',    color: '#059669' },
  paused:    { label: 'Paused',    color: '#d97706' },
  cancelled: { label: 'Cancelled', color: '#8A8580' },
  expired:   { label: 'Expired',   color: '#dc2626' },
};

const num = (v: unknown) => Number(v || 0);
const daysUntil = (d: string | null | undefined) =>
  d ? Math.ceil((new Date(d + 'T12:00:00').getTime() - Date.now()) / 86400000) : null;

const DEFAULT_HGP_KPI_IDS = ['revenue', 'service', 'inventory', 'margin'];

function Metric({ label, value, sub, icon: Icon, color = HGP_BLUE, onClick }: any) {
  const Comp: any = onClick ? 'button' : 'div';
  return (
    <Comp className={`hgp-card p-3 min-w-0 ${onClick ? 'hgp-card-button' : ''}`} style={{ '--accent': color } as any} onClick={onClick}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="hgp-k">{label}</div>
          <div className="hgp-v">{value}</div>
          <div className="hgp-sub">{sub}</div>
        </div>
        <div className="w-8 h-8 border border-border bg-secondary/35 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4" style={{ color }} strokeWidth={1.7} />
        </div>
      </div>
    </Comp>
  );
}

function StatusPill({ meta }: { meta: { label: string; color: string } }) {
  return (
    <span className="inline-flex px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.16em] whitespace-nowrap"
      style={{ backgroundColor: meta.color + '16', color: meta.color }}>
      {meta.label}
    </span>
  );
}

const VISIT_TYPES: Record<string, { label: string; color: string }> = {
  scheduled:  { label: 'Scheduled',  color: '#059669' },
  emergency:  { label: 'Emergency',  color: '#dc2626' },
  repair:     { label: 'Repair',     color: '#d97706' },
  warranty:   { label: 'Warranty',   color: '#7c3aed' },
  inspection: { label: 'Inspection', color: '#0891b2' },
};

const BLANK_UNIT = {
  id: '', model: '', serial_number: '', kw_rating: '', fuel_type: 'natural_gas',
  status: 'in_stock', unit_cost: '', sale_price: '', customer_name: '',
  purchase_date: '', install_date: '', warranty_end: '', permit_number: '', notes: '',
  deposit_amount: '', install_labor_cost: '', inspection_status: '',
  log_po: true, po_vendor_id: '', po_number: '', po_total: '', po_date: todayLocalDate(),
};

const BLANK_VISIT = {
  id: '', agreement_id: '', customer_name: '', visit_date: todayLocalDate(),
  visit_type: 'scheduled', status: 'completed', technician: '', labor_hours: '', revenue: '', cost: '', summary: '',
};

const BLANK_AGREEMENT = {
  id: '', customer_name: '', customer_email: '', plan: 'annual', status: 'active',
  annual_value: '', visits_per_year: '2', emergency_coverage: false,
  start_date: '', next_visit_date: '', notes: '',
};

export default function GeneratorOps() {
  const navigate = useNavigate();
  const { user } = useAuth();
  useEntityOpsRealtime();

  const { data: units = [], isLoading: unitsLoading } = useEquipmentUnits();
  const { data: agreements = [], isLoading: agreementsLoading } = useServiceAgreements();
  const { data: visits = [] } = useServiceVisits();
  const { data: rpcSummary } = useHgpFinanceSummary();
  const { data: income = [] } = useTransactions('income');
  const { data: expenses = [] } = useTransactions('expense');
  const { data: checks = [] } = useChecks();

  const upsertUnit = useEntityOpsUpsert('hgp_equipment_units');
  const deleteUnit = useEntityOpsSoftDelete('hgp_equipment_units');
  const upsertAgreement = useEntityOpsUpsert('hgp_service_agreements');
  const deleteAgreement = useEntityOpsSoftDelete('hgp_service_agreements');
  const upsertVisit = useEntityOpsUpsert('hgp_service_visits');
  const deleteVisit = useEntityOpsSoftDelete('hgp_service_visits');
  const upsertPO = useEntityOpsUpsert('hgp_purchase_orders');
  const { data: vendors = [] } = useVendors();
  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [mobileCalendarOpen, setMobileCalendarOpen] = useState(false);

  const [unitDialog, setUnitDialog] = useState(false);
  const [unitForm, setUnitForm] = useState({ ...BLANK_UNIT });
  const [agreementDialog, setAgreementDialog] = useState(false);
  const [agreementForm, setAgreementForm] = useState({ ...BLANK_AGREEMENT });
  const [visitDialog, setVisitDialog] = useState(false);
  const [visitForm, setVisitForm] = useState({ ...BLANK_VISIT });
  const [showAllGuided, setShowAllGuided] = useState(false);
  const [kpiCustomOpen, setKpiCustomOpen] = useState(false);
  const [selectedKpiIds, setSelectedKpiIds] = useState<string[]>(() => {
    try {
      const saved = window.localStorage.getItem('hgp-ops-kpis');
      const parsed = saved ? JSON.parse(saved) : null;
      return Array.isArray(parsed) && parsed.length ? parsed : DEFAULT_HGP_KPI_IDS;
    } catch {
      return DEFAULT_HGP_KPI_IDS;
    }
  });
  const [unitSearch, setUnitSearch] = useState('');
  const [unitStatus, setUnitStatus] = useState('all');
  const [unitPage, setUnitPage] = useState(1);
  const unitPageSize = 8;

  const stats = useMemo(() => {
    const live = units as any[];
    const onHand = live.filter(u => u.status === 'in_stock' || u.status === 'reserved');
    const installed = live.filter(u => u.status === 'installed');
    const inventoryValue = onHand.reduce((s, u) => s + num(u.unit_cost), 0);
    const depositsHeld = onHand.reduce((s, u) => s + num(u.deposit_amount), 0);
    const sold = installed.filter(u => num(u.sale_price) > 0);
    const soldRevenue = sold.reduce((s, u) => s + num(u.sale_price), 0);
    // True job COGS: equipment cost + install labor, not equipment alone.
    const soldCogs = sold.reduce((s, u) => s + num(u.unit_cost) + num(u.install_labor_cost), 0);
    const avgMarginPct = soldRevenue > 0 ? ((soldRevenue - soldCogs) / soldRevenue) * 100 : 0;

    const active = (agreements as any[]).filter(a => a.status === 'active');
    const arr = active.reduce((s, a) => s + num(a.annual_value), 0);
    const upcoming = active.filter(a => {
      const d = daysUntil(a.next_visit_date);
      return d !== null && d >= 0 && d <= 30;
    });
    const overdueVisits = active.filter(a => {
      const d = daysUntil(a.next_visit_date);
      return d !== null && d < 0;
    });
    const warrantyExpiring = installed.filter(u => {
      const d = daysUntil(u.warranty_end);
      return d !== null && d >= 0 && d <= 90;
    });
    /* Renewal pipeline: active plans ending within 60 days are revenue to
       save; expired-but-active plans need immediate renewal outreach. */
    const renewals = active
      .filter(a => a.end_date)
      .map(a => ({ ...a, endsIn: daysUntil(a.end_date) }))
      .filter(a => a.endsIn !== null && a.endsIn <= 60)
      .sort((a, b) => (a.endsIn ?? 0) - (b.endsIn ?? 0));
    const renewalValue = renewals.reduce((s, a) => s + num(a.annual_value), 0);

    /* Contracted service revenue: each active agreement's annual value
       prorated over the coverage days that fall inside the horizon (capped
       at the agreement's end date when one is set) — contracted dollars,
       not a projection of renewals. */
    const contractedOver = (horizonDays: number) =>
      active.reduce((s, a) => {
        const coverage = a.end_date != null
          ? Math.min(horizonDays, Math.max(daysUntil(a.end_date) ?? 0, 0))
          : horizonDays;
        return s + num(a.annual_value) * (coverage / 365);
      }, 0);
    const contracted90 = contractedOver(90);
    const contracted180 = contractedOver(180);
    const contracted365 = contractedOver(365);

    /* Prefer the server-side rollup (get_hgp_finance_summary, migration
       20260717000001); fall back to client-side math over the fetched
       transactions when the RPC isn't deployed yet. */
    const isService = (t: any) => /service|maintenance|plan/i.test(t.category ?? '');
    const isEmergency = (t: any) => /emergency|after.?hours/i.test(`${t.category ?? ''} ${t.description ?? ''}`);
    const totalIncome = rpcSummary?.totalIncome
      ?? (income as any[]).filter(t => (t.status ?? '') !== 'voided')
        .reduce((s, t) => s + num(t.total_amount ?? t.amount), 0);
    const clearedChecks = (checks as any[]).filter(c => c.status === 'cleared')
      .reduce((s, c) => s + num(c.amount), 0);
    const totalExpense = (rpcSummary?.totalExpense ?? (expenses as any[]).filter(t => (t.status ?? '') !== 'voided')
      .reduce((s, t) => s + num(t.total_amount ?? t.amount), 0)) + clearedChecks;
    const serviceRevenue = rpcSummary?.serviceRevenue
      ?? (income as any[]).filter(t => (t.status ?? '') !== 'voided' && isService(t))
        .reduce((s, t) => s + num(t.total_amount ?? t.amount), 0);
    const emergencyRevenue = rpcSummary?.emergencyRevenue
      ?? (income as any[]).filter(t => (t.status ?? '') !== 'voided' && isEmergency(t))
        .reduce((s, t) => s + num(t.total_amount ?? t.amount), 0);

    return {
      onHandCount: onHand.length, installedCount: installed.length, inventoryValue, depositsHeld,
      soldRevenue, soldCogs, avgMarginPct, activeCount: active.length, arr,
      upcoming, overdueVisits, warrantyExpiring, renewals, renewalValue,
      contracted90, contracted180, contracted365,
      totalIncome, totalExpense, serviceRevenue, emergencyRevenue,
    };
  }, [units, agreements, income, expenses, checks, rpcSummary]);

  /* Monthly income/expense trend (last 8 months) feeding the priority-card
     sparklines — expense includes cleared checks, mirroring stats.totalExpense. */
  const monthlyTrend = useMemo(() => {
    const buckets = new Map<string, { key: string; label: string; income: number; expense: number }>();
    const keyLabel = (key: string) => {
      const [y, m] = key.split('-').map(Number);
      return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short' });
    };
    // Pre-seed the trailing 8 calendar months so the sparkline always has
    // enough points to draw a line — a brand-new entity's data can be only
    // days old, and an area/line chart needs 2+ points to render at all.
    const now = new Date();
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      buckets.set(key, { key, label: keyLabel(key), income: 0, expense: 0 });
    }
    const ensure = (dateStr: string) => {
      const key = dateStr.slice(0, 7);
      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = { key, label: keyLabel(key), income: 0, expense: 0 };
        buckets.set(key, bucket);
      }
      return bucket;
    };
    (income as any[]).filter(t => (t.status ?? '') !== 'voided').forEach(t => {
      if (!t.transaction_date) return;
      ensure(t.transaction_date).income += num(t.total_amount ?? t.amount);
    });
    (expenses as any[]).filter(t => (t.status ?? '') !== 'voided').forEach(t => {
      if (!t.transaction_date) return;
      ensure(t.transaction_date).expense += num(t.total_amount ?? t.amount);
    });
    (checks as any[]).filter(c => c.status === 'cleared').forEach(c => {
      if (!c.issue_date) return;
      ensure(c.issue_date).expense += num(c.amount);
    });
    return Array.from(buckets.values()).sort((a, b) => a.key.localeCompare(b.key)).slice(-8);
  }, [income, expenses, checks]);

  const marginByModel = useMemo(() => {
    const groups: Record<string, { model: string; count: number; cost: number; revenue: number }> = {};
    for (const u of units as any[]) {
      if (u.status !== 'installed' || num(u.sale_price) <= 0) continue;
      const g = groups[u.model] ?? (groups[u.model] = { model: u.model, count: 0, cost: 0, revenue: 0 });
      g.count += 1;
      g.cost += num(u.unit_cost) + num(u.install_labor_cost);
      g.revenue += num(u.sale_price);
    }
    return Object.values(groups)
      .map(g => ({ ...g, margin: g.revenue - g.cost, marginPct: g.revenue > 0 ? ((g.revenue - g.cost) / g.revenue) * 100 : 0 }))
      .sort((a, b) => b.margin - a.margin);
  }, [units]);

  const guidedActions = useMemo(() => [
    { label: 'Generator Deposit', sub: 'Guided income', icon: ArrowDownToLine, color: '#059669', to: '/concierge?start=income&category=Generator%20Deposit&payment_method=credit_card&cost_phase=Equipment%20Order&source_name=Generator%20Customer' },
    { label: 'Emergency Service', sub: 'Guided income', icon: PhoneCall, color: '#dc2626', to: '/concierge?start=income&category=Emergency%20Service&payment_method=credit_card&cost_phase=Emergency%20Service&source_name=HGP%20Emergency%20Client' },
    { label: 'Distributor Invoice', sub: 'Guided expense', icon: ArrowUpFromLine, color: '#7c3aed', to: '/concierge?start=expense&category=Distributor%20Invoice&payment_method=check&cost_phase=Equipment%20Order' },
    { label: 'Service Parts', sub: 'Guided expense', icon: Package, color: '#0891b2', to: '/concierge?start=expense&category=Service%20Parts&payment_method=credit_card&cost_phase=Service%20Parts' },
    { label: 'Supplier Check', sub: 'Guided check', icon: FileText, color: '#2563eb', to: '/concierge?start=check&memo=HGP%20supplier%20payment' },
    { label: 'Client / Job', sub: 'Account or install', icon: Users, color: HGP_BLUE, to: '/concierge?start=project' },
  ], []);

  useEffect(() => {
    window.localStorage.setItem('hgp-ops-kpis', JSON.stringify(selectedKpiIds));
  }, [selectedKpiIds]);

  const filteredUnits = useMemo(() => {
    const q = unitSearch.trim().toLowerCase();
    return (units as any[]).filter(u => {
      if (unitStatus !== 'all' && u.status !== unitStatus) return false;
      if (!q) return true;
      return [u.model, u.serial_number, u.customer_name, u.fuel_type, u.permit_number]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [units, unitSearch, unitStatus]);
  const unitPageCount = Math.max(1, Math.ceil(filteredUnits.length / unitPageSize));
  const safeUnitPage = Math.min(unitPage, unitPageCount);
  const pagedUnits = filteredUnits.slice((safeUnitPage - 1) * unitPageSize, safeUnitPage * unitPageSize);

  const openUnit = (u?: any) => {
    setUnitForm(u ? {
      id: u.id, model: u.model ?? '', serial_number: u.serial_number ?? '',
      kw_rating: u.kw_rating != null ? String(u.kw_rating) : '', fuel_type: u.fuel_type ?? 'natural_gas',
      status: u.status ?? 'in_stock', unit_cost: u.unit_cost != null ? String(u.unit_cost) : '',
      sale_price: u.sale_price != null ? String(u.sale_price) : '', customer_name: u.customer_name ?? '',
      purchase_date: u.purchase_date ?? '', install_date: u.install_date ?? '',
      warranty_end: u.warranty_end ?? '', permit_number: u.permit_number ?? '', notes: u.notes ?? '',
      deposit_amount: u.deposit_amount != null && num(u.deposit_amount) !== 0 ? String(u.deposit_amount) : '',
      install_labor_cost: u.install_labor_cost != null && num(u.install_labor_cost) !== 0 ? String(u.install_labor_cost) : '',
      inspection_status: u.inspection_status ?? '',
      log_po: false, po_vendor_id: '', po_number: '', po_total: '', po_date: todayLocalDate(),
    } : { ...BLANK_UNIT });
    setUnitDialog(true);
  };

  const saveUnit = async () => {
    if (!user?.id) return toast.error('Sign in required');
    if (!unitForm.model.trim()) return toast.error('Generator model is required');
    const row: any = {
      ...(unitForm.id ? { id: unitForm.id } : {}),
      user_id: user.id,
      entity_id: 'houston-generator-pros',
      model: unitForm.model.trim(),
      serial_number: unitForm.serial_number.trim() || null,
      kw_rating: unitForm.kw_rating ? Number(unitForm.kw_rating) : null,
      fuel_type: unitForm.fuel_type,
      status: unitForm.status,
      unit_cost: Number(unitForm.unit_cost) || 0,
      sale_price: unitForm.sale_price ? Number(unitForm.sale_price) : null,
      customer_name: unitForm.customer_name.trim() || null,
      purchase_date: unitForm.purchase_date || null,
      install_date: unitForm.install_date || null,
      warranty_end: unitForm.warranty_end || null,
      permit_number: unitForm.permit_number.trim() || null,
      notes: unitForm.notes.trim() || null,
      deposit_amount: Number(unitForm.deposit_amount) || 0,
      install_labor_cost: Number(unitForm.install_labor_cost) || 0,
      inspection_status: unitForm.inspection_status.trim() || null,
    };
    try {
      // New intake with a purchase order: the PO row mirrors straight into
      // HGP expenses ('Generator Equipment Purchase') via the DB trigger.
      if (!unitForm.id && unitForm.log_po) {
        const poTotal = Number(unitForm.po_total) || Number(unitForm.unit_cost) || 0;
        if (poTotal > 0) {
          try {
            const po: any = await upsertPO.mutateAsync({
              user_id: user.id,
              entity_id: 'houston-generator-pros',
              vendor_id: unitForm.po_vendor_id || null,
              po_number: unitForm.po_number.trim() || null,
              order_date: unitForm.po_date || todayLocalDate(),
              total_amount: poTotal,
              status: 'received',
              memo: `Equipment intake — ${unitForm.model.trim()}`,
            });
            row.po_id = po?.id ?? null;
            row.vendor_id = unitForm.po_vendor_id || null;
          } catch {
            toast.info('Unit will save, but run migration 20260718000002 so purchase orders post to expenses.');
          }
        }
      }
      await upsertUnit.mutateAsync(row);
      toast.success(unitForm.id
        ? 'Unit updated'
        : (!unitForm.id && unitForm.log_po && (Number(unitForm.po_total) || Number(unitForm.unit_cost)) > 0 && row.po_id)
          ? 'Unit received — purchase expense posted to HGP financials'
          : 'Unit added to inventory');
      setUnitDialog(false);
    } catch (e: any) { toast.error(e.message); }
  };

  const openVisit = (preset?: any) => {
    if (preset?.visit) {
      const v = preset.visit;
      setVisitForm({
        id: v.id, agreement_id: v.agreement_id ?? '', customer_name: v.customer_name ?? '',
        visit_date: v.visit_date ?? todayLocalDate(),
        visit_type: v.visit_type ?? 'scheduled', status: v.status ?? 'completed',
        technician: v.technician ?? '', labor_hours: num(v.labor_hours) ? String(v.labor_hours) : '',
        revenue: num(v.revenue) ? String(v.revenue) : '', cost: num(v.cost) ? String(v.cost) : '',
        summary: v.summary ?? '',
      });
    } else if (preset?.date) {
      setVisitForm({ ...BLANK_VISIT, visit_date: preset.date, status: 'scheduled' });
    } else {
      setVisitForm({
        ...BLANK_VISIT,
        agreement_id: preset?.id ?? '',
        customer_name: preset?.customer_name ?? '',
        visit_date: preset?.next_visit_date ?? BLANK_VISIT.visit_date,
        status: preset?.id ? 'scheduled' : 'completed',
      });
    }
    setVisitDialog(true);
  };

  const saveVisit = async () => {
    if (!user?.id) return toast.error('Sign in required');
    if (!visitForm.customer_name.trim()) return toast.error('Customer name is required');
    const row: any = {
      ...(visitForm.id ? { id: visitForm.id } : {}),
      user_id: user.id,
      entity_id: 'houston-generator-pros',
      agreement_id: visitForm.agreement_id || null,
      customer_name: visitForm.customer_name.trim(),
      visit_date: visitForm.visit_date,
      visit_type: visitForm.visit_type,
      status: visitForm.status,
      technician: visitForm.technician.trim() || null,
      labor_hours: Number(visitForm.labor_hours) || 0,
      revenue: Number(visitForm.revenue) || 0,
      cost: Number(visitForm.cost) || 0,
      summary: visitForm.summary.trim() || null,
    };
    try {
      await upsertVisit.mutateAsync(row);
      toast.success(
        visitForm.status === 'scheduled' ? 'Visit scheduled'
        : visitForm.status === 'cancelled' ? 'Visit cancelled'
        : Number(visitForm.revenue) > 0 ? 'Visit completed — income posted to the ledger'
        : 'Visit completed');
      setVisitDialog(false);
    } catch (e: any) { toast.error(e.message); }
  };

  const openAgreement = (a?: any) => {
    setAgreementForm(a ? {
      id: a.id, customer_name: a.customer_name ?? '', customer_email: a.customer_email ?? '',
      plan: a.plan ?? 'annual', status: a.status ?? 'active',
      annual_value: a.annual_value != null ? String(a.annual_value) : '',
      visits_per_year: String(a.visits_per_year ?? 2), emergency_coverage: !!a.emergency_coverage,
      start_date: a.start_date ?? '', next_visit_date: a.next_visit_date ?? '', notes: a.notes ?? '',
    } : { ...BLANK_AGREEMENT });
    setAgreementDialog(true);
  };

  const saveAgreement = async () => {
    if (!user?.id) return toast.error('Sign in required');
    if (!agreementForm.customer_name.trim()) return toast.error('Customer name is required');
    const row: any = {
      ...(agreementForm.id ? { id: agreementForm.id } : {}),
      user_id: user.id,
      entity_id: 'houston-generator-pros',
      customer_name: agreementForm.customer_name.trim(),
      customer_email: agreementForm.customer_email.trim() || null,
      plan: agreementForm.plan,
      status: agreementForm.status,
      annual_value: Number(agreementForm.annual_value) || 0,
      visits_per_year: Number(agreementForm.visits_per_year) || 2,
      emergency_coverage: agreementForm.emergency_coverage,
      start_date: agreementForm.start_date || null,
      next_visit_date: agreementForm.next_visit_date || null,
      notes: agreementForm.notes.trim() || null,
    };
    try {
      await upsertAgreement.mutateAsync(row);
      toast.success(agreementForm.id ? 'Agreement updated' : 'Service agreement created');
      setAgreementDialog(false);
    } catch (e: any) { toast.error(e.message); }
  };

  const kpiCards = useMemo(() => [
    { id: 'revenue', label: 'Revenue (Entity)', value: fmtUSD(stats.totalIncome), sub: `${fmtUSD(stats.totalExpense)} costs recorded`, icon: TrendingUp, color: '#059669', onClick: () => navigate('/ledger') },
    { id: 'service', label: 'Recurring Service', value: fmtUSD(stats.arr), sub: `${fmtUSD(stats.contracted90)} contracted 90d · ${fmtUSD(stats.contracted365)} 12mo`, icon: Wrench, color: HGP_BLUE, onClick: () => openAgreement() },
    { id: 'inventory', label: 'Inventory On Hand', value: String(stats.onHandCount), sub: `${fmtUSD(stats.inventoryValue)} at cost · ${fmtUSD(stats.depositsHeld)} deposits held`, icon: Package, color: '#7c3aed', onClick: () => openUnit() },
    { id: 'margin', label: 'Install Margin', value: `${stats.avgMarginPct.toFixed(1)}%`, sub: `${fmtUSD(stats.soldRevenue - stats.soldCogs)} on ${stats.installedCount} installs`, icon: Zap, color: '#d97706', onClick: () => navigate('/projects') },
    { id: 'emergency', label: 'Emergency Revenue', value: fmtUSD(stats.emergencyRevenue), sub: 'After-hours and outage response income', icon: PhoneCall, color: '#dc2626', onClick: () => navigate('/storm') },
    { id: 'visits', label: 'Service Visits', value: String(stats.upcoming.length), sub: `${stats.overdueVisits.length} overdue · ${stats.warrantyExpiring.length} warranties ≤90d`, icon: CalendarClock, color: '#0891b2', onClick: () => openVisit() },
    { id: 'renewals', label: 'Renewal Pipeline', value: fmtUSD(stats.renewalValue), sub: `${stats.renewals.length} plans within 60 days`, icon: ShieldCheck, color: '#059669', onClick: () => stats.renewals[0] ? openAgreement(stats.renewals[0]) : openAgreement() },
    { id: 'costs', label: 'Operating Costs', value: fmtUSD(stats.totalExpense), sub: 'Parts, equipment, labor, permits + cleared checks', icon: ArrowUpFromLine, color: '#dc2626', onClick: () => navigate('/expenses') },
  ], [navigate, stats]);

  const displayKpiCards = useMemo(() => {
    const selected = selectedKpiIds
      .map(id => kpiCards.find(card => card.id === id))
      .filter(Boolean) as any[];
    return selected.length ? selected.slice(0, 4) : kpiCards.slice(0, 4);
  }, [kpiCards, selectedKpiIds]);

  const toggleKpi = (id: string) => {
    setSelectedKpiIds(current => {
      if (current.includes(id)) return current.filter(x => x !== id);
      if (current.length >= 4) return current;
      return [...current, id];
    });
  };

  return (
    <AppShell>
      <style>{OPS_CSS}</style>
      <PageHeader
        eyebrow="Houston Generator Pros"
        title="Generator Operations"
        description="Sales, inventory COGS, install margin, maintenance plans, and service revenue."
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button className="hgp-action !h-9" onClick={() => openVisit()}><CalendarClock className="w-3 h-3" /> Visit</button>
            <button className="hgp-action !h-9" onClick={() => openAgreement()}><Wrench className="w-3 h-3" /> Plan</button>
            <button className="hgp-primary !h-9" onClick={() => openUnit()}><Plus className="w-3.5 h-3.5" /> Unit</button>
          </div>
        }
      />

      <div className="hgp-shell border-t border-border/50">
        <div className="px-4 sm:px-8 py-4 space-y-4">
          <section className="hgp-guided p-2.5">
            <div className="hgp-flow-strip">
              <div className="hgp-flow-intro">
                <div className="hgp-k" style={{ color: HGP_BLUE }}>Guided Generator Finance Flows</div>
                <div className="text-sm font-black tracking-tight mt-1">Fast HGP entry</div>
                <div className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">Prefilled income, expense, check, client, and job workflows.</div>
              </div>
              {(showAllGuided ? guidedActions : guidedActions.slice(0, 5)).map(action => (
                <button key={action.label} className="hgp-flow-chip min-w-0" onClick={() => navigate(action.to)}>
                  <div className="hgp-guided-icon !w-8 !h-8" style={{ color: action.color, backgroundColor: `${action.color}12`, borderColor: `${action.color}30` }}>
                    <action.icon className="w-4 h-4" strokeWidth={1.8} />
                  </div>
                  <div className="min-w-0">
                    <div className="hgp-guided-title truncate">{action.label}</div>
                    <div className="hgp-guided-sub truncate">{action.sub}</div>
                  </div>
                </button>
              ))}
              <button className="hgp-flow-chip min-w-0" onClick={() => setShowAllGuided(v => !v)}>
                <div className="hgp-guided-icon !w-8 !h-8"><MoreHorizontal className="w-4 h-4" /></div>
                <div className="min-w-0">
                  <div className="hgp-guided-title">{showAllGuided ? 'Less' : 'More'}</div>
                  <div className="hgp-guided-sub truncate">Tools</div>
                </div>
              </button>
            </div>
          </section>

          {/* ── Priority command strip — same intel-card language as Checks/
              Income/Expenses/Ledger, customized per metric: revenue and cost
              get real monthly trend areas, inventory and dispatch get
              comparison bars against their own sub-metrics. ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
            <button className="hgp-priority-card text-left" onClick={() => navigate('/ledger')}>
              <div className="relative flex items-start justify-between gap-2 p-2.5 sm:p-3 pb-2">
                <div className="min-w-0">
                  <div className="hgp-k">Entity Revenue</div>
                  <div className="text-xl font-black font-mono-tab mt-1 text-positive">{fmtUSD(stats.totalIncome)}</div>
                  <div className="hgp-sub truncate">{fmtUSD(stats.serviceRevenue)} service · {fmtUSD(stats.emergencyRevenue)} emergency</div>
                </div>
                <div className="hgp-priority-spark shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyTrend}>
                      <defs>
                        <linearGradient id="hgpRevTrend" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#059669" stopOpacity={0.32} />
                          <stop offset="95%" stopColor="#059669" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="label" hide /><YAxis hide domain={[0, 'dataMax']} />
                      <RechartsTooltip cursor={false} formatter={(v: number) => fmtUSD(Number(v))} contentStyle={{ borderRadius: 0, border: '1px solid #ddd6c8', fontSize: 11 }} />
                      <Area type="monotone" dataKey="income" stroke="#059669" fill="url(#hgpRevTrend)" strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="hgp-priority-foot relative px-2.5 sm:px-3 py-1.5 flex items-center justify-between gap-2">
                <span className="text-[8px] uppercase tracking-[0.14em] font-bold text-foreground/46">8mo trend</span>
                <span className="text-[9px] font-mono-tab font-semibold text-foreground/66">{fmtUSD(monthlyTrend.at(-1)?.income ?? 0)} this month</span>
              </div>
            </button>

            <button className="hgp-priority-card text-left" onClick={() => navigate('/expenses')}>
              <div className="relative flex items-start justify-between gap-2 p-2.5 sm:p-3 pb-2">
                <div className="min-w-0">
                  <div className="hgp-k">Costs Recorded</div>
                  <div className="text-xl font-black font-mono-tab mt-1 text-destructive">{fmtUSD(stats.totalExpense)}</div>
                  <div className="hgp-sub truncate">Distributor invoices, parts, labor + cleared checks</div>
                </div>
                <div className="hgp-priority-spark shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyTrend}>
                      <defs>
                        <linearGradient id="hgpCostTrend" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#dc2626" stopOpacity={0.30} />
                          <stop offset="95%" stopColor="#dc2626" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="label" hide /><YAxis hide domain={[0, 'dataMax']} />
                      <RechartsTooltip cursor={false} formatter={(v: number) => fmtUSD(Number(v))} contentStyle={{ borderRadius: 0, border: '1px solid #ddd6c8', fontSize: 11 }} />
                      <Area type="monotone" dataKey="expense" stroke="#dc2626" fill="url(#hgpCostTrend)" strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="hgp-priority-foot relative px-2.5 sm:px-3 py-1.5 flex items-center justify-between gap-2">
                <span className="text-[8px] uppercase tracking-[0.14em] font-bold text-foreground/46">8mo trend</span>
                <span className="text-[9px] font-mono-tab font-semibold text-foreground/66">{fmtUSD(monthlyTrend.at(-1)?.expense ?? 0)} this month</span>
              </div>
            </button>

            <button className="hgp-priority-card text-left" onClick={() => navigate('/projects')}>
              <div className="relative flex items-start justify-between gap-2 p-2.5 sm:p-3 pb-2">
                <div className="min-w-0">
                  <div className="hgp-k">Inventory + Deposits</div>
                  <div className="text-xl font-black font-mono-tab mt-1">{stats.onHandCount} units</div>
                  <div className="hgp-sub truncate">{fmtUSD(stats.inventoryValue)} at cost · {fmtUSD(stats.depositsHeld)} deposits held</div>
                </div>
                <div className="hgp-priority-spark shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[{ label: 'At Cost', value: stats.inventoryValue }, { label: 'Deposits', value: stats.depositsHeld }]}>
                      <XAxis dataKey="label" hide /><YAxis hide />
                      <RechartsTooltip cursor={false} formatter={(v: number) => fmtUSD(Number(v))} contentStyle={{ borderRadius: 0, border: '1px solid #ddd6c8', fontSize: 11 }} />
                      <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                        <Cell fill="#7c3aed" /><Cell fill="#7c3aed88" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="hgp-priority-foot relative px-2.5 sm:px-3 py-1.5 flex items-center justify-between gap-2">
                <span className="text-[8px] uppercase tracking-[0.14em] font-bold text-foreground/46">On hand</span>
                <span className="text-[9px] font-mono-tab font-semibold text-foreground/66">{stats.installedCount} installed</span>
              </div>
            </button>

            <button className="hgp-priority-card text-left" onClick={() => openVisit()}>
              <div className="relative flex items-start justify-between gap-2 p-2.5 sm:p-3 pb-2">
                <div className="min-w-0">
                  <div className="hgp-k">Dispatch Attention</div>
                  <div className={`text-xl font-black font-mono-tab mt-1 ${stats.overdueVisits.length ? 'text-destructive' : 'text-positive'}`}>{stats.upcoming.length} visits</div>
                  <div className="hgp-sub truncate">{stats.overdueVisits.length ? `${stats.overdueVisits.length} overdue` : 'No overdue visits'} · {stats.warrantyExpiring.length} warranties ≤90d</div>
                </div>
                <div className="hgp-priority-spark shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[{ label: 'Upcoming', value: stats.upcoming.length }, { label: 'Overdue', value: stats.overdueVisits.length }]}>
                      <XAxis dataKey="label" hide /><YAxis hide />
                      <RechartsTooltip cursor={false} formatter={(v: number) => Number(v).toLocaleString()} contentStyle={{ borderRadius: 0, border: '1px solid #ddd6c8', fontSize: 11 }} />
                      <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                        <Cell fill={HGP_BLUE} /><Cell fill={stats.overdueVisits.length ? '#dc2626' : 'hsl(var(--border))'} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="hgp-priority-foot relative px-2.5 sm:px-3 py-1.5 flex items-center justify-between gap-2">
                <span className="text-[8px] uppercase tracking-[0.14em] font-bold text-foreground/46">Next 30d</span>
                <span className="text-[9px] font-mono-tab font-semibold text-foreground/66">{stats.warrantyExpiring.length} warranties ≤90d</span>
              </div>
            </button>
          </div>

          {/* ── Optional metric drawer — collapsed by default to keep the HGP
              overview focused on guided entry, priority work, and schedule. ── */}
          <section className="space-y-2">
            <button className="hgp-action !h-9 w-full sm:w-auto justify-center" onClick={() => setKpiCustomOpen(v => !v)}>
              <Settings2 className="w-3 h-3" /> {kpiCustomOpen ? 'Hide Optional Metrics' : 'Show Optional Metrics'}
            </button>
            {kpiCustomOpen && (
              <div className="hgp-panel p-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2 px-1">
                  <div>
                    <div className="hgp-k">Optional HGP Metrics</div>
                    <div className="text-[10px] text-muted-foreground">Choose up to 4 compact cards when you need a deeper snapshot.</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-1.5">
                  {kpiCards.map(card => {
                    const selected = selectedKpiIds.includes(card.id);
                    const disabled = !selected && selectedKpiIds.length >= 4;
                    return (
                      <button key={card.id} className={`hgp-action !h-9 justify-between ${selected ? '!border-foreground' : ''}`}
                        disabled={disabled}
                        style={selected ? { color: card.color } : disabled ? { opacity: .45 } : undefined}
                        onClick={() => toggleKpi(card.id)}>
                        <span className="truncate">{card.label}</span>
                        {selected && <CheckIcon className="w-3 h-3 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                  {displayKpiCards.map(card => (
                    <Metric key={card.id} {...card} />
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* ── Margin by model + upcoming visits ── */}
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_.85fr] gap-4 items-start">
            <section className="hgp-panel p-3 sm:p-4">
              <div className="hgp-k mb-2">Unit Margin by Model</div>
              <div className="overflow-x-auto">
                <div className="min-w-[520px]">
                  <div className="hgp-row grid grid-cols-[1.4fr_.5fr_.8fr_.8fr_.8fr_.6fr] gap-2 bg-secondary/45 hgp-k items-center">
                    <div>Model</div><div>Units</div><div>Revenue</div><div>COGS</div><div>Margin</div><div>%</div>
                  </div>
                  {marginByModel.map(m => (
                    <div key={m.model} className="hgp-row grid grid-cols-[1.4fr_.5fr_.8fr_.8fr_.8fr_.6fr] gap-2 items-center">
                      <div className="font-bold truncate">{m.model}</div>
                      <div className="font-mono-tab">{m.count}</div>
                      <div className="font-mono-tab">{fmtUSD(m.revenue)}</div>
                      <div className="font-mono-tab">{fmtUSD(m.cost)}</div>
                      <div className={`font-mono-tab font-bold ${m.margin >= 0 ? 'text-positive' : 'text-destructive'}`}>{fmtUSD(m.margin)}</div>
                      <div className="font-mono-tab">{m.marginPct.toFixed(1)}%</div>
                    </div>
                  ))}
                  {!marginByModel.length && (
                    <div className="py-8 text-center text-xs text-muted-foreground">
                      Mark units as installed with a sale price to see model-level margin.
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="hgp-panel p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                <div className="hgp-k">Visit Schedule</div>
                <div className="flex items-center gap-1.5">
                  <button className="hgp-action !h-9 !px-2.5" onClick={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))} aria-label="Previous month">
                    <ChevronLeft className="w-3 h-3" />
                  </button>
                  <button className="hgp-action !h-9 flex-1 sm:flex-none justify-center" onClick={() => { const d = new Date(); setCalMonth(new Date(d.getFullYear(), d.getMonth(), 1)); }}>
                    {calMonth.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </button>
                  <button className="hgp-action !h-9 !px-2.5" onClick={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))} aria-label="Next month">
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
              {(() => {
                const first = new Date(calMonth.getFullYear(), calMonth.getMonth(), 1);
                const startPad = first.getDay();
                const daysInMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 0).getDate();
                const todayKey = todayLocalDate();
                const byDay: Record<string, any[]> = {};
                for (const v of visits as any[]) {
                  if (!v.visit_date) continue;
                  (byDay[v.visit_date] ??= []).push(v);
                }
                // Plans whose next visit is due but not yet scheduled show as dashed ghosts.
                const ghostByDay: Record<string, any[]> = {};
                for (const a of (agreements as any[]).filter(x => x.status === 'active' && x.next_visit_date)) {
                  const hasScheduled = (byDay[a.next_visit_date] ?? []).some(v => v.agreement_id === a.id && v.status === 'scheduled');
                  if (!hasScheduled) (ghostByDay[a.next_visit_date] ??= []).push(a);
                }
                const cells = [];
                for (let i = 0; i < startPad; i++) cells.push(null);
                for (let d = 1; d <= daysInMonth; d++) cells.push(d);
                const agenda = [
                  ...Object.entries(byDay).flatMap(([date, rows]) => rows.map(v => ({
                    id: `v-${v.id}`,
                    date,
                    customer: v.customer_name,
                    detail: `${String(v.visit_type || 'visit').replace(/_/g, ' ')} · ${String(v.status || 'scheduled').replace(/_/g, ' ')}`,
                    color: v.status === 'cancelled' ? '#8A8580'
                      : v.visit_type === 'emergency' ? '#dc2626'
                      : v.status === 'scheduled' ? HGP_BLUE : '#059669',
                    onClick: () => openVisit({ visit: v }),
                  }))),
                  ...Object.entries(ghostByDay).flatMap(([date, rows]) => rows.map(a => ({
                    id: `g-${a.id}`,
                    date,
                    customer: a.customer_name,
                    detail: `plan visit due · ${fmtUSD(num(a.annual_value))}/yr`,
                    color: '#d97706',
                    onClick: () => openVisit(a),
                  }))),
                ].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 8);
                return (
                  <>
                    <div className="sm:hidden mb-3 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="hgp-k">Mobile Agenda</div>
                          <div className="text-[10px] text-muted-foreground">Next visits and due service plans</div>
                        </div>
                        <button className="hgp-action !h-9 shrink-0" onClick={() => openVisit({ date: todayKey })}>Add Visit</button>
                      </div>
                      {agenda.map(item => {
                        const d = new Date(`${item.date}T12:00:00`);
                        return (
                          <button key={item.id} className="hgp-agenda-card" onClick={item.onClick}>
                            <div className="hgp-agenda-date">
                              {d.toLocaleDateString('en-US', { month: 'short' })}<br />{d.getDate()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-black truncate">{item.customer}</div>
                              <div className="text-[10px] capitalize text-muted-foreground truncate">{item.detail}</div>
                            </div>
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                          </button>
                        );
                      })}
                      {!agenda.length && (
                        <button className="hgp-agenda-card" onClick={() => openVisit({ date: todayKey })}>
                          <div className="hgp-agenda-date">Open</div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-black">No scheduled visits this month</div>
                            <div className="text-[10px] text-muted-foreground">Tap to add the next generator service visit.</div>
                          </div>
                        </button>
                      )}
                      <button
                        type="button"
                        className="hgp-agenda-card justify-center !min-h-[38px] text-[10px] font-black uppercase tracking-[0.12em] text-foreground/70"
                        onClick={() => setMobileCalendarOpen(v => !v)}
                        aria-expanded={mobileCalendarOpen}
                      >
                        <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                        {mobileCalendarOpen ? 'Hide Full Calendar' : 'Show Full Calendar'}
                        {mobileCalendarOpen ? <ChevronUp className="w-3.5 h-3.5 shrink-0 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 shrink-0 ml-1" />}
                      </button>
                    </div>
                    {/* Full month grid: collapsed by default on mobile (the
                        agenda above covers day-to-day management), always
                        shown on sm+ where there's room for it. */}
                    <div className={`${mobileCalendarOpen ? 'block' : 'hidden'} sm:block`}>
                    <div className="hgp-calendar-scroll">
                    <div className="grid hgp-calendar gap-px text-center mb-0.5">
                      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((w, i) => (
                        <div key={i} className="text-[9px] font-black uppercase text-muted-foreground py-1">{w}</div>
                      ))}
                    </div>
                    <div className="grid hgp-calendar gap-px bg-border/60 border border-border">
                      {cells.map((d, i) => {
                        if (d === null) return <div key={`p${i}`} className="bg-secondary/20 hgp-day" />;
                        const key = `${calMonth.getFullYear()}-${String(calMonth.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                        const dayVisits = byDay[key] ?? [];
                        const ghosts = ghostByDay[key] ?? [];
                        const isToday = key === todayKey;
                        return (
                          <div key={key}
                            className="hgp-day bg-background cursor-pointer hover:bg-secondary/30 transition-colors min-w-0"
                            style={isToday ? { boxShadow: `inset 0 0 0 1.5px ${HGP_BLUE}` } : undefined}
                            onClick={() => openVisit({ date: key })}
                            title={`Schedule a visit on ${key}`}>
                            <div className={`text-[10px] font-black px-0.5 mb-1 ${isToday ? '' : 'text-muted-foreground'}`}
                              style={isToday ? { color: HGP_BLUE } : undefined}>{d}</div>
                            <div className="space-y-1">
                              {dayVisits.slice(0, 3).map(v => {
                                const color = v.status === 'cancelled' ? '#8A8580'
                                  : v.visit_type === 'emergency' ? '#dc2626'
                                  : v.status === 'scheduled' ? HGP_BLUE : '#059669';
                                return (
                                  <button key={v.id} type="button"
                                    className={`hgp-visit-chip ${v.status === 'cancelled' ? 'line-through opacity-60' : ''}`}
                                    style={{ backgroundColor: color + '16', color, borderColor: color + '30' }}
                                    onClick={e => { e.stopPropagation(); openVisit({ visit: v }); }}
                                    title={`${v.customer_name} · ${v.visit_type} · ${v.status}`}>
                                    {v.customer_name}
                                  </button>
                                );
                              })}
                              {ghosts.slice(0, 2).map(a => (
                                <button key={`g${a.id}`} type="button"
                                  className="hgp-visit-chip border-dashed"
                                  style={{ borderColor: '#d97706aa', color: '#d97706', backgroundColor: '#d9770610' }}
                                  onClick={e => { e.stopPropagation(); openVisit(a); }}
                                  title={`${a.customer_name} — plan visit due, click to schedule`}>
                                  {a.customer_name}
                                </button>
                              ))}
                              {dayVisits.length > 3 && (
                                <div className="text-[9px] text-muted-foreground px-1">+{dayVisits.length - 3} more</div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    </div>
                    <div className="flex flex-wrap gap-2.5 mt-2 text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                      <span><span className="inline-block w-1.5 h-1.5 mr-1" style={{ background: HGP_BLUE }} />Scheduled</span>
                      <span><span className="inline-block w-1.5 h-1.5 mr-1 bg-[#059669]" />Completed</span>
                      <span><span className="inline-block w-1.5 h-1.5 mr-1 bg-[#dc2626]" />Emergency</span>
                      <span><span className="inline-block w-1.5 h-1.5 mr-1 border border-dashed border-[#d97706]" />Plan due</span>
                      <span className="w-full sm:w-auto sm:ml-auto normal-case font-medium">Tap a day to schedule · tap a chip to edit</span>
                    </div>
                    </div>
                  </>
                );
              })()}

              {(stats.renewals.length > 0 || stats.warrantyExpiring.length > 0) && (
                <>
                  <div className="flex items-center justify-between mt-4 mb-2">
                    <div className="hgp-k">Renewals & Warranty Watch</div>
                    {stats.renewalValue > 0 && (
                      <span className="text-[9px] font-mono-tab font-bold text-warning">{fmtUSD(stats.renewalValue)}/yr at stake</span>
                    )}
                  </div>
                  <div className="space-y-1.5 max-h-44 overflow-y-auto">
                    {stats.renewals.map((a: any) => (
                      <div key={a.id} className="border border-border px-2.5 py-1.5 text-xs flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="font-bold truncate">{a.customer_name}</span>
                          <span className="text-[9px] text-muted-foreground"> · plan {fmtUSD(num(a.annual_value))}/yr</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`text-[9px] font-black uppercase tracking-[0.1em] ${a.endsIn < 0 ? 'text-destructive' : 'text-warning'}`}>
                            {a.endsIn < 0 ? `Lapsed ${Math.abs(a.endsIn)}d` : `Renews in ${a.endsIn}d`}
                          </span>
                          <button className="hgp-action" title="Open plan to renew" onClick={() => openAgreement(a)}>Renew</button>
                        </div>
                      </div>
                    ))}
                    {stats.warrantyExpiring.map((u: any) => (
                      <div key={u.id} className="border border-border px-2.5 py-1.5 text-xs flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="font-bold truncate">{u.customer_name || u.model}</span>
                          <span className="text-[9px] text-muted-foreground"> · warranty ends {fmtDate(u.warranty_end)}</span>
                        </div>
                        <button className="hgp-action shrink-0" title="Open unit" onClick={() => openUnit(u)}>Review</button>
                      </div>
                    ))}
                  </div>
                </>
              )}

            </section>
          </div>

          {/* ── Equipment inventory ── */}
          <section className="hgp-panel p-3 sm:p-4">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3 mb-3">
              <div>
                <div className="hgp-k">Equipment Inventory</div>
                <h2 className="text-base font-bold mt-0.5">Generator Units</h2>
                <div className="text-[10px] text-muted-foreground mt-1">{filteredUnits.length} matching units · page {safeUnitPage} of {unitPageCount}</div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 lg:justify-end">
                <div className="relative min-w-[220px]">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input className="hgp-field pl-8" placeholder="Search model, serial, customer…" value={unitSearch} onChange={e => { setUnitSearch(e.target.value); setUnitPage(1); }} />
                </div>
                <Select value={unitStatus} onValueChange={v => { setUnitStatus(v); setUnitPage(1); }}>
                  <SelectTrigger className="hgp-field sm:w-[160px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {Object.entries(UNIT_STATUS).map(([k, m]) => <SelectItem key={k} value={k}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <button className="hgp-action !h-[38px]" onClick={() => openUnit()}><Plus className="w-3 h-3" /> Add Unit</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <div className="min-w-[860px]">
                <div className="hgp-row grid grid-cols-[1.3fr_.9fr_.5fr_.7fr_.7fr_.7fr_.9fr_.9fr_.5fr] gap-2 bg-secondary/45 hgp-k items-center">
                  <div>Model</div><div>Serial</div><div>kW</div><div>Status</div><div>Cost</div><div>Price</div><div>Customer</div><div>Warranty</div><div></div>
                </div>
                {pagedUnits.map(u => {
                  const wd = daysUntil(u.warranty_end);
                  return (
                    <div key={u.id} className="hgp-row grid grid-cols-[1.3fr_.9fr_.5fr_.7fr_.7fr_.7fr_.9fr_.9fr_.5fr] gap-2 items-center">
                      <div className="font-bold truncate">{u.model}</div>
                      <div className="font-mono-tab text-[10px] truncate">{u.serial_number || '—'}</div>
                      <div className="font-mono-tab">{u.kw_rating ? Number(u.kw_rating) : '—'}</div>
                      <div><StatusPill meta={UNIT_STATUS[u.status] ?? UNIT_STATUS.in_stock} /></div>
                      <div className="font-mono-tab">{fmtUSD(num(u.unit_cost))}</div>
                      <div className="font-mono-tab">{u.sale_price != null ? fmtUSD(num(u.sale_price)) : '—'}</div>
                      <div className="truncate text-[11px]">{u.customer_name || '—'}</div>
                      <div className={`text-[10px] whitespace-nowrap ${wd !== null && wd <= 90 && wd >= 0 ? 'text-warning font-bold' : 'text-muted-foreground'}`}>
                        {u.warranty_end ? fmtDate(u.warranty_end) : '—'}
                      </div>
                      <div className="flex items-center gap-1 justify-end">
                        <button className="p-1 text-muted-foreground hover:text-foreground" onClick={() => openUnit(u)} title="Edit unit"><Pencil className="w-3 h-3" /></button>
                        <button className="p-1 text-muted-foreground hover:text-destructive" title="Remove unit"
                          onClick={() => { if (confirm('Remove this unit from inventory?')) deleteUnit.mutate(u.id, { onSuccess: () => toast.success('Unit removed') }); }}>
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {!unitsLoading && !(units as any[]).length && (
                  <div className="py-10 text-center text-xs text-muted-foreground">No generator units yet — add your first unit to start tracking inventory and COGS.</div>
                )}
                {!unitsLoading && !!(units as any[]).length && !filteredUnits.length && (
                  <div className="py-10 text-center text-xs text-muted-foreground">No units match this search/filter.</div>
                )}
              </div>
            </div>
            {filteredUnits.length > unitPageSize && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-3 mt-3 border-t border-border">
                <div className="text-[10px] text-muted-foreground font-mono-tab">
                  Showing {(safeUnitPage - 1) * unitPageSize + 1}-{Math.min(safeUnitPage * unitPageSize, filteredUnits.length)} of {filteredUnits.length}
                </div>
                <div className="flex items-center gap-1.5">
                  <button className="hgp-page-btn" onClick={() => setUnitPage(1)} disabled={safeUnitPage === 1}>First</button>
                  <button className="hgp-page-btn" onClick={() => setUnitPage(p => Math.max(1, p - 1))} disabled={safeUnitPage === 1}>Prev</button>
                  <span className="px-2 text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">Page {safeUnitPage}/{unitPageCount}</span>
                  <button className="hgp-page-btn" onClick={() => setUnitPage(p => Math.min(unitPageCount, p + 1))} disabled={safeUnitPage === unitPageCount}>Next</button>
                  <button className="hgp-page-btn" onClick={() => setUnitPage(unitPageCount)} disabled={safeUnitPage === unitPageCount}>Last</button>
                </div>
              </div>
            )}
          </section>

          {/* ── Service agreements ── */}
          <section className="hgp-panel p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div>
                <div className="hgp-k">Service Contracts</div>
                <h2 className="text-base font-bold mt-0.5">Maintenance Plans</h2>
              </div>
              <button className="hgp-action" onClick={() => openAgreement()}><Plus className="w-3 h-3" /> New Plan</button>
            </div>
            <div className="overflow-x-auto">
              <div className="min-w-[760px]">
                <div className="hgp-row grid grid-cols-[1.3fr_.8fr_.7fr_.8fr_.6fr_.9fr_.7fr_.5fr] gap-2 bg-secondary/45 hgp-k items-center">
                  <div>Customer</div><div>Plan</div><div>Status</div><div>Annual Value</div><div>Visits/yr</div><div>Next Visit</div><div>Emergency</div><div></div>
                </div>
                {(agreements as any[]).map(a => (
                  <div key={a.id} className="hgp-row grid grid-cols-[1.3fr_.8fr_.7fr_.8fr_.6fr_.9fr_.7fr_.5fr] gap-2 items-center">
                    <div className="font-bold truncate">{a.customer_name}</div>
                    <div className="capitalize text-[11px]">{String(a.plan).replace('_', '-')}</div>
                    <div><StatusPill meta={AGREEMENT_STATUS[a.status] ?? AGREEMENT_STATUS.active} /></div>
                    <div className="font-mono-tab font-bold">{fmtUSD(num(a.annual_value))}</div>
                    <div className="font-mono-tab">{a.visits_per_year}</div>
                    <div className="text-[11px] whitespace-nowrap">{a.next_visit_date ? fmtDate(a.next_visit_date) : '—'}</div>
                    <div>{a.emergency_coverage
                      ? <span className="text-[9px] font-black uppercase text-positive">24/7</span>
                      : <span className="text-[9px] text-muted-foreground">—</span>}</div>
                    <div className="flex items-center gap-1 justify-end">
                      <button className="p-1 text-muted-foreground hover:text-foreground" onClick={() => openAgreement(a)} title="Edit plan"><Pencil className="w-3 h-3" /></button>
                      <button className="p-1 text-muted-foreground hover:text-destructive" title="Remove plan"
                        onClick={() => { if (confirm('Remove this service agreement?')) deleteAgreement.mutate(a.id, { onSuccess: () => toast.success('Agreement removed') }); }}>
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
                {!agreementsLoading && !(agreements as any[]).length && (
                  <div className="py-10 text-center text-xs text-muted-foreground">No maintenance plans yet — recurring service revenue starts here.</div>
                )}
              </div>
            </div>
          </section>

          {/* ── Bookkeeping guidance ── */}
          <section className="hgp-panel p-3 sm:p-4">
            <div className="hgp-k mb-2">Revenue Tagging</div>
            <div className="flex items-start gap-2 text-[11px] text-muted-foreground leading-relaxed">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: HGP_BLUE }} />
              <span>
                Log generator income under <Link to="/income" className="font-bold" style={{ color: HGP_BLUE }}>Income</Link> with
                categories containing <b>Service</b>/<b>Maintenance</b> for plan revenue and <b>Emergency</b> for after-hours
                calls — the split above reads those tags. Equipment purchases logged under Expenses with the supplier vendor
                keep entity COGS aligned with unit costs recorded here.
              </span>
            </div>
          </section>
        </div>
      </div>

      {/* ── Unit dialog ── */}
      <Dialog open={unitDialog} onOpenChange={setUnitDialog}>
        <DialogContent className="max-w-lg rounded-none max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-base">{unitForm.id ? 'Edit Generator Unit' : 'Receive Generator Unit'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="col-span-2">
              <div className="hgp-k mb-1">Model *</div>
              <Input className="hgp-field" placeholder="e.g. Generac Guardian 24kW" value={unitForm.model} onChange={e => setUnitForm(f => ({ ...f, model: e.target.value }))} />
            </div>
            <div>
              <div className="hgp-k mb-1">Serial Number</div>
              <Input className="hgp-field font-mono-tab" value={unitForm.serial_number} onChange={e => setUnitForm(f => ({ ...f, serial_number: e.target.value }))} />
            </div>
            <div>
              <div className="hgp-k mb-1">kW Rating</div>
              <Input className="hgp-field" type="number" inputMode="decimal" value={unitForm.kw_rating} onChange={e => setUnitForm(f => ({ ...f, kw_rating: e.target.value }))} />
            </div>
            <div>
              <div className="hgp-k mb-1">Fuel</div>
              <Select value={unitForm.fuel_type} onValueChange={v => setUnitForm(f => ({ ...f, fuel_type: v }))}>
                <SelectTrigger className="hgp-field"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="natural_gas">Natural Gas</SelectItem>
                  <SelectItem value="propane">Propane</SelectItem>
                  <SelectItem value="diesel">Diesel</SelectItem>
                  <SelectItem value="bi_fuel">Bi-Fuel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="hgp-k mb-1">Status</div>
              <Select value={unitForm.status} onValueChange={v => setUnitForm(f => ({ ...f, status: v }))}>
                <SelectTrigger className="hgp-field"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(UNIT_STATUS).map(([k, m]) => <SelectItem key={k} value={k}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="hgp-k mb-1">Unit Cost (COGS)</div>
              <Input className="hgp-field" type="number" inputMode="decimal" value={unitForm.unit_cost} onChange={e => setUnitForm(f => ({ ...f, unit_cost: e.target.value }))} />
            </div>
            <div>
              <div className="hgp-k mb-1">Sale Price</div>
              <Input className="hgp-field" type="number" inputMode="decimal" value={unitForm.sale_price} onChange={e => setUnitForm(f => ({ ...f, sale_price: e.target.value }))} />
            </div>
            <div>
              <div className="hgp-k mb-1">Install Labor Cost</div>
              <Input className="hgp-field" type="number" inputMode="decimal" value={unitForm.install_labor_cost} onChange={e => setUnitForm(f => ({ ...f, install_labor_cost: e.target.value }))} />
            </div>
            <div>
              <div className="hgp-k mb-1">Deposit Received</div>
              <Input className="hgp-field" type="number" inputMode="decimal" value={unitForm.deposit_amount} onChange={e => setUnitForm(f => ({ ...f, deposit_amount: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <div className="hgp-k mb-1">Customer</div>
              <Input className="hgp-field" value={unitForm.customer_name} onChange={e => setUnitForm(f => ({ ...f, customer_name: e.target.value }))} />
            </div>
            <div>
              <div className="hgp-k mb-1">Purchase Date</div>
              <Input className="hgp-field" type="date" value={unitForm.purchase_date} onChange={e => setUnitForm(f => ({ ...f, purchase_date: e.target.value }))} />
            </div>
            <div>
              <div className="hgp-k mb-1">Install Date</div>
              <Input className="hgp-field" type="date" value={unitForm.install_date} onChange={e => setUnitForm(f => ({ ...f, install_date: e.target.value }))} />
            </div>
            <div>
              <div className="hgp-k mb-1">Warranty End</div>
              <Input className="hgp-field" type="date" value={unitForm.warranty_end} onChange={e => setUnitForm(f => ({ ...f, warranty_end: e.target.value }))} />
            </div>
            <div>
              <div className="hgp-k mb-1">Permit #</div>
              <Input className="hgp-field" value={unitForm.permit_number} onChange={e => setUnitForm(f => ({ ...f, permit_number: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <div className="hgp-k mb-1">Inspection Status</div>
              <Input className="hgp-field" placeholder="e.g. Passed final 6/12, awaiting city sign-off…" value={unitForm.inspection_status} onChange={e => setUnitForm(f => ({ ...f, inspection_status: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <div className="hgp-k mb-1">Notes</div>
              <Textarea className="rounded-none text-xs" rows={2} value={unitForm.notes} onChange={e => setUnitForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          {!unitForm.id && (
            <div className="border border-border mt-1">
              <label className="flex items-center gap-2 px-3 py-2 bg-secondary/30 border-b border-border cursor-pointer select-none">
                <input type="checkbox" className="w-4 h-4" checked={unitForm.log_po}
                  onChange={e => setUnitForm(f => ({ ...f, log_po: e.target.checked }))} />
                <span className="text-xs font-bold">Log purchase order → HGP expense</span>
                <span className="text-[9px] text-muted-foreground ml-auto">Posts as "Generator Equipment Purchase"</span>
              </label>
              {unitForm.log_po && (
                <div className="p-3 grid grid-cols-2 gap-2.5">
                  <div className="col-span-2">
                    <div className="hgp-k mb-1">Distributor / Vendor</div>
                    <Select value={unitForm.po_vendor_id || '__none__'} onValueChange={v => setUnitForm(f => ({ ...f, po_vendor_id: v === '__none__' ? '' : v }))}>
                      <SelectTrigger className="hgp-field"><SelectValue placeholder="Select vendor" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">No vendor</SelectItem>
                        {(vendors as any[]).map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <div className="hgp-k mb-1">PO Number</div>
                    <Input className="hgp-field font-mono-tab" placeholder="PO-1042" value={unitForm.po_number} onChange={e => setUnitForm(f => ({ ...f, po_number: e.target.value }))} />
                  </div>
                  <div>
                    <div className="hgp-k mb-1">Order Date</div>
                    <Input className="hgp-field" type="date" value={unitForm.po_date} onChange={e => setUnitForm(f => ({ ...f, po_date: e.target.value }))} />
                  </div>
                  <div className="col-span-2">
                    <div className="hgp-k mb-1">PO Total (defaults to unit cost)</div>
                    <Input className="hgp-field !h-11 !text-[14px] font-mono-tab" type="number" inputMode="decimal"
                      placeholder={unitForm.unit_cost || '0.00'}
                      value={unitForm.po_total} onChange={e => setUnitForm(f => ({ ...f, po_total: e.target.value }))} />
                  </div>
                </div>
              )}
            </div>
          )}
          <button className="hgp-primary w-full mt-2" onClick={saveUnit} disabled={upsertUnit.isPending}>
            {unitForm.id ? 'Save Unit' : unitForm.log_po ? 'Receive Unit + Post Expense' : 'Add to Inventory'}
          </button>
        </DialogContent>
      </Dialog>

      {/* ── Agreement dialog ── */}
      <Dialog open={agreementDialog} onOpenChange={setAgreementDialog}>
        <DialogContent className="max-w-lg rounded-none max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-base">{agreementForm.id ? 'Edit Maintenance Plan' : 'New Maintenance Plan'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="col-span-2">
              <div className="hgp-k mb-1">Customer *</div>
              <Input className="hgp-field" value={agreementForm.customer_name} onChange={e => setAgreementForm(f => ({ ...f, customer_name: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <div className="hgp-k mb-1">Customer Email</div>
              <Input className="hgp-field" type="email" value={agreementForm.customer_email} onChange={e => setAgreementForm(f => ({ ...f, customer_email: e.target.value }))} />
            </div>
            <div>
              <div className="hgp-k mb-1">Plan</div>
              <Select value={agreementForm.plan} onValueChange={v => setAgreementForm(f => ({ ...f, plan: v }))}>
                <SelectTrigger className="hgp-field"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">Annual</SelectItem>
                  <SelectItem value="semi_annual">Semi-Annual</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="hgp-k mb-1">Status</div>
              <Select value={agreementForm.status} onValueChange={v => setAgreementForm(f => ({ ...f, status: v }))}>
                <SelectTrigger className="hgp-field"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(AGREEMENT_STATUS).map(([k, m]) => <SelectItem key={k} value={k}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="hgp-k mb-1">Annual Value</div>
              <Input className="hgp-field" type="number" inputMode="decimal" value={agreementForm.annual_value} onChange={e => setAgreementForm(f => ({ ...f, annual_value: e.target.value }))} />
            </div>
            <div>
              <div className="hgp-k mb-1">Visits / Year</div>
              <Input className="hgp-field" type="number" inputMode="numeric" value={agreementForm.visits_per_year} onChange={e => setAgreementForm(f => ({ ...f, visits_per_year: e.target.value }))} />
            </div>
            <div>
              <div className="hgp-k mb-1">Start Date</div>
              <Input className="hgp-field" type="date" value={agreementForm.start_date} onChange={e => setAgreementForm(f => ({ ...f, start_date: e.target.value }))} />
            </div>
            <div>
              <div className="hgp-k mb-1">Next Visit</div>
              <Input className="hgp-field" type="date" value={agreementForm.next_visit_date} onChange={e => setAgreementForm(f => ({ ...f, next_visit_date: e.target.value }))} />
            </div>
            <label className="col-span-2 flex items-center gap-2 text-xs font-semibold cursor-pointer select-none">
              <input type="checkbox" className="w-4 h-4" checked={agreementForm.emergency_coverage}
                onChange={e => setAgreementForm(f => ({ ...f, emergency_coverage: e.target.checked }))} />
              Includes 24/7 emergency coverage
            </label>
            <div className="col-span-2">
              <div className="hgp-k mb-1">Notes</div>
              <Textarea className="rounded-none text-xs" rows={2} value={agreementForm.notes} onChange={e => setAgreementForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <button className="hgp-primary w-full mt-2" onClick={saveAgreement} disabled={upsertAgreement.isPending}>
            {agreementForm.id ? 'Save Plan' : 'Create Plan'}
          </button>
        </DialogContent>
      </Dialog>

      {/* ── Service visit dialog ── */}
      <Dialog open={visitDialog} onOpenChange={setVisitDialog}>
        <DialogContent className="max-w-lg rounded-none max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-base">{visitForm.id ? "Edit Visit" : visitForm.status === "scheduled" ? "Schedule Visit" : "Log Service Visit"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="col-span-2">
              <div className="hgp-k mb-1">Maintenance Plan (optional)</div>
              <Select value={visitForm.agreement_id || '__none__'}
                onValueChange={v => {
                  const a = (agreements as any[]).find(x => x.id === v);
                  setVisitForm(f => ({
                    ...f,
                    agreement_id: v === '__none__' ? '' : v,
                    customer_name: a ? a.customer_name : f.customer_name,
                  }));
                }}>
                <SelectTrigger className="hgp-field"><SelectValue placeholder="One-off service call" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">One-off service call</SelectItem>
                  {(agreements as any[]).filter(a => a.status === 'active').map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.customer_name} — {String(a.plan).replace('_', '-')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <div className="hgp-k mb-1">Customer *</div>
              <Input className="hgp-field" value={visitForm.customer_name} onChange={e => setVisitForm(f => ({ ...f, customer_name: e.target.value }))} />
            </div>
            <div>
              <div className="hgp-k mb-1">Visit Date</div>
              <Input className="hgp-field" type="date" value={visitForm.visit_date} onChange={e => setVisitForm(f => ({ ...f, visit_date: e.target.value }))} />
            </div>
            <div>
              <div className="hgp-k mb-1">Type</div>
              <Select value={visitForm.visit_type} onValueChange={v => setVisitForm(f => ({ ...f, visit_type: v }))}>
                <SelectTrigger className="hgp-field"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(VISIT_TYPES).map(([k, m]) => <SelectItem key={k} value={k}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <div className="hgp-k mb-1">Status</div>
              <div className="flex gap-1.5">
                {([['scheduled', 'Scheduled', HGP_BLUE], ['completed', 'Completed', '#059669'], ['cancelled', 'Cancelled', '#8A8580']] as const).map(([v, l, c]) => (
                  <button key={v} type="button" className="hgp-action flex-1 justify-center !h-9"
                    style={visitForm.status === v ? { borderColor: c + '80', color: c, background: c + '10' } : undefined}
                    onClick={() => setVisitForm(f => ({ ...f, status: v }))}>
                    {l}
                  </button>
                ))}
              </div>
              {visitForm.status !== 'completed' && Number(visitForm.revenue) > 0 && (
                <div className="text-[9px] text-warning mt-1">Revenue posts to income only when the visit is completed.</div>
              )}
            </div>
            <div>
              <div className="hgp-k mb-1">Technician</div>
              <Input className="hgp-field" value={visitForm.technician} onChange={e => setVisitForm(f => ({ ...f, technician: e.target.value }))} />
            </div>
            <div>
              <div className="hgp-k mb-1">Labor Hours</div>
              <Input className="hgp-field" type="number" inputMode="decimal" value={visitForm.labor_hours} onChange={e => setVisitForm(f => ({ ...f, labor_hours: e.target.value }))} />
            </div>
            <div>
              <div className="hgp-k mb-1">Revenue Billed</div>
              <Input className="hgp-field" type="number" inputMode="decimal" value={visitForm.revenue} onChange={e => setVisitForm(f => ({ ...f, revenue: e.target.value }))} />
            </div>
            <div>
              <div className="hgp-k mb-1">Visit Cost</div>
              <Input className="hgp-field" type="number" inputMode="decimal" value={visitForm.cost} onChange={e => setVisitForm(f => ({ ...f, cost: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <div className="hgp-k mb-1">Summary</div>
              <Textarea className="rounded-none text-xs" rows={2} placeholder="Work performed, parts used…" value={visitForm.summary} onChange={e => setVisitForm(f => ({ ...f, summary: e.target.value }))} />
            </div>
            <div className="col-span-2 text-[10px] text-muted-foreground leading-relaxed">
              Revenue entered here posts automatically to the income ledger
              (category {visitForm.visit_type === 'emergency' ? '"Emergency Service"' : '"Service Maintenance"'}) and updates the plan's last-visit date.
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            {visitForm.id && (
              <button className="hgp-action !h-11 px-4 !text-destructive" onClick={() => {
                if (confirm('Delete this visit? Any linked income will be voided.')) {
                  deleteVisit.mutate(visitForm.id, { onSuccess: () => { toast.success('Visit removed'); setVisitDialog(false); } });
                }
              }}>
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            <button className="hgp-primary flex-1 !h-11" onClick={saveVisit} disabled={upsertVisit.isPending}>
              {visitForm.id ? 'Save Visit' : visitForm.status === 'scheduled' ? 'Schedule Visit' : 'Log Visit'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
