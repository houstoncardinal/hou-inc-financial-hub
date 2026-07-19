import { useMemo, useState, useCallback, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import EntityInsightCharts from '@/components/charts/EntityInsightCharts';
import { useEntity } from '@/contexts/EntityContext';
import { useChecks, useTransactions, useProjects, useVendors, useFinanceControlSummary, useFixedAssets } from '@/hooks/useFinance';
import { useCapitalActivity, useHgpJobs, useHoldingsCovenants, useHoldingsNotes } from '@/hooks/useEntityOps';
import { fmtUSD } from '@/lib/format';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, ComposedChart, Legend,
  Brush,
} from 'recharts';
import TimeFilter, { getDateRange } from '@/components/TimeFilter';

const parseLocalDate = (d: string): Date => {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day);
};

/* ─── Constants ─── */
const GOLD = '#9D7E3F';
const INCOME_GREEN = '#16a34a';
const EXPENSE_RED = '#dc2626';
const SLATE = '#334155';

type ChartMode = 'command' | 'cash' | 'risk' | 'mix';
type CardRangeKey = 'inherit' | 'today' | 'week' | 'month' | 'quarter' | 'ytd';

type ChartInsight = {
  title: string;
  value: string;
  detail: string;
  tone?: 'positive' | 'negative' | 'warning' | 'neutral';
};

const CARD_RANGES: { value: CardRangeKey; label: string }[] = [
  { value: 'inherit', label: 'Inherit Global' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'quarter', label: 'This Quarter' },
  { value: 'ytd', label: 'Year to Date' },
];

type ChartPalette = {
  accent: string;
  secondary: string;
  tertiary: string;
  positive: string;
  warning: string;
  negative: string;
  slate: string;
  categorical: string[];
};

function getChartPalette(entityId?: string | null): ChartPalette {
  if (entityId === 'houston-generator-pros') {
    return {
      accent: '#1B72B5',
      secondary: '#0F766E',
      tertiary: '#475569',
      positive: '#059669',
      warning: '#D97706',
      negative: '#DC2626',
      slate: '#334155',
      categorical: ['#1B72B5', '#0F766E', '#475569', '#0891B2', '#64748B', '#16A34A', '#B45309', '#7C3AED'],
    };
  }
  if (entityId === 'houston-enterprise-holdings') {
    return {
      accent: '#047857',
      secondary: '#0F5132',
      tertiary: '#B08A2E',
      positive: '#059669',
      warning: '#B7791F',
      negative: '#B91C1C',
      slate: '#1F2937',
      categorical: ['#047857', '#0F5132', '#B08A2E', '#334155', '#0E7490', '#65A30D', '#7C3AED', '#BE123C'],
    };
  }
  return {
    accent: GOLD,
    secondary: '#1F3A5F',
    tertiary: '#475569',
    positive: INCOME_GREEN,
    warning: '#C08403',
    negative: EXPENSE_RED,
    slate: SLATE,
    categorical: [GOLD, '#1F3A5F', '#64748B', '#0F766E', '#2563EB', '#D97706', '#7C3AED', '#BE123C'],
  };
}

type LedgerFilterPayload = {
  entityId: string;
  label: string;
  search?: string;
  type?: 'income' | 'expense' | 'all';
  projectId?: string;
  source: 'sankey' | 'heatmap';
};

const ledgerFilterKey = 'hou-ledger-cross-filter';

function publishLedgerFilter(payload: LedgerFilterPayload) {
  sessionStorage.setItem(ledgerFilterKey, JSON.stringify(payload));
  window.dispatchEvent(new CustomEvent<LedgerFilterPayload>('hou:ledger-filter', { detail: payload }));
}

function includesAny(value: unknown, terms: string[]) {
  const hay = String(value ?? '').toLowerCase();
  return terms.some(t => hay.includes(t.toLowerCase()));
}

function rangeForCard(key: CardRangeKey, inherited: { start: Date; end: Date }) {
  if (key === 'inherit') return inherited;
  const now = new Date();
  const end = new Date(now);
  let start = new Date(now);

  if (key === 'today') {
    start.setHours(0, 0, 0, 0);
  } else if (key === 'week') {
    const day = start.getDay();
    start.setDate(start.getDate() - day);
    start.setHours(0, 0, 0, 0);
  } else if (key === 'month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (key === 'quarter') {
    const qStart = Math.floor(now.getMonth() / 3) * 3;
    start = new Date(now.getFullYear(), qStart, 1);
  } else if (key === 'ytd') {
    start = new Date(now.getFullYear(), 0, 1);
  }

  return { start, end };
}

function inDateWindow(dateValue: string | undefined, start: Date, end: Date) {
  if (!dateValue) return false;
  const dt = parseLocalDate(dateValue);
  return dt >= start && dt <= end;
}

function seriesBuckets(start: Date, end: Date) {
  const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
  const buckets: { label: string; start: Date; end: Date }[] = [];

  if (days <= 45) {
    const count = Math.min(days, 31);
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(end);
      d.setDate(d.getDate() - i);
      const bStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const bEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
      buckets.push({ label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), start: bStart, end: bEnd });
    }
    return buckets;
  }

  const count = Math.min(12, Math.max(6, Math.ceil(days / 31)));
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setMonth(d.getMonth() - i);
    const bStart = new Date(d.getFullYear(), d.getMonth(), 1);
    const bEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    buckets.push({ label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }), start: bStart, end: bEnd });
  }
  return buckets;
}

function buildCashFlowSeries(income: any[], expenses: any[], checks: any[], start: Date, end: Date) {
  return seriesBuckets(start, end).map(bucket => {
    const inR = (dt: string) => {
      const d = parseLocalDate(dt);
      return d >= bucket.start && d < bucket.end;
    };
    const inflow = income.filter((t: any) => inR(t.transaction_date)).reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
    const exp = expenses.filter((t: any) => inR(t.transaction_date)).reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
    const chk = checks.filter((c: any) => inR(c.issue_date) && c.status === 'cleared').reduce((s: number, c: any) => s + Number(c.amount || 0), 0);
    return { label: bucket.label, inflow, outflow: exp + chk, net: inflow - (exp + chk) };
  });
}

function cumulativeSeries(data: { label: string; net: number }[]) {
  let running = 0;
  return data.map(m => {
    running += m.net;
    return { label: m.label, net: running };
  });
}

function buildCategoryData(expenses: any[]) {
  const map: Record<string, number> = {};
  expenses.forEach((t: any) => {
    const cat = t.category || 'Uncategorized';
    map[cat] = (map[cat] || 0) + Number(t.amount || 0);
  });
  return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
}

function buildVendorData(expenses: any[]) {
  const map: Record<string, number> = {};
  expenses.forEach((t: any) => {
    const name = t.vendors?.name || t.source_name || 'Unlinked';
    map[name] = (map[name] || 0) + Number(t.amount || 0);
  });
  return Object.entries(map).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total).slice(0, 8);
}

function buildIncomeSourceData(income: any[]) {
  const map: Record<string, number> = {};
  income.forEach((t: any) => {
    const src = t.source_name || t.vendors?.name || t.category || 'Other';
    map[src] = (map[src] || 0) + Number(t.amount || 0);
  });
  return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 7);
}

function buildCheckStats(checks: any[]) {
  return {
    cleared: checks.filter((c: any) => c.status === 'cleared').length,
    pending: checks.filter((c: any) => c.status === 'pending').length,
    voided: checks.filter((c: any) => c.status === 'voided').length,
  };
}

function buildCheckVolumeData(checks: any[], start: Date, end: Date) {
  return seriesBuckets(start, end).map(bucket => ({
    label: bucket.label,
    count: checks.filter((c: any) => {
      if (!c.issue_date) return false;
      const d = parseLocalDate(c.issue_date);
      return d >= bucket.start && d < bucket.end;
    }).length,
  }));
}

const CHARTS_CSS = `
  .charts-command {
    position: relative;
    isolation: isolate;
  }
  .charts-command::before {
    content: "";
    position: absolute;
    inset: 0 0 auto 0;
    height: 240px;
    z-index: -1;
    background:
      radial-gradient(circle at 18% 20%, color-mix(in srgb, var(--entity-accent) 18%, transparent), transparent 34%),
      linear-gradient(135deg, color-mix(in srgb, var(--entity-accent) 8%, transparent), transparent 46%);
    pointer-events: none;
  }
  .charts-hero {
    border: 1px solid hsl(var(--border));
    background:
      linear-gradient(135deg, color-mix(in srgb, var(--entity-accent) 10%, transparent), transparent 38%),
      linear-gradient(180deg, rgba(255,255,255,0.94), hsl(var(--secondary) / 0.32));
    box-shadow: 0 24px 65px rgba(15, 23, 42, 0.08);
  }
  .charts-hero-metrics {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }
  .charts-hero-grid {
    background-image:
      linear-gradient(hsl(var(--border) / 0.38) 1px, transparent 1px),
      linear-gradient(90deg, hsl(var(--border) / 0.38) 1px, transparent 1px);
    background-size: 28px 28px;
    mask-image: linear-gradient(90deg, transparent, black 20%, black 80%, transparent);
  }
  .charts-card {
    position: relative;
    border: 1px solid hsl(var(--border));
    background:
      linear-gradient(180deg, rgba(255,255,255,0.96), hsl(var(--background))),
      linear-gradient(135deg, color-mix(in srgb, var(--entity-accent) 22%, transparent), transparent);
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05), 0 20px 42px rgba(15, 23, 42, 0.055);
    animation: chartIn 420ms ease both;
  }
  .charts-card::after {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    background:
      linear-gradient(90deg, color-mix(in srgb, var(--entity-accent) 13%, transparent), transparent 34%),
      radial-gradient(circle at 84% 0%, color-mix(in srgb, var(--entity-accent) 10%, transparent), transparent 26%);
    opacity: 0.55;
  }
  .charts-card-inner {
    position: relative;
    z-index: 1;
  }
  .charts-card:hover {
    box-shadow: 0 2px 4px rgba(15, 23, 42, 0.06), 0 24px 52px rgba(15, 23, 42, 0.08);
    transform: translateY(-1px);
  }
  .charts-mode-button {
    min-height: 44px;
    border: 1px solid hsl(var(--border));
    background: hsl(var(--background));
    color: hsl(var(--muted-foreground));
    transition: border-color 180ms ease, background 180ms ease, color 180ms ease, transform 180ms ease;
  }
  .charts-mode-button[data-active="true"] {
    border-color: color-mix(in srgb, var(--entity-accent) 48%, hsl(var(--border)));
    background: color-mix(in srgb, var(--entity-accent) 10%, hsl(var(--background)));
    color: hsl(var(--foreground));
    box-shadow: inset 0 3px 0 var(--entity-accent);
  }
  .charts-range-select {
    height: 28px;
    max-width: 132px;
    border: 1px solid hsl(var(--border));
    background:
      linear-gradient(180deg, rgba(255,255,255,0.96), hsl(var(--background)));
    color: hsl(var(--foreground));
    padding: 0 24px 0 9px;
    font-size: 9px;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    outline: none;
    appearance: none;
    background-image:
      linear-gradient(45deg, transparent 50%, currentColor 50%),
      linear-gradient(135deg, currentColor 50%, transparent 50%),
      linear-gradient(180deg, rgba(255,255,255,0.96), hsl(var(--background)));
    background-position:
      calc(100% - 12px) 11px,
      calc(100% - 8px) 11px,
      0 0;
    background-size: 4px 4px, 4px 4px, 100% 100%;
    background-repeat: no-repeat;
  }
  .charts-range-select:focus {
    border-color: color-mix(in srgb, var(--entity-accent) 54%, hsl(var(--border)));
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--entity-accent) 12%, transparent);
  }
  .charts-recalculating {
    opacity: 0.58;
    filter: saturate(0.82);
    transition: opacity 180ms ease, filter 180ms ease;
  }
  .charts-data-fade {
    animation: chartIn 260ms ease both;
  }
  .charts-clickable {
    cursor: pointer;
  }
  .charts-clickable:hover {
    background: color-mix(in srgb, var(--entity-accent) 8%, hsl(var(--background)));
  }
  .charts-insight {
    border: 1px solid color-mix(in srgb, var(--entity-accent) 32%, hsl(var(--border)));
    background:
      linear-gradient(135deg, color-mix(in srgb, var(--entity-accent) 11%, transparent), transparent 42%),
      linear-gradient(180deg, rgba(255,255,255,0.98), hsl(var(--background)));
    box-shadow: inset 0 3px 0 var(--entity-accent), 0 18px 44px rgba(15, 23, 42, 0.06);
  }
  .charts-mini-ring {
    background:
      conic-gradient(var(--entity-accent) var(--pct, 35%), hsl(var(--secondary)) 0),
      hsl(var(--background));
  }
  .charts-flow {
    stroke-dasharray: 10 8;
    animation: flowDash 4.2s linear infinite;
  }
  .charts-kpi {
    border: 1px solid hsl(var(--border));
    background: color-mix(in srgb, var(--entity-accent) 5%, hsl(var(--background)));
    min-width: 0;
  }
  .charts-kpi-value {
    font-size: clamp(0.92rem, 1.1vw, 1.18rem);
    line-height: 1.12;
    overflow-wrap: anywhere;
    word-break: normal;
  }
  .charts-money {
    font-variant-numeric: tabular-nums;
    overflow-wrap: anywhere;
  }
  .charts-list-row {
    grid-template-columns: 10px minmax(0, 1fr) 44px minmax(112px, max-content);
  }
  @media (min-width: 1280px) and (max-width: 1535px) {
    .charts-hero-shell {
      grid-template-columns: minmax(0, 1fr) minmax(310px, 0.78fr);
    }
  }
  @keyframes chartIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes flowDash {
    to { stroke-dashoffset: -72; }
  }
  @media (max-width: 640px) {
    .charts-card:hover { transform: none; }
    .charts-range-select {
      max-width: 100%;
      width: 100%;
      height: 34px;
      margin-top: 8px;
    }
  }
`;

function CardRangeSelect({
  value,
  onChange,
}: {
  value: CardRangeKey;
  onChange: (value: CardRangeKey) => void;
}) {
  return (
    <select
      className="charts-range-select"
      value={value}
      aria-label="Chart date range"
      onChange={e => onChange(e.target.value as CardRangeKey)}
    >
      {CARD_RANGES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
    </select>
  );
}

function insightToneClass(tone: ChartInsight['tone']) {
  if (tone === 'positive') return 'text-positive';
  if (tone === 'negative') return 'text-destructive';
  if (tone === 'warning') return 'text-warning';
  return 'text-foreground';
}

function InsightPanel({ insight, entityLabel }: { insight: ChartInsight | null; entityLabel: string }) {
  const active = insight ?? {
    title: 'Interactive Analysis Ready',
    value: entityLabel,
    detail: 'Click a chart slice, bar, check status, risk cell, or cash-flow path to inspect the underlying signal and cross-filter the ledger when available.',
    tone: 'neutral' as const,
  };

  return (
    <section className="charts-insight p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[9px] uppercase tracking-[0.22em] font-black text-muted-foreground">Selected Intelligence</div>
          <div className="mt-1 text-base sm:text-lg font-black truncate">{active.title}</div>
          <div className={`mt-1 text-xl sm:text-2xl font-black font-mono-tab ${insightToneClass(active.tone)}`}>{active.value}</div>
          <p className="mt-2 text-xs sm:text-sm leading-5 text-muted-foreground max-w-4xl">{active.detail}</p>
        </div>
        <div className="w-16 h-16 shrink-0 charts-mini-ring border border-border flex items-center justify-center" style={{ ['--pct' as any]: insight ? '72%' : '35%' }}>
          <div className="w-11 h-11 bg-background border border-border flex items-center justify-center text-[9px] uppercase tracking-[0.12em] font-black text-muted-foreground">
            Live
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Shared tooltip ─── */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background/95 backdrop-blur-sm border border-border/60 px-3 py-2.5 text-xs shadow-md rounded-sm">
      <div className="text-muted-foreground mb-1.5 font-medium tracking-wider">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <span
            className="w-2.5 h-2.5 rounded-sm shrink-0"
            style={{
              backgroundColor: p.color || p.fill || 'var(--entity-accent)',
              boxShadow: typeof p.color === 'string' && !p.color.includes('--') ? `0 0 6px ${p.color}40` : 'none',
            }}
          />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-semibold font-mono-tab">{typeof p.value === 'number' ? fmtUSD(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Chart card wrapper ─── */
function ChartCard({
  title,
  subtitle,
  children,
  className = '',
  toolbar,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  toolbar?: React.ReactNode;
}) {
  return (
    <div className={`charts-card overflow-hidden transition-all duration-300 ${className}`}>
      <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: 'linear-gradient(90deg, var(--entity-accent), var(--entity-secondary), color-mix(in srgb, var(--entity-accent) 28%, white))' }} />
      <div className="charts-card-inner">
        <div className="px-4 py-3 border-b border-border/50 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-5 shrink-0" style={{ backgroundColor: 'var(--entity-accent)' }} />
              <div className="text-[10px] uppercase tracking-[0.2em] font-black text-foreground/80 leading-snug">{title}</div>
            </div>
            {subtitle && <div className="text-[10px] text-muted-foreground mt-1 font-mono-tab leading-relaxed">{subtitle}</div>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden sm:inline-flex border border-border/70 bg-background/70 px-2 py-1 text-[8px] uppercase tracking-[0.16em] font-black text-muted-foreground">Live</span>
            {toolbar}
          </div>
        </div>
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  );
}

/* ─── 1. Cash Flow Trend ─── */
function CashFlowTrendChart({
  data,
  palette,
  onInspect,
  rangeControl,
}: {
  data: { label: string; inflow: number; outflow: number; net: number }[];
  palette: ChartPalette;
  onInspect: (insight: ChartInsight) => void;
  rangeControl?: React.ReactNode;
}) {
  return (
    <ChartCard title="Cash Flow Trend" subtitle="Brush timeline to isolate high-volume periods" toolbar={rangeControl}>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="cfInflow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={palette.positive} stopOpacity={0.28} />
                <stop offset="95%" stopColor={palette.positive} stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="cfOutflow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={palette.negative} stopOpacity={0.24} />
                <stop offset="95%" stopColor={palette.negative} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => fmtUSD(v)} width={60} />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--border)', strokeDasharray: '3 3' }} />
            <Legend
              wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }}
              iconType="circle"
              iconSize={8}
              formatter={(value: string) => <span className="text-muted-foreground">{value}</span>}
            />
            <Area
              type="monotone"
              dataKey="inflow"
              name="Inflow"
              stroke={palette.positive}
              strokeWidth={2.5}
              fill="url(#cfInflow)"
              dot={{ r: 3, fill: palette.positive, cursor: 'pointer' }}
              activeDot={{ r: 5, strokeWidth: 0, onClick: (_: any, d: any) => onInspect({ title: `Cash Inflow · ${d?.payload?.label || 'Period'}`, value: fmtUSD(Number(d?.payload?.inflow || 0)), detail: 'Incoming cash for the selected month in the current entity and time scope.', tone: 'positive' }) }}
              isAnimationActive
              animationDuration={900}
            />
            <Area
              type="monotone"
              dataKey="outflow"
              name="Outflow"
              stroke={palette.negative}
              strokeWidth={2.5}
              fill="url(#cfOutflow)"
              dot={{ r: 3, fill: palette.negative, cursor: 'pointer' }}
              activeDot={{ r: 5, strokeWidth: 0, onClick: (_: any, d: any) => onInspect({ title: `Cash Outflow · ${d?.payload?.label || 'Period'}`, value: fmtUSD(Number(d?.payload?.outflow || 0)), detail: 'Outgoing expense and cleared check activity for the selected month.', tone: 'negative' }) }}
              isAnimationActive
              animationDuration={900}
            />
            <Line
              type="monotone"
              dataKey="net"
              name="Net Position"
              stroke={palette.accent}
              strokeWidth={2}
              strokeDasharray="4 3"
              dot={{ r: 2.5, fill: palette.accent, cursor: 'pointer' }}
              activeDot={{ r: 5, strokeWidth: 0, onClick: (_: any, d: any) => onInspect({ title: `Net Cash · ${d?.payload?.label || 'Period'}`, value: fmtUSD(Number(d?.payload?.net || 0)), detail: 'Net monthly cash movement after comparing inflow and outflow.', tone: Number(d?.payload?.net || 0) >= 0 ? 'positive' : 'negative' }) }}
              isAnimationActive
              animationDuration={900}
            />
            <Brush
              dataKey="label"
              height={22}
              travellerWidth={9}
              stroke="var(--entity-accent)"
              fill="hsl(var(--secondary))"
              tickFormatter={(v: string) => v}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

/* ─── 2. Inflow vs Outflow Bars ─── */
function InflowOutflowChart({
  data,
  palette,
  onInspect,
  rangeControl,
}: {
  data: { label: string; inflow: number; outflow: number }[];
  palette: ChartPalette;
  onInspect: (insight: ChartInsight) => void;
  rangeControl?: React.ReactNode;
}) {
  return (
    <ChartCard title="Inflow vs Outflow" subtitle="Period comparison with independent range control" toolbar={rangeControl}>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => fmtUSD(v)} width={60} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--border)', fillOpacity: 0.1 }} />
            <Legend
              wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }}
              iconType="rect"
              iconSize={8}
              formatter={(value: string) => <span className="text-muted-foreground">{value}</span>}
            />
            <Bar dataKey="inflow" name="Inflow" fill={palette.positive} radius={[3, 3, 0, 0]} maxBarSize={32} className="charts-clickable" isAnimationActive animationDuration={850} onClick={(d: any) => onInspect({ title: `Monthly Inflow · ${d.label}`, value: fmtUSD(Number(d.inflow || 0)), detail: 'Inflow for this month based on filtered income transactions.', tone: 'positive' })} />
            <Bar dataKey="outflow" name="Outflow" fill={palette.negative} radius={[3, 3, 0, 0]} maxBarSize={32} className="charts-clickable" isAnimationActive animationDuration={850} onClick={(d: any) => onInspect({ title: `Monthly Outflow · ${d.label}`, value: fmtUSD(Number(d.outflow || 0)), detail: 'Outflow for this month based on filtered expenses and cleared checks.', tone: 'negative' })} />
            <Line type="monotone" dataKey="inflow" name="Inflow Trend" stroke={palette.positive} strokeWidth={2} dot={false} strokeDasharray="4 2" isAnimationActive animationDuration={850} />
            <Line type="monotone" dataKey="outflow" name="Outflow Trend" stroke={palette.negative} strokeWidth={2} dot={false} strokeDasharray="4 2" isAnimationActive animationDuration={850} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

/* ─── 3. Cumulative Net Position ─── */
function NetPositionChart({
  data,
  palette,
  onInspect,
  rangeControl,
}: {
  data: { label: string; net: number }[];
  palette: ChartPalette;
  onInspect: (insight: ChartInsight) => void;
  rangeControl?: React.ReactNode;
}) {
  const lastNet = data.length > 0 ? data[data.length - 1].net : 0;
  return (
    <ChartCard title="Cumulative Net Position" subtitle={`Current: ${fmtUSD(lastNet)}`} toolbar={rangeControl}>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="cumNetGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={palette.accent} stopOpacity={0.25} />
                <stop offset="95%" stopColor={palette.accent} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.4} vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => fmtUSD(v)} width={60} />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--border)', strokeDasharray: '3 3' }} />
            <Area
              type="monotone"
              dataKey="net"
              name="Net Position"
              stroke={palette.accent}
              strokeWidth={2.5}
              fill="url(#cumNetGrad)"
              dot={{ r: 3, fill: palette.accent, stroke: 'var(--background)', strokeWidth: 1, cursor: 'pointer' }}
              activeDot={{ r: 5, strokeWidth: 0, onClick: (_: any, d: any) => onInspect({ title: `Cumulative Net · ${d?.payload?.label || 'Period'}`, value: fmtUSD(Number(d?.payload?.net || 0)), detail: 'Running net position through this point in the selected period.', tone: Number(d?.payload?.net || 0) >= 0 ? 'positive' : 'negative' }) }}
              isAnimationActive
              animationDuration={900}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

/* ─── 4. Expense Categories Pie ─── */
function CategoryPieChart({
  data,
  palette,
  onInspect,
  rangeControl,
}: {
  data: { name: string; value: number }[];
  palette: ChartPalette;
  onInspect: (insight: ChartInsight) => void;
  rangeControl?: React.ReactNode;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (data.length === 0) {
    return <ChartCard title="Expense Categories"><div className="h-56 flex items-center justify-center text-sm text-muted-foreground">No expense data</div></ChartCard>;
  }
  return (
    <ChartCard title="Expense Categories" subtitle={`${data.length} categories · ${fmtUSD(total)} total`} toolbar={rangeControl}>
      <div className="flex flex-col sm:flex-row items-center gap-5">
        <div className="h-48 w-48 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={42}
                outerRadius={70}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
                className="charts-clickable"
                isAnimationActive
                animationDuration={850}
                onClick={(d: any) => {
                  const pct = total > 0 ? (Number(d.value || 0) / total) * 100 : 0;
                  onInspect({
                    title: `Expense Category · ${d.name}`,
                    value: fmtUSD(Number(d.value || 0)),
                    detail: `${pct.toFixed(1)}% of filtered expenses. Use this to spot spend concentration and drill into ledger records for this category.`,
                    tone: 'negative',
                  });
                }}
              >
                {data.map((_, i) => <Cell key={i} fill={palette.categorical[i % palette.categorical.length]} />)}
              </Pie>
              <Tooltip content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0];
                const pct = total > 0 ? ((Number(d.value) / total) * 100).toFixed(1) : '0';
                return (
                  <div className="bg-background/95 backdrop-blur-sm border border-border/60 px-3 py-2 text-xs shadow-md rounded-sm">
                    <div className="font-medium">{d.name}</div>
                    <div className="font-mono-tab mt-1">{fmtUSD(Number(d.value))}</div>
                    <div className="text-muted-foreground text-[9px] mt-0.5">{pct}% of total</div>
                  </div>
                );
              }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 w-full min-w-0">
          <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-1">
            {data.map((d, i) => {
              const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : '0';
              return (
                <button
                  key={d.name}
                  type="button"
                  onClick={() => onInspect({
                    title: `Expense Category · ${d.name}`,
                    value: fmtUSD(d.value),
                    detail: `${pct}% of filtered expenses. This is a high-signal category for cost review, vendor grouping, and project allocation checks.`,
                    tone: 'negative',
                  })}
                  className="charts-clickable charts-list-row w-full grid items-center gap-2.5 text-xs group px-1.5 py-1 rounded-sm transition-colors text-left"
                >
                  <span className="w-2.5 h-2.5 shrink-0 rounded-sm" style={{ backgroundColor: palette.categorical[i % palette.categorical.length] }} />
                  <span className="min-w-0 whitespace-normal break-words leading-tight text-foreground/80 group-hover:text-foreground">{d.name}</span>
                  <span className="font-mono-tab text-muted-foreground text-[9px] w-10 text-right shrink-0">{pct}%</span>
                  <span className="charts-money font-semibold font-mono-tab text-[10px] text-right shrink-0">{fmtUSD(d.value)}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </ChartCard>
  );
}

/* ─── 5. Income Sources Pie ─── */
function IncomeSourceChart({
  data,
  palette,
  onInspect,
  rangeControl,
}: {
  data: { name: string; value: number }[];
  palette: ChartPalette;
  onInspect: (insight: ChartInsight) => void;
  rangeControl?: React.ReactNode;
}) {
  const INC_COLORS = [palette.positive, palette.secondary, palette.accent, palette.tertiary, '#65a30d', '#0891b2', '#7c3aed'];
  const total = data.reduce((s, d) => s + d.value, 0);
  if (data.length === 0) {
    return <ChartCard title="Income Sources"><div className="h-56 flex items-center justify-center text-sm text-muted-foreground">No income data</div></ChartCard>;
  }
  return (
    <ChartCard title="Income Sources" subtitle={`${data.length} sources · ${fmtUSD(total)} total`} toolbar={rangeControl}>
      <div className="flex flex-col sm:flex-row items-center gap-5">
        <div className="h-48 w-48 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={42}
                outerRadius={70}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
                className="charts-clickable"
                isAnimationActive
                animationDuration={850}
                onClick={(d: any) => {
                  const pct = total > 0 ? (Number(d.value || 0) / total) * 100 : 0;
                  onInspect({
                    title: `Income Source · ${d.name}`,
                    value: fmtUSD(Number(d.value || 0)),
                    detail: `${pct.toFixed(1)}% of filtered income. This shows which client/source channel is carrying current revenue volume.`,
                    tone: 'positive',
                  });
                }}
              >
                {data.map((_, i) => <Cell key={i} fill={INC_COLORS[i % INC_COLORS.length]} />)}
              </Pie>
              <Tooltip content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0];
                const pct = total > 0 ? ((Number(d.value) / total) * 100).toFixed(1) : '0';
                return (
                  <div className="bg-background/95 backdrop-blur-sm border border-border/60 px-3 py-2 text-xs shadow-md rounded-sm">
                    <div className="font-medium">{d.name}</div>
                    <div className="font-mono-tab mt-1">{fmtUSD(Number(d.value))}</div>
                    <div className="text-muted-foreground text-[9px] mt-0.5">{pct}% of total</div>
                  </div>
                );
              }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 w-full min-w-0">
          <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-1">
            {data.map((d, i) => {
              const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : '0';
              return (
                <button
                  key={d.name}
                  type="button"
                  onClick={() => onInspect({
                    title: `Income Source · ${d.name}`,
                    value: fmtUSD(d.value),
                    detail: `${pct}% of filtered income. Good for reviewing revenue concentration, recurring receipts, and entity cash quality.`,
                    tone: 'positive',
                  })}
                  className="charts-clickable charts-list-row w-full grid items-center gap-2.5 text-xs group px-1.5 py-1 rounded-sm transition-colors text-left"
                >
                  <span className="w-2.5 h-2.5 shrink-0 rounded-sm" style={{ backgroundColor: INC_COLORS[i % INC_COLORS.length] }} />
                  <span className="min-w-0 whitespace-normal break-words leading-tight text-foreground/80 group-hover:text-foreground">{d.name}</span>
                  <span className="font-mono-tab text-muted-foreground text-[9px] w-10 text-right shrink-0">{pct}%</span>
                  <span className="charts-money font-semibold font-mono-tab text-[10px] text-right shrink-0">{fmtUSD(d.value)}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </ChartCard>
  );
}

/* ─── 6. Top Vendors by Spend ─── */
function VendorSpendChart({
  data,
  palette,
  onInspect,
  rangeControl,
}: {
  data: { name: string; total: number }[];
  palette: ChartPalette;
  onInspect: (insight: ChartInsight) => void;
  rangeControl?: React.ReactNode;
}) {
  if (data.length === 0) {
    return <ChartCard title="Top Vendors"><div className="h-56 flex items-center justify-center text-sm text-muted-foreground">No vendor data</div></ChartCard>;
  }
  return (
    <ChartCard title="Top Vendors by Spend" subtitle={`${data.length} vendors`} toolbar={rangeControl}>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.4} horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => fmtUSD(v)} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} width={80} />
            <Tooltip content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0];
              return (
                <div className="bg-background/95 backdrop-blur-sm border border-border/60 px-3 py-2 text-xs shadow-md rounded-sm">
                  <div className="font-medium">{d.payload.name}</div>
                  <div className="font-mono-tab mt-1">{fmtUSD(Number(d.value))}</div>
                </div>
              );
            }} cursor={{ fill: 'var(--border)', fillOpacity: 0.1 }} />
            <Bar
              dataKey="total"
              name="Spend"
              fill={palette.negative}
              radius={[0, 3, 3, 0]}
              maxBarSize={16}
              className="charts-clickable"
              isAnimationActive
              animationDuration={850}
              onClick={(d: any) => onInspect({
                title: `Vendor Spend · ${d.name}`,
                value: fmtUSD(Number(d.total || 0)),
                detail: 'Top vendor concentration for the selected entity and period. Use this to review supplier dependency, compliance, and cost exposure.',
                tone: 'warning',
              })}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={palette.categorical[(i + 2) % palette.categorical.length]} fillOpacity={0.94 - (i / data.length) * 0.22} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

/* ─── 7. Check Status + Volume Combo ─── */
function CheckInsightChart({ cleared, pending, voided, volumeData, palette, onInspect, rangeControl }: {
  cleared: number; pending: number; voided: number;
  volumeData: { label: string; count: number }[];
  palette: ChartPalette;
  onInspect: (insight: ChartInsight) => void;
  rangeControl?: React.ReactNode;
}) {
  const statusData = [
    { name: 'Cleared', value: cleared, color: palette.positive },
    { name: 'Pending', value: pending, color: palette.warning },
    { name: 'Voided', value: voided, color: '#64748b' },
  ].filter(d => d.value > 0);
  const totalChecks = cleared + pending + voided;

  return (
    <ChartCard title="Check Insights" subtitle={`${totalChecks} total checks`} toolbar={rangeControl}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Status donut */}
        <div>
          {statusData.length > 0 ? (
            <div className="flex flex-col items-center">
              <div className="h-36 w-36">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={55}
                      paddingAngle={3}
                      dataKey="value"
                      strokeWidth={0}
                      className="charts-clickable"
                      isAnimationActive
                      animationDuration={850}
                      onClick={(d: any) => onInspect({
                        title: `Check Status · ${d.name}`,
                        value: String(d.value || 0),
                        detail: `${d.name} checks in the selected period. This is useful for cash-clearing review, reconciliation timing, and outstanding payment control.`,
                        tone: d.name === 'Cleared' ? 'positive' : d.name === 'Pending' ? 'warning' : 'neutral',
                      })}
                    >
                      {statusData.map((_, i) => <Cell key={i} fill={statusData[i].color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex gap-4 mt-2">
                {statusData.map(d => (
                  <button
                    key={d.name}
                    type="button"
                    onClick={() => onInspect({
                      title: `Check Status · ${d.name}`,
                      value: String(d.value),
                      detail: `${d.name} checks in the selected period. Review this signal before close or reconciliation.`,
                      tone: d.name === 'Cleared' ? 'positive' : d.name === 'Pending' ? 'warning' : 'neutral',
                    })}
                    className="charts-clickable flex items-center gap-1.5 text-[9px] px-1 py-0.5"
                  >
                    <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: d.color }} />
                    <span className="text-muted-foreground">{d.name}</span>
                    <span className="font-semibold font-mono-tab">{d.value}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-36 flex items-center justify-center text-sm text-muted-foreground">No data</div>
          )}
        </div>
        {/* Volume line */}
        <div>
          <div className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground font-medium mb-2">Monthly Volume</div>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={volumeData} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.3} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 8, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 8, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} allowDecimals={false} width={20} />
                <Tooltip content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="bg-background/95 backdrop-blur-sm border border-border/60 px-3 py-2 text-xs shadow-md rounded-sm">
                      <div className="text-muted-foreground mb-0.5">{label}</div>
                      <div className="font-medium">{payload[0].value} checks</div>
                    </div>
                  );
                }} cursor={{ stroke: 'var(--border)', strokeDasharray: '3 3' }} />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="Checks"
                  stroke={palette.accent}
                  strokeWidth={2}
                  dot={{ r: 2.5, fill: palette.accent, cursor: 'pointer' }}
                  activeDot={{
                    r: 5,
                    strokeWidth: 0,
                    onClick: (_: any, d: any) => onInspect({
                      title: `Check Volume · ${d?.payload?.label || 'Month'}`,
                      value: String(d?.payload?.count || 0),
                      detail: 'Monthly check volume trend. Use spikes here to review vendor payment timing and operational cash activity.',
                      tone: 'neutral',
                    }),
                  }}
                  isAnimationActive
                  animationDuration={850}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </ChartCard>
  );
}

/* ─── 8. Data Summary Stat Cards ─── */
function DataSummaryCards({ income, expenses, checks, projects, vendors, onInspect, rangeControl }: {
  income: any[]; expenses: any[]; checks: any[]; projects: any[]; vendors: any[];
  onInspect: (insight: ChartInsight) => void;
  rangeControl?: React.ReactNode;
}) {
  const totalIncome   = income.reduce((s: number, t: any) => s + Number(t.amount), 0);
  const totalExpenses = expenses.reduce((s: number, t: any) => s + Number(t.amount), 0);
  const clearedChecks = checks.filter((c: any) => c.status === 'cleared').reduce((s: number, c: any) => s + Number(c.amount), 0);
  const netPosition   = totalIncome - totalExpenses - clearedChecks;

  const summaryItems = [
    { label: 'Total Income', value: fmtUSD(totalIncome), color: 'var(--positive)', tone: 'positive' as const, detail: 'Gross income rows inside the selected time window.' },
    { label: 'Total Expenses', value: fmtUSD(totalExpenses), color: 'var(--accent)', tone: 'negative' as const, detail: 'Expense rows inside the selected time window, before cleared checks are added to outflow.' },
    { label: 'Net Position', value: fmtUSD(netPosition), color: netPosition >= 0 ? 'var(--positive)' : 'var(--accent)', tone: netPosition >= 0 ? 'positive' as const : 'negative' as const, detail: 'Income minus expenses and cleared checks for the selected period.' },
    { label: 'Checks Issued', value: String(checks.length), color: 'var(--warning)', tone: 'warning' as const, detail: 'Total checks issued inside the selected time window.' },
    { label: 'Active Projects', value: String(projects.filter((p: any) => p.status === 'active').length), color: 'var(--chart-3)', tone: 'neutral' as const, detail: 'Active project or asset records available to this entity.' },
    { label: 'Vendors', value: String(vendors.length), color: 'var(--chart-4)', tone: 'neutral' as const, detail: 'Vendor/supplier records available to this entity.' },
  ];

  return (
    <ChartCard title="Financial Summary" subtitle="Key metrics at a glance" toolbar={rangeControl}>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {summaryItems.map(s => (
          <button
            key={s.label}
            type="button"
            onClick={() => onInspect({ title: s.label, value: s.value, detail: s.detail, tone: s.tone })}
            className="charts-clickable border border-border/60 px-3 py-2.5 transition-colors text-left"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
              <div className="micro-label text-[8px]">{s.label}</div>
            </div>
            <div className="charts-money text-sm font-semibold font-mono-tab">{s.value}</div>
          </button>
        ))}
      </div>
    </ChartCard>
  );
}

/* ─── Advanced entity-aware intelligence layer ─── */
function MiniSankey({ data, accent, reservoirValue, onPick, rangeControl }: {
  data: { from: string; to: string; value: number; search?: string; type?: 'income' | 'expense' | 'all' }[];
  accent: string;
  reservoirValue: number;
  onPick: (payload: Omit<LedgerFilterPayload, 'entityId' | 'source'>) => void;
  rangeControl?: React.ReactNode;
}) {
  const reservoir = 'Entity Reservoir';
  const left = Array.from(new Set(data.filter(d => d.to === reservoir).map(d => d.from)));
  const right = Array.from(new Set(data.filter(d => d.from === reservoir).map(d => d.to)));
  const max = Math.max(1, ...data.map(d => d.value));
  const lx = 18, cx = 50, rx = 82;
  const yOf = (arr: string[], label: string) => {
    const i = Math.max(0, arr.indexOf(label));
    return 16 + (i * (68 / Math.max(1, arr.length - 1)));
  };
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <ChartCard title="Cash Flow Velocity" subtitle={`Dynamic Sankey blueprint · ${fmtUSD(total)} mapped`} toolbar={rangeControl}>
      <div className="h-[280px]">
        <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="entitySankeyGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={accent} stopOpacity="0.22" />
              <stop offset="100%" stopColor={accent} stopOpacity="0.72" />
            </linearGradient>
          </defs>
          {data.map((d, i) => {
            const isInflow = d.to === reservoir;
            const y1 = isInflow ? yOf(left, d.from) : 50;
            const y2 = isInflow ? 50 : yOf(right, d.to);
            const x1 = isInflow ? lx : cx + 8;
            const x2 = isInflow ? cx - 8 : rx;
            const width = 2 + (d.value / max) * 12;
            return (
              <g key={`${d.from}-${d.to}-${i}`} className="cursor-pointer group" onClick={() => onPick({ label: `${d.from} → ${d.to}`, search: d.search || d.from, type: d.type || 'all' })}>
                <path
                  d={`M ${x1} ${y1} C ${isInflow ? 32 : 62} ${y1}, ${isInflow ? 38 : 68} ${y2}, ${x2} ${y2}`}
                  fill="none"
                  stroke="url(#entitySankeyGrad)"
                  strokeWidth={width}
                  strokeLinecap="round"
                  opacity="0.76"
                  className="charts-flow group-hover:opacity-100 transition-opacity"
                />
                <title>{`${d.from} → ${d.to}: ${fmtUSD(d.value)}`}</title>
              </g>
            );
          })}
          <g transform={`translate(${cx},50)`}>
            <rect x="-8" y="-19" width="16" height="38" rx="2.2" fill={accent} opacity="0.92" />
            <rect x="-6" y="-17" width="12" height="34" rx="1.7" fill="rgba(255,255,255,0.18)" />
            <text x="0" y="-2" textAnchor="middle" fontSize="2.6" fill="white" className="font-black">NET</text>
            <text x="0" y="3" textAnchor="middle" fontSize="2.3" fill="white" className="font-bold">{fmtUSD(reservoirValue).replace('.00', '')}</text>
          </g>
          {left.map(label => (
            <g key={`l-${label}`} transform={`translate(${lx},${yOf(left, label)})`}>
              <rect x="-15" y="-4.7" width="29" height="9.4" rx="1.5" fill="hsl(var(--background))" stroke="hsl(var(--border))" />
              <text x="-13.5" y="1.2" fontSize="2.65" fill="currentColor" className="font-bold">{label.slice(0, 17)}</text>
            </g>
          ))}
          {right.map(label => (
            <g key={`r-${label}`} transform={`translate(${rx},${yOf(right, label)})`}>
              <rect x="-1" y="-4.7" width="27" height="9.4" rx="1.5" fill="hsl(var(--background))" stroke="hsl(var(--border))" />
              <text x="1" y="1.2" fontSize="2.65" fill="currentColor" className="font-bold">{label.slice(0, 17)}</text>
            </g>
          ))}
        </svg>
      </div>
    </ChartCard>
  );
}

function WaterfallChart({ data, title, subtitle, palette, onInspect, rangeControl }: {
  data: { label: string; value: number; kind: 'start' | 'up' | 'down' | 'end' }[];
  title: string;
  subtitle: string;
  palette: ChartPalette;
  onInspect: (insight: ChartInsight) => void;
  rangeControl?: React.ReactNode;
}) {
  let running = 0;
  const rows = data.map(d => {
    const start = d.kind === 'start' ? 0 : running;
    if (d.kind === 'start') running = d.value;
    else if (d.kind === 'end') running = d.value;
    else running += d.value;
    return { ...d, start, end: running, delta: d.kind === 'end' ? d.value - start : d.value };
  });
  const chartRows = rows.map(r => ({ ...r, base: Math.min(r.start, r.end), height: Math.abs(r.end - r.start) || Math.abs(r.value) }));
  return (
    <ChartCard title={title} subtitle={subtitle} toolbar={rangeControl}>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartRows} margin={{ top: 10, right: 10, left: 0, bottom: 24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.45} vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }} interval={0} angle={-14} height={50} textAnchor="end" />
            <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => fmtUSD(v)} width={64} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="base" stackId="wf" fill="transparent" />
            <Bar
              dataKey="height"
              name="Impact"
              stackId="wf"
              radius={[3, 3, 0, 0]}
              className="charts-clickable"
              isAnimationActive
              animationDuration={900}
              onClick={(d: any) => onInspect({
                title: `Waterfall · ${d.label}`,
                value: fmtUSD(Number(d.delta || d.value || 0)),
                detail: `${d.label} contributes to the entity-specific waterfall model. Positive steps add value; negative steps reduce margin or net asset value.`,
                tone: d.kind === 'down' ? 'negative' : d.kind === 'end' ? 'neutral' : 'positive',
              })}
            >
              {chartRows.map((r, i) => <Cell key={i} fill={r.kind === 'down' ? palette.negative : r.kind === 'end' ? palette.accent : palette.positive} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

function BulletGraphs({ title, subtitle, rows, mode, palette, onInspect, rangeControl }: {
  title: string;
  subtitle: string;
  mode: 'cost' | 'covenant';
  rows: { label: string; value: number; target: number; caption: string; search?: string }[];
  palette: ChartPalette;
  onInspect: (insight: ChartInsight) => void;
  rangeControl?: React.ReactNode;
}) {
  return (
    <ChartCard title={title} subtitle={subtitle} toolbar={rangeControl}>
      <div className="space-y-3">
        {rows.slice(0, 8).map((row, index) => {
          const pct = row.target > 0 ? (row.value / row.target) * 100 : 0;
          const bad = mode === 'cost' ? pct >= 81 : pct >= 80;
          const warn = mode === 'cost' ? pct >= 51 && pct < 81 : pct >= 65 && pct < 80;
          return (
            <button
              key={`${row.label}-${index}`}
              type="button"
              onClick={() => onInspect({
                title: `Target Exposure · ${row.label}`,
                value: `${pct.toFixed(1)}%`,
                detail: `${row.caption}. Current value is ${fmtUSD(row.value)} against a target/baseline of ${fmtUSD(row.target)}.`,
                tone: bad ? 'negative' : warn ? 'warning' : 'positive',
              })}
              className="charts-clickable w-full space-y-1.5 p-2 text-left"
            >
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="font-bold truncate">{row.label}</span>
                <span className={`font-mono-tab font-black ${bad ? 'text-destructive' : warn ? 'text-warning' : 'text-positive'}`}>{pct.toFixed(1)}%</span>
              </div>
              <div className="relative h-8 border border-border bg-secondary/25 overflow-hidden">
                <div className="absolute inset-y-0 left-0 w-1/2 bg-slate-500/10" />
                <div className="absolute inset-y-0 left-1/2 w-[30%] bg-amber-500/14" />
                <div className="absolute inset-y-0 left-[80%] right-0 bg-red-500/14" />
                <div className="absolute top-0 bottom-0 w-px bg-foreground/70" style={{ left: '100%' }} />
                <div className="absolute top-1 bottom-1 w-px bg-foreground/25" style={{ left: '50%' }} />
                <div className="absolute top-1 bottom-1 w-px bg-foreground/25" style={{ left: '80%' }} />
                <div
                  className="absolute top-1/2 h-[5px] -translate-y-1/2 left-0 transition-all duration-700 shadow-sm"
                  style={{
                    width: `${Math.min(pct, 130)}%`,
                    background: bad ? palette.negative : warn ? palette.warning : palette.slate,
                  }}
                />
                <div
                  className="absolute top-[5px] bottom-[5px] w-[3px] bg-foreground shadow-[0_0_0_1px_rgba(255,255,255,0.7)]"
                  style={{ left: `${Math.min(100, Math.max(0, pct))}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] text-muted-foreground">
                <span>{row.caption}</span>
                <span>{fmtUSD(row.value)} / {fmtUSD(row.target)}</span>
              </div>
            </button>
          );
        })}
        {!rows.length && <div className="h-40 flex items-center justify-center text-xs text-muted-foreground">No target data available for this entity yet.</div>}
      </div>
    </ChartCard>
  );
}

function RiskHeatmap({ title, subtitle, points, accent, onPick, rangeControl }: {
  title: string;
  subtitle: string;
  accent: string;
  points: { label: string; x: number; y: number; z: number; search: string; type?: 'income' | 'expense' | 'all'; note: string }[];
  onPick: (payload: Omit<LedgerFilterPayload, 'entityId' | 'source'>) => void;
  rangeControl?: React.ReactNode;
}) {
  const maxX = Math.max(1, ...points.map(p => p.x));
  const xOf = (x: number) => 12 + (Math.min(1, x / maxX) * 76);
  const yOf = (y: number) => 84 - (Math.min(1, y / 4) * 68);
  return (
    <ChartCard title={title} subtitle={subtitle} toolbar={rangeControl}>
      <div className="h-72">
        <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
          <rect x="10" y="12" width="39" height="36" fill="rgba(5,150,105,0.07)" stroke="hsl(var(--border))" />
          <rect x="49" y="12" width="41" height="36" fill="rgba(220,38,38,0.14)" stroke="hsl(var(--border))" />
          <rect x="10" y="48" width="39" height="38" fill="rgba(148,163,184,0.09)" stroke="hsl(var(--border))" />
          <rect x="49" y="48" width="41" height="38" fill="rgba(217,119,6,0.11)" stroke="hsl(var(--border))" />
          <text x="12" y="10" fontSize="3" fill="currentColor" className="font-black">LEGAL EXPOSURE</text>
          <text x="52" y="94" fontSize="3" fill="currentColor" className="font-black">FINANCIAL SCALE</text>
          <text x="53" y="18" fontSize="3" fill={EXPENSE_RED} className="font-black">HIGH RISK</text>
          <line x1="49" x2="49" y1="12" y2="86" stroke="hsl(var(--foreground))" strokeOpacity=".35" strokeDasharray="3 3" />
          <line x1="10" x2="90" y1="48" y2="48" stroke="hsl(var(--foreground))" strokeOpacity=".35" strokeDasharray="3 3" />
          {points.map((p, i) => {
            const highRisk = p.x / maxX > 0.5 && p.y >= 2;
            const r = Math.max(3.3, Math.min(9, 3.5 + p.z * 0.6));
            return (
              <g key={`${p.label}-${i}`} className="cursor-pointer" onClick={() => onPick({ label: p.label, search: p.search, type: p.type || 'all' })}>
                <circle cx={xOf(p.x)} cy={yOf(p.y)} r={r + (highRisk ? 2.2 : 0)} fill={highRisk ? EXPENSE_RED : accent} opacity={highRisk ? 0.16 : 0.1} />
                <circle cx={xOf(p.x)} cy={yOf(p.y)} r={r} fill={highRisk ? EXPENSE_RED : p.y >= 2 ? GOLD : accent} opacity="0.86" />
                <text x={xOf(p.x)} y={yOf(p.y) - r - 2} textAnchor="middle" fontSize="2.5" fill="currentColor" className="font-bold">{p.label.slice(0, 12)}</text>
                <title>{`${p.label}: ${fmtUSD(p.x)} · ${p.y} risk flags · ${p.note}`}</title>
              </g>
            );
          })}
        </svg>
      </div>
    </ChartCard>
  );
}

function ScopedLedgerPreview({ rows, filter, onClear }: {
  rows: any[];
  filter: LedgerFilterPayload | null;
  onClear: () => void;
}) {
  if (!filter) return null;
  return (
    <div className="border border-border bg-background p-3">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] font-black text-muted-foreground">Ledger Cross-Filter</div>
          <div className="text-sm font-bold">{filter.label}</div>
        </div>
        <button onClick={onClear} className="h-8 border border-border px-3 text-[9px] uppercase tracking-[0.14em] font-bold">Clear</button>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[720px]">
          {rows.slice(0, 8).map(r => (
            <div key={`${r.kind}-${r.id}`} className="grid grid-cols-[110px_90px_1fr_1fr_120px] gap-3 py-2 border-t border-border text-xs">
              <div className="font-mono-tab text-muted-foreground">{r.date}</div>
              <div className="uppercase text-[9px] tracking-[0.12em] font-bold">{r.kind}</div>
              <div className="font-semibold truncate">{r.party}</div>
              <div className="text-muted-foreground truncate">{r.context}</div>
              <div className={`font-mono-tab text-right font-bold ${r.amount >= 0 ? 'text-positive' : 'text-destructive'}`}>{fmtUSD(Math.abs(r.amount))}</div>
            </div>
          ))}
          {!rows.length && <div className="py-8 text-center text-xs text-muted-foreground">No ledger rows match this chart selection.</div>}
        </div>
      </div>
    </div>
  );
}

function EnterpriseIntelligenceCharts({ income, expenses, checks, projects, vendors, focus = 'command', onInspect, rangeControl }: {
  income: any[]; expenses: any[]; checks: any[]; projects: any[]; vendors: any[];
  focus?: ChartMode;
  onInspect: (insight: ChartInsight) => void;
  rangeControl?: React.ReactNode;
}) {
  const { entity } = useEntity();
  const entityId = entity?.id ?? 'houston-enterprise';
  const palette = useMemo(() => getChartPalette(entityId), [entityId]);
  const accent = entity?.color ?? palette.accent;
  const { data: controls = [] } = useFinanceControlSummary();
  const { data: hgpJobs = [] } = useHgpJobs();
  const { data: holdingsNotes = [] } = useHoldingsNotes();
  const { data: covenants = [] } = useHoldingsCovenants();
  const { data: capitalActivity = [] } = useCapitalActivity();
  const { data: fixedAssets = [] } = useFixedAssets();
  const [activeFilter, setActiveFilter] = useState<LedgerFilterPayload | null>(() => {
    try {
      const raw = sessionStorage.getItem(ledgerFilterKey);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });

  const pushFilter = (source: 'sankey' | 'heatmap', payload: Omit<LedgerFilterPayload, 'entityId' | 'source'>) => {
    const next = { ...payload, entityId, source };
    setActiveFilter(next);
    onInspect({
      title: source === 'sankey' ? 'Cash Flow Path Selected' : 'Risk Cell Selected',
      value: payload.label,
      detail: 'The chart selection is now mirrored in the ledger cross-filter preview and broadcast to the Ledger screen for deeper review.',
      tone: source === 'heatmap' ? 'warning' : 'neutral',
    });
    publishLedgerFilter(next);
  };

  const sankeyData = useMemo(() => {
    const reservoir = 'Entity Reservoir';
    const incomeMap: Record<string, number> = {};
    income.forEach((t: any) => {
      const source = t.source_name || t.vendors?.name || t.category || 'Client Receipts';
      incomeMap[source] = (incomeMap[source] || 0) + Number(t.amount || 0);
    });
    const expenseMap: Record<string, number> = {};
    expenses.forEach((t: any) => {
      const cat = t.category || t.vendors?.name || 'Uncategorized';
      expenseMap[cat] = (expenseMap[cat] || 0) + Number(t.amount || 0);
    });
    const inflows = Object.entries(incomeMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([from, value]) => ({ from, to: reservoir, value, search: from, type: 'income' as const }));
    const outflows = Object.entries(expenseMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([to, value]) => ({ from: reservoir, to, value, search: to, type: 'expense' as const }));
    return [...inflows, ...outflows].filter(d => d.value > 0);
  }, [income, expenses]);

  const reservoirValue = useMemo(() => {
    const totalIncome = income.reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
    const totalExpenses = expenses.reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
    const cleared = checks.filter((c: any) => c.status === 'cleared').reduce((s: number, c: any) => s + Number(c.amount || 0), 0);
    return totalIncome - totalExpenses - cleared;
  }, [income, expenses, checks]);

  const waterfallData = useMemo(() => {
    if (entityId === 'houston-enterprise') {
      const original = (projects as any[]).reduce((s, p) => s + Number(p.budget || 0), 0);
      const approvedCo = (controls as any[]).reduce((s, r) => s + Number(r.approved_change_orders || 0), 0);
      const actualCost = expenses.reduce((s: number, r: any) => s + Number(r.amount || 0), 0)
        + checks.filter((c: any) => c.status === 'cleared').reduce((s: number, c: any) => s + Number(c.amount || 0), 0);
      return [
        { label: 'Original Contract', value: original, kind: 'start' as const },
        { label: 'Approved COs', value: approvedCo, kind: 'up' as const },
        { label: 'Actual Costs', value: -actualCost, kind: 'down' as const },
        { label: 'Net Margin', value: original + approvedCo - actualCost, kind: 'end' as const },
      ];
    }
    const acquisition = (fixedAssets as any[]).reduce((s, a) => s + Number(a.cost_basis || 0), 0)
      || (hgpJobs as any[]).reduce((s, j) => s + Number(j.equipment_cost || 0), 0);
    const capex = (hgpJobs as any[]).reduce((s, j) => s + Number(j.materials_cost || 0) + Number(j.labor_cost || 0), 0);
    const dep = (fixedAssets as any[]).reduce((s, a) => s + Number(a.accumulated_depreciation || 0), 0);
    return [
      { label: 'Initial Acquisition', value: acquisition, kind: 'start' as const },
      { label: 'Capital Improvements', value: capex, kind: 'up' as const },
      { label: 'Amort. / Deprec.', value: -dep, kind: 'down' as const },
      { label: 'Net Asset Value', value: acquisition + capex - dep, kind: 'end' as const },
    ];
  }, [entityId, projects, controls, fixedAssets, hgpJobs, expenses, checks]);

  const bulletRows = useMemo(() => {
    if (entityId === 'houston-enterprise') {
      const spendByProject = new Map<string, number>();
      expenses.forEach((t: any) => {
        if (!t.project_id) return;
        spendByProject.set(t.project_id, (spendByProject.get(t.project_id) || 0) + Number(t.amount || 0));
      });
      checks.forEach((c: any) => {
        if (!c.project_id || c.status !== 'cleared') return;
        spendByProject.set(c.project_id, (spendByProject.get(c.project_id) || 0) + Number(c.amount || 0));
      });
      return (controls as any[]).map(r => ({
        label: r.project_name || 'Project',
        value: spendByProject.get(r.project_id) || Number(r.committed_cost || r.actual_cost || 0),
        target: Number(r.revised_contract_value || r.budget || 1),
        caption: 'Committed costs vs contract budget baseline',
        search: r.project_name,
      }));
    }
    return (holdingsNotes as any[]).filter(n => n.status === 'active').map(n => {
      const ltv = Number(n.metadata?.ltv_ratio || n.ltv_ratio || 0);
      const value = ltv > 0 ? ltv : Number(n.outstanding_balance || 0);
      const target = ltv > 0 ? 100 : Math.max(Number(n.original_principal || n.outstanding_balance || 1), 1);
      return {
        label: n.counterparty_name || 'Note',
        value,
        target,
        caption: ltv > 0 ? 'LTV ratio vs banking covenant ceiling' : 'Outstanding balance vs original principal',
        search: n.counterparty_name,
      };
    });
  }, [entityId, controls, holdingsNotes, expenses, checks]);

  const heatmapPoints = useMemo(() => {
    if (entityId === 'houston-enterprise') {
      const spend: Record<string, number> = {};
      expenses.forEach((t: any) => {
        const name = t.vendors?.name || t.source_name || 'Unlinked Vendor';
        spend[name] = (spend[name] || 0) + Number(t.amount || 0);
      });
      return Object.entries(spend).map(([label, x]) => {
        const vendor = (vendors as any[]).find(v => v.name === label) || {};
        const missing = [vendor.w9_on_file === false, vendor.coi_expires_at && new Date(vendor.coi_expires_at) < new Date(), !vendor.lien_waiver_status || vendor.lien_waiver_status === 'outstanding'].filter(Boolean).length;
        return { label, x, y: missing, z: x / 1000, search: label, type: 'expense' as const, note: 'Spend vs W-9 / COI / lien-waiver exposure' };
      }).sort((a, b) => b.x * Math.max(1, b.y) - a.x * Math.max(1, a.y)).slice(0, 24);
    }
    const covenantPoints = (covenants as any[]).map(c => {
      const dueDays = c.next_review_date ? Math.max(0, (new Date(c.next_review_date).getTime() - Date.now()) / 86400000) : 180;
      const y = c.status === 'breached' ? 4 : c.status === 'warning' || c.status === 'at_risk' ? 3 : dueDays <= 30 ? 2 : 1;
      return { label: c.name, x: Number(c.current_value || c.threshold_value || 1), y, z: 8 - Math.min(7, dueDays / 30), search: c.name, type: 'all' as const, note: `Status: ${String(c.status || 'compliant').replace(/_/g, ' ')}` };
    });
    const maturityPoints = (holdingsNotes as any[]).filter(n => n.maturity_date).map(n => {
      const days = (new Date(n.maturity_date).getTime() - Date.now()) / 86400000;
      return { label: n.counterparty_name, x: Number(n.outstanding_balance || 0), y: days <= 90 ? 4 : days <= 180 ? 3 : 1, z: Math.max(1, 8 - Math.max(0, days / 60)), search: n.counterparty_name, type: 'all' as const, note: `Matures ${new Date(n.maturity_date).toLocaleDateString()}` };
    });
    return [...covenantPoints, ...maturityPoints].slice(0, 24);
  }, [entityId, expenses, vendors, covenants, holdingsNotes]);

  const ledgerPreviewRows = useMemo(() => {
    if (!activeFilter || activeFilter.entityId !== entityId) return [];
    const term = String(activeFilter.search || '').toLowerCase();
    const all = [
      ...income.map((t: any) => ({ id: t.id, kind: 'Income', date: t.transaction_date, party: t.source_name || t.vendors?.name || 'Income', context: [t.category, t.description, t.projects?.name].filter(Boolean).join(' · '), amount: Number(t.amount || 0), raw: t })),
      ...expenses.map((t: any) => ({ id: t.id, kind: 'Expense', date: t.transaction_date, party: t.vendors?.name || t.source_name || 'Expense', context: [t.category, t.description, t.projects?.name].filter(Boolean).join(' · '), amount: -Number(t.amount || 0), raw: t })),
      ...checks.map((c: any) => ({ id: c.id, kind: 'Check', date: c.issue_date, party: c.payee_name || 'Check', context: [c.memo, c.projects?.name].filter(Boolean).join(' · '), amount: -Number(c.amount || 0), raw: c })),
    ];
    return all.filter(r => {
      if (activeFilter.type && activeFilter.type !== 'all' && r.kind.toLowerCase() !== activeFilter.type) return false;
      if (!term) return true;
      return [r.party, r.context, r.raw?.external_reference, r.raw?.category, r.raw?.transaction_number, r.raw?.check_number].filter(Boolean).join(' ').toLowerCase().includes(term);
    }).sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  }, [activeFilter, entityId, income, expenses, checks]);

  return (
    <div className="space-y-4">
      {(focus === 'command' || focus === 'mix' || focus === 'cash') && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <MiniSankey data={sankeyData} accent={accent} reservoirValue={reservoirValue} onPick={p => pushFilter('sankey', p)} rangeControl={rangeControl} />
          <WaterfallChart
            data={waterfallData}
            palette={palette}
            onInspect={onInspect}
            rangeControl={rangeControl}
            title={entityId === 'houston-enterprise' ? 'Project Variance Waterfall' : 'Capital Adjustments Waterfall'}
            subtitle={entityId === 'houston-enterprise' ? 'Original contract -> change orders -> actual costs -> margin' : 'Acquisition cost -> CapEx -> depreciation/amortization -> net asset value'}
          />
        </div>
      )}
      {(focus === 'command' || focus === 'mix' || focus === 'risk') && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <BulletGraphs
            title={entityId === 'houston-enterprise' ? 'Committed Cost Exposure' : 'Note Yield / LTV Covenant Bullets'}
            subtitle={entityId === 'houston-enterprise' ? '0-50 safe · 51-80 warning · 81+ over-budget exposure' : 'Institutional covenant pressure by note/counterparty'}
            rows={bulletRows}
            mode={entityId === 'houston-enterprise' ? 'cost' : 'covenant'}
            palette={palette}
            onInspect={onInspect}
            rangeControl={rangeControl}
          />
          <RiskHeatmap
            title={entityId === 'houston-enterprise' ? 'Vendor Compliance Risk Matrix' : 'Regulatory / Investment Compliance Matrix'}
            subtitle={entityId === 'houston-enterprise' ? 'X: spend · Y: missing W-9 / COI / lien waivers' : 'X: exposure · Y: maturity / filing / covenant pressure'}
          points={heatmapPoints}
          accent={accent}
          onPick={p => pushFilter('heatmap', p)}
          rangeControl={rangeControl}
        />
        </div>
      )}
      <ScopedLedgerPreview
        filter={activeFilter?.entityId === entityId ? activeFilter : null}
        rows={ledgerPreviewRows}
        onClear={() => {
          setActiveFilter(null);
          sessionStorage.removeItem(ledgerFilterKey);
          window.dispatchEvent(new CustomEvent('hou:ledger-filter-clear'));
        }}
      />
    </div>
  );
}

/* ═══════════════════════ MAIN PAGE ═══════════════════════ */
export default function Charts() {
  const { entity } = useEntity();
  const entityId = entity?.id ?? 'houston-enterprise';
  const palette = useMemo(() => getChartPalette(entityId), [entityId]);
  const { data: checks = [] } = useChecks();
  const { data: income = [] } = useTransactions('income');
  const { data: expenses = [] } = useTransactions('expense');
  const { data: projects = [] } = useProjects();
  const { data: vendors = [] } = useVendors();

  /* ── Time filter state ── */
  const [timePeriod, setTimePeriod] = useState('all');
  const [customStart, setCustomStart] = useState<string | undefined>();
  const [customEnd, setCustomEnd] = useState<string | undefined>();
  const [chartMode, setChartMode] = useState<ChartMode>('command');
  const [selectedInsight, setSelectedInsight] = useState<ChartInsight | null>(null);
  const [cardRanges, setCardRanges] = useState<Record<string, CardRangeKey>>({});
  const [isRecalculating, setIsRecalculating] = useState(false);

  const { start, end } = useMemo(() => {
    if (timePeriod === 'custom' && customStart && customEnd) {
      return { start: parseLocalDate(customStart), end: parseLocalDate(customEnd) };
    }
    return getDateRange(timePeriod);
  }, [timePeriod, customStart, customEnd]);

  useEffect(() => {
    setIsRecalculating(true);
    const id = window.setTimeout(() => setIsRecalculating(false), 180);
    return () => window.clearTimeout(id);
  }, [timePeriod, customStart, customEnd, cardRanges]);

  const inheritedRange = useMemo(() => ({ start, end }), [start, end]);

  const selectedCardRange = useCallback((key: string) => cardRanges[key] ?? 'inherit', [cardRanges]);

  const setCardRange = useCallback((key: string, value: CardRangeKey) => {
    setCardRanges(prev => ({ ...prev, [key]: value }));
  }, []);

  const controlFor = useCallback((key: string) => (
    <CardRangeSelect
      value={selectedCardRange(key)}
      onChange={value => setCardRange(key, value)}
    />
  ), [selectedCardRange, setCardRange]);

  const getCardRange = useCallback((key: string) => rangeForCard(selectedCardRange(key), inheritedRange), [selectedCardRange, inheritedRange]);

  const rowsForCard = useCallback((key: string, rows: any[], dateField: string) => {
    const range = getCardRange(key);
    return rows.filter((row: any) => inDateWindow(row?.[dateField], range.start, range.end));
  }, [getCardRange]);

  /* ── Filtered data ── */
  const filteredIncome = useMemo(() => {
    return income.filter((t: any) => {
      const dt = parseLocalDate(t.transaction_date);
      return dt >= start && dt <= end;
    });
  }, [income, start, end]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((t: any) => {
      const dt = parseLocalDate(t.transaction_date);
      return dt >= start && dt <= end;
    });
  }, [expenses, start, end]);

  const filteredChecks = useMemo(() => {
    return checks.filter((c: any) => {
      const dt = parseLocalDate(c.issue_date);
      return dt >= start && dt <= end;
    });
  }, [checks, start, end]);

  const intelligenceIncome = useMemo(() => rowsForCard('intelligence', income, 'transaction_date'), [rowsForCard, income]);
  const intelligenceExpenses = useMemo(() => rowsForCard('intelligence', expenses, 'transaction_date'), [rowsForCard, expenses]);
  const intelligenceChecks = useMemo(() => rowsForCard('intelligence', checks, 'issue_date'), [rowsForCard, checks]);

  const cashRange = useMemo(() => getCardRange('cashFlow'), [getCardRange]);
  const cashIncome = useMemo(() => rowsForCard('cashFlow', income, 'transaction_date'), [rowsForCard, income]);
  const cashExpenses = useMemo(() => rowsForCard('cashFlow', expenses, 'transaction_date'), [rowsForCard, expenses]);
  const cashChecks = useMemo(() => rowsForCard('cashFlow', checks, 'issue_date'), [rowsForCard, checks]);

  const inOutRange = useMemo(() => getCardRange('inOut'), [getCardRange]);
  const inOutIncome = useMemo(() => rowsForCard('inOut', income, 'transaction_date'), [rowsForCard, income]);
  const inOutExpenses = useMemo(() => rowsForCard('inOut', expenses, 'transaction_date'), [rowsForCard, expenses]);
  const inOutChecks = useMemo(() => rowsForCard('inOut', checks, 'issue_date'), [rowsForCard, checks]);

  const netRange = useMemo(() => getCardRange('netPosition'), [getCardRange]);
  const netIncome = useMemo(() => rowsForCard('netPosition', income, 'transaction_date'), [rowsForCard, income]);
  const netExpenses = useMemo(() => rowsForCard('netPosition', expenses, 'transaction_date'), [rowsForCard, expenses]);
  const netChecks = useMemo(() => rowsForCard('netPosition', checks, 'issue_date'), [rowsForCard, checks]);

  const categoryExpenses = useMemo(() => rowsForCard('expenseCategories', expenses, 'transaction_date'), [rowsForCard, expenses]);
  const vendorExpenses = useMemo(() => rowsForCard('vendors', expenses, 'transaction_date'), [rowsForCard, expenses]);
  const incomeSourceRows = useMemo(() => rowsForCard('incomeSources', income, 'transaction_date'), [rowsForCard, income]);
  const checksRange = useMemo(() => getCardRange('checks'), [getCardRange]);
  const checksRows = useMemo(() => rowsForCard('checks', checks, 'issue_date'), [rowsForCard, checks]);
  const summaryIncome = useMemo(() => rowsForCard('summary', income, 'transaction_date'), [rowsForCard, income]);
  const summaryExpenses = useMemo(() => rowsForCard('summary', expenses, 'transaction_date'), [rowsForCard, expenses]);
  const summaryChecks = useMemo(() => rowsForCard('summary', checks, 'issue_date'), [rowsForCard, checks]);

  /* ── Cash flow data ── */
  const cashFlowData = useMemo(() => {
    return buildCashFlowSeries(cashIncome, cashExpenses, cashChecks, cashRange.start, cashRange.end);
  }, [cashIncome, cashExpenses, cashChecks, cashRange]);

  const inOutData = useMemo(() => {
    return buildCashFlowSeries(inOutIncome, inOutExpenses, inOutChecks, inOutRange.start, inOutRange.end);
  }, [inOutIncome, inOutExpenses, inOutChecks, inOutRange]);

  const netFlowData = useMemo(() => {
    return buildCashFlowSeries(netIncome, netExpenses, netChecks, netRange.start, netRange.end);
  }, [netIncome, netExpenses, netChecks, netRange]);

  /* ── Cumulative net ── */
  const cumulativeNet = useMemo(() => {
    return cumulativeSeries(netFlowData);
  }, [netFlowData]);

  /* ── Category breakdown ── */
  const categoryData = useMemo(() => {
    return buildCategoryData(categoryExpenses);
  }, [categoryExpenses]);

  /* ── Vendor spend ── */
  const vendorData = useMemo(() => {
    return buildVendorData(vendorExpenses);
  }, [vendorExpenses]);

  /* ── Income source ── */
  const incomeSourceData = useMemo(() => {
    return buildIncomeSourceData(incomeSourceRows);
  }, [incomeSourceRows]);

  /* ── Check stats ── */
  const checkStats = useMemo(() => buildCheckStats(checksRows), [checksRows]);

  /* ── Check volume ── */
  const checkVolumeData = useMemo(() => {
    return buildCheckVolumeData(checksRows, checksRange.start, checksRange.end);
  }, [checksRows, checksRange]);

  const commandStats = useMemo(() => {
    const totalIncome = filteredIncome.reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
    const totalExpenses = filteredExpenses.reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
    const clearedChecks = filteredChecks.filter((c: any) => c.status === 'cleared').reduce((s: number, c: any) => s + Number(c.amount || 0), 0);
    const net = totalIncome - totalExpenses - clearedChecks;
    const totalRows = filteredIncome.length + filteredExpenses.length + filteredChecks.length;
    return { totalIncome, totalExpenses, clearedChecks, net, totalRows };
  }, [filteredIncome, filteredExpenses, filteredChecks]);

  const entityCopy = useMemo(() => {
    if (entityId === 'houston-generator-pros') {
      return {
        title: 'Generator Operations Analytics',
        summary: 'Revenue, inventory, jobs, dispatch, outage response, procurement, service agreements, and maintenance renewal intelligence for Houston Generator Pros.',
        scope: 'HGP operating scope',
      };
    }
    if (entityId === 'houston-enterprise-holdings') {
      return {
        title: 'Holdings Capital Intelligence',
        summary: 'Notes, capital activity, covenants, balance sheet position, amortization, approvals, maturities, and entity performance for Houston Enterprise Holdings.',
        scope: 'HEH capital scope',
      };
    }
    return {
      title: 'Construction Financial Intelligence',
      summary: 'Project cash flow, WIP, commitments, vendor compliance, change-order exposure, draws, checks, and operating trends for Houston Enterprise.',
      scope: 'HE construction scope',
    };
  }, [entityId]);

  const modeItems: { id: ChartMode; label: string; caption: string }[] = [
    { id: 'command', label: 'Command', caption: 'All executive charts' },
    { id: 'cash', label: 'Cash Flow', caption: 'Velocity + movement' },
    { id: 'risk', label: 'Risk', caption: 'Compliance + exposure' },
    { id: 'mix', label: 'Entity Mix', caption: 'Specialty + summary' },
  ];

  const handleCustomChange = useCallback((s: string, e: string) => {
    setCustomStart(s);
    setCustomEnd(e);
  }, []);

  return (
    <AppShell>
      <style>{CHARTS_CSS}</style>
      <PageHeader
        eyebrow={`${entity?.shortName ?? 'HE'} Analytics`}
        title="Enterprise Analytics Command Center"
        actions={
          <TimeFilter
            value={timePeriod}
            onChange={setTimePeriod}
            customStart={customStart}
            customEnd={customEnd}
            onCustomChange={handleCustomChange}
          />
        }
      />

      <div className={`charts-command charts-data-fade px-4 sm:px-8 py-6 space-y-5 ${isRecalculating ? 'charts-recalculating' : ''}`}>
        <section className="charts-hero relative overflow-hidden p-4 sm:p-5">
          <div className="charts-hero-grid absolute inset-0 opacity-40" />
          <div className="charts-hero-shell relative grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-4 xl:items-end">
            <div>
              <div className="inline-flex items-center gap-2 border border-border bg-background/80 px-2.5 py-1 text-[9px] uppercase tracking-[0.18em] font-black text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: palette.accent }} />
                {entityCopy.scope}
              </div>
              <h2 className="mt-3 text-2xl sm:text-3xl font-black tracking-tight">{entityCopy.title}</h2>
              <p className="mt-2 max-w-3xl text-sm sm:text-[15px] leading-6 text-muted-foreground">{entityCopy.summary}</p>
            </div>
            <div className="charts-hero-metrics">
              {[
                { label: 'Inflow', value: fmtUSD(commandStats.totalIncome), color: palette.positive },
                { label: 'Outflow', value: fmtUSD(commandStats.totalExpenses + commandStats.clearedChecks), color: palette.negative },
                { label: 'Net', value: fmtUSD(commandStats.net), color: commandStats.net >= 0 ? palette.positive : palette.negative },
                { label: 'Rows', value: String(commandStats.totalRows), color: palette.accent },
              ].map(item => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setSelectedInsight({
                    title: `${entityCopy.scope} · ${item.label}`,
                    value: item.value,
                    detail: `${item.label} is calculated from the currently selected time period and active entity scope. Change the period or entity to browse a different operating slice.`,
                    tone: item.label === 'Inflow' ? 'positive' : item.label === 'Outflow' ? 'negative' : commandStats.net >= 0 ? 'positive' : 'negative',
                  })}
                  className="charts-kpi charts-clickable p-3 text-left"
                >
                  <div className="flex items-center gap-1.5 text-[8px] uppercase tracking-[0.17em] font-black text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                    {item.label}
                  </div>
                  <div className="charts-kpi-value charts-money mt-1.5 font-black font-mono-tab">{item.value}</div>
                </button>
              ))}
            </div>
          </div>
        </section>

        <div className="overflow-x-auto">
          <div className="min-w-max grid grid-cols-4 gap-2">
            {modeItems.map(mode => (
              <button
                key={mode.id}
                type="button"
                data-active={chartMode === mode.id}
                onClick={() => setChartMode(mode.id)}
                className="charts-mode-button px-3 py-2 text-left"
              >
                <div className="text-[10px] uppercase tracking-[0.18em] font-black">{mode.label}</div>
                <div className="mt-0.5 text-[10px] font-mono-tab opacity-75">{mode.caption}</div>
              </button>
            ))}
          </div>
        </div>

        <InsightPanel insight={selectedInsight} entityLabel={entity?.shortName ?? 'HE'} />

        <EnterpriseIntelligenceCharts
          income={intelligenceIncome}
          expenses={intelligenceExpenses}
          checks={intelligenceChecks}
          projects={projects}
          vendors={vendors}
          focus={chartMode}
          onInspect={setSelectedInsight}
          rangeControl={controlFor('intelligence')}
        />

        {/* Row 0: entity-specific analytics (HGP generator ops / Holdings capital) */}
        {(chartMode === 'command' || chartMode === 'mix') && <EntityInsightCharts />}

        {/* Row 1: Cash Flow + Inflow/Outflow */}
        {(chartMode === 'command' || chartMode === 'cash') && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <CashFlowTrendChart data={cashFlowData} palette={palette} onInspect={setSelectedInsight} rangeControl={controlFor('cashFlow')} />
            <InflowOutflowChart data={inOutData} palette={palette} onInspect={setSelectedInsight} rangeControl={controlFor('inOut')} />
          </div>
        )}

        {/* Row 2: Cumulative Net + Categories */}
        {(chartMode === 'command' || chartMode === 'cash' || chartMode === 'mix') && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <NetPositionChart data={cumulativeNet} palette={palette} onInspect={setSelectedInsight} rangeControl={controlFor('netPosition')} />
            <CategoryPieChart data={categoryData} palette={palette} onInspect={setSelectedInsight} rangeControl={controlFor('expenseCategories')} />
          </div>
        )}

        {/* Row 3: Income Sources + Vendor Spend */}
        {(chartMode === 'command' || chartMode === 'cash' || chartMode === 'mix') && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <IncomeSourceChart data={incomeSourceData} palette={palette} onInspect={setSelectedInsight} rangeControl={controlFor('incomeSources')} />
            <VendorSpendChart data={vendorData} palette={palette} onInspect={setSelectedInsight} rangeControl={controlFor('vendors')} />
          </div>
        )}

        {/* Row 4: Check Insights + Summary */}
        {(chartMode === 'command' || chartMode === 'risk' || chartMode === 'mix') && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <CheckInsightChart {...checkStats} volumeData={checkVolumeData} palette={palette} onInspect={setSelectedInsight} rangeControl={controlFor('checks')} />
            <DataSummaryCards income={summaryIncome} expenses={summaryExpenses} checks={summaryChecks} projects={projects} vendors={vendors} onInspect={setSelectedInsight} rangeControl={controlFor('summary')} />
          </div>
        )}
      </div>

      <div className="pb-12" />
    </AppShell>
  );
}
