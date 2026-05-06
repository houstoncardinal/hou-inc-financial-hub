import { useMemo, useState, useCallback } from 'react';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { useChecks, useTransactions, useProjects, useVendors } from '@/hooks/useFinance';
import { fmtUSD } from '@/lib/format';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, ComposedChart, Legend,
} from 'recharts';
import TimeFilter, { getDateRange } from '@/components/TimeFilter';

/* ─── Constants ─── */
const PIE_COLORS_LIGHT = [
  '#121212', '#a4221e', '#555555', '#888888', '#2d2d2d',
  '#c44a46', '#666666', '#999999', '#333333', '#bb5555',
];

/* ─── Shared tooltip ─── */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background/95 backdrop-blur-sm border border-border/60 px-3 py-2.5 text-xs shadow-md rounded-sm">
      <div className="text-muted-foreground mb-1.5 font-medium tracking-wider">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: p.color, boxShadow: p.color.includes('--') ? 'none' : `0 0 6px ${p.color}40` }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-semibold font-mono-tab">{typeof p.value === 'number' ? fmtUSD(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Chart card wrapper ─── */
function ChartCard({ title, subtitle, children, className = '' }: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`border border-border bg-background/50 hover:shadow-sm transition-shadow duration-300 ${className}`}>
      <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
        <div>
          <div className="micro-label">{title}</div>
          {subtitle && <div className="text-[9px] text-muted-foreground mt-0.5">{subtitle}</div>}
        </div>
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  );
}

/* ─── 1. Cash Flow Trend ─── */
function CashFlowTrendChart({ data }: { data: { label: string; inflow: number; outflow: number; net: number }[] }) {
  return (
    <ChartCard title="Cash Flow Trend" subtitle="6-month inflow vs outflow">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="cfInflow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--positive)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--positive)" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="cfOutflow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--accent)" stopOpacity={0.02} />
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
            <Area type="monotone" dataKey="inflow" name="Inflow" stroke="var(--positive)" strokeWidth={2.5} fill="url(#cfInflow)" dot={{ r: 3, fill: 'var(--positive)' }} activeDot={{ r: 5, strokeWidth: 0 }} />
            <Area type="monotone" dataKey="outflow" name="Outflow" stroke="var(--accent)" strokeWidth={2.5} fill="url(#cfOutflow)" dot={{ r: 3, fill: 'var(--accent)' }} activeDot={{ r: 5, strokeWidth: 0 }} />
            <Line type="monotone" dataKey="net" name="Net Position" stroke="var(--foreground)" strokeWidth={2} strokeDasharray="4 3" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

/* ─── 2. Inflow vs Outflow Bars ─── */
function InflowOutflowChart({ data }: { data: { label: string; inflow: number; outflow: number }[] }) {
  return (
    <ChartCard title="Inflow vs Outflow" subtitle="Monthly comparison">
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
            <Bar dataKey="inflow" name="Inflow" fill="var(--positive)" radius={[3, 3, 0, 0]} maxBarSize={32} />
            <Bar dataKey="outflow" name="Outflow" fill="var(--accent)" radius={[3, 3, 0, 0]} maxBarSize={32} />
            <Line type="monotone" dataKey="inflow" name="Inflow Trend" stroke="var(--positive)" strokeWidth={2} dot={false} strokeDasharray="4 2" />
            <Line type="monotone" dataKey="outflow" name="Outflow Trend" stroke="var(--accent)" strokeWidth={2} dot={false} strokeDasharray="4 2" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

/* ─── 3. Cumulative Net Position ─── */
function NetPositionChart({ data }: { data: { label: string; net: number }[] }) {
  const lastNet = data.length > 0 ? data[data.length - 1].net : 0;
  return (
    <ChartCard title="Cumulative Net Position" subtitle={`Current: ${fmtUSD(lastNet)}`}>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="cumNetGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--foreground)" stopOpacity={0.25} />
                <stop offset="95%" stopColor="var(--foreground)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.4} vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => fmtUSD(v)} width={60} />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--border)', strokeDasharray: '3 3' }} />
            <Area type="monotone" dataKey="net" name="Net Position" stroke="var(--foreground)" strokeWidth={2.5} fill="url(#cumNetGrad)" dot={{ r: 3, fill: 'var(--foreground)', stroke: 'var(--background)', strokeWidth: 1 }} activeDot={{ r: 5, strokeWidth: 0 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

/* ─── 4. Expense Categories Pie ─── */
function CategoryPieChart({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (data.length === 0) {
    return <ChartCard title="Expense Categories"><div className="h-56 flex items-center justify-center text-sm text-muted-foreground">No expense data</div></ChartCard>;
  }
  return (
    <ChartCard title="Expense Categories" subtitle={`${data.length} categories · ${fmtUSD(total)} total`}>
      <div className="flex flex-col sm:flex-row items-center gap-5">
        <div className="h-48 w-48 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={42} outerRadius={70} paddingAngle={3} dataKey="value" strokeWidth={0}>
                {data.map((_, i) => <Cell key={i} fill={PIE_COLORS_LIGHT[i % PIE_COLORS_LIGHT.length]} />)}
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
                <div key={d.name} className="flex items-center gap-2.5 text-xs group hover:bg-secondary/20 px-1.5 py-1 rounded-sm transition-colors">
                  <span className="w-2.5 h-2.5 shrink-0 rounded-sm" style={{ backgroundColor: PIE_COLORS_LIGHT[i % PIE_COLORS_LIGHT.length] }} />
                  <span className="flex-1 truncate text-foreground/80 group-hover:text-foreground">{d.name}</span>
                  <span className="font-mono-tab text-muted-foreground text-[9px] w-10 text-right shrink-0">{pct}%</span>
                  <span className="font-semibold font-mono-tab text-[10px] w-24 text-right shrink-0">{fmtUSD(d.value)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </ChartCard>
  );
}

/* ─── 5. Income Sources Pie ─── */
function IncomeSourceChart({ data }: { data: { name: string; value: number }[] }) {
  const INC_COLORS = ['var(--positive)', '#2d6b42', '#555555', '#888888', '#3a8a5a', '#666666', '#999999'];
  const total = data.reduce((s, d) => s + d.value, 0);
  if (data.length === 0) {
    return <ChartCard title="Income Sources"><div className="h-56 flex items-center justify-center text-sm text-muted-foreground">No income data</div></ChartCard>;
  }
  return (
    <ChartCard title="Income Sources" subtitle={`${data.length} sources · ${fmtUSD(total)} total`}>
      <div className="flex flex-col sm:flex-row items-center gap-5">
        <div className="h-48 w-48 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={42} outerRadius={70} paddingAngle={3} dataKey="value" strokeWidth={0}>
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
                <div key={d.name} className="flex items-center gap-2.5 text-xs group hover:bg-secondary/20 px-1.5 py-1 rounded-sm transition-colors">
                  <span className="w-2.5 h-2.5 shrink-0 rounded-sm" style={{ backgroundColor: INC_COLORS[i % INC_COLORS.length] }} />
                  <span className="flex-1 truncate text-foreground/80 group-hover:text-foreground">{d.name}</span>
                  <span className="font-mono-tab text-muted-foreground text-[9px] w-10 text-right shrink-0">{pct}%</span>
                  <span className="font-semibold font-mono-tab text-[10px] w-24 text-right shrink-0">{fmtUSD(d.value)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </ChartCard>
  );
}

/* ─── 6. Top Vendors by Spend ─── */
function VendorSpendChart({ data }: { data: { name: string; total: number }[] }) {
  if (data.length === 0) {
    return <ChartCard title="Top Vendors"><div className="h-56 flex items-center justify-center text-sm text-muted-foreground">No vendor data</div></ChartCard>;
  }
  return (
    <ChartCard title="Top Vendors by Spend" subtitle={`${data.length} vendors`}>
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
            <Bar dataKey="total" name="Spend" fill="var(--accent)" radius={[0, 3, 3, 0]} maxBarSize={16}>
              {data.map((_, i) => (
                <Cell key={i} fill={`hsl(0 72% ${38 + (i / data.length) * 15}%)`} fillOpacity={0.85 - (i / data.length) * 0.3} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

/* ─── 7. Check Status + Volume Combo ─── */
function CheckInsightChart({ cleared, pending, voided, volumeData }: {
  cleared: number; pending: number; voided: number;
  volumeData: { label: string; count: number }[];
}) {
  const statusData = [
    { name: 'Cleared', value: cleared, color: 'var(--positive)' },
    { name: 'Pending', value: pending, color: 'var(--accent)' },
    { name: 'Voided', value: voided, color: 'var(--muted-foreground)' },
  ].filter(d => d.value > 0);
  const totalChecks = cleared + pending + voided;

  return (
    <ChartCard title="Check Insights" subtitle={`${totalChecks} total checks`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Status donut */}
        <div>
          {statusData.length > 0 ? (
            <div className="flex flex-col items-center">
              <div className="h-36 w-36">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={30} outerRadius={55} paddingAngle={3} dataKey="value" strokeWidth={0}>
                      {statusData.map((_, i) => <Cell key={i} fill={statusData[i].color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex gap-4 mt-2">
                {statusData.map(d => (
                  <div key={d.name} className="flex items-center gap-1.5 text-[9px]">
                    <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: d.color }} />
                    <span className="text-muted-foreground">{d.name}</span>
                    <span className="font-semibold font-mono-tab">{d.value}</span>
                  </div>
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
                <Line type="monotone" dataKey="count" name="Checks" stroke="var(--foreground)" strokeWidth={2} dot={{ r: 2.5, fill: 'var(--foreground)' }} activeDot={{ r: 4, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </ChartCard>
  );
}

/* ─── 8. Data Summary Stat Cards ─── */
function DataSummaryCards({ income, expenses, checks, projects, vendors }: {
  income: any[]; expenses: any[]; checks: any[]; projects: any[]; vendors: any[];
}) {
  const summaryItems = [
    { label: 'Total Income', value: fmtUSD(income.reduce((s: number, t: any) => s + Number(t.amount), 0)), color: 'var(--positive)' },
    { label: 'Total Expenses', value: fmtUSD(expenses.reduce((s: number, t: any) => s + Number(t.amount), 0)), color: 'var(--accent)' },
    { label: 'Net Position', value: fmtUSD(
        income.reduce((s: number, t: any) => s + Number(t.amount), 0) -
        expenses.reduce((s: number, t: any) => s + Number(t.amount), 0)
      ),
      color: 'var(--foreground)' },
    { label: 'Checks Issued', value: String(checks.length), color: 'var(--warning)' },
    { label: 'Active Projects', value: String(projects.filter((p: any) => p.status === 'active').length), color: 'var(--chart-3)' },
    { label: 'Vendors', value: String(vendors.length), color: 'var(--chart-4)' },
  ];

  return (
    <ChartCard title="Financial Summary" subtitle="Key metrics at a glance">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {summaryItems.map(s => (
          <div key={s.label} className="border border-border/60 px-3 py-2.5 hover:bg-secondary/10 transition-colors">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
              <div className="micro-label text-[8px]">{s.label}</div>
            </div>
            <div className="text-sm font-semibold font-mono-tab">{s.value}</div>
          </div>
        ))}
      </div>
    </ChartCard>
  );
}

/* ═══════════════════════ MAIN PAGE ═══════════════════════ */
export default function Charts() {
  const { data: checks = [] } = useChecks();
  const { data: income = [] } = useTransactions('income');
  const { data: expenses = [] } = useTransactions('expense');
  const { data: projects = [] } = useProjects();
  const { data: vendors = [] } = useVendors();

  /* ── Time filter state ── */
  const [timePeriod, setTimePeriod] = useState('all');
  const [customStart, setCustomStart] = useState<string | undefined>();
  const [customEnd, setCustomEnd] = useState<string | undefined>();

  const { start, end } = useMemo(() => {
    if (timePeriod === 'custom' && customStart && customEnd) {
      return { start: new Date(customStart), end: new Date(customEnd) };
    }
    return getDateRange(timePeriod);
  }, [timePeriod, customStart, customEnd]);

  /* ── Filtered data ── */
  const filteredIncome = useMemo(() => {
    return income.filter((t: any) => {
      const dt = new Date(t.transaction_date);
      return dt >= start && dt <= end;
    });
  }, [income, start, end]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((t: any) => {
      const dt = new Date(t.transaction_date);
      return dt >= start && dt <= end;
    });
  }, [expenses, start, end]);

  const filteredChecks = useMemo(() => {
    return checks.filter((c: any) => {
      const dt = new Date(c.issue_date);
      return dt >= start && dt <= end;
    });
  }, [checks, start, end]);

  /* ── Cash flow data ── */
  const cashFlowData = useMemo(() => {
    const months: { label: string; inflow: number; outflow: number; net: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(end);
      d.setMonth(d.getMonth() - i);
      const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const inR = (dt: string) => { const d2 = new Date(dt); return d2 >= mStart && d2 < mEnd; };
      const inflow = filteredIncome.filter((t: any) => inR(t.transaction_date)).reduce((s: number, t: any) => s + Number(t.amount), 0);
      const exp = filteredExpenses.filter((t: any) => inR(t.transaction_date)).reduce((s: number, t: any) => s + Number(t.amount), 0);
      const chk = filteredChecks.filter((c: any) => inR(c.issue_date) && c.status === 'cleared').reduce((s: number, c: any) => s + Number(c.amount), 0);
      months.push({ label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }), inflow, outflow: exp + chk, net: inflow - (exp + chk) });
    }
    return months;
  }, [filteredIncome, filteredExpenses, filteredChecks, end]);

  /* ── Cumulative net ── */
  const cumulativeNet = useMemo(() => {
    let running = 0;
    return cashFlowData.map(m => {
      running += m.net;
      return { label: m.label, net: running };
    });
  }, [cashFlowData]);

  /* ── Category breakdown ── */
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredExpenses.forEach((t: any) => {
      const cat = t.category || 'Uncategorized';
      map[cat] = (map[cat] || 0) + Number(t.amount);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [filteredExpenses]);

  /* ── Vendor spend ── */
  const vendorData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredExpenses.forEach((t: any) => {
      const name = t.vendors?.name || 'Unlinked';
      map[name] = (map[name] || 0) + Number(t.amount);
    });
    return Object.entries(map).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total).slice(0, 8);
  }, [filteredExpenses]);

  /* ── Income source ── */
  const incomeSourceData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredIncome.forEach((t: any) => {
      const src = t.source_name || t.vendors?.name || 'Other';
      map[src] = (map[src] || 0) + Number(t.amount);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 7);
  }, [filteredIncome]);

  /* ── Check stats ── */
  const checkStats = useMemo(() => ({
    cleared: filteredChecks.filter((c: any) => c.status === 'cleared').length,
    pending: filteredChecks.filter((c: any) => c.status === 'pending').length,
    voided: filteredChecks.filter((c: any) => c.status === 'voided').length,
  }), [filteredChecks]);

  /* ── Check volume ── */
  const checkVolumeData = useMemo(() => {
    const months: { label: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(end);
      d.setMonth(d.getMonth() - i);
      const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const inR = (dt: string) => { const d2 = new Date(dt); return d2 >= mStart && d2 < mEnd; };
      months.push({ label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }), count: filteredChecks.filter((c: any) => inR(c.issue_date)).length });
    }
    return months;
  }, [filteredChecks, end]);

  /* ── Total exposure ── */
  const totalExposure = useMemo(() => {
    return projects.filter((p: any) => p.status === 'active').reduce((s: number, p: any) => s + Number(p.budget), 0);
  }, [projects]);

  const handleCustomChange = useCallback((s: string, e: string) => {
    setCustomStart(s);
    setCustomEnd(e);
  }, []);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Analytics"
        title="Charts & Visualizations"
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

      <div className="px-4 sm:px-8 py-6 space-y-4">
        {/* Row 1: Cash Flow + Inflow/Outflow */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CashFlowTrendChart data={cashFlowData} />
          <InflowOutflowChart data={cashFlowData} />
        </div>

        {/* Row 2: Cumulative Net + Categories */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <NetPositionChart data={cumulativeNet} />
          <CategoryPieChart data={categoryData} />
        </div>

        {/* Row 3: Income Sources + Vendor Spend */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <IncomeSourceChart data={incomeSourceData} />
          <VendorSpendChart data={vendorData} />
        </div>

        {/* Row 4: Check Insights + Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CheckInsightChart {...checkStats} volumeData={checkVolumeData} />
          <DataSummaryCards income={filteredIncome} expenses={filteredExpenses} checks={filteredChecks} projects={projects} vendors={vendors} />
        </div>
      </div>

      <div className="pb-12" />
    </AppShell>
  );
}