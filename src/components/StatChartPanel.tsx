import { useMemo, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ComposedChart, Line, Legend, Cell,
} from 'recharts';
import { fmtUSD } from '@/lib/format';

/* ── Shared custom tooltip ── */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background/95 backdrop-blur-sm border border-border/60 px-3 py-2 text-xs shadow-md rounded-sm">
      <div className="text-muted-foreground mb-1 font-medium">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-semibold font-mono-tab">{typeof p.value === 'number' ? fmtUSD(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ── 1. Total Balance — 12-month cumulative area chart with gradient, dots, annotations ── */
export function BalanceTrendChart({ data, color }: { data: { month: string; balance: number }[]; color: string }) {
  const gradientId = useMemo(() => `bal-grad-${Math.random().toString(36).slice(2, 8)}`, []);
  const maxVal = useMemo(() => Math.max(...data.map(d => d.balance), 0), [data]);
  const minVal = useMemo(() => Math.min(...data.map(d => d.balance), 0), [data]);

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={80}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="60%" stopColor={color} stopOpacity={0.10} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="2 2" stroke="var(--border)" strokeOpacity={0.3} vertical={false} />
          <XAxis dataKey="month" hide />
          <YAxis hide domain={['dataMin - 500', 'dataMax + 500']} />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--border)', strokeDasharray: '2 2' }} />
          <Area
            type="monotone" dataKey="balance" name="Balance"
            stroke={color} strokeWidth={2} fill={`url(#${gradientId})`}
            dot={{ r: 2, fill: color, stroke: 'var(--background)', strokeWidth: 1, strokeOpacity: 0.6 }}
            activeDot={{ r: 4, fill: color, stroke: 'var(--background)', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
      <div className="flex justify-between text-[8px] text-muted-foreground/60 mt-0.5 px-0.5 font-mono-tab">
        <span>Low {fmtUSD(minVal)}</span>
        <span>High {fmtUSD(maxVal)}</span>
      </div>
    </div>
  );
}

/* ── 2. Inflow — Monthly trend + category bar composition ── */
export function InflowChart({
  monthlyData,
  categoryData,
}: {
  monthlyData: { month: string; inflow: number }[];
  categoryData: { name: string; value: number }[];
}) {
  const colors = ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5', '#059669', '#047857'];
  const total = categoryData.reduce((s, c) => s + c.value, 0);
  return (
    <div className="w-full">
      {/* Mini bar chart — monthly trend */}
      <ResponsiveContainer width="100%" height={44}>
        <BarChart data={monthlyData} margin={{ top: 2, right: 2, left: 2, bottom: 0 }}>
          <CartesianGrid strokeDasharray="2 2" stroke="var(--border)" strokeOpacity={0.2} vertical={false} />
          <XAxis dataKey="month" hide />
          <YAxis hide />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--border)', fillOpacity: 0.15 }} />
          <Bar dataKey="inflow" name="Inflow" radius={[1, 1, 0, 0]} maxBarSize={20}>
            {monthlyData.map((_, i) => (
              <Cell key={i} fill={`hsl(150, 60%, ${35 + i * 2}%)`} fillOpacity={0.7 + (i / monthlyData.length) * 0.3} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {/* Category breakdown as inline tags */}
      {categoryData.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {categoryData.slice(0, 4).map((c, i) => (
            <span key={c.name} className="text-[7px] px-1 py-0.5 rounded-sm font-mono-tab flex items-center gap-1" style={{ backgroundColor: `${colors[i % colors.length]}15`, color: colors[i % colors.length] }}>
              <span className="w-1 h-1 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
              {c.name} {total > 0 ? `${((c.value / total) * 100).toFixed(0)}%` : ''}
            </span>
          ))}
          {categoryData.length > 4 && (
            <span className="text-[7px] text-muted-foreground px-1">+{categoryData.length - 4} more</span>
          )}
        </div>
      )}
    </div>
  );
}

/* ── 3. Outflow — Monthly expense trend + spending type breakdown ── */
export function OutflowChart({
  monthlyData,
  categoryData,
}: {
  monthlyData: { month: string; outflow: number }[];
  categoryData: { name: string; value: number }[];
}) {
  const colors = ['#ef4444', '#f87171', '#fca5a5', '#fecaca', '#dc2626', '#b91c1c', '#991b1b'];
  const total = categoryData.reduce((s, c) => s + c.value, 0);
  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={44}>
        <ComposedChart data={monthlyData} margin={{ top: 2, right: 2, left: 2, bottom: 0 }}>
          <CartesianGrid strokeDasharray="2 2" stroke="var(--border)" strokeOpacity={0.2} vertical={false} />
          <XAxis dataKey="month" hide />
          <YAxis hide />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--border)', fillOpacity: 0.15 }} />
          <defs>
            <linearGradient id="outflowGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#ef4444" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <Bar dataKey="outflow" name="Outflow" radius={[1, 1, 0, 0]} maxBarSize={20} fill="url(#outflowGrad)" stroke="#ef4444" strokeWidth={0.5} />
          <Line type="monotone" dataKey="outflow" name="Trend" stroke="#ef4444" strokeWidth={1.5} dot={false} strokeDasharray="3 2" />
        </ComposedChart>
      </ResponsiveContainer>
      {categoryData.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {categoryData.slice(0, 4).map((c, i) => (
            <span key={c.name} className="text-[7px] px-1 py-0.5 rounded-sm font-mono-tab flex items-center gap-1" style={{ backgroundColor: `${colors[i % colors.length]}15`, color: colors[i % colors.length] }}>
              <span className="w-1 h-1 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
              {c.name} {total > 0 ? `${((c.value / total) * 100).toFixed(0)}%` : ''}
            </span>
          ))}
          {categoryData.length > 4 && (
            <span className="text-[7px] text-muted-foreground px-1">+{categoryData.length - 4} more</span>
          )}
        </div>
      )}
    </div>
  );
}

/* ── 4. Pending Checks — Aging distribution bar chart ── */
export function PendingAgingChart({
  agingBuckets,
  totalValue,
}: {
  agingBuckets: { label: string; count: number; value: number; color: string }[];
  totalValue: number;
}) {
  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={50}>
        <BarChart data={agingBuckets} margin={{ top: 2, right: 2, left: 2, bottom: 0 }} layout="vertical">
          <CartesianGrid strokeDasharray="2 2" stroke="var(--border)" strokeOpacity={0.15} horizontal={false} />
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="label" hide />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload;
              return (
                <div className="bg-background/95 backdrop-blur-sm border border-border/60 px-3 py-2 text-xs shadow-md rounded-sm">
                  <div className="text-muted-foreground mb-1 font-medium">{d.label}</div>
                  <div className="text-muted-foreground">{d.count} check{d.count !== 1 ? 's' : ''}</div>
                  <div className="font-semibold font-mono-tab text-foreground">{fmtUSD(d.value)}</div>
                </div>
              );
            }}
            cursor={{ fill: 'var(--border)', fillOpacity: 0.15 }}
          />
          <Bar dataKey="count" name="Checks" radius={[0, 1, 1, 0]} maxBarSize={14} background={{ fill: 'var(--border)', fillOpacity: 0.1 }}>
            {agingBuckets.map((b, i) => (
              <Cell key={i} fill={b.color} fillOpacity={0.7 + (i / agingBuckets.length) * 0.3} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {agingBuckets.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {agingBuckets.map((b) => (
            <span key={b.label} className="text-[7px] px-1 py-0.5 rounded-sm font-mono-tab flex items-center gap-1" style={{ backgroundColor: `${b.color}15`, color: b.color }}>
              <span className="w-1 h-1 rounded-full" style={{ backgroundColor: b.color }} />
              {b.label}: {b.count}
            </span>
          ))}
        </div>
      )}
      {totalValue > 0 && (
        <div className="text-[8px] text-muted-foreground mt-1 font-mono-tab flex justify-between">
          <span>Total held</span>
          <span className="font-semibold text-foreground">{fmtUSD(totalValue)}</span>
        </div>
      )}
    </div>
  );
}