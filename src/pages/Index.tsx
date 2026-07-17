import { useMemo, useState, useRef, useEffect } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import { useChecks, useTransactions, useProjects, useVendors, useFinanceControlSummary, useFinanceAgingSummary } from '@/hooks/useFinance';
import { useInvoices, invoiceTotal } from '@/hooks/useInvoices';
import { useEntity } from '@/contexts/EntityContext';
import { useAuth } from '@/hooks/useAuth';
import { fmtUSD, fmtDate } from '@/lib/format';
import {
  FileText, ArrowDownToLine, ArrowUpFromLine,
  ConciergeBell, FolderKanban, Users, Receipt, AlertTriangle,
  X, Camera, BookOpen, Grid3X3, FolderOpen,
  Upload, ChevronRight, Layers, Settings2,
  Check as CheckIcon, BarChart3,
} from 'lucide-react';
import { buildFinanceBuckets, FinanceRangePicker, financeRangeLabel, getFinanceDateRange } from '@/lib/financeTime';
import { CashFlowChart } from '@/components/FinancialChartPanel';
import { BalanceTrendChart, InflowChart, OutflowChart, PendingAgingChart } from '@/components/StatChartPanel';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';

const parseLocalDate = (d: string): Date => {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day);
};

/* ── Compact period picker ────────────────────────────────────────────────── */
function CompactPeriodPicker({
  value, onChange, accentColor,
}: { value: string; onChange: (v: string) => void; accentColor?: string }) {
  return <FinanceRangePicker value={value} onChange={onChange} accentColor={accentColor} />;
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
      { to: '/charts',   label: 'Charts',   icon: BarChart3,    desc: 'Analytics & trends' },
    ],
  },
  {
    group: 'Tools',
    items: [
      { to: '/concierge', label: 'Concierge',     icon: ConciergeBell, desc: 'Guided assistant' },
      { to: '/documents', label: 'Documents',     icon: FolderOpen,    desc: 'Receipts & files' },
      { to: '/finance',   label: 'Switch Entity', icon: Layers,        desc: 'Change active entity' },
    ],
  },
];

function MobileFinanceMenu({ open, onClose, entityColor }: { open: boolean; onClose: () => void; entityColor?: string }) {
  const navigate = useNavigate();
  const location = useLocation();
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
            className="fixed inset-x-0 bottom-0 z-50 bg-background border-t border-border shadow-2xl"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            style={{ maxHeight: '88vh', overflowY: 'auto', paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <div className="h-1" style={{ background: `linear-gradient(90deg, ${color}, ${color}66, transparent)` }} />
            <div className="sticky top-0 bg-background border-b border-border z-10">
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 rounded-full bg-border" />
              </div>
              <div className="px-5 pb-4 flex items-center justify-between gap-4">
                <div>
                  <div className="text-[8px] uppercase tracking-[0.3em] font-bold" style={{ color }}>Finance Hub</div>
                  <div className="text-base font-semibold tracking-tight mt-0.5">All entity sections</div>
                  <div className="text-[10px] text-muted-foreground mt-1">Jump to any dashboard, register, or finance tool.</div>
                </div>
                <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>
            </div>
            <div className="px-4 py-4 space-y-5">
              {FINANCE_SECTIONS.map(section => (
                <div key={section.group}>
                  <div className="text-[8px] uppercase tracking-[0.28em] font-bold text-muted-foreground/60 mb-2 px-1">{section.group}</div>
                  <div className="grid grid-cols-2 gap-2">
                    {section.items.map(item => {
                      const active = location.pathname === item.to || (item.to === '/finance/dashboard' && location.pathname === '/finance/dashboard');
                      return (
                        <button
                          key={item.to}
                          onClick={() => go(item.to)}
                          className="relative flex items-center gap-2.5 p-3 border bg-background hover:bg-secondary/40 active:bg-secondary transition-colors text-left overflow-hidden min-h-[74px]"
                          style={{ borderColor: active ? `${color}80` : 'hsl(var(--border))', backgroundColor: active ? `${color}0D` : undefined }}
                        >
                          {active && <div className="absolute left-0 top-0 bottom-0 w-0.5" style={{ backgroundColor: color }} />}
                          <div className="w-9 h-9 flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}14`, border: `1px solid ${color}28` }}>
                            <item.icon className="w-4 h-4" style={{ color }} strokeWidth={1.6} />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold truncate">{item.label}</div>
                            <div className="text-[9px] text-muted-foreground leading-snug line-clamp-2">{item.desc}</div>
                          </div>
                        </button>
                      );
                    })}
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

function UserAvatar({ name, email }: { name?: string; email?: string }) {
  const label = name || email || 'User';
  const initials = label.includes('@')
    ? label.slice(0, 2).toUpperCase()
    : label.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="w-8 h-8 flex items-center justify-center border border-border bg-secondary/70 text-[10px] font-bold font-mono-tab text-foreground shrink-0" title={label}>
      {initials || 'U'}
    </div>
  );
}

function MiniTooltip({
  active,
  payload,
  label,
  formatter = (value: any) => (typeof value === 'number' ? fmtUSD(value) : value),
}: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background/95 border border-border px-2.5 py-1.5 text-[10px] shadow-md">
      <div className="text-muted-foreground mb-1">{label ?? 'Current point'}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="font-mono-tab font-semibold">
            {p.name}: {formatter(p.value, p)}
          </span>
        </div>
      ))}
    </div>
  );
}

function MiniArea({
  data, dataKey, color, gid, height = 52, name, formatter,
}: {
  data: any[]; dataKey: string; color: string; gid: string; height?: number; name?: string; formatter?: (value: any, payload?: any) => string;
}) {
  return (
    <div className="w-full min-w-0" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.34} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="label" hide />
          <YAxis hide />
          <RechartsTooltip content={<MiniTooltip formatter={formatter} />} allowEscapeViewBox={{ x: true, y: true }} wrapperStyle={{ zIndex: 80, pointerEvents: 'none' }} cursor={{ stroke: 'var(--border)', strokeDasharray: '2 2' }} />
          <Area type="monotone" dataKey={dataKey} name={name ?? dataKey} stroke={color} fill={`url(#${gid})`} strokeWidth={1.8} dot={false} activeDot={{ r: 3, fill: color, stroke: 'var(--background)', strokeWidth: 1.5 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function NetCashFlowMiniChart({ data, positive }: {
  data: { label: string; net: number; inflow: number; outflow: number }[]; positive: boolean;
}) {
  const color = positive ? '#10b981' : '#ef4444';
  return (
    <div className="w-full min-w-0" style={{ height: 62 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data.map(d => ({ label: d.label, net: d.net, inflow: d.inflow, outflow: d.outflow }))} margin={{ top: 4, right: 2, left: 2, bottom: 0 }}>
          <defs>
            <linearGradient id="net-cash-flow-g" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.34} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="label" hide />
          <YAxis hide domain={['dataMin', 'dataMax']} />
          <ReferenceLine y={0} stroke="var(--border)" strokeDasharray="2 2" ifOverflow="extendDomain" />
          <RechartsTooltip
            content={<MiniTooltip formatter={(value: number, p: any) => {
              if (p?.dataKey === 'net') return `${Number(value || 0) >= 0 ? '+' : '-'}${fmtUSD(Math.abs(Number(value || 0)))}`;
              return fmtUSD(Number(value || 0));
            }} />}
            allowEscapeViewBox={{ x: true, y: true }}
            wrapperStyle={{ zIndex: 80, pointerEvents: 'none' }}
            cursor={{ stroke: 'var(--border)', strokeDasharray: '2 2' }}
          />
          <Area
            type="monotone"
            dataKey="net"
            name="Net cash flow"
            stroke={color}
            fill="url(#net-cash-flow-g)"
            strokeWidth={2.1}
            dot={{ r: 1.5, fill: color, strokeWidth: 0 }}
            activeDot={{ r: 3.5, fill: color, stroke: 'var(--background)', strokeWidth: 1.5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function ReceivablesMiniChart({ data, height = 58, showLegend = true }: {
  data: { label: string; outstanding: number; overdue: number; collected: number }[]; height?: number; showLegend?: boolean;
}) {
  const paidColor = '#10b981';
  const openColor = '#f59e0b';
  const overdueColor = '#ef4444';
  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 3, right: 0, left: 0, bottom: 0 }}>
          <XAxis dataKey="label" hide />
          <YAxis hide />
          <RechartsTooltip content={<MiniTooltip />} allowEscapeViewBox={{ x: true, y: true }} wrapperStyle={{ zIndex: 80, pointerEvents: 'none' }} cursor={{ fill: 'var(--border)', fillOpacity: 0.12 }} />
          <Bar dataKey="collected" name="Collected" stackId="a" fill={paidColor} fillOpacity={0.62} radius={[0, 0, 1, 1]} maxBarSize={18} />
          <Bar dataKey="outstanding" name="Open" stackId="a" fill={openColor} fillOpacity={0.8} maxBarSize={18} />
          <Bar dataKey="overdue" name="Overdue" stackId="a" fill={overdueColor} fillOpacity={0.88} radius={[1, 1, 0, 0]} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
      {showLegend && <div className="hidden sm:flex flex-wrap gap-1 mt-1">
        <span className="text-[7px] px-1 py-0.5 text-foreground/75 font-mono-tab border border-border/50" style={{ backgroundColor: `${paidColor}14` }}>paid</span>
        <span className="text-[7px] px-1 py-0.5 text-foreground/75 font-mono-tab border border-border/50" style={{ backgroundColor: `${openColor}14` }}>open</span>
        <span className="text-[7px] px-1 py-0.5 text-foreground/75 font-mono-tab border border-border/50" style={{ backgroundColor: `${overdueColor}14` }}>overdue</span>
      </div>}
    </div>
  );
}

function ProjectsMiniChart({ data, compact = false }: {
  data: { name: string; budget: number; spent: number; remaining: number; pct: number; revenue?: number }[]; compact?: boolean;
}) {
  const totalBudget = data.reduce((s, p) => s + p.budget, 0);
  const totalSpent = data.reduce((s, p) => s + p.spent, 0);
  const burn = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const atRisk = data.filter(p => p.budget > 0 && p.pct >= 85).length;

  if (data.length === 0) {
    return <div className={compact ? 'h-[40px] flex items-center text-[9px] text-muted-foreground' : 'h-[58px] flex items-center text-[9px] text-muted-foreground'}>No active project budget data</div>;
  }
  return (
    <div className="space-y-1 sm:space-y-1.5 min-w-0">
      {!compact && <div className="hidden sm:grid grid-cols-3 gap-1 text-[8px] font-mono-tab">
        <div className="bg-background/45 border border-border/50 px-1.5 py-1">
          <div className="text-foreground/55">Burn</div>
          <div className={burn > 90 ? 'text-destructive font-semibold' : burn > 72 ? 'text-warning font-semibold' : 'font-semibold'}>{Math.round(burn)}%</div>
        </div>
        <div className="bg-background/45 border border-border/50 px-1.5 py-1">
          <div className="text-foreground/55">At Risk</div>
          <div className={atRisk > 0 ? 'text-warning font-semibold' : 'font-semibold'}>{atRisk}</div>
        </div>
        <div className="bg-background/45 border border-border/50 px-1.5 py-1">
          <div className="text-foreground/55">Jobs</div>
          <div className="font-semibold">{data.length}</div>
        </div>
      </div>}
      {data.slice(0, compact ? 2 : 3).map((p, index) => (
        <div key={p.name} className={`min-w-0 ${!compact && index === 2 ? 'hidden sm:block' : ''}`}>
          <div className="flex items-center justify-between gap-2 text-[8px] mb-0.5">
            <span className="truncate text-foreground/60">{p.name}</span>
            <span className="font-mono-tab font-semibold">{p.budget > 0 ? `${Math.round(p.pct)}%` : fmtUSD(p.revenue)}</span>
          </div>
          <div className="h-1.5 bg-border/50 overflow-hidden">
            <div
              className={`h-full ${p.pct > 90 ? 'bg-destructive' : p.pct > 72 ? 'bg-warning' : 'bg-positive'}`}
              style={{ width: `${Math.min(100, Math.max(3, p.pct))}%` }}
            />
          </div>
        </div>
      ))}
    </div>
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
  { id: 'income',    label: 'Log Income',     icon: ArrowDownToLine, desc: 'Guided revenue',        color: '#10b981', dest: '/concierge?start=income' },
  { id: 'expense',   label: 'Record Expense', icon: ArrowUpFromLine, desc: 'Guided cost entry',     color: '#ef4444', dest: '/concierge?start=expense' },
  { id: 'check',     label: 'New Check',      icon: FileText,        desc: 'Guided check issue',    color: '#2563eb', dest: '/concierge?start=check' },
  { id: 'projects',  label: 'Projects',       icon: FolderKanban,    desc: 'Job performance',       color: '#3b82f6', dest: '/projects' },
  { id: 'scan',      label: 'Scan Receipt',   icon: Camera,          desc: 'Capture document',      color: '#8b5cf6', dest: '_camera' },
  { id: 'concierge', label: 'Concierge',      icon: ConciergeBell,   desc: 'Guided finance hub',    color: '#9D7E3F', dest: '/concierge' },
  { id: 'ledger',    label: 'Ledger',         icon: BookOpen,        desc: 'Audit register',        color: '#64748b', dest: '/ledger' },
  { id: 'invoices',  label: 'Invoices',       icon: Receipt,         desc: 'Billing pipeline',      color: '#6366f1', dest: '/invoices' },
  { id: 'vendors',   label: 'Vendors',        icon: Users,           desc: 'Payee controls',        color: '#0891b2', dest: '/vendors' },
  { id: 'upload',    label: 'Upload Doc',     icon: Upload,          desc: 'Store evidence',        color: '#f97316', dest: '/documents' },
] as const;

const DEFAULT_QA_IDS = ['income', 'expense', 'check', 'projects', 'scan', 'concierge'];

/* ── Construction intelligence customization ─────────────────────────────── */
const CI_OPTIONS = [
  { id: 'margin',      label: 'WIP Over/Under Billings' },
  { id: 'receivables', label: 'Aging Invoice Stack' },
  { id: 'projectBurn', label: 'Committed Cost Index' },
  { id: 'vendors',     label: 'Lien Waiver & Compliance' },
  { id: 'unlinked',    label: 'Unlinked Costs' },
  { id: 'clearance',   label: 'Check Clearance' },
] as const;

/* ── Construction risk visualizations (WIP / aging / EAC / compliance) ─────
   Compact div-based charts sized for the intelligence-card slot. All data
   comes from live sources: the finance_project_control_summary rollup
   (over/under billing, committed cost, EAC envelope), the AR aging RPC, and
   the vendors table's real compliance columns (insurance_expiration,
   w9_on_file, lien_waiver_required — editable on /vendors). ── */

function WipBillingBar({ over, under }: { over: number; under: number }) {
  const total = over + under;
  const overPct = total > 0 ? (over / total) * 100 : 50;
  return (
    <div className="space-y-1">
      <div className="h-3 flex overflow-hidden border border-border/70 bg-secondary/40">
        {total > 0 ? (
          <>
            <div className="h-full bg-[#10b981]/80" style={{ width: `${overPct}%` }} title={`Over-billed ${fmtUSD(over)}`} />
            <div className="h-full bg-[#ef4444]/75" style={{ width: `${100 - overPct}%` }} title={`Under-billed ${fmtUSD(under)}`} />
          </>
        ) : (
          <div className="h-full w-full" />
        )}
      </div>
      <div className="flex justify-between text-[7.5px] font-mono-tab text-muted-foreground">
        <span className="text-positive">Over {fmtUSD(over)}</span>
        <span className="text-destructive">Under {fmtUSD(under)}</span>
      </div>
    </div>
  );
}

const AGING_BRACKETS: { key: string; label: string; color: string }[] = [
  { key: 'current', label: 'Cur',  color: '#64748b' },
  { key: '1-30',    label: '0-30', color: '#9D7E3F' },
  { key: '31-60',   label: '31-60', color: '#f59e0b' },
  { key: '61-90',   label: '61-90', color: '#f97316' },
  { key: '90+',     label: '90+',  color: '#ef4444' },
];

function AgingMicroColumns({ buckets }: { buckets: Record<string, number> }) {
  const max = Math.max(1, ...AGING_BRACKETS.map(b => buckets[b.key] ?? 0));
  return (
    <div className="flex items-end gap-1 h-11">
      {AGING_BRACKETS.map(b => {
        const v = buckets[b.key] ?? 0;
        return (
          <div key={b.key} className="flex-1 min-w-0 flex flex-col items-center gap-0.5" title={`${b.label}: ${fmtUSD(v)}`}>
            <div className="w-full flex items-end" style={{ height: 32 }}>
              <div className="w-full" style={{ height: `${Math.max(v > 0 ? 3 : 1, (v / max) * 32)}px`, backgroundColor: v > 0 ? b.color : 'hsl(var(--border))' }} />
            </div>
            <div className="text-[6.5px] font-bold text-muted-foreground uppercase tracking-tight">{b.label}</div>
          </div>
        );
      })}
    </div>
  );
}

function ExposureRings({ jobs }: { jobs: { name: string; pct: number }[] }) {
  if (!jobs.length) {
    return <div className="h-11 flex items-center text-[8px] text-muted-foreground">No active jobs with contract envelopes yet.</div>;
  }
  return (
    <div className="flex items-center gap-2.5 h-11">
      {jobs.map(j => {
        const color = j.pct > 100 ? '#ef4444' : j.pct > 85 ? '#f59e0b' : '#64748b';
        return (
          <div key={j.name} className="flex items-center gap-1.5 min-w-0 flex-1" title={`${j.name}: ${j.pct.toFixed(0)}% of envelope committed`}>
            <div
              className="w-8 h-8 shrink-0 rounded-full grid place-items-center"
              style={{ background: `conic-gradient(${color} ${Math.min(j.pct, 100)}%, hsl(var(--secondary)) 0)` }}
            >
              <div className="w-6 h-6 rounded-full bg-background grid place-items-center text-[7px] font-black font-mono-tab" style={{ color }}>
                {Math.round(j.pct)}%
              </div>
            </div>
            <div className="text-[7px] leading-tight text-muted-foreground truncate">{j.name}</div>
          </div>
        );
      })}
    </div>
  );
}

function ComplianceMatrix({ vendors }: { vendors: { name: string; state: 'ok' | 'expiring' | 'expired' | 'unknown' }[] }) {
  if (!vendors.length) {
    return <div className="h-11 flex items-center text-[8px] text-muted-foreground">No vendors on file yet.</div>;
  }
  const COLORS = { ok: '#10b981', expiring: '#f59e0b', expired: '#ef4444', unknown: 'hsl(var(--border))' };
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-[3px]">
        {vendors.slice(0, 27).map(v => (
          <div key={v.name} className="w-3 h-3" title={`${v.name}: ${v.state === 'ok' ? 'COI current' : v.state === 'expiring' ? 'COI expires ≤30d' : v.state === 'expired' ? 'COI expired' : 'No COI on file'}`}
            style={{ backgroundColor: COLORS[v.state] }} />
        ))}
      </div>
      <div className="flex gap-2 text-[6.5px] font-bold uppercase tracking-tight text-muted-foreground">
        <span><span className="inline-block w-1.5 h-1.5 mr-0.5" style={{ background: COLORS.ok }} />Current</span>
        <span><span className="inline-block w-1.5 h-1.5 mr-0.5" style={{ background: COLORS.expiring }} />≤30d</span>
        <span><span className="inline-block w-1.5 h-1.5 mr-0.5" style={{ background: COLORS.expired }} />Expired</span>
        <span><span className="inline-block w-1.5 h-1.5 mr-0.5" style={{ background: COLORS.unknown }} />None</span>
      </div>
    </div>
  );
}

const DEFAULT_CI_IDS = ['margin', 'receivables', 'projectBurn', 'vendors'];
const DEFAULT_CI_MAX = 4;

/* ── Styles ───────────────────────────────────────────────────────────────── */
const IDX_CSS = `
.stat-card{border:1px solid hsl(var(--border));box-shadow:0 1px 3px rgba(10,10,10,0.05),0 1px 2px rgba(10,10,10,0.03);}
.stat-card:hover{box-shadow:0 6px 22px rgba(10,10,10,0.08),0 2px 5px rgba(10,10,10,0.04);z-index:30;}
.qa-card{background:hsl(var(--background));border:1px solid hsl(var(--border));box-shadow:0 1px 3px rgba(10,10,10,0.05),0 1px 2px rgba(10,10,10,0.03),0 1px 0 rgba(255,255,255,0.45) inset;transition:box-shadow 0.18s,transform 0.18s,border-color 0.18s,background 0.18s;}
.qa-card:hover{box-shadow:0 5px 18px rgba(10,10,10,0.08),0 2px 5px rgba(10,10,10,0.04),0 1px 0 rgba(255,255,255,0.45) inset;transform:translateY(-1px);border-color:hsl(var(--foreground)/0.22);background:hsl(var(--secondary)/0.35);}
.ci-card{background:hsl(var(--background));border:1px solid hsl(var(--border));box-shadow:0 1px 3px rgba(10,10,10,0.05);transition:box-shadow 0.18s,transform 0.18s,border-color 0.18s;position:relative;overflow:visible;}
.ci-card:hover{box-shadow:0 4px 14px rgba(10,10,10,0.08);transform:translateY(-1px);border-color:hsl(var(--foreground)/0.18);z-index:30;}
.idx-widget{background:hsl(var(--background));transition:box-shadow 0.18s;}
.idx-widget:hover{box-shadow:0 3px 14px rgba(10,10,10,0.08);}
.idx-row:hover{background-color:hsl(var(--secondary)/0.55);}
.dark .stat-card{box-shadow:0 1px 5px rgba(0,0,0,0.35),inset 0 1px 0 rgba(255,255,255,0.04);}
.dark .stat-card:hover{box-shadow:0 6px 24px rgba(0,0,0,0.48),inset 0 1px 0 rgba(255,255,255,0.05);}
.dark .qa-card{background:hsl(var(--card));box-shadow:0 1px 4px rgba(0,0,0,0.30),0 1px 0 rgba(255,255,255,0.05) inset;}
.dark .qa-card:hover{box-shadow:0 5px 18px rgba(0,0,0,0.42),0 1px 0 rgba(255,255,255,0.05) inset;transform:translateY(-1px);}
.dark .ci-card{background:hsl(var(--card));box-shadow:0 1px 3px rgba(0,0,0,0.25);}
.dark .ci-card:hover{box-shadow:0 4px 14px rgba(0,0,0,0.38);}
.dark .idx-widget{background:hsl(var(--card));}
.dark .idx-widget:hover{box-shadow:0 3px 14px rgba(0,0,0,0.3);}
.dark .idx-row:hover{background-color:hsl(var(--secondary)/0.4);}
`;

export default function Index() {
  const navigate    = useNavigate();
  const { entity, ready } = useEntity();
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

  // Construction intelligence customization
  const [ciCustomOpen,    setCiCustomOpen]    = useState(false);
  const [selectedCiIds,   setSelectedCiIds]   = useState<string[]>(() => {
    try { const s = localStorage.getItem('hou-dash-ci'); return s ? JSON.parse(s) : DEFAULT_CI_IDS; }
    catch { return DEFAULT_CI_IDS; }
  });

  const cameraRef = useRef<HTMLInputElement>(null);

  useEffect(() => { localStorage.setItem('hou-dash-cards', JSON.stringify(selectedKpiIds)); }, [selectedKpiIds]);
  useEffect(() => { localStorage.setItem('hou-dash-qa', JSON.stringify(selectedQaIds)); },   [selectedQaIds]);
  useEffect(() => { localStorage.setItem('hou-dash-ci', JSON.stringify(selectedCiIds)); },     [selectedCiIds]);

  /* ── Data hooks ─────────────────────────────────────────────────────────── */
  const filtered = useMemo(() => {
    const { start, end } = getFinanceDateRange(timePeriod);
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
    const { start, end } = getFinanceDateRange(timePeriod);
    const label = financeRangeLabel(timePeriod);
    const inRange = (d: string) => { const dt = parseLocalDate(d); return dt >= start && dt <= end; };
    const pInc = income.filter((t: any) => inRange(t.transaction_date)).reduce((s: number, t: any) => s + Number(t.amount), 0);
    const pExp = expenses.filter((t: any) => inRange(t.transaction_date)).reduce((s: number, t: any) => s + Number(t.amount), 0);
    const pChk = checks.filter((c: any) => inRange(c.issue_date) && c.status === 'cleared').reduce((s: number, c: any) => s + Number(c.amount), 0);
    return { income: pInc, outflow: pExp + pChk, net: pInc - pExp - pChk, label };
  }, [income, expenses, checks, timePeriod]);

  const dashboardBuckets = useMemo(() => {
    const dates = [
      ...income.map((t: any) => t.transaction_date),
      ...expenses.map((t: any) => t.transaction_date),
      ...checks.map((c: any) => c.issue_date),
      ...invoices.flatMap((i: any) => [i.issue_date, i.due_date].filter(Boolean)),
    ].filter(Boolean);
    return buildFinanceBuckets(timePeriod, dates);
  }, [timePeriod, income, expenses, checks, invoices]);

  const cashFlowData = useMemo(() => {
    return dashboardBuckets.map(({ label, start, end }) => {
      const inR   = (dt: string) => { const d2 = parseLocalDate(dt); return d2 >= start && d2 < end; };
      const inflow  = income.filter((t: any) => inR(t.transaction_date)).reduce((s: number, t: any) => s + Number(t.amount), 0);
      const exp     = expenses.filter((t: any) => inR(t.transaction_date)).reduce((s: number, t: any) => s + Number(t.amount), 0);
      const chk     = checks.filter((c: any) => inR(c.issue_date) && c.status === 'cleared').reduce((s: number, c: any) => s + Number(c.amount), 0);
      return { label, inflow, outflow: exp + chk, net: inflow - exp - chk };
    });
  }, [dashboardBuckets, income, expenses, checks]);

  const ciTrendData = useMemo(() => {
    return dashboardBuckets.map(({ label, start, end }) => {
      const inR   = (dt: string) => { const d2 = parseLocalDate(dt); return d2 >= start && d2 < end; };
      const mInc = income.filter((t: any) => inR(t.transaction_date)).reduce((s: number, t: any) => s + Number(t.amount), 0);
      const mOut = expenses.filter((t: any) => inR(t.transaction_date)).reduce((s: number, t: any) => s + Number(t.amount), 0)
        + checks.filter((c: any) => inR(c.issue_date) && c.status === 'cleared').reduce((s: number, c: any) => s + Number(c.amount), 0);
      return {
        month:   label,
        revenue: mInc,
        outflow: mOut,
        margin:  mInc > 0 ? Math.round(((mInc - mOut) / mInc) * 100) : 0,
      };
    });
  }, [dashboardBuckets, income, expenses, checks]);

  const periodInvoices = useMemo(() => {
    const { start, end } = getFinanceDateRange(timePeriod);
    const inRange = (d?: string) => {
      if (!d) return false;
      const dt = parseLocalDate(d);
      return dt >= start && dt <= end;
    };
    return invoices.filter((i: any) => inRange(i.issue_date) || inRange(i.due_date));
  }, [invoices, timePeriod]);

  const invoiceTrendData = useMemo(() => {
    return dashboardBuckets.map(({ label, start, end }) => {
      const inR   = (dt?: string) => {
        if (!dt) return false;
        const d2 = parseLocalDate(dt);
        return d2 >= start && d2 < end;
      };
      const monthInvoices = invoices.filter((inv: any) => inR(inv.issue_date) || inR(inv.due_date));
      return {
        label,
        outstanding: monthInvoices.filter((inv: any) => inv.status === 'sent').reduce((s: number, inv: any) => s + invoiceTotal(inv), 0),
        overdue:     monthInvoices.filter((inv: any) => inv.status === 'overdue').reduce((s: number, inv: any) => s + invoiceTotal(inv), 0),
        collected:   monthInvoices.filter((inv: any) => inv.status === 'paid').reduce((s: number, inv: any) => s + invoiceTotal(inv), 0),
      };
    });
  }, [dashboardBuckets, invoices]);

  const invoicePeriodStats = useMemo(() => {
    const total = periodInvoices.reduce((s, i) => s + invoiceTotal(i), 0);
    const paid = periodInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + invoiceTotal(i), 0);
    const open = periodInvoices.filter(i => i.status === 'sent' || i.status === 'overdue').reduce((s, i) => s + invoiceTotal(i), 0);
    const overdue = periodInvoices.filter(i => i.status === 'overdue').reduce((s, i) => s + invoiceTotal(i), 0);
    return {
      total,
      paid,
      open,
      overdue,
      count: periodInvoices.length,
      openCount: periodInvoices.filter(i => i.status === 'sent' || i.status === 'overdue').length,
      overdueCount: periodInvoices.filter(i => i.status === 'overdue').length,
      collectionPct: total > 0 ? (paid / total) * 100 : 0,
    };
  }, [periodInvoices]);

  const projectFinancialData = useMemo(() => {
    const active = projects.filter((p: any) => p.status === 'active' || !p.status);
    return active.map((p: any) => {
      const projectExpenses = expenses
        .filter((t: any) => t.project_id === p.id)
        .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
      const projectChecks = checks
        .filter((c: any) => c.project_id === p.id && c.status !== 'voided')
        .reduce((s: number, c: any) => s + Number(c.amount || 0), 0);
      const projectIncome = income
        .filter((t: any) => t.project_id === p.id)
        .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
      const budget = Number(p.budget || 0);
      const spent = projectExpenses + projectChecks;
      return {
        id: p.id,
        name: p.name || 'Untitled project',
        code: p.code,
        budget,
        spent,
        revenue: projectIncome,
        remaining: Math.max(0, budget - spent),
        pct: budget > 0 ? (spent / budget) * 100 : 0,
      };
    }).sort((a, b) => b.budget - a.budget);
  }, [projects, expenses, checks, income]);

  const vendorSpendData = useMemo(() => {
    const m: Record<string, number> = {};
    filtered.expenses.forEach((t: any) => {
      const k = t.vendors?.name || t.vendor_name || t.category || 'Unassigned';
      m[k] = (m[k] || 0) + Number(t.amount || 0);
    });
    filtered.checks.forEach((c: any) => {
      const k = c.vendors?.name || c.payee_name || 'Checks';
      m[k] = (m[k] || 0) + Number(c.amount || 0);
    });
    return Object.entries(m)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [filtered.expenses, filtered.checks]);

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
    return dashboardBuckets.map(({ label, start, end }) => {
      const inR   = (dt: string) => { const d2 = parseLocalDate(dt); return d2 >= start && d2 < end; };
      const inc = income.filter((t: any) => inR(t.transaction_date)).reduce((s: number, t: any) => s + Number(t.amount), 0);
      const out = expenses.filter((t: any) => inR(t.transaction_date)).reduce((s: number, t: any) => s + Number(t.amount), 0)
        + checks.filter((c: any) => inR(c.issue_date) && c.status === 'cleared').reduce((s: number, c: any) => s + Number(c.amount), 0);
      return { month: label, label, balance: inc - out };
    });
  }, [dashboardBuckets, income, expenses, checks]);

  const inflowMonthlyData = useMemo(() => {
    return dashboardBuckets.map(({ label, start, end }) => {
      const inR   = (dt: string) => { const d2 = parseLocalDate(dt); return d2 >= start && d2 < end; };
      return { month: label, label, inflow: income.filter((t: any) => inR(t.transaction_date)).reduce((s: number, t: any) => s + Number(t.amount), 0) };
    });
  }, [dashboardBuckets, income]);

  const inflowCategoryData = useMemo(() => {
    const m: Record<string, number> = {};
    filtered.income.forEach((t: any) => { const k = t.source_name || t.category || 'Other'; m[k] = (m[k] || 0) + Number(t.amount); });
    return Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 7);
  }, [filtered.income]);

  const outflowMonthlyData = useMemo(() => {
    return dashboardBuckets.map(({ label, start, end }) => {
      const inR   = (dt: string) => { const d2 = parseLocalDate(dt); return d2 >= start && d2 < end; };
      return { month: label, label, outflow:
        expenses.filter((t: any) => inR(t.transaction_date)).reduce((s: number, t: any) => s + Number(t.amount), 0)
        + checks.filter((c: any) => inR(c.issue_date) && c.status === 'cleared').reduce((s: number, c: any) => s + Number(c.amount), 0) };
    });
  }, [dashboardBuckets, expenses, checks]);

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

  /* ── Construction risk intelligence (WIP / aging / EAC / compliance) ─────
     Must stay above the entity early-return so hook order is stable. */
  const { data: controlRows = [] } = useFinanceControlSummary();
  const { data: agingRows = [] } = useFinanceAgingSummary();

  const wipBilling = useMemo(() => {
    let over = 0, under = 0;
    for (const r of controlRows as any[]) {
      const v = Number(r.over_under_billed || 0);
      if (v > 0) over += v; else under += Math.abs(v);
    }
    return { over, under, net: over - under };
  }, [controlRows]);

  const arAging = useMemo(() => {
    const buckets: Record<string, number> = {};
    let total = 0;
    for (const r of agingRows as any[]) {
      if (r.aging_type !== 'ar') continue;
      const v = Number(r.open_amount || 0);
      buckets[r.bucket] = (buckets[r.bucket] ?? 0) + v;
      total += v;
    }
    const late30 = (buckets['31-60'] ?? 0) + (buckets['61-90'] ?? 0) + (buckets['90+'] ?? 0);
    const late60 = (buckets['61-90'] ?? 0) + (buckets['90+'] ?? 0);
    return { buckets, total, late30, late60 };
  }, [agingRows]);

  const exposureJobs = useMemo(() => {
    const jobs = (controlRows as any[])
      .filter(r => r.project_status === 'active')
      .map(r => {
        const exposure = Number(r.actual_cost || 0) + Number(r.remaining_commitment || 0);
        const envelope = Number(r.revised_contract_value || 0);
        return { name: r.project_name as string, exposure, envelope, pct: envelope > 0 ? (exposure / envelope) * 100 : 0 };
      })
      .filter(j => j.envelope > 0)
      .sort((a, b) => b.exposure - a.exposure)
      .slice(0, 3);
    const overCount = jobs.filter(j => j.pct > 100).length;
    const worst = jobs.reduce((w, j) => (j.pct > (w?.pct ?? -1) ? j : w), null as null | typeof jobs[number]);
    return { jobs, overCount, worst };
  }, [controlRows]);

  const compliance = useMemo(() => {
    const now = Date.now();
    const soon = now + 30 * 86400000;
    const stateOf = (v: any): 'ok' | 'expiring' | 'expired' | 'unknown' => {
      if (!v.insurance_expiration) return 'unknown';
      const exp = new Date(v.insurance_expiration + 'T12:00:00').getTime();
      if (exp < now) return 'expired';
      if (exp < soon) return 'expiring';
      return 'ok';
    };
    const rows = (vendors as any[]).map(v => ({ id: v.id, name: v.name as string, state: stateOf(v), w9: Boolean(v.w9_on_file), waiver: Boolean(v.lien_waiver_required) }));
    const expired = rows.filter(r => r.state === 'expired');
    const expiring = rows.filter(r => r.state === 'expiring');
    const expiredIds = new Set(expired.map(r => r.id));
    const atRiskChecks = (checks as any[]).filter((c: any) => c.status === 'pending' && c.payee_vendor_id && expiredIds.has(c.payee_vendor_id));
    const atRiskValue = atRiskChecks.reduce((s: number, c: any) => s + Number(c.amount || 0), 0);
    const missingW9 = rows.filter(r => !r.w9).length;
    const waiverRequired = rows.filter(r => r.waiver).length;
    return { rows, expired: expired.length, expiring: expiring.length, atRiskChecks: atRiskChecks.length, atRiskValue, missingW9, waiverRequired };
  }, [vendors, checks]);

  if (!ready)  return null;
  if (!entity) return <Navigate to="/finance" replace />;

  /* ── Post-guard derived values ──────────────────────────────────────────── */
  const hour      = new Date().getHours();
  const greeting  = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const rawName   = user?.user_metadata?.full_name ?? user?.email ?? '';
  const firstName = rawName.includes('@') ? rawName.split('@')[0] : (rawName.split(' ')[0] || '');
  const entityNotice = entity.type === 'construction'
    ? 'Construction operating entity'
    : entity.type === 'energy'
      ? 'Energy services operating entity'
      : 'Holdings and development entity';

  const pMargin = periodStats.income > 0
    ? ((periodStats.income - periodStats.outflow) / periodStats.income) * 100
    : 0;

  const activeProjects = projects.filter((p: any) => p.status === 'active' || !p.status);
  const projectBudgetTotal = projectFinancialData.reduce((s, p) => s + p.budget, 0);
  const projectSpentTotal = projectFinancialData.reduce((s, p) => s + p.spent, 0);
  const projectBurnPct = projectBudgetTotal > 0 ? (projectSpentTotal / projectBudgetTotal) * 100 : 0;
  const vendorSpendTotal = vendorSpendData.reduce((s, v) => s + v.value, 0);
  const topVendorShare = vendorSpendTotal > 0 && vendorSpendData[0] ? (vendorSpendData[0].value / vendorSpendTotal) * 100 : 0;

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
      chart: <NetCashFlowMiniChart data={cashFlowData} positive={periodStats.net >= 0} />,
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
              <RechartsTooltip content={<MiniTooltip formatter={(value: number) => `${Number(value || 0).toFixed(1)}%`} />} allowEscapeViewBox={{ x: true, y: true }} wrapperStyle={{ zIndex: 80, pointerEvents: 'none' }} cursor={{ stroke: 'var(--border)', strokeDasharray: '2 2' }} />
              <Area type="monotone" dataKey="v" name="Margin" stroke="#10b981" fill="url(#mg-g)" strokeWidth={1.7} dot={false} activeDot={{ r: 3, fill: '#10b981', stroke: 'var(--background)', strokeWidth: 1.5 }} />
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
      sub: invoiceAlerts.overdueCount > 0
        ? `${invoiceAlerts.overdueCount} overdue · ${fmtUSD(invoiceAlerts.overdueTotal)}`
        : constructionKPIs.receivables > 0 ? `${invoiceAlerts.outstanding ? 'Open collections' : 'Sent invoices'}` : 'All invoices collected',
      color: constructionKPIs.receivables > 0 ? 'var(--warning)' : 'var(--positive)',
      bg: 'from-violet-50/70 dark:from-violet-950/25 to-violet-50/30 dark:to-violet-950/5',
      chart: <ReceivablesMiniChart data={invoiceTrendData} />,
      onClick: () => navigate('/invoices'),
    },
    {
      id: 'projects',
      label: 'Active Projects',
      value: `${constructionKPIs.activeProjectCount}`,
      sub: projectBudgetTotal > 0
        ? `${Math.round(projectBurnPct)}% committed · ${fmtUSD(projectBudgetTotal)} budget`
        : 'No budgets set',
      color: projectBurnPct > 90 ? 'var(--destructive)' : projectBurnPct > 72 ? 'var(--warning)' : 'var(--foreground)',
      bg: 'from-slate-50/60 dark:from-slate-950/20 to-slate-50/20 dark:to-slate-950/5',
      chart: <ProjectsMiniChart data={projectFinancialData} />,
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

  const toggleCi = (id: string) => setSelectedCiIds(prev =>
    prev.includes(id)
      ? prev.length > 1 ? prev.filter(i => i !== id) : prev
      : prev.length < DEFAULT_CI_MAX ? [...prev, id] : prev
  );

  /* ── Construction intelligence cards ───────────────────────────────────── */
  const unlinkedExpenses = filtered.expenses.filter((t: any) => !t.project_id).length;
  const unlinkedExpenseValue = filtered.expenses
    .filter((t: any) => !t.project_id)
    .reduce((s: number, t: any) => s + Number(t.amount), 0);
  const clearedChecks = filtered.checks.filter((c: any) => c.status === 'cleared').length;
  const checkClearancePct = filtered.checks.length > 0 ? (clearedChecks / filtered.checks.length) * 100 : 100;

  const ciCards = [
    {
      id:         'margin',
      label:      'WIP Over/Under Billings',
      value:      fmtUSD(Math.abs(wipBilling.net)),
      sub:        wipBilling.over + wipBilling.under > 0
        ? (wipBilling.net >= 0 ? 'Net over-billed — client capital working' : 'Net under-billed — fronting our own cash')
        : 'No WIP variance recorded yet',
      detail:     wipBilling.under > wipBilling.over ? 'Cash exposure' : 'Cash cushion',
      valueColor: wipBilling.net >= 0 ? 'text-positive' : 'text-destructive',
      chart:      <WipBillingBar over={wipBilling.over} under={wipBilling.under} />,
    },
    {
      id:         'receivables',
      label:      'Aging Invoice Stack',
      value:      fmtUSD(arAging.total),
      sub:        arAging.total > 0
        ? `${fmtUSD(arAging.late30)} locked 30d+ · ${fmtUSD(arAging.late60)} at 60d+`
        : 'No open receivables',
      detail:     (arAging.buckets['90+'] ?? 0) > 0 ? `${fmtUSD(arAging.buckets['90+'])} at 90d+` : 'None past 90d',
      valueColor: arAging.late60 > 0 ? 'text-destructive' : arAging.late30 > 0 ? 'text-warning' : 'text-positive',
      chart:      <AgingMicroColumns buckets={arAging.buckets} />,
    },
    {
      id:         'projectBurn',
      label:      'Committed Cost Index',
      value:      exposureJobs.worst ? `${Math.round(exposureJobs.worst.pct)}%` : '—',
      sub:        exposureJobs.worst
        ? `${exposureJobs.worst.name} leads exposure vs contract envelope`
        : 'Actual + open commitments vs revised contract',
      detail:     exposureJobs.overCount > 0 ? `${exposureJobs.overCount} over envelope` : `Top ${exposureJobs.jobs.length} tracked`,
      valueColor: exposureJobs.overCount > 0 ? 'text-destructive' : (exposureJobs.worst?.pct ?? 0) > 85 ? 'text-warning' : 'text-foreground',
      chart:      <ExposureRings jobs={exposureJobs.jobs} />,
    },
    {
      id:         'vendors',
      label:      'Lien Waiver & Compliance',
      value:      compliance.atRiskChecks > 0 ? fmtUSD(compliance.atRiskValue) : `${compliance.expired + compliance.expiring}`,
      sub:        compliance.atRiskChecks > 0
        ? `${compliance.atRiskChecks} pending check${compliance.atRiskChecks !== 1 ? 's' : ''} to expired-COI vendors`
        : `${compliance.expired} expired COI · ${compliance.expiring} expiring ≤30d · ${compliance.missingW9} missing W-9`,
      detail:     compliance.waiverRequired > 0 ? `${compliance.waiverRequired} need lien waivers` : 'No waiver flags',
      valueColor: compliance.atRiskChecks > 0 || compliance.expired > 0 ? 'text-destructive' : compliance.expiring > 0 ? 'text-warning' : 'text-positive',
      chart:      <ComplianceMatrix vendors={compliance.rows} />,
    },
    {
      id:         'unlinked',
      label:      'Unlinked Costs',
      value:      `${unlinkedExpenses}`,
      sub:        `${fmtUSD(unlinkedExpenseValue)} needs job-cost assignment`,
      detail:     unlinkedExpenses === 0 ? 'Fully coded' : 'Review coding',
      valueColor: unlinkedExpenses === 0 ? 'text-positive' : 'text-warning',
      chart:      <MiniArea data={cashFlowData.map(d => ({ label: d.label, value: d.outflow }))} dataKey="value" name="Uncoded cost trend" color="#f59e0b" gid="cig-unlinked" height={36} formatter={(v) => fmtUSD(Number(v || 0))} />,
    },
    {
      id:         'clearance',
      label:      'Check Clearance',
      value:      `${checkClearancePct.toFixed(0)}%`,
      sub:        `${clearedChecks} cleared · ${filtered.checks.length - clearedChecks} open in range`,
      detail:     checkClearancePct >= 80 ? 'Strong controls' : 'Follow up',
      valueColor: checkClearancePct >= 80 ? 'text-positive' : checkClearancePct >= 50 ? 'text-warning' : 'text-destructive',
      chart:      <PendingAgingChart agingBuckets={pendingAgingData} totalValue={stats.pendingValue} />,
    },
  ];
  const displayCiCards = ciCards.filter(c => selectedCiIds.includes(c.id));

  /* ── Render ─────────────────────────────────────────────────────────────── */
  return (
    <AppShell
      hideMobileMenuButton
      mobileHeaderActions={
        <div className="flex items-center gap-1">
          <UserAvatar name={user?.user_metadata?.full_name} email={user?.email} />
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="h-9 px-3 min-w-[4.5rem] flex items-center justify-center gap-1.5 border border-border bg-secondary/60 hover:bg-secondary transition-colors"
            aria-label="Open finance hub"
          >
            <Layers className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span className="text-[8px] uppercase tracking-[0.12em] font-bold">Hub</span>
          </button>
        </div>
      }
    >
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
                {entity.name} · {entityNotice}
              </span>
            </div>
            <h1 className="text-xl font-semibold tracking-tight leading-snug">
              {greeting}{firstName ? `, ${firstName}` : ''}.
            </h1>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            <CompactPeriodPicker value={timePeriod} onChange={setTimePeriod} accentColor={entity.color} />
          </div>
        </div>

        {/* Mobile */}
        <div className="sm:hidden px-4 pt-3 pb-2.5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entity.color }} />
                <span className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground font-medium">{entity.name} · {entity.category}</span>
              </div>
              <h1 className="text-[17px] font-semibold tracking-tight leading-tight">
                {greeting}{firstName ? `, ${firstName}` : ''}.
              </h1>
            </div>
            <CompactPeriodPicker value={timePeriod} onChange={setTimePeriod} accentColor={entity.color} />
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
      <div className="px-4 sm:px-8 pt-3 pb-3 border-b border-border/60">
        <div className="flex items-center justify-between mb-2">
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

        <div className={`grid gap-2.5 ${kpiGridCls}`}>
          {displayKpiCards.map((card, idx) => (
            <motion.button key={card.id} onClick={card.onClick}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className={`stat-card group relative text-left bg-gradient-to-br ${card.bg} overflow-visible transition-all duration-200 hover:-translate-y-0.5 h-full flex flex-col`}
            >
              <div className="h-[2px] w-full" style={{ backgroundColor: card.color }} />
              <div className="relative px-2.5 py-2 sm:px-3 sm:pt-2.5 sm:pb-6 grid grid-cols-[minmax(0,1fr)_minmax(82px,38%)] sm:grid-cols-[minmax(0,1fr)_minmax(88px,38%)] gap-2 sm:gap-3 flex-1 min-h-[86px] sm:min-h-[96px] items-center">
                <div className="min-w-0 overflow-hidden flex flex-col justify-center">
                  <div className="text-[8px] sm:text-[9px] uppercase tracking-[0.12em] sm:tracking-[0.15em] text-foreground/65 font-semibold mb-1 leading-tight sm:min-h-[2.1em] flex items-start break-words">
                    {card.label}
                  </div>
                  <div
                    className="text-[clamp(13px,4vw,15px)] sm:text-[clamp(15px,1.35vw,18px)] font-bold tracking-tight font-mono-tab leading-tight sm:min-h-[1.2em] flex items-center min-w-0 truncate"
                    style={{ color: card.color }}
                    title={String(card.value)}
                  >
                    {card.value}
                  </div>
                  <div className="text-[8px] sm:text-[9px] text-foreground/72 mt-1 font-mono-tab leading-snug line-clamp-2 break-words">
                    {card.sub || ''}
                  </div>
                </div>
                {card.chart && <div className="min-w-0 w-full max-w-full mt-0 flex items-center justify-end">{card.chart}</div>}
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

        <div className={`grid gap-2 grid-cols-2 ${displayQaActions.length <= 3 ? 'sm:grid-cols-3' : displayQaActions.length === 4 ? 'sm:grid-cols-4' : displayQaActions.length === 5 ? 'sm:grid-cols-5' : 'sm:grid-cols-6'}`}>
          {displayQaActions.map((a, idx) => (
            <motion.button
              key={a.id}
              onClick={() => handleQaClick(a.dest)}
              initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className="qa-card relative overflow-hidden flex flex-row items-center justify-start gap-2 py-2 px-2.5 group active:scale-[0.98] transition-transform min-w-0"
            >
              <span className="absolute inset-x-0 bottom-0 h-[2px]" style={{ backgroundColor: a.color }} />
              <div className="w-7 h-7 flex items-center justify-center transition-transform duration-200 group-hover:scale-105 shrink-0 border border-border bg-secondary/35">
                <a.icon className="w-3.5 h-3.5" style={{ color: a.color }} strokeWidth={1.6} />
              </div>
              <div className="text-left min-w-0">
                <div className="text-[10px] sm:text-[11px] font-bold tracking-tight leading-tight truncate">{a.label}</div>
                <div className="text-[8px] text-foreground/55 hidden sm:block mt-0.5 leading-snug truncate font-mono-tab">{a.desc}</div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-foreground/30 ml-auto shrink-0 hidden sm:block" strokeWidth={1.5} />
            </motion.button>
          ))}
        </div>
      </div>

      {/* ══ CONSTRUCTION INTELLIGENCE ═══════════════════════════════════════ */}
      <div className="px-4 sm:px-8 pt-4 pb-3 border-b border-border/60">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="micro-label">Construction Intelligence · {periodStats.label}</div>
            <div className="text-[9px] text-muted-foreground mt-0.5 hidden sm:block">
              Live job-cost, collection, vendor, and control signals from this entity.
            </div>
          </div>
          <button
            onClick={() => setCiCustomOpen(o => !o)}
            className={`flex items-center gap-1 text-[10px] font-medium transition-colors ${ciCustomOpen ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Settings2 className="w-3 h-3" strokeWidth={1.5} />
            Customize
          </button>
        </div>

        <AnimatePresence>
          {ciCustomOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <div className="border border-border bg-secondary/20 p-3 mb-3">
                <div className="text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-2">Select up to 4 intelligence widgets</div>
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-1.5">
                  {CI_OPTIONS.map(opt => {
                    const sel = selectedCiIds.includes(opt.id);
                    const dis = !sel && selectedCiIds.length >= DEFAULT_CI_MAX;
                    return (
                      <button key={opt.id} onClick={() => toggleCi(opt.id)} disabled={dis}
                        className={`flex items-center justify-between gap-2 px-2.5 py-2 border text-[10px] text-left transition-all ${
                          sel ? 'border-foreground bg-foreground text-background'
                             : dis ? 'border-border/40 text-muted-foreground/40 cursor-not-allowed'
                             : 'border-border hover:border-foreground/40 text-foreground'}`}>
                        <span className="font-medium truncate">{opt.label}</span>
                        {sel && <CheckIcon className="w-3 h-3 shrink-0" strokeWidth={2.5} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
          {displayCiCards.map((ci, idx) => (
            <motion.div key={ci.label}
              initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className="ci-card border border-border bg-background p-2 sm:p-2.5 transition-shadow duration-200 min-w-0"
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground font-medium leading-tight">{ci.label}</div>
                <div className="text-[8px] text-muted-foreground text-right leading-tight border border-border/70 px-1.5 py-0.5 bg-secondary/30 shrink-0">{ci.detail}</div>
              </div>
              <div className={`text-[15px] sm:text-base font-bold font-mono-tab leading-tight ${ci.valueColor}`}>{ci.value}</div>
              <div className="text-[8px] text-muted-foreground mt-1 leading-snug font-mono-tab line-clamp-1">{ci.sub}</div>
              <div className="mt-1.5">{ci.chart}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ══ PROJECTS + CASH FLOW + RECENT ACTIVITY ══════════════════════════ */}
      <div className="px-4 sm:px-8 pt-4 pb-6">
        <div className="grid gap-3 xl:grid-cols-12 xl:items-start">
          <div className="xl:col-span-7 border border-border overflow-hidden idx-widget">
            <div className="flex items-center justify-between px-3.5 py-3 border-b border-border bg-secondary/25">
              <div>
                <div className="micro-label">Recent Activity</div>
                <div className="text-[9px] text-muted-foreground">{recent.length} movement{recent.length !== 1 ? 's' : ''} in {periodStats.label.toLowerCase()}</div>
              </div>
              <Link to="/ledger" className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground transition-colors">
                View all <ChevronRight className="inline w-3 h-3" />
              </Link>
            </div>

            <div className="grid grid-cols-3 border-b border-border">
              <div className="px-3 py-2">
                <div className="text-[8px] uppercase tracking-[0.16em] text-muted-foreground">Income</div>
                <div className="text-sm font-bold font-mono-tab text-positive">{fmtUSD(periodStats.income)}</div>
              </div>
              <div className="px-3 py-2 border-l border-border">
                <div className="text-[8px] uppercase tracking-[0.16em] text-muted-foreground">Outflow</div>
                <div className="text-sm font-bold font-mono-tab text-destructive">{fmtUSD(periodStats.outflow)}</div>
              </div>
              <div className="px-3 py-2 border-l border-border">
                <div className="text-[8px] uppercase tracking-[0.16em] text-muted-foreground">Net</div>
                <div className={`text-sm font-bold font-mono-tab ${periodStats.net >= 0 ? 'text-positive' : 'text-destructive'}`}>
                  {periodStats.net >= 0 ? '+' : '-'}{fmtUSD(Math.abs(periodStats.net))}
                </div>
              </div>
            </div>

            <div className="sm:hidden divide-y divide-border">
              {recent.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">No activity yet.</div>
              ) : recent.slice(0, 7).map(r => (
                <button key={r.kind + r.id}
                  onClick={() => navigate(r.kind === 'Check' ? '/checks' : r.kind === 'Expense' ? '/expenses' : '/income')}
                  className="w-full grid grid-cols-[1fr_auto] gap-2 p-3 text-left idx-row">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-1"><TypeBadge kind={r.kind} /><span className="text-[9px] text-muted-foreground font-mono-tab">{fmtDate(r.date)}</span></div>
                    <div className="text-[12px] font-medium truncate">{r.label}</div>
                    <div className="text-[9px] text-muted-foreground truncate">{r.project || 'Unassigned'}</div>
                  </div>
                  <span className={`text-xs font-semibold font-mono-tab self-center ${r.amount >= 0 ? 'text-positive' : 'text-destructive'}`}>
                    {r.amount >= 0 ? '+' : '-'}{fmtUSD(Math.abs(r.amount))}
                  </span>
                </button>
              ))}
            </div>

            <div className="hidden sm:block">
              <div className="grid grid-cols-12 px-3.5 py-1.5 border-b border-border text-[9px] uppercase tracking-[0.14em] text-muted-foreground font-medium">
                <div className="col-span-2">Date</div>
                <div className="col-span-2">Type</div>
                <div className="col-span-4">Counterparty</div>
                <div className="col-span-2">Project</div>
                <div className="col-span-2 text-right">Amount</div>
              </div>
              {recent.length === 0 ? (
                <div className="px-3.5 py-10 text-center text-sm text-muted-foreground">No activity this period.</div>
              ) : (
                <div className="divide-y divide-border">
                  {recent.slice(0, 7).map(r => (
                    <button key={r.kind + r.id}
                      onClick={() => navigate(r.kind === 'Check' ? '/checks' : r.kind === 'Expense' ? '/expenses' : '/income')}
                      className="w-full grid grid-cols-12 px-3.5 py-2 text-xs font-mono-tab idx-row items-center transition-colors text-left">
                      <div className="col-span-2 text-muted-foreground text-[10px]">{fmtDate(r.date)}</div>
                      <div className="col-span-2"><TypeBadge kind={r.kind} /></div>
                      <div className="col-span-4 truncate pr-2 text-[11px]">{r.label}</div>
                      <div className="col-span-2 truncate pr-2 text-[10px] text-muted-foreground">{r.project || 'Unassigned'}</div>
                      <div className={`col-span-2 text-right font-semibold text-[11px] ${r.amount >= 0 ? 'text-positive' : 'text-destructive'}`}>
                        {r.amount >= 0 ? '+' : '-'}{fmtUSD(Math.abs(r.amount))}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {recent.length > 7 && (
              <button
                onClick={() => navigate('/ledger')}
                className="w-full border-t border-border px-3.5 py-2.5 text-[10px] uppercase tracking-[0.18em] font-bold text-foreground/70 hover:text-foreground hover:bg-secondary/45 transition-colors"
              >
                View all {recent.length} activity records
              </button>
            )}
          </div>

          <div className="xl:col-span-5 h-fit">
            <CashFlowChart data={cashFlowData} />
          </div>
        </div>

        <div className="grid gap-3 mt-3 lg:grid-cols-3">
          <button onClick={() => navigate('/projects')}
            className="idx-widget border border-border p-3 text-left transition-all min-w-0">
            <div className="flex items-center justify-between mb-2.5">
              <div>
                <div className="micro-label">Active Projects ({activeProjects.length})</div>
                <div className="text-[9px] text-muted-foreground font-mono-tab">
                  {fmtUSD(projectSpentTotal)} committed · {projectBudgetTotal > 0 ? `${Math.round(projectBurnPct)}% burn` : 'no budgets'}
                </div>
              </div>
              <div className="w-8 h-8 flex items-center justify-center bg-blue-600/10 text-blue-600 shrink-0">
                <FolderKanban className="w-4 h-4" strokeWidth={1.5} />
              </div>
            </div>

            {activeProjects.length === 0 ? (
              <div className="py-4 border border-dashed border-border text-center text-[10px] text-muted-foreground">No active projects</div>
            ) : (
              <div className="space-y-1.5">
                {projectFinancialData.slice(0, 4).map(p => (
                  <div key={p.id} className="grid grid-cols-[1fr_auto] gap-2">
                    <div className="min-w-0">
                      <div className="flex justify-between gap-2 text-[9px] mb-0.5">
                        <span className="truncate font-medium">{p.name}</span>
                        <span className="font-mono-tab text-muted-foreground">{p.budget > 0 ? `${Math.round(p.pct)}%` : fmtUSD(p.revenue)}</span>
                      </div>
                      <div className="h-1.5 bg-border/50 overflow-hidden">
                        <div className={`h-full ${p.pct > 90 ? 'bg-destructive' : p.pct > 72 ? 'bg-warning' : 'bg-positive'}`} style={{ width: `${Math.min(100, Math.max(3, p.pct))}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </button>

          <button onClick={() => navigate('/vendors')}
            className="idx-widget border border-border p-3 text-left transition-all min-w-0">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div>
                <div className="micro-label">Vendors</div>
                <div className="text-[9px] text-muted-foreground truncate">{vendors.length} on file</div>
              </div>
              <div className="w-8 h-8 flex items-center justify-center bg-cyan-600/10 text-cyan-600 shrink-0">
                <Users className="w-4 h-4" strokeWidth={1.5} />
              </div>
            </div>
            <div className="text-lg font-bold font-mono-tab">{fmtUSD(vendorSpendTotal)}</div>
            <div className="text-[8px] text-muted-foreground mb-2">period spend</div>
            <div className="space-y-1">
              {vendorSpendData.length === 0 ? (
                <div className="h-10 flex items-center text-[9px] text-muted-foreground">No spend this period</div>
              ) : vendorSpendData.slice(0, 4).map(v => (
                <div key={v.name}>
                  <div className="flex justify-between gap-2 text-[8px]">
                    <span className="truncate">{v.name}</span>
                    <span className="font-mono-tab">{vendorSpendTotal > 0 ? ((v.value / vendorSpendTotal) * 100).toFixed(0) : 0}%</span>
                  </div>
                  <div className="h-1 bg-border/50 overflow-hidden">
                    <div className="h-full bg-cyan-600/75" style={{ width: `${vendorSpendTotal > 0 ? (v.value / vendorSpendTotal) * 100 : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </button>

          <button onClick={() => navigate('/invoices')}
            className="idx-widget border border-border p-3 text-left transition-all min-w-0">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div>
                <div className="micro-label">Invoices</div>
                <div className="text-[9px] text-muted-foreground truncate">{invoicePeriodStats.count} in range</div>
              </div>
              <div className={`w-8 h-8 flex items-center justify-center shrink-0 ${invoiceAlerts.overdueCount > 0 ? 'bg-destructive/10 text-destructive' : 'bg-violet-600/10 text-violet-600'}`}>
                <Receipt className="w-4 h-4" strokeWidth={1.5} />
              </div>
            </div>
            <div className={`text-lg font-bold font-mono-tab ${invoicePeriodStats.overdue > 0 ? 'text-destructive' : ''}`}>
              {fmtUSD(invoicePeriodStats.open || invoiceAlerts.outstanding)}
            </div>
            <div className="text-[8px] text-muted-foreground mb-2">open receivables</div>
            <div className="h-2 bg-border/50 overflow-hidden flex">
              <div className="h-full bg-positive/70" style={{ width: `${invoicePeriodStats.total > 0 ? (invoicePeriodStats.paid / invoicePeriodStats.total) * 100 : 0}%` }} />
              <div className="h-full bg-warning/75" style={{ width: `${invoicePeriodStats.total > 0 ? ((invoicePeriodStats.open - invoicePeriodStats.overdue) / invoicePeriodStats.total) * 100 : 0}%` }} />
              <div className="h-full bg-destructive/75" style={{ width: `${invoicePeriodStats.total > 0 ? (invoicePeriodStats.overdue / invoicePeriodStats.total) * 100 : 0}%` }} />
            </div>
            <div className="grid grid-cols-3 gap-1 mt-2 text-[8px] font-mono-tab text-muted-foreground">
              <span>{invoicePeriodStats.collectionPct.toFixed(0)}% paid</span>
              <span>{invoicePeriodStats.openCount} open</span>
              <span>{invoicePeriodStats.overdueCount} late</span>
            </div>
          </button>
        </div>
      </div>

      <div className="md:hidden pb-6" />
    </AppShell>
  );
}
