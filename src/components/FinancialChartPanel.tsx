import { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { fmtUSD } from '@/lib/format';

const COLORS = {
  positive: 'var(--positive)',
  accent: 'var(--accent)',
  muted: 'var(--muted-foreground)',
  border: 'var(--border)',
  grid: 'var(--border)',
};

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

/* ── Cash Flow Trend Line Chart ── */
export function CashFlowChart({ data }: {
  data: { label: string; inflow: number; outflow: number; net: number }[];
}) {
  return (
    <div className="border border-border p-4">
      <div className="micro-label mb-3">Cash Flow Trend · 6 Month</div>
      <div className="h-48 sm:h-52">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
              axisLine={{ stroke: 'var(--border)' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => fmtUSD(v)}
            />
            <RechartsTooltip content={<ChartTooltip />} />
            <Line type="monotone" dataKey="inflow" name="Income" stroke="var(--positive)" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
            <Line type="monotone" dataKey="outflow" name="Expenses" stroke="var(--accent)" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
            <Line type="monotone" dataKey="net" name="Net" stroke="var(--foreground)" strokeWidth={3} strokeDasharray="none" dot={{ r: 3, fill: 'var(--foreground)', strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0, fill: 'var(--foreground)' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-4 text-[9px] text-muted-foreground uppercase tracking-wider pt-2 border-t border-border mt-2">
        <span className="flex items-center gap-1"><span className="w-2 h-2 bg-positive rounded-full" /> Income</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 bg-accent rounded-full" /> Expenses</span>
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 border border-foreground rounded-full" /> Net</span>
      </div>
    </div>
  );
}

/* ── Exposure Donut Chart ── */
export function ExposureChart({ projects, totalExposure }: {
  projects: any[];
  totalExposure: number;
}) {
  const pieData = useMemo(() => {
    const active = projects.filter((p: any) => p.status === 'active' && Number(p.budget) > 0);
    return active.map((p: any) => ({ name: p.name, value: Number(p.budget) }));
  }, [projects]);

  const chartColors = [
    'var(--chart-1)',
    'var(--chart-2)',
    'var(--chart-3)',
    'var(--chart-4)',
    'var(--chart-5)',
    'var(--accent)',
    'var(--positive)',
    'var(--warning)',
  ];

  if (pieData.length === 0) {
    return (
      <div className="border border-border p-4 h-full">
        <div className="micro-label mb-3">Exposure Breakdown</div>
        <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">No active projects with budgets</div>
      </div>
    );
  }

  return (
    <div className="border border-border p-4 h-full flex flex-col">
      <div className="micro-label mb-3 shrink-0">Exposure Breakdown</div>
      <div className="flex-1 flex flex-col sm:flex-row items-center gap-3 min-h-0">
        <div className="h-40 w-40 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={38} outerRadius={62} paddingAngle={2} dataKey="value">
                {pieData.map((_, i) => <Cell key={`cell-${i}`} fill={chartColors[i % chartColors.length]} />)}
              </Pie>
              <RechartsTooltip content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0];
                return (
                  <div className="bg-background border border-border px-3 py-2 text-xs shadow-sm">
                    <div className="font-medium truncate max-w-[180px]">{d.name}</div>
                    <div className="font-mono-tab mt-0.5">{fmtUSD(Number(d.value))}</div>
                  </div>
                );
              }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 w-full min-w-0 overflow-hidden">
          <div className="grid grid-cols-1 gap-1">
            {pieData.map((d, i) => {
              const pct = totalExposure > 0 ? ((d.value / totalExposure) * 100).toFixed(1) : '0';
              return (
                <div key={d.name} className="flex items-center gap-2 text-xs min-w-0">
                  <span className="w-2 h-2 shrink-0 rounded-sm" style={{ backgroundColor: chartColors[i % chartColors.length] }} />
                  <span className="flex-1 truncate min-w-0 text-foreground/80">{d.name}</span>
                  <span className="font-mono-tab text-muted-foreground shrink-0 text-[10px]">{pct}%</span>
                  <span className="font-semibold font-mono-tab shrink-0 text-[10px]">{fmtUSD(d.value)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}