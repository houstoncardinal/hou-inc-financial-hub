import { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { fmtUSD } from '@/lib/format';

export interface TrendSeries { key: string; label: string; color: string; }
export interface TrendPoint { period: string; [key: string]: number | string; }

function TrendTooltip({ active, payload, label, series }: any) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s: number, p: any) => s + (Number(p.value) || 0), 0);
  return (
    <div className="rounded-lg border border-border bg-background px-2.5 py-2 shadow-lg text-[11px] min-w-[140px]">
      <div className="font-bold mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="space-y-0.5">
        {series.map((s: TrendSeries) => {
          const p = payload.find((x: any) => x.dataKey === s.key);
          if (!p) return null;
          return (
            <div key={s.key} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                {s.label}
              </span>
              <span className="font-mono-tab font-semibold">{fmtUSD(Number(p.value) || 0)}</span>
            </div>
          );
        })}
      </div>
      {series.length > 1 && (
        <div className="flex items-center justify-between gap-3 mt-1 pt-1 border-t border-border font-bold">
          <span>Total</span>
          <span className="font-mono-tab">{fmtUSD(total)}</span>
        </div>
      )}
    </div>
  );
}

export function TrendLineChart({ data, series, periods = [3, 6, 12], defaultPeriod = 6 }: {
  data: TrendPoint[];
  series: TrendSeries[];
  periods?: number[];
  defaultPeriod?: number;
}) {
  const [months, setMonths] = useState(defaultPeriod);
  const sliced = data.slice(-months);

  return (
    <div>
      <div className="flex justify-end mb-1">
        <select
          value={months}
          onChange={e => setMonths(Number(e.target.value))}
          className="text-[10px] border border-border rounded-md px-1.5 py-1 bg-background focus:outline-none hover:border-foreground/30 transition-colors"
        >
          {periods.map(p => <option key={p} value={p}>{p} Months</option>)}
        </select>
      </div>
      <ResponsiveContainer width="100%" height={190}>
        <AreaChart data={sliced} margin={{ top: 6, right: 6, bottom: 0, left: -18 }}>
          <defs>
            {series.map(s => (
              <linearGradient key={s.key} id={`trend-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={0.28} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.6} />
          <XAxis dataKey="period" tick={{ fontSize: 9 }} axisLine={{ stroke: 'hsl(var(--border))' }} tickLine={false} />
          <YAxis
            tick={{ fontSize: 9 }} axisLine={false} tickLine={false} width={44}
            tickFormatter={(v: number) => `${v < 0 ? '-' : ''}$${Math.abs(v) >= 1000 ? (Math.abs(v) / 1000).toFixed(0) + 'K' : Math.abs(v)}`}
          />
          <Tooltip content={<TrendTooltip series={series} />} cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1, strokeDasharray: '3 3' }} />
          {series.map(s => (
            <Area
              key={s.key} type="monotone" dataKey={s.key} name={s.label}
              stroke={s.color} strokeWidth={2} fill={`url(#trend-${s.key})`}
              dot={{ r: 2.5, fill: s.color, strokeWidth: 0 }}
              activeDot={{ r: 4, fill: s.color, stroke: 'white', strokeWidth: 1.5 }}
              isAnimationActive={false}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2 pt-2 border-t border-border">
        {series.map(s => {
          const total = sliced.reduce((sum, d) => sum + (Number(d[s.key]) || 0), 0);
          return (
            <div key={s.key} className="flex items-center gap-1.5 text-[10px]">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
              <span className="text-muted-foreground">{s.label}</span>
              <span className="font-mono-tab font-semibold">{fmtUSD(total)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
