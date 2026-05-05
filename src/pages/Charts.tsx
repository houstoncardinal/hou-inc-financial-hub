import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { useChecks, useTransactions, useProjects, useVendors } from '@/hooks/useFinance';
import { fmtUSD, fmtDate } from '@/lib/format';
import { BurnRateChart, ExposureChart } from '@/components/FinancialChartPanel';
import SparklineChart from '@/components/SparklineChart';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area,
} from 'recharts';

/* ─── Tooltip style ─── */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background border border-border px-3 py-2 text-xs shadow-sm">
      <div className="text-muted-foreground mb-1">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="font-medium">{p.name}: {fmtUSD(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Inflow vs Outflow Bar Chart ─── */
function InflowOutflowChart({ data }: { data: { label: string; inflow: number; outflow: number }[] }) {
  return (
    <div className="border border-border p-4">
      <div className="micro-label mb-3">Inflow vs Outflow · 6 Months</div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => fmtUSD(v)} />
            <RechartsTooltip content={<ChartTooltip />} />
            <Bar dataKey="inflow" name="Inflow" fill="var(--positive)" radius={[2, 2, 0, 0]} />
            <Bar dataKey="outflow" name="Outflow" fill="var(--accent)" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ─── Cumulative Net Position Area Chart ─── */
function NetPositionChart({ data }: { data: { label: string; net: number }[] }) {
  return (
    <div className="border border-border p-4">
      <div className="micro-label mb-3">Cumulative Net Position</div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <defs>
              <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--foreground)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--foreground)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => fmtUSD(v)} />
            <RechartsTooltip content={<ChartTooltip />} />
            <Area type="monotone" dataKey="net" name="Net Position" stroke="var(--foreground)" fill="url(#netGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ─── Category Breakdown Pie Chart ─── */
function CategoryPieChart({ data }: { data: { name: string; value: number }[] }) {
  const colors = ['#121212', '#a4221e', '#555555', '#888888', '#2d2d2d', '#c44a46', '#666666', '#999999', '#333333', '#bb5555'];
  if (data.length === 0) {
    return (
      <div className="border border-border p-4">
        <div className="micro-label mb-3">Expense Categories</div>
        <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">No expense data yet</div>
      </div>
    );
  }
  return (
    <div className="border border-border p-4">
      <div className="micro-label mb-3">Expense Categories</div>
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="h-48 w-48 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={40} outerRadius={68} paddingAngle={2} dataKey="value">
                {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
              </Pie>
              <RechartsTooltip content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0];
                return <div className="bg-background border border-border px-3 py-2 text-xs shadow-sm"><div className="font-medium">{d.name}</div><div className="font-mono-tab mt-0.5">{fmtUSD(Number(d.value))}</div></div>;
              }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 w-full min-w-0">
          <div className="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto">
            {data.map((d, i) => (
              <div key={d.name} className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 shrink-0 rounded-sm" style={{ backgroundColor: colors[i % colors.length] }} />
                <span className="flex-1 truncate">{d.name}</span>
                <span className="font-semibold font-mono-tab shrink-0">{fmtUSD(d.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Vendor Spend Bar Chart ─── */
function VendorSpendChart({ data }: { data: { name: string; total: number }[] }) {
  if (data.length === 0) {
    return (
      <div className="border border-border p-4">
        <div className="micro-label mb-3">Top Vendors by Spend</div>
        <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">No vendor expense data yet</div>
      </div>
    );
  }
  return (
    <div className="border border-border p-4">
      <div className="micro-label mb-3">Top Vendors by Spend</div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 40, left: 80, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => fmtUSD(v)} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} width={75} />
            <RechartsTooltip content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0];
              return <div className="bg-background border border-border px-3 py-2 text-xs shadow-sm"><div className="font-medium">{d.payload.name}</div><div className="font-mono-tab mt-0.5">{fmtUSD(Number(d.value))}</div></div>;
            }} />
            <Bar dataKey="total" name="Spend" fill="var(--accent)" radius={[0, 2, 2, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ─── Income Source Pie Chart ─── */
function IncomeSourceChart({ data }: { data: { name: string; value: number }[] }) {
  const colors = ['#121212', '#2d6b42', '#555555', '#888888', '#3a8a5a', '#666666', '#999999'];
  if (data.length === 0) {
    return (
      <div className="border border-border p-4">
        <div className="micro-label mb-3">Income Sources</div>
        <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">No income data yet</div>
      </div>
    );
  }
  return (
    <div className="border border-border p-4">
      <div className="micro-label mb-3">Income Sources</div>
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="h-48 w-48 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={40} outerRadius={68} paddingAngle={2} dataKey="value">
                {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
              </Pie>
              <RechartsTooltip content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0];
                return <div className="bg-background border border-border px-3 py-2 text-xs shadow-sm"><div className="font-medium">{d.name}</div><div className="font-mono-tab mt-0.5">{fmtUSD(Number(d.value))}</div></div>;
              }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 w-full min-w-0">
          <div className="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto">
            {data.map((d, i) => (
              <div key={d.name} className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 shrink-0 rounded-sm" style={{ backgroundColor: colors[i % colors.length] }} />
                <span className="flex-1 truncate">{d.name}</span>
                <span className="font-semibold font-mono-tab shrink-0">{fmtUSD(d.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Check Status Pie Chart ─── */
function CheckStatusChart({ cleared, pending, voided }: { cleared: number; pending: number; voided: number }) {
  const data = [
    { name: 'Cleared', value: cleared },
    { name: 'Pending', value: pending },
    { name: 'Voided', value: voided },
  ].filter(d => d.value > 0);
  const colors = ['var(--positive)', 'var(--accent)', 'var(--muted-foreground)'];
  if (data.length === 0) {
    return (
      <div className="border border-border p-4">
        <div className="micro-label mb-3">Check Status Distribution</div>
        <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">No check data yet</div>
      </div>
    );
  }
  return (
    <div className="border border-border p-4">
      <div className="micro-label mb-3">Check Status Distribution</div>
      <div className="flex items-center gap-6">
        <div className="h-40 w-40 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={2} dataKey="value">
                {data.map((_, i) => <Cell key={i} fill={colors[i]} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-2">
          {data.map((d, i) => (
            <div key={d.name} className="flex items-center gap-2 text-xs">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: colors[i] }} />
              <span className="flex-1">{d.name}</span>
              <span className="font-mono-tab text-muted-foreground">{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Monthly Check Volume ─── */
function CheckVolumeChart({ data }: { data: { label: string; count: number }[] }) {
  return (
    <div className="border border-border p-4">
      <div className="micro-label mb-3">Monthly Check Volume</div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <RechartsTooltip content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return <div className="bg-background border border-border px-3 py-2 text-xs shadow-sm"><div className="text-muted-foreground mb-1">{label}</div><div className="font-medium">{payload[0].value} checks</div></div>;
            }} />
            <Line type="monotone" dataKey="count" name="Checks" stroke="var(--foreground)" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ═══════════════════════ PAGE ═══════════════════════ */
export default function Charts() {
  const { data: checks = [] } = useChecks();
  const { data: income = [] } = useTransactions('income');
  const { data: expenses = [] } = useTransactions('expense');
  const { data: projects = [] } = useProjects();
  const { data: vendors = [] } = useVendors();

  /* ── Cash flow for BurnRateChart ── */
  const cashFlowData = useMemo(() => {
    const months: { label: string; inflow: number; outflow: number; net: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const inR = (dt: string) => { const d2 = new Date(dt); return d2 >= start && d2 < end; };
      const inflow = income.filter((t: any) => inR(t.transaction_date)).reduce((s: number, t: any) => s + Number(t.amount), 0);
      const exp = expenses.filter((t: any) => inR(t.transaction_date)).reduce((s: number, t: any) => s + Number(t.amount), 0);
      const chk = checks.filter((c: any) => inR(c.issue_date) && c.status === 'cleared').reduce((s: number, c: any) => s + Number(c.amount), 0);
      months.push({ label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }), inflow, outflow: exp + chk, net: inflow - (exp + chk) });
    }
    return months;
  }, [income, expenses, checks]);

  /* ── Cumulative net with running total ── */
  const cumulativeNet = useMemo(() => {
    let running = 0;
    return cashFlowData.map(m => {
      running += m.net;
      return { label: m.label, net: running };
    });
  }, [cashFlowData]);

  /* ── Total exposure for ExposureChart ── */
  const totalExposure = useMemo(() => {
    return projects.filter((p: any) => p.status === 'active').reduce((s: number, p: any) => s + Number(p.budget), 0);
  }, [projects]);

  /* ── Category breakdown ── */
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach((t: any) => {
      const cat = t.category || 'Uncategorized';
      map[cat] = (map[cat] || 0) + Number(t.amount);
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [expenses]);

  /* ── Vendor spend ── */
  const vendorData = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach((t: any) => {
      const name = t.vendors?.name || 'Unlinked';
      map[name] = (map[name] || 0) + Number(t.amount);
    });
    return Object.entries(map)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [expenses]);

  /* ── Income source breakdown ── */
  const incomeSourceData = useMemo(() => {
    const map: Record<string, number> = {};
    income.forEach((t: any) => {
      const src = t.source_name || t.vendors?.name || 'Other';
      map[src] = (map[src] || 0) + Number(t.amount);
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7);
  }, [income]);

  /* ── Check stats ── */
  const checkStats = useMemo(() => {
    const cleared = checks.filter((c: any) => c.status === 'cleared').length;
    const pending = checks.filter((c: any) => c.status === 'pending').length;
    const voided = checks.filter((c: any) => c.status === 'voided').length;
    return { cleared, pending, voided };
  }, [checks]);

  /* ── Check volume by month ── */
  const checkVolumeData = useMemo(() => {
    const months: { label: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const inR = (dt: string) => { const d2 = new Date(dt); return d2 >= start && d2 < end; };
      months.push({ label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }), count: checks.filter((c: any) => inR(c.issue_date)).length });
    }
    return months;
  }, [checks]);

  return (
    <AppShell>
      <PageHeader eyebrow="Analytics" title="Charts & Visualizations" description="Interactive charts powered by your real financial data." />

      <div className="px-4 sm:px-8 py-6 space-y-6">
        {/* Row 1: BurnRate + Cumulative Net */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <BurnRateChart data={cashFlowData} />
          <NetPositionChart data={cumulativeNet} />
        </div>

        {/* Row 2: Inflow/Outflow Bars + Exposure */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <InflowOutflowChart data={cashFlowData} />
          <ExposureChart projects={projects} totalExposure={totalExposure} />
        </div>

        {/* Row 3: Categories + Income Sources */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CategoryPieChart data={categoryData} />
          <IncomeSourceChart data={incomeSourceData} />
        </div>

        {/* Row 4: Vendor Spend + Check Status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <VendorSpendChart data={vendorData} />
          <CheckStatusChart {...checkStats} />
        </div>

        {/* Row 5: Check Volume */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CheckVolumeChart data={checkVolumeData} />
          {/* Summary card */}
          <div className="border border-border p-4 flex flex-col justify-center">
            <div className="micro-label mb-4">Data Summary</div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { l: 'Total Income', v: fmtUSD(income.reduce((s: number, t: any) => s + Number(t.amount), 0)) },
                { l: 'Total Expenses', v: fmtUSD(expenses.reduce((s: number, t: any) => s + Number(t.amount), 0)) },
                { l: 'Checks Issued', v: String(checks.length) },
                { l: 'Active Projects', v: String(projects.filter((p: any) => p.status === 'active').length) },
                { l: 'Vendors', v: String(vendors.length) },
                { l: 'Avg Check Amount', v: checks.length > 0 ? fmtUSD(checks.reduce((s: number, c: any) => s + Number(c.amount), 0) / checks.length) : '—' },
              ].map(s => (
                <div key={s.l} className="border border-border px-3 py-2.5">
                  <div className="micro-label">{s.l}</div>
                  <div className="text-base font-semibold font-mono-tab mt-0.5">{s.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="pb-12" />
    </AppShell>
  );
}