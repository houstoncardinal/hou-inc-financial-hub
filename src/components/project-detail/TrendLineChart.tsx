import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { fmtUSD } from '@/lib/format';

export interface TrendSeries { key: string; label: string; color: string; }
export interface TrendPoint { period: string; [key: string]: number | string; }

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
          className="text-[10px] border border-border rounded-none px-1.5 py-1 bg-background focus:outline-none"
        >
          {periods.map(p => <option key={p} value={p}>{p} Months</option>)}
        </select>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={sliced} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
          <XAxis dataKey="period" tick={{ fontSize: 9 }} axisLine={{ stroke: 'hsl(var(--border))' }} tickLine={false} />
          <YAxis
            tick={{ fontSize: 9 }} axisLine={false} tickLine={false} width={44}
            tickFormatter={(v: number) => `${v < 0 ? '-' : ''}$${Math.abs(v) >= 1000 ? (Math.abs(v) / 1000).toFixed(0) + 'K' : Math.abs(v)}`}
          />
          <Tooltip formatter={(v: number) => fmtUSD(v)} contentStyle={{ fontSize: 11, borderRadius: 6 }} />
          {series.map(s => (
            <Line
              key={s.key} type="monotone" dataKey={s.key} name={s.label}
              stroke={s.color} strokeWidth={2} dot={{ r: 2.5 }} isAnimationActive={false}
            />
          ))}
        </LineChart>
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
