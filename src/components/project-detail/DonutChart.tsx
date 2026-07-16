import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { fmtUSD } from '@/lib/format';

export interface DonutSlice { label: string; value: number; color: string; }

function DonutTooltip({ active, payload, formatValue, total }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  const pct = total > 0 ? (p.value / total) * 100 : 0;
  return (
    <div className="rounded-lg border border-border bg-background px-2.5 py-1.5 shadow-lg text-[11px]">
      <div className="flex items-center gap-1.5 font-semibold mb-0.5">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
        {p.label}
      </div>
      <div className="font-mono-tab text-muted-foreground">{formatValue(p.value)} &middot; {pct.toFixed(1)}%</div>
    </div>
  );
}

export function DonutChart({ slices, centerValue, centerLabel, size = 110, formatValue = fmtUSD }: {
  slices: DonutSlice[];
  centerValue?: string;
  centerLabel?: string;
  size?: number;
  formatValue?: (n: number) => string;
}) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const data = slices.filter(s => s.value > 0).sort((a, b) => b.value - a.value);
  const chartData = data.length ? data : [{ label: 'none', value: 1, color: '#e5e5e5' }];
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <ResponsiveContainer width={size} height={size}>
          <PieChart>
            <Pie
              data={chartData} dataKey="value" nameKey="label" cx="50%" cy="50%"
              innerRadius={size * 0.32} outerRadius={size * 0.48}
              paddingAngle={data.length > 1 ? 2 : 0} isAnimationActive={false} stroke="none"
              onMouseEnter={(_, i) => data.length > 0 && setActiveIdx(i)}
              onMouseLeave={() => setActiveIdx(null)}
            >
              {chartData.map((s, i) => (
                <Cell
                  key={i} fill={s.color}
                  opacity={activeIdx === null || activeIdx === i ? 1 : 0.35}
                  style={{ transition: 'opacity .15s ease' }}
                />
              ))}
            </Pie>
            {data.length > 0 && <Tooltip content={<DonutTooltip formatValue={formatValue} total={total} />} />}
          </PieChart>
        </ResponsiveContainer>
        {(centerValue || centerLabel) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            {centerValue && <div className="text-lg font-bold font-mono-tab leading-tight">{centerValue}</div>}
            {centerLabel && <div className="text-[9px] uppercase tracking-wide text-muted-foreground mt-0.5 text-center px-2">{centerLabel}</div>}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        {data.map((s, i) => {
          const pct = total > 0 ? (s.value / total) * 100 : 0;
          return (
            <div
              key={s.label}
              className="rounded-md px-1.5 py-1 -mx-1.5 transition-colors"
              style={{ backgroundColor: activeIdx === i ? `${s.color}14` : 'transparent' }}
              onMouseEnter={() => setActiveIdx(i)}
              onMouseLeave={() => setActiveIdx(null)}
            >
              <div className="flex items-center gap-1.5 text-[11px] min-w-0">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                <span className="text-muted-foreground leading-snug">{s.label}</span>
              </div>
              <div className="flex items-baseline justify-between gap-2 mt-0.5 pl-3.5">
                <span className="font-mono-tab font-semibold text-[11px]">{formatValue(s.value)}</span>
                <span className="text-[9px] font-bold text-muted-foreground tabular-nums shrink-0">{pct.toFixed(1)}%</span>
              </div>
              <div className="mt-1 ml-3.5 h-[3px] rounded-full bg-secondary/60 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: s.color }} />
              </div>
            </div>
          );
        })}
        {data.length === 0 && (
          <div className="text-[11px] text-muted-foreground italic">No data yet</div>
        )}
      </div>
    </div>
  );
}
