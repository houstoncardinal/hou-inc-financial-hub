import { useMemo, useState, useRef, useEffect } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import { useChecks, useTransactions, useProjects, useVendors } from '@/hooks/useFinance';
import { useInvoices, invoiceTotal } from '@/hooks/useInvoices';
import { useEntity, ENTITIES } from '@/contexts/EntityContext';
import type { Entity } from '@/contexts/EntityContext';
import { useAuth } from '@/hooks/useAuth';
import { fmtUSD, fmtDate } from '@/lib/format';
import {
  FileText, ArrowDownToLine, ArrowUpFromLine,
  ConciergeBell, FolderKanban, Users, Receipt, AlertTriangle,
  X, Camera, BookOpen, Grid3X3, BookMarked, FolderOpen,
  Upload, ChevronRight, Layers, ChevronDown, Settings2,
  Plus, Check as CheckIcon, Calendar,
} from 'lucide-react';
import { getDateRange } from '@/components/TimeFilter';
import { CashFlowChart } from '@/components/FinancialChartPanel';
import { BalanceTrendChart, InflowChart, OutflowChart, PendingAgingChart } from '@/components/StatChartPanel';
import { AnimatePresence, motion } from 'framer-motion';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

const parseLocalDate = (d: string): Date => {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day);
};

/* ── Period options ───────────────────────────────────────────────────────── */
const PERIOD_OPTS = [
  { id: '1d',      label: 'Today',         short: 'Today' },
  { id: '1w',      label: 'Last 7 days',   short: '7D' },
  { id: '1m',      label: 'Last 30 days',  short: '30D' },
  { id: 'quarter', label: 'This quarter',  short: 'QTR' },
  { id: '1y',      label: 'This year',     short: 'YTD' },
  { id: 'all',     label: 'All time',      short: 'All' },
];

/* ── Compact period picker ────────────────────────────────────────────────── */
function CompactPeriodPicker({
  value, onChange, accentColor,
}: { value: string; onChange: (v: string) => void; accentColor?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const color = accentColor || '#9D7E3F';

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const current = PERIOD_OPTS.find(o => o.id === value) ?? PERIOD_OPTS[5];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`group flex items-center gap-1.5 px-2.5 py-1.5 border text-[11px] font-semibold transition-all duration-150 whitespace-nowrap ${
          open
            ? 'border-foreground/30 bg-secondary text-foreground'
            : 'border-border bg-background hover:border-foreground/25 hover:bg-secondary/60 text-foreground/80'
        }`}
      >
        <Calendar className="w-3 h-3 opacity-50" strokeWidth={1.5} />
        <span className="hidden sm:inline">{current.label}</span>
        <span className="sm:hidden">{current.short}</span>
        <ChevronDown
          className={`w-3 h-3 opacity-60 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          strokeWidth={2}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.11, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 top-full mt-1.5 w-44 border border-border bg-background shadow-2xl z-50 overflow-hidden"
          >
            <div className="px-3 pt-2 pb-1.5 border-b border-border/50">
              <div className="text-[8px] uppercase tracking-[0.24em] text-muted-foreground font-bold">Time Range</div>
            </div>
            <div className="py-1">
              {PERIOD_OPTS.map(o => {
                const active = o.id === value;
                return (
                  <button
                    key={o.id}
                    onClick={() => { onChange(o.id); setOpen(false); }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 text-left text-[11px] transition-colors ${
                      active
                        ? 'bg-secondary/60 font-semibold text-foreground'
                        : 'hover:bg-secondary/40 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span>{o.label}</span>
                    {active && (
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Real-time entity switcher ────────────────────────────────────────────── */
function EntitySwitcher({ entity, setEntity }: { entity: Entity; setEntity: (e: Entity) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 border transition-all hover:opacity-90 active:opacity-75"
        style={{ borderColor: `${entity.color}60`, backgroundColor: entity.colorMuted }}
      >
        <div
          className="w-5 h-5 flex items-center justify-center shrink-0 text-[8px] font-black leading-none"
          style={{ backgroundColor: entity.color, color: '#fff' }}
        >
          {entity.shortName.charAt(0)}
        </div>
        <span
          className="text-[10px] uppercase tracking-[0.18em] font-bold hidden sm:block"
          style={{ color: entity.color }}
        >
          {entity.shortName}
        </span>
        <ChevronDown
          className={`w-3 h-3 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          style={{ color: entity.color }}
          strokeWidth={2.5}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.11, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 top-full mt-1.5 w-64 border border-border bg-background shadow-2xl z-50 overflow-hidden"
          >
            <div className="px-3 pt-2 pb-1.5 border-b border-border/50">
              <div className="text-[8px] uppercase tracking-[0.24em] text-muted-foreground font-bold">Switch Entity</div>
            </div>
            <div className="p-1.5 space-y-0.5">
              {ENTITIES.map(e => {
                const active = e.id === entity.id;
                return (
                  <button
                    key={e.id}
                    onClick={() => { setEntity(e); setOpen(false); }}
                    className={`w-full flex items-center gap-3 px-2.5 py-2.5 text-left transition-all hover:bg-secondary/60 group ${active ? 'bg-secondary/40' : ''}`}
                  >
                    <div
                      className="w-9 h-9 flex items-center justify-center shrink-0 text-[9px] font-black tracking-tight leading-tight"
                      style={{
                        backgroundColor: e.colorMuted,
                        color: e.color,
                        border: `1.5px solid ${e.color}35`,
                      }}
                    >
                      {e.shortName}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-semibold truncate">{e.name}</div>
                      <div className="text-[9px] text-muted-foreground mt-0.5">{e.category} · Est. {e.since}</div>
                    </div>
                    {active && (
                      <div className="w-1.5 h-1.5 rounded-full shrink-0 mr-0.5" style={{ backgroundColor: e.color }} />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Mobile Finance Menu ──────────────────────────────────────────────────── */
const FINANCE_SECTIONS = [
  {
    group: 'Daily',
    items: [
      { to: '/finance/dashboard', label: 'Overview',  icon: Grid3X3,         desc: 'Balance, stats & charts' },
      { to: '/ledger',            label: 'Ledger',    icon: BookOpen,        desc: 'Full transaction log' },
      { to: '/checks',            label: 'Checks',    icon: FileText,        desc: 'Issue & track checks' },
      { to: '/income',            label: 'Income',    icon: ArrowDownToLine, desc: 'Log revenue' },
      { to: '/expenses',          label: 'Expenses',  icon: ArrowUpFromLine, desc: 'Record payments' },
    ],
  },
  {
    group: 'Management',
    items: [
      { to: '/projects', label: 'Projects', icon: FolderKanban, desc: 'Active & archived jobs' },
      { to: '/vendors',  label: 'Vendors',  icon: Users,        desc: 'Vendor directory' },
      { to: '/invoices', label: 'Invoices', icon: Receipt,      desc: 'Billing & collections' },
    ],
  },
  {
    group: 'Tools',
    items: [
      { to: '/concierge', label: 'Concierge',     icon: ConciergeBell, desc: 'Guided assistant' },
      { to: '/documents', label: 'Documents',     icon: FolderOpen,    desc: 'Receipts & files' },
      { to: '/glossary',  label: 'Glossary',      icon: BookMarked,    desc: 'Terms & definitions' },
      { to: '/finance',   label: 'Switch Entity', icon: Layers,        desc: 'Change active entity' },
    ],
  },
];

function MobileFinanceMenu({ open, onClose, entityColor }: { open: boolean; onClose: () => void; entityColor?: string }) {
  const navigate = useNavigate();
  const color = entityColor || '#9D7E3F';
  const go = (to: string) => { onClose(); navigate(to); };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-x-0 bottom-0 z-50 bg-background border-t border-border"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            style={{ maxHeight: '85vh', overflowY: 'auto', paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <div className="sticky top-0 bg-background border-b border-border z-10">
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 rounded-full bg-border" />
              </div>
              <div className="px-5 pb-3 flex items-center justify-between">
                <div>
                  <div className="text-[8px] uppercase tracking-[0.3em] text-muted-foreground">Finance Hub</div>
                  <div className="text-sm font-semibold tracking-tight">All Sections</div>
                </div>
                <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>
            </div>
            <div className="px-4 py-3 space-y-4">
              {FINANCE_SECTIONS.map(section => (
                <div key={section.group}>
                  <div className="text-[8px] uppercase tracking-[0.28em] font-bold text-muted-foreground/60 mb-2 px-1">{section.group}</div>
                  <div className="grid grid-cols-2 gap-2">
                    {section.items.map(item => (
                      <button
                        key={item.to}
                        onClick={() => go(item.to)}
                        className="flex items-center gap-2.5 p-3 border border-border bg-background hover:bg-secondary/40 active:bg-secondary transition-colors text-left"
                      >
                        <div className="w-8 h-8 flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}14` }}>
                          <item.icon className="w-3.5 h-3.5" style={{ color }} strokeWidth={1.5} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold truncate">{item.label}</div>
                          <div className="text-[9px] text-muted-foreground truncate">{item.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="h-4" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function TypeBadge({ kind }: { kind: string }) {
  const map: Record<string, string> = {
    Income:  'bg-positive/10 text-positive border-positive/25',
    Expense: 'bg-destructive/10 text-destructive border-destructive/25',
    Check:   'bg-warning/10 text-warning border-warning/25',
  };
  return (
    <span className={`text-[8px] uppercase tracking-[0.14em] px-1.5 py-0.5 border font-semibold shrink-0 ${map[kind] || 'border-border text-muted-foreground'}`}>
      {kind}
    </span>
  );
}

/* ── KPI card catalog (static) ────────────────────────────────────────────── */
const KPI_OPTIONS = [
  { id: 'balance',     label: 'Total Balance' },
  { id: 'revenue',     label: 'Revenue' },
  { id: 'expenses',    label: 'Expenses' },
  { id: 'net',         label: 'Net Cash Flow' },
  { id: 'pending',     label: 'Pending Checks' },
  { id: 'margin',      label: 'Gross Margin' },
  { id: 'receivables', label: 'Receivables' },
  { id: 'projects',    label: 'Active Projects' },
] as const;

const DEFAULT_KPI_IDS  = ['balance', 'revenue', 'expenses', 'pending'];
const DEFAULT_KPI_MAX  = 4;

/* ── Quick action catalog (static) ───────────────────────────────────────── */
const QA_CATALOG = [
  { id: 'income',    label: 'Log Income',     icon: ArrowDownToLine, desc: 'Record revenue',       colorCls: 'bg-positive/12 text-positive',       dest: '/income' },
  { id: 'expense',   label: 'Record Expense', icon: ArrowUpFromLine, desc: 'Log payment',          colorCls: 'bg-destructive/10 text-destructive',  dest: '/expenses' },
  { id: 'check',     label: 'New Check',      icon: FileText,        desc: 'Issue a check',        colorCls: 'bg-warning/10 text-warning',          dest: '/checks/new' },
  { id: 'projects',  label: 'Projects',       icon: FolderKanban,    desc: 'Manage jobs',          colorCls: 'bg-blue-500/10 text-blue-500',        dest: '/projects' },
  { id: 'scan',      label: 'Scan Receipt',   icon: Camera,          desc: 'Capture photo',        colorCls: 'bg-violet-500/10 text-violet-500',    dest: '_camera' },
  { id: 'concierge', label: 'Concierge',      icon: ConciergeBell,   desc: 'AI assistant',         colorCls: 'bg-foreground/8 text-foreground',     dest: '/concierge' },
  { id: 'ledger',    label: 'Ledger',         icon: BookOpen,        desc: 'Transaction log',      colorCls: 'bg-slate-500/10 text-slate-500',      dest: '/ledger' },
  { id: 'invoices',  label: 'Invoices',       icon: Receipt,         desc: 'Billing & collections', colorCls: 'bg-indigo-500/10 text-indigo-500',  dest: '/invoices' },
  { id: 'vendors',   label: 'Vendors',        icon: Users,           desc: 'Vendor directory',     colorCls: 'bg-cyan-600/10 text-cyan-600',        dest: '/vendors' },
  { id: 'upload',    label: 'Upload Doc',     icon: Upload,          desc: 'Store document',       colorCls: 'bg-orange-500/10 text-orange-500',    dest: '/documents' },
] as const;

const DEFAULT_QA_IDS = ['income', 'expense', 'check', 'projects', 'scan', 'concierge'];

/* ── Styles ───────────────────────────────────────────────────────────────── */
const IDX_CSS = `
.stat-card{border:1px solid hsl(var(--border));box-shadow:0 1px 3px rgba(10,10,10,0.05),0 1px 2px rgba(10,10,10,0.03);}
.stat-card:hover{box-shadow:0 6px 22px rgba(10,10,10,0.08),0 2px 5px rgba(10,10,10,0.04);}
.qa-card{background:hsl(var(--background));border:1px solid hsl(var(--border));box-shadow:0 1px 3px rgba(10,10,10,0.06),0 1px 2px rgba(10,10,10,0.03);transition:box-shadow 0.18s,transform 0.18s;}
.qa-card:hover{box-shadow:0 5px 18px rgba(10,10,10,0.09),0 2px 5px rgba(10,10,10,0.04);transform:translateY(-1px);}
.ci-card{background:hsl(var(--background));border:1px solid hsl(var(--border));box-shadow:0 1px 3px rgba(10,10,10,0.05);transition:box-shadow 0.18s;}
.ci-card:hover{box-shadow:0 4px 14px rgba(10,10,10,0.08);}
.idx-widget{background:hsl(var(--background));transition:box-shadow 0.18s;}
.idx-widget:hover{box-shadow:0 3px 14px rgba(10,10,10,0.08);}
.idx-row:hover{background-color:hsl(var(--secondary)/0.55);}
.dark .stat-card{box-shadow:0 1px 5px rgba(0,0,0,0.35),inset 0 1px 0 rgba(255,255,255,0.04);}
.dark .stat-card:hover{box-shadow:0 6px 24px rgba(0,0,0,0.48),inset 0 1px 0 rgba(255,255,255,0.05);}
.dark .qa-card{background:hsl(var(--card));box-shadow:0 1px 4px rgba(0,0,0,0.30);}
.dark .qa-card:hover{box-shadow:0 5px 18px rgba(0,0,0,0.42);transform:translateY(-1px);}
.dark .ci-card{background:hsl(var(--card));box-shadow:0 1px 3px rgba(0,0,0,0.25);}
.dark .ci-card:hover{box-shadow:0 4px 14px rgba(0,0,0,0.38);}
.dark .idx-widget{background:hsl(var(--card));}
.dark .idx-widget:hover{box-shadow:0 3px 14px rgba(0,0,0,0.3);}
.dark .idx-row:hover{background-color:hsl(var(--secondary)/0.4);}
`;

export default function Index() {
  const navigate    = useNavigate();
  const { entity, setEntity, ready } = useEntity();
  const { user }    = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (ready && searchParams.has('entity')) {
      searchParams.delete('entity');
      setSearchParams(searchParams, { replace: true });
    }
  }, [ready]);

  const { data: checks   = [] } = useChecks();
  const { data: income   = [] } = useTransactions('income');
  const { data: expenses = [] } = useTransactions('expense');
  const { data: projects = [] } = useProjects();
  const { data: vendors  = [] } = useVendors();
  const { invoices }             = useInvoices();

  const [timePeriod,      setTimePeriod]      = useState('all');
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  const [mobileMenuOpen,  setMobileMenuOpen]  = useState(false);

  // KPI card customization
  const [kpiCustomOpen,   setKpiCustomOpen]   = useState(false);
  const [selectedKpiIds,  setSelectedKpiIds]  = useState<string[]>(() => {
    try { const s = localStorage.getItem('hou-dash-cards'); return s ? JSON.parse(s) : DEFAULT_KPI_IDS; }
    catch { return DEFAULT_KPI_IDS; }
  });

  // Quick action customization
  const [qaCustomOpen,    setQaCustomOpen]    = useState(false);
  const [selectedQaIds,   setSelectedQaIds]   = useState<string[]>(() => {
    try { const s = localStorage.getItem('hou-dash-qa'); return s ? JSON.parse(s) : DEFAULT_QA_IDS; }
    catch { return DEFAULT_QA_IDS; }
  });

  const cameraRef = useRef<HTMLInputElement>(null);

  useEffect(() => { localStorage.setItem('hou-dash-cards', JSON.stringify(selectedKpiIds)); }, [selectedKpiIds]);
  useEffect(() => { localStorage.setItem('hou-dash-qa', JSON.stringify(selectedQaIds)); },   [selectedQaIds]);

  /* ── Data hooks ─────────────────────────────────────────────────────────── */
  const filtered = useMemo(() => {
    const { start, end } = getDateRange(timePeriod);
    const inRange = (d: string) => { const dt = parseLocalDate(d); return dt >= start && dt <= end; };
    return {
      checks:   checks.filter((c: any) => inRange(c.issue_date)),
      income:   income.filter((t: any) => inRange(t.transaction_date)),
      expenses: expenses.filter((t: any) => inRange(t.transaction_date)),
    };
  }, [checks, income, expenses, timePeriod]);

  const stats = useMemo(() => {
    const now      = new Date();
    const mtdStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const inMTD    = (d: string) => parseLocalDate(d) >= mtdStart;
    const totalIn  = income.reduce((s: number, t: any) => s + Number(t.amount), 0);
    const totalOut = expenses.reduce((s: number, t: any) => s + Number(t.amount), 0)
      + checks.filter((c: any) => c.status === 'cleared').reduce((s: number, c: any) => s + Number(c.amount), 0);
    const pending      = checks.filter((c: any) => c.status === 'pending');
    return {
      balance:      totalIn - totalOut,
      inflowMTD:    income.filter((t: any) => inMTD(t.transaction_date)).reduce((s: number, t: any) => s + Number(t.amount), 0),
      outflowMTD:   expenses.filter((t: any) => inMTD(t.transaction_date)).reduce((s: number, t: any) => s + Number(t.amount), 0)
        + checks.filter((c: any) => inMTD(c.issue_date) && c.status === 'cleared').reduce((s: number, c: any) => s + Number(c.amount), 0),
      pendingCount: pending.length,
      pendingValue: pending.reduce((s: number, c: any) => s + Number(c.amount), 0),
    };
  }, [income, expenses, checks]);

  const periodStats = useMemo(() => {
    const { start, end, label } = getDateRange(timePeriod);
    const inRange = (d: string) => { const dt = parseLocalDate(d); return dt >= start && dt <= end; };
    const pInc = income.filter((t: any) => inRange(t.transaction_date)).reduce((s: number, t: any) => s + Number(t.amount), 0);
    const pExp = expenses.filter((t: any) => inRange(t.transaction_date)).reduce((s: number, t: any) => s + Number(t.amount), 0);
    const pChk = checks.filter((c: any) => inRange(c.issue_date) && c.status === 'cleared').reduce((s: number, c: any) => s + Number(c.amount), 0);
    return { income: pInc, outflow: pExp + pChk, net: pInc - pExp - pChk, label };
  }, [income, expenses, checks, timePeriod]);

  const cashFlowData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d     = new Date(); d.setMonth(d.getMonth() - (5 - i));
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end   = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const inR   = (dt: string) => { const d2 = parseLocalDate(dt); return d2 >= start && d2 < end; };
      const inflow  = income.filter((t: any) => inR(t.transaction_date)).reduce((s: number, t: any) => s + Number(t.amount), 0);
      const exp     = expenses.filter((t: any) => inR(t.transaction_date)).reduce((s: number, t: any) => s + Number(t.amount), 0);
      const chk     = checks.filter((c: any) => inR(c.issue_date) && c.status === 'cleared').reduce((s: number, c: any) => s + Number(c.amount), 0);
      return { label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }), inflow, outflow: exp + chk, net: inflow - exp - chk };
    });
  }, [income, expenses, checks]);

  const ciTrendData = useMemo(() => {
    const MO = 'JanFebMarAprMayJunJulAugSepOctNovDec'.match(/.{3}/g)!;
    return Array.from({ length: 6 }, (_, i) => {
      const d     = new Date(); d.setMonth(d.getMonth() - (5 - i));
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end   = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const inR   = (dt: string) => { const d2 = parseLocalDate(dt); return d2 >= start && d2 < end; };
      const mInc = income.filter((t: any) => inR(t.transaction_date)).reduce((s: number, t: any) => s + Number(t.amount), 0);
      const mOut = expenses.filter((t: any) => inR(t.transaction_date)).reduce((s: number, t: any) => s + Number(t.amount), 0)
        + checks.filter((c: any) => inR(c.issue_date) && c.status === 'cleared').reduce((s: number, c: any) => s + Number(c.amount), 0);
      return {
        month:   MO[d.getMonth()],
        revenue: mInc,
        outflow: mOut,
        margin:  mInc > 0 ? Math.round(((mInc - mOut) / mInc) * 100) : 0,
      };
    });
  }, [income, expenses, checks]);

  const recent = useMemo(() => [
    ...filtered.checks.map((c: any) => ({
      id: c.id, kind: 'Check', label: c.payee_name,
      amount: -Number(c.amount), date: c.issue_date, project: c.projects?.name,
    })),
    ...filtered.income.map((t: any) => ({
      id: t.id, kind: 'Income', label: t.source_name || t.vendors?.name || '—',
      amount: Number(t.amount), date: t.transaction_date, project: t.projects?.name,
    })),
    ...filtered.expenses.map((t: any) => ({
      id: t.id, kind: 'Expense', label: t.vendors?.name || t.category || '—',
      amount: -Number(t.amount), date: t.transaction_date, project: t.projects?.name,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10), [filtered]);

  const balanceTrendData = useMemo(() => {
    const months = 'JanFebMarAprMayJunJulAugSepOctNovDec'.match(/.{3}/g) || [];
    return Array.from({ length: 12 }, (_, i) => {
      const d     = new Date(); d.setMonth(d.getMonth() - (11 - i));
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end   = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const inR   = (dt: string) => { const d2 = parseLocalDate(dt); return d2 >= start && d2 < end; };
      const inc = income.filter((t: any) => inR(t.transaction_date)).reduce((s: number, t: any) => s + Number(t.amount), 0);
      const out = expenses.filter((t: any) => inR(t.transaction_date)).reduce((s: number, t: any) => s + Number(t.amount), 0)
        + checks.filter((c: any) => inR(c.issue_date) && c.status === 'cleared').reduce((s: number, c: any) => s + Number(c.amount), 0);
      return { month: months[d.getMonth()] || '', balance: inc - out };
    });
  }, [income, expenses, checks]);

  const inflowMonthlyData = useMemo(() => {
    const months = 'JanFebMarAprMayJunJulAugSepOctNovDec'.match(/.{3}/g) || [];
    return Array.from({ length: 12 }, (_, i) => {
      const d     = new Date(); d.setMonth(d.getMonth() - (11 - i));
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end   = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const inR   = (dt: string) => { const d2 = parseLocalDate(dt); return d2 >= start && d2 < end; };
      return { month: months[d.getMonth()] || '', inflow: income.filter((t: any) => inR(t.transaction_date)).reduce((s: number, t: any) => s + Number(t.amount), 0) };
    });
  }, [income]);

  const inflowCategoryData = useMemo(() => {
    const m: Record<string, number> = {};
    filtered.income.forEach((t: any) => { const k = t.source_name || t.category || 'Other'; m[k] = (m[k] || 0) + Number(t.amount); });
    return Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 7);
  }, [filtered.income]);

  const outflowMonthlyData = useMemo(() => {
    const months = 'JanFebMarAprMayJunJulAugSepOctNovDec'.match(/.{3}/g) || [];
    return Array.from({ length: 12 }, (_, i) => {
      const d     = new Date(); d.setMonth(d.getMonth() - (11 - i));
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end   = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const inR   = (dt: string) => { const d2 = parseLocalDate(dt); return d2 >= start && d2 < end; };
      return { month: months[d.getMonth()] || '', outflow:
        expenses.filter((t: any) => inR(t.transaction_date)).reduce((s: number, t: any) => s + Number(t.amount), 0)
        + checks.filter((c: any) => inR(c.issue_date) && c.status === 'cleared').reduce((s: number, c: any) => s + Number(c.amount), 0) };
    });
  }, [expenses, checks]);

  const outflowCategoryData = useMemo(() => {
    const m: Record<string, number> = {};
    filtered.expenses.forEach((t: any) => { const k = t.vendors?.name || t.category || 'Other'; m[k] = (m[k] || 0) + Number(t.amount); });
    return Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 7);
  }, [filtered.expenses]);

  const pendingAgingData = useMemo(() => {
    const now     = new Date();
    const pending = checks.filter((c: any) => c.status === 'pending');
    return [
      { label: '0–7d',   min: 0,  max: 7,       color: '#f59e0b' },
      { label: '8–14d',  min: 8,  max: 14,       color: '#d97706' },
      { label: '15–30d', min: 15, max: 30,       color: '#b45309' },
      { label: '30d+',   min: 30, max: Infinity, color: '#92400e' },
    ].map(b => {
      const items = pending.filter((c: any) => {
        const days = Math.floor((now.getTime() - parseLocalDate(c.issue_date).getTime()) / 86400000);
        return days >= b.min && days < b.max;
      });
      return { ...b, count: items.length, value: items.reduce((s: number, c: any) => s + Number(c.amount), 0) };
    });
  }, [checks]);

  const constructionKPIs = useMemo(() => {
    const ytdStart = new Date(new Date().getFullYear(), 0, 1);
    const inYTD    = (d: string) => parseLocalDate(d) >= ytdStart;
    const ytdInc   = income.filter((t: any) => inYTD(t.transaction_date)).reduce((s: number, t: any) => s + Number(t.amount), 0);
    const ytdOut   = expenses.filter((t: any) => inYTD(t.transaction_date)).reduce((s: number, t: any) => s + Number(t.amount), 0)
      + checks.filter((c: any) => inYTD(c.issue_date) && c.status === 'cleared').reduce((s: number, c: any) => s + Number(c.amount), 0);
    const active   = projects.filter((p: any) => p.status === 'active' || !p.status);
    return {
      grossMarginPct:     ytdInc > 0 ? ((ytdInc - ytdOut) / ytdInc) * 100 : 0,
      ytdIncome:          ytdInc,
      retainageHeld:      checks.filter((c: any) => c.status !== 'voided').reduce((s: number, c: any) => s + (Number(c.retainage_held) || 0), 0),
      receivables:        invoices.filter((i: any) => i.status === 'sent' || i.status === 'overdue').reduce((s: number, i: any) => s + invoiceTotal(i), 0),
      activeProjectCount: active.length,
      totalBudget:        active.reduce((s: number, p: any) => s + Number(p.budget || 0), 0),
    };
  }, [income, expenses, checks, invoices, projects]);

  const invoiceAlerts = useMemo(() => {
    const overdue = invoices.filter(i => i.status === 'overdue');
    return {
      overdueCount: overdue.length,
      overdueTotal: overdue.reduce((s, i) => s + invoiceTotal(i), 0),
      outstanding:  invoices.filter(i => i.status === 'sent' || i.status === 'overdue').reduce((s, i) => s + invoiceTotal(i), 0),
    };
  }, [invoices]);

  const stalePendingCount = pendingAgingData[3]?.count ?? 0;
  const stalePendingValue = pendingAgingData[3]?.value ?? 0;

  if (!ready)  return null;
  if (!entity) return <Navigate to="/finance" replace />;

  /* ── Post-guard derived values ──────────────────────────────────────────── */
  const hour      = new Date().getHours();
  const greeting  = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const rawName   = user?.user_metadata?.full_name ?? user?.email ?? '';
  const firstName = rawName.includes('@') ? rawName.split('@')[0] : (rawName.split(' ')[0] || '');

  const pMargin = periodStats.income > 0
    ? ((periodStats.income - periodStats.outflow) / periodStats.income) * 100
    : 0;

  const activeProjects = projects.filter((p: any) => p.status === 'active' || !p.status);

  /* ── KPI card full catalog ──────────────────────────────────────────────── */
  const ALL_KPI_CARDS = [
    {
      id: 'balance',
      label: 'Total Balance',
      value: fmtUSD(stats.balance),
      sub: stats.balance >= 0 ? 'Positive net position' : 'Negative net position',
      color: stats.balance >= 0 ? 'var(--positive)' : 'var(--destructive)',
      bg: 'from-blue-50/80 dark:from-blue-950/30 to-blue-100/40 dark:to-blue-950/10',
      chart: <BalanceTrendChart data={balanceTrendData} color={stats.balance >= 0 ? 'var(--positive)' : 'var(--destructive)'} />,
      onClick: () => navigate('/ledger'),
    },
    {
      id: 'revenue',
      label: `Revenue · ${periodStats.label}`,
      value: fmtUSD(periodStats.income),
      sub: `${filtered.income.length} transaction${filtered.income.length !== 1 ? 's' : ''}`,
      color: 'var(--positive)',
      bg: 'from-emerald-50/80 dark:from-emerald-950/30 to-emerald-100/40 dark:to-emerald-950/10',
      chart: <InflowChart monthlyData={inflowMonthlyData} categoryData={inflowCategoryData} />,
      onClick: () => navigate('/income'),
    },
    {
      id: 'expenses',
      label: `Expenses · ${periodStats.label}`,
      value: fmtUSD(periodStats.outflow),
      sub: `${filtered.expenses.length} transaction${filtered.expenses.length !== 1 ? 's' : ''}`,
      color: 'var(--destructive)',
      bg: 'from-rose-50/80 dark:from-rose-950/30 to-rose-100/40 dark:to-rose-950/10',
      chart: <OutflowChart monthlyData={outflowMonthlyData} categoryData={outflowCategoryData} />,
      onClick: () => navigate('/expenses'),
    },
    {
      id: 'net',
      label: `Net Cash Flow · ${periodStats.label}`,
      value: `${periodStats.net >= 0 ? '+' : ''}${fmtUSD(periodStats.net)}`,
      sub: periodStats.net >= 0 ? 'Surplus' : 'Deficit',
      color: periodStats.net >= 0 ? 'var(--positive)' : 'var(--destructive)',
      bg: periodStats.net >= 0
        ? 'from-emerald-50/70 dark:from-emerald-950/25 to-emerald-50/30 dark:to-emerald-950/5'
        : 'from-rose-50/70 dark:from-rose-950/25 to-rose-50/30 dark:to-rose-950/5',
      chart: (
        <div style={{ height: 56 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={cashFlowData.map(d => ({ m: d.label, v: d.net }))} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="net-g" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={periodStats.net >= 0 ? '#10b981' : '#ef4444'} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={periodStats.net >= 0 ? '#10b981' : '#ef4444'} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke={periodStats.net >= 0 ? '#10b981' : '#ef4444'} fill="url(#net-g)" strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ),
      onClick: () => navigate('/ledger'),
    },
    {
      id: 'pending',
      label: 'Pending Checks',
      value: `${stats.pendingCount}`,
      sub: `${fmtUSD(stats.pendingValue)} held`,
      color: 'var(--warning)',
      bg: 'from-amber-50/80 dark:from-amber-950/30 to-amber-100/40 dark:to-amber-950/10',
      chart: <PendingAgingChart agingBuckets={pendingAgingData} totalValue={stats.pendingValue} />,
      onClick: () => navigate('/checks'),
    },
    {
      id: 'margin',
      label: `Gross Margin · ${periodStats.label}`,
      value: `${pMargin.toFixed(1)}%`,
      sub: `on ${fmtUSD(periodStats.income)} revenue`,
      color: pMargin >= 20 ? 'var(--positive)' : pMargin >= 0 ? 'var(--warning)' : 'var(--destructive)',
      bg: 'from-slate-50/70 dark:from-slate-950/25 to-slate-50/30 dark:to-slate-950/5',
      chart: (
        <div style={{ height: 56 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={ciTrendData.map(d => ({ m: d.month, v: d.margin }))} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="mg-g" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke="#10b981" fill="url(#mg-g)" strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ),
      onClick: () => navigate('/ledger'),
    },
    {
      id: 'receivables',
      label: 'Receivables',
      value: fmtUSD(constructionKPIs.receivables),
      sub: constructionKPIs.receivables > 0 ? 'Sent + overdue invoices' : 'All invoices collected',
      color: constructionKPIs.receivables > 0 ? 'var(--warning)' : 'var(--positive)',
      bg: 'from-violet-50/70 dark:from-violet-950/25 to-violet-50/30 dark:to-violet-950/5',
      chart: null,
      onClick: () => navigate('/invoices'),
    },
    {
      id: 'projects',
      label: 'Active Projects',
      value: `${constructionKPIs.activeProjectCount}`,
      sub: constructionKPIs.totalBudget > 0 ? `${fmtUSD(constructionKPIs.totalBudget)} combined budget` : 'No budgets set',
      color: 'var(--foreground)',
      bg: 'from-slate-50/60 dark:from-slate-950/20 to-slate-50/20 dark:to-slate-950/5',
      chart: null,
      onClick: () => navigate('/projects'),
    },
  ];

  const displayKpiCards = ALL_KPI_CARDS.filter(c => selectedKpiIds.includes(c.id));
  const kpiCols = displayKpiCards.length;
  const kpiGridCls = kpiCols === 1
    ? 'grid-cols-1'
    : kpiCols === 2
    ? 'grid-cols-1 sm:grid-cols-2'
    : kpiCols === 3
    ? 'grid-cols-1 sm:grid-cols-3'
    : 'grid-cols-1 sm:grid-cols-4';

  /* ── Quick action display list ──────────────────────────────────────────── */
  const displayQaActions = QA_CATALOG.filter(a => selectedQaIds.includes(a.id));

  const handleQaClick = (dest: string) => {
    if (dest === '_camera') { cameraRef.current?.click(); return; }
    navigate(dest);
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    navigate('/documents', { state: { capturedFile: file } });
  };

  const toggleKpi = (id: string) => setSelectedKpiIds(prev =>
    prev.includes(id)
      ? prev.length > 1 ? prev.filter(i => i !== id) : prev
      : prev.length < DEFAULT_KPI_MAX ? [...prev, id] : prev
  );

  const toggleQa = (id: string) => setSelectedQaIds(prev =>
    prev.includes(id)
      ? prev.length > 1 ? prev.filter(i => i !== id) : prev
      : prev.length < 6 ? [...prev, id] : prev
  );

  /* ── Construction intelligence cards ───────────────────────────────────── */
  const ciCards = [
    {
      label:      'Gross Margin',
      value:      `${pMargin.toFixed(1)}%`,
      sub:        periodStats.income > 0 ? `on ${fmtUSD(periodStats.income)} revenue` : 'No revenue this period',
      valueColor: pMargin >= 20 ? 'text-positive' : pMargin >= 0 ? 'text-warning' : 'text-destructive',
      data:       ciTrendData, key: 'margin' as const, stroke: pMargin >= 20 ? '#10b981' : '#f59e0b', gid: 'cig0',
    },
    {
      label:      'Revenue',
      value:      fmtUSD(periodStats.income),
      sub:        periodStats.label,
      valueColor: 'text-foreground',
      data:       ciTrendData, key: 'revenue' as const, stroke: '#10b981', gid: 'cig1',
    },
    {
      label:      'Receivables',
      value:      fmtUSD(constructionKPIs.receivables),
      sub:        constructionKPIs.receivables > 0 ? 'Sent + overdue' : 'All collected',
      valueColor: constructionKPIs.receivables > 0 ? 'text-warning' : 'text-positive',
      data:       [] as typeof ciTrendData, key: 'revenue' as const, stroke: '#f59e0b', gid: 'cig2',
    },
    {
      label:      'Retainage Held',
      value:      fmtUSD(constructionKPIs.retainageHeld),
      sub:        constructionKPIs.retainageHeld > 0 ? 'Withheld from disbursements' : 'None on record',
      valueColor: constructionKPIs.retainageHeld > 0 ? 'text-accent' : 'text-muted-foreground',
      data:       [] as typeof ciTrendData, key: 'outflow' as const, stroke: '#9d7e3f', gid: 'cig3',
    },
    {
      label:      'Active Jobs',
      value:      `${constructionKPIs.activeProjectCount}`,
      sub:        constructionKPIs.totalBudget > 0 ? `${fmtUSD(constructionKPIs.totalBudget)} budget` : 'No budgets set',
      valueColor: 'text-foreground',
      data:       [] as typeof ciTrendData, key: 'revenue' as const, stroke: '#6366f1', gid: 'cig4',
    },
  ];

  /* ── Render ─────────────────────────────────────────────────────────────── */
  return (
    <AppShell>
      <style>{IDX_CSS}</style>

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleCameraCapture} />
      <MobileFinanceMenu open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} entityColor={entity.color} />

      {/* ══ HEADER ══════════════════════════════════════════════════════════ */}
      <div className="border-b border-border/60">

        {/* Desktop */}
        <div className="hidden sm:flex items-center justify-between px-8 py-4 gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: entity.color }} />
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">
                {entity.shortName} · {entity.category}
              </span>
            </div>
            <h1 className="text-xl font-semibold tracking-tight leading-snug">
              {greeting}{firstName ? `, ${firstName}` : ''}.
            </h1>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            <button onClick={() => navigate('/income')}
              className="flex items-center gap-1 px-2.5 py-1.5 border border-border hover:bg-secondary text-[11px] font-semibold transition-colors">
              <Plus className="w-3 h-3" strokeWidth={2.5} /> Income
            </button>
            <button onClick={() => navigate('/expenses')}
              className="flex items-center gap-1 px-2.5 py-1.5 border border-border hover:bg-secondary text-[11px] font-semibold transition-colors">
              <Plus className="w-3 h-3" strokeWidth={2.5} /> Expense
            </button>
            <button onClick={() => navigate('/checks/new')}
              className="flex items-center gap-1 px-2.5 py-1.5 border border-border hover:bg-secondary text-[11px] font-semibold transition-colors">
              <Plus className="w-3 h-3" strokeWidth={2.5} /> Check
            </button>

            <div className="w-px h-4 bg-border/70 mx-0.5" />

            <CompactPeriodPicker value={timePeriod} onChange={setTimePeriod} accentColor={entity.color} />
            <EntitySwitcher entity={entity} setEntity={setEntity} />
          </div>
        </div>

        {/* Mobile */}
        <div className="sm:hidden px-4 pt-3 pb-2.5">
          <div className="flex items-center justify-between mb-2.5">
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entity.color }} />
                <span className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-medium">{entity.shortName}</span>
              </div>
              <h1 className="text-[17px] font-semibold tracking-tight leading-tight">
                {greeting}{firstName ? `, ${firstName}` : ''}.
              </h1>
            </div>
            <div className="flex items-center gap-1.5">
              <CompactPeriodPicker value={timePeriod} onChange={setTimePeriod} accentColor={entity.color} />
              <EntitySwitcher entity={entity} setEntity={setEntity} />
              <button onClick={() => setMobileMenuOpen(true)}
                className="w-8 h-8 flex items-center justify-center border border-border bg-secondary/60 hover:bg-secondary transition-colors">
                <Grid3X3 className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* Mobile quick-add row */}
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { label: '+ Income',  dest: '/income' },
              { label: '+ Expense', dest: '/expenses' },
              { label: '+ Check',   dest: '/checks/new' },
            ].map(b => (
              <button key={b.label} onClick={() => navigate(b.dest)}
                className="py-1.5 text-[11px] font-semibold border border-border hover:bg-secondary transition-colors text-center">
                {b.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ══ ALERTS ══════════════════════════════════════════════════════════ */}
      {invoiceAlerts.overdueCount > 0 && !dismissedAlerts.includes('overdue') && (
        <div className="px-4 sm:px-8 py-2 flex items-center justify-between gap-3 border-b border-accent/20 bg-accent/5">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-3.5 h-3.5 text-accent shrink-0" strokeWidth={2} />
            <span className="text-xs text-accent font-medium">
              {invoiceAlerts.overdueCount} overdue invoice{invoiceAlerts.overdueCount > 1 ? 's' : ''} ·{' '}
              <span className="font-mono-tab font-semibold">{fmtUSD(invoiceAlerts.overdueTotal)}</span>
            </span>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <button onClick={() => navigate('/invoices')} className="text-[10px] uppercase tracking-[0.18em] font-bold text-accent hover:opacity-70">View →</button>
            <button onClick={() => setDismissedAlerts(a => [...a, 'overdue'])} className="text-accent/60 hover:text-accent">
              <X className="w-3.5 h-3.5" strokeWidth={2} />
            </button>
          </div>
        </div>
      )}
      {stalePendingCount > 0 && !dismissedAlerts.includes('stale') && (
        <div className="px-4 sm:px-8 py-2 flex items-center justify-between gap-3 border-b border-warning/20 bg-warning/5">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" strokeWidth={2} />
            <span className="text-xs text-warning font-medium">
              {stalePendingCount} check{stalePendingCount > 1 ? 's' : ''} pending 30+ days ·{' '}
              <span className="font-mono-tab font-semibold">{fmtUSD(stalePendingValue)}</span>
            </span>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <button onClick={() => navigate('/checks')} className="text-[10px] uppercase tracking-[0.18em] font-bold text-warning hover:opacity-70">View →</button>
            <button onClick={() => setDismissedAlerts(a => [...a, 'stale'])} className="text-warning/60 hover:text-warning">
              <X className="w-3.5 h-3.5" strokeWidth={2} />
            </button>
          </div>
        </div>
      )}

      {/* ══ KPI CARDS ═══════════════════════════════════════════════════════ */}
      <div className="px-4 sm:px-8 pt-4 pb-3 border-b border-border/60">
        <div className="flex items-center justify-between mb-3">
          <div className="micro-label">Key Metrics · {periodStats.label}</div>
          <button
            onClick={() => setKpiCustomOpen(o => !o)}
            className={`flex items-center gap-1 text-[10px] font-medium transition-colors ${kpiCustomOpen ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Settings2 className="w-3 h-3" strokeWidth={1.5} />
            Customize
          </button>
        </div>

        <AnimatePresence>
          {kpiCustomOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <div className="border border-border bg-secondary/20 p-3 mb-3">
                <div className="text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-2">Select up to 4 metrics</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {KPI_OPTIONS.map(opt => {
                    const sel = selectedKpiIds.includes(opt.id);
                    const dis = !sel && selectedKpiIds.length >= 4;
                    return (
                      <button key={opt.id} onClick={() => toggleKpi(opt.id)} disabled={dis}
                        className={`flex items-center justify-between px-2.5 py-2 border text-[10px] text-left transition-all ${
                          sel ? 'border-foreground bg-foreground text-background'
                             : dis ? 'border-border/40 text-muted-foreground/40 cursor-not-allowed'
                             : 'border-border hover:border-foreground/40 text-foreground'}`}>
                        <span className="font-medium">{opt.label}</span>
                        {sel && <CheckIcon className="w-3 h-3 shrink-0" strokeWidth={2.5} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className={`grid gap-3 ${kpiGridCls}`}>
          {displayKpiCards.map((card, idx) => (
            <motion.button key={card.id} onClick={card.onClick}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className={`stat-card group relative text-left bg-gradient-to-br ${card.bg} overflow-hidden transition-all duration-200 hover:-translate-y-0.5`}
            >
              <div className="h-[2px] w-full" style={{ backgroundColor: card.color }} />
              <div className="px-3.5 py-3">
                <div className="text-[9px] sm:text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-medium mb-1.5 leading-tight">
                  {card.label}
                </div>
                <div className="text-lg sm:text-xl font-bold tracking-tight font-mono-tab leading-tight" style={{ color: card.color }}>
                  {card.value}
                </div>
                {card.sub && <div className="text-[9px] text-muted-foreground mt-0.5 font-mono-tab">{card.sub}</div>}
                {card.chart && <div className="mt-2.5">{card.chart}</div>}
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* ══ QUICK ACTIONS ═══════════════════════════════════════════════════ */}
      <div className="px-4 sm:px-8 pt-4 pb-3 border-b border-border/60">
        <div className="flex items-center justify-between mb-3">
          <div className="micro-label">Quick Actions</div>
          <button
            onClick={() => setQaCustomOpen(o => !o)}
            className={`flex items-center gap-1 text-[10px] font-medium transition-colors ${qaCustomOpen ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Settings2 className="w-3 h-3" strokeWidth={1.5} />
            Customize
          </button>
        </div>

        <AnimatePresence>
          {qaCustomOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <div className="border border-border bg-secondary/20 p-3 mb-3">
                <div className="text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-2">Select up to 6 actions</div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                  {QA_CATALOG.map(opt => {
                    const sel = selectedQaIds.includes(opt.id);
                    const dis = !sel && selectedQaIds.length >= 6;
                    return (
                      <button key={opt.id} onClick={() => toggleQa(opt.id)} disabled={dis}
                        className={`flex items-center gap-2 px-2.5 py-2 border text-[10px] text-left transition-all ${
                          sel ? 'border-foreground bg-foreground text-background'
                             : dis ? 'border-border/40 text-muted-foreground/40 cursor-not-allowed'
                             : 'border-border hover:border-foreground/40 text-foreground'}`}>
                        <opt.icon className="w-3 h-3 shrink-0" strokeWidth={1.5} />
                        <span className="font-medium truncate">{opt.label}</span>
                        {sel && <CheckIcon className="w-3 h-3 shrink-0 ml-auto" strokeWidth={2.5} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className={`grid gap-2.5 ${displayQaActions.length <= 3 ? 'grid-cols-3' : displayQaActions.length === 4 ? 'grid-cols-4' : displayQaActions.length === 5 ? 'grid-cols-5 sm:grid-cols-5' : 'grid-cols-3 sm:grid-cols-6'}`}>
          {displayQaActions.map((a, idx) => (
            <motion.button
              key={a.id}
              onClick={() => handleQaClick(a.dest)}
              initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className="qa-card flex flex-col items-center justify-center gap-1.5 py-3.5 px-2 group active:scale-[0.97] transition-transform"
            >
              <div className={`w-9 h-9 flex items-center justify-center transition-transform duration-200 group-hover:scale-110 ${a.colorCls}`}>
                <a.icon className="w-4 h-4" strokeWidth={1.5} />
              </div>
              <div className="text-center">
                <div className="text-[10px] sm:text-[11px] font-semibold tracking-tight leading-tight">{a.label}</div>
                <div className="text-[8px] text-muted-foreground hidden sm:block mt-0.5 leading-snug">{a.desc}</div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* ══ CONSTRUCTION INTELLIGENCE ═══════════════════════════════════════ */}
      <div className="px-4 sm:px-8 pt-4 pb-3 border-b border-border/60">
        <div className="micro-label mb-3">Construction Intelligence · {periodStats.label}</div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {ciCards.map((ci, idx) => (
            <motion.div key={ci.label}
              initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className="ci-card border border-border bg-background p-3 transition-shadow duration-200"
            >
              <div className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground font-medium mb-1.5 leading-tight">{ci.label}</div>
              <div className={`text-base font-bold font-mono-tab leading-tight ${ci.valueColor}`}>{ci.value}</div>
              {ci.data.length > 0 && (
                <div className="mt-1.5" style={{ height: 38 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={ci.data} margin={{ top: 1, right: 0, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id={ci.gid} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={ci.stroke} stopOpacity={0.32} />
                          <stop offset="95%" stopColor={ci.stroke} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey={ci.key} stroke={ci.stroke} fill={`url(#${ci.gid})`}
                        strokeWidth={1.5} dot={false} isAnimationActive animationDuration={500} animationEasing="ease-out" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div className="text-[8px] text-muted-foreground mt-1.5 leading-snug">{ci.sub}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ══ PROJECTS + CASH FLOW + RECENT ACTIVITY ══════════════════════════ */}
      <div className="px-4 sm:px-8 pt-4 pb-6">
        <div className="lg:grid lg:grid-cols-5 lg:gap-5">

          {/* Projects — 2/5 cols */}
          <div className="lg:col-span-2 mb-5 lg:mb-0">
            <div className="flex items-center gap-2 mb-3">
              <button onClick={() => navigate('/vendors')}
                className="flex items-center gap-2 px-3 py-2 border border-border idx-widget transition-all flex-1">
                <div className="w-6 h-6 flex items-center justify-center bg-blue-600/10 text-blue-600 shrink-0">
                  <Users className="w-3 h-3" strokeWidth={1.5} />
                </div>
                <div className="min-w-0">
                  <div className="text-[8px] uppercase tracking-[0.1em] text-muted-foreground">Vendors</div>
                  <div className="text-[11px] font-semibold font-mono-tab">{vendors.length} on file</div>
                </div>
              </button>
              <button onClick={() => navigate('/invoices')}
                className="flex items-center gap-2 px-3 py-2 border border-border idx-widget transition-all flex-1">
                <div className={`w-6 h-6 flex items-center justify-center shrink-0 ${invoiceAlerts.overdueCount > 0 ? 'bg-accent/10 text-accent' : 'bg-violet-600/10 text-violet-600'}`}>
                  <Receipt className="w-3 h-3" strokeWidth={1.5} />
                </div>
                <div className="min-w-0">
                  <div className="text-[8px] uppercase tracking-[0.1em] text-muted-foreground">Invoices</div>
                  <div className={`text-[11px] font-semibold font-mono-tab ${invoiceAlerts.overdueCount > 0 ? 'text-accent' : ''}`}>
                    {invoiceAlerts.overdueCount > 0 ? `${invoiceAlerts.overdueCount} overdue` : `${fmtUSD(invoiceAlerts.outstanding)} out`}
                  </div>
                </div>
              </button>
            </div>

            <div className="flex items-center justify-between mb-2">
              <div className="micro-label">Active Projects ({activeProjects.length})</div>
              <button onClick={() => navigate('/projects')}
                className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5">
                All <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {activeProjects.length === 0 ? (
              <button onClick={() => navigate('/projects')}
                className="w-full flex items-center justify-center gap-2 px-4 py-3.5 border border-dashed border-border text-[10px] text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all">
                <FolderKanban className="w-3.5 h-3.5" strokeWidth={1.5} /> No active projects — create one
              </button>
            ) : (
              <div className="space-y-1.5">
                {activeProjects.slice(0, 6).map((p: any) => (
                  <button key={p.id} onClick={() => navigate(`/projects/${p.id}`)}
                    className="flex items-center gap-2.5 w-full px-3 py-2.5 border border-border idx-widget text-left group">
                    <div className="w-1 self-stretch shrink-0 bg-positive/60" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-semibold truncate group-hover:text-accent transition-colors">{p.name}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {p.code && <span className="text-[8px] font-black font-mono-tab text-muted-foreground bg-secondary px-1 py-0.5">{p.code}</span>}
                        {Number(p.budget) > 0 && <span className="text-[9px] font-mono-tab text-muted-foreground">{fmtUSD(Number(p.budget))}</span>}
                      </div>
                    </div>
                    <ChevronRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" strokeWidth={1.5} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Cash Flow + Recent Activity — 3/5 cols */}
          <div className="lg:col-span-3 space-y-4">
            <CashFlowChart data={cashFlowData} />

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="micro-label">Recent Activity</div>
                <Link to="/ledger" className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground transition-colors">
                  View all →
                </Link>
              </div>

              {/* Mobile */}
              <div className="sm:hidden space-y-1.5">
                {recent.length === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">No activity yet.</div>
                ) : recent.slice(0, 5).map(r => (
                  <div key={r.kind + r.id} className="border border-border p-2.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <TypeBadge kind={r.kind} />
                      <span className={`text-xs font-semibold font-mono-tab ${r.amount >= 0 ? 'text-positive' : 'text-destructive'}`}>
                        {r.amount >= 0 ? '+' : ''}{fmtUSD(Math.abs(r.amount))}
                      </span>
                    </div>
                    <div className="text-[12px] font-medium">{r.label}</div>
                    <div className="flex justify-between text-[9px] text-muted-foreground">
                      <span>{r.project || '—'}</span>
                      <span className="font-mono-tab">{fmtDate(r.date)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop */}
              <div className="hidden sm:block border border-border overflow-hidden">
                <div className="grid grid-cols-12 px-3.5 py-1.5 border-b border-border bg-secondary/40 text-[9px] uppercase tracking-[0.14em] text-muted-foreground font-medium">
                  <div className="col-span-2">Date</div>
                  <div className="col-span-2">Type</div>
                  <div className="col-span-4">Counterparty</div>
                  <div className="col-span-3 text-right">Amount</div>
                  <div className="col-span-1" />
                </div>
                {recent.length === 0 ? (
                  <div className="px-3.5 py-6 text-center text-sm text-muted-foreground">No activity this period.</div>
                ) : (
                  <div className="divide-y divide-border max-h-[320px] overflow-y-auto">
                    {recent.map(r => (
                      <div key={r.kind + r.id}
                        className="grid grid-cols-12 px-3.5 py-2 text-xs font-mono-tab idx-row items-center transition-colors">
                        <div className="col-span-2 text-muted-foreground text-[10px]">{fmtDate(r.date)}</div>
                        <div className="col-span-2"><TypeBadge kind={r.kind} /></div>
                        <div className="col-span-4 truncate pr-2 text-[11px]">{r.label}</div>
                        <div className={`col-span-3 text-right font-semibold text-[11px] ${r.amount >= 0 ? 'text-positive' : 'text-destructive'}`}>
                          {r.amount >= 0 ? '+' : ''}{fmtUSD(Math.abs(r.amount))}
                        </div>
                        <div className="col-span-1 flex justify-end">
                          <button
                            onClick={() => navigate(r.kind === 'Check' ? '/checks' : r.kind === 'Expense' ? '/expenses' : '/income')}
                            className="text-[9px] text-muted-foreground hover:text-foreground transition-colors">
                            →
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="md:hidden pb-6" />
    </AppShell>
  );
}
