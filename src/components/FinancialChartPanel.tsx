import { useMemo, useState } from 'react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, ComposedChart, Area,
  ReferenceLine, Line,
} from 'recharts';
import { fmtUSD } from '@/lib/format';

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

/* ── Cash Flow Trend Composite Chart ── */
export function CashFlowChart({ data }: {
  data: { label: string; inflow: number; outflow: number; net: number }[];
}) {
  const [mode, setMode] = useState<'flow' | 'net'>('flow');
  const totalIn = data.reduce((s, d) => s + d.inflow, 0);
  const totalOut = data.reduce((s, d) => s + d.outflow, 0);
  const totalNet = data.reduce((s, d) => s + d.net, 0);
  const avgNet = data.length ? totalNet / data.length : 0;
  const bestMonth = data.reduce((best, d) => (d.net > best.net ? d : best), data[0] ?? { label: '—', net: 0 });
  const last = data[data.length - 1] ?? { inflow: 0, outflow: 0, net: 0 };
  const prior = data[data.length - 2] ?? last;
  const netDelta = last.net - prior.net;

  return (
    <div className="border border-border idx-widget overflow-hidden">
      <div className="p-3 sm:p-4 border-b border-border/70">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <div className="micro-label">Cash Flow Trend · 6 Month</div>
            <div className={`text-lg sm:text-xl font-bold font-mono-tab mt-1 leading-tight ${totalNet >= 0 ? 'text-positive' : 'text-destructive'}`}>
              {totalNet >= 0 ? '+' : '-'}{fmtUSD(Math.abs(totalNet))}
            </div>
            <div className="text-[9px] text-muted-foreground font-mono-tab mt-0.5">
              Avg {avgNet >= 0 ? '+' : '-'}{fmtUSD(Math.abs(avgNet))} / month · Best {bestMonth.label}
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2">
            <div className="grid grid-cols-2 gap-2 text-right text-[9px] font-mono-tab">
              <div className="px-2 py-1 border border-positive/20 bg-positive/5">
                <div className="text-muted-foreground">In</div>
                <div className="text-positive font-semibold">{fmtUSD(totalIn)}</div>
              </div>
              <div className="px-2 py-1 border border-accent/20 bg-accent/5">
                <div className="text-muted-foreground">Out</div>
                <div className="text-accent font-semibold">{fmtUSD(totalOut)}</div>
              </div>
            </div>
            <div className="flex border border-border overflow-hidden shrink-0">
              {(['flow', 'net'] as const).map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setMode(opt)}
                  className={`px-2.5 py-1.5 text-[9px] uppercase tracking-[0.14em] font-semibold transition-colors ${
                    mode === opt ? 'bg-foreground text-background' : 'bg-background text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {opt === 'flow' ? 'trend' : 'net'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="px-2 sm:px-3 pt-3">
        <div className="h-44 sm:h-48">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
              <defs>
                <linearGradient id="cash-inflow-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--positive)" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="var(--positive)" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="cash-outflow-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.16} />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.01} />
                </linearGradient>
                <linearGradient id="cash-net-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--foreground)" stopOpacity={0.16} />
                  <stop offset="65%" stopColor="var(--foreground)" stopOpacity={0.04} />
                  <stop offset="100%" stopColor="var(--foreground)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} strokeOpacity={0.65} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                axisLine={false}
                tickLine={false}
                dy={6}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                axisLine={false}
                tickLine={false}
                width={58}
                tickFormatter={(v: number) => fmtUSD(v)}
              />
              <ReferenceLine y={0} stroke="var(--border)" strokeWidth={1.4} />
              <RechartsTooltip content={<ChartTooltip />} cursor={{ fill: 'var(--border)', fillOpacity: 0.08 }} />
              {mode === 'flow' && (
                <>
                  <Area type="monotone" dataKey="inflow" name="Income" stroke="var(--positive)" fill="url(#cash-inflow-fill)" strokeWidth={2.2} dot={false} activeDot={{ r: 4, fill: 'var(--positive)', stroke: 'var(--background)', strokeWidth: 2 }} />
                  <Area type="monotone" dataKey="outflow" name="Expenses" stroke="var(--accent)" fill="url(#cash-outflow-fill)" strokeWidth={2.2} dot={false} activeDot={{ r: 4, fill: 'var(--accent)', stroke: 'var(--background)', strokeWidth: 2 }} />
                </>
              )}
              {mode === 'net' && (
                <Area type="monotone" dataKey="net" name="Net Area" stroke="transparent" fill="url(#cash-net-fill)" dot={false} activeDot={false} />
              )}
              <Line
                type="monotone"
                dataKey="net"
                name="Net"
                stroke="var(--foreground)"
                strokeWidth={2.8}
                dot={{ r: 3, fill: 'var(--background)', stroke: 'var(--foreground)', strokeWidth: 1.7 }}
                activeDot={{ r: 5, fill: 'var(--foreground)', stroke: 'var(--background)', strokeWidth: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-2 border-t border-border mt-2">
        <div className="px-3 py-2">
          <div className="text-[8px] uppercase tracking-[0.16em] text-muted-foreground">Latest</div>
          <div className={`text-[11px] font-semibold font-mono-tab ${last.net >= 0 ? 'text-positive' : 'text-destructive'}`}>
            {last.net >= 0 ? '+' : '-'}{fmtUSD(Math.abs(last.net))}
          </div>
        </div>
        <div className="px-3 py-2 border-l border-border">
          <div className="text-[8px] uppercase tracking-[0.16em] text-muted-foreground">Change</div>
          <div className={`text-[11px] font-semibold font-mono-tab ${netDelta >= 0 ? 'text-positive' : 'text-destructive'}`}>
            {netDelta >= 0 ? '+' : '-'}{fmtUSD(Math.abs(netDelta))}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-3 text-[9px] text-muted-foreground uppercase tracking-wider px-3 py-2 border-t border-border">
        <span className="flex items-center gap-1"><span className="w-2 h-2 bg-positive rounded-full" /> Income</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 bg-accent rounded-full" /> Expenses</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 border border-foreground rounded-full" /> Net</span>
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
