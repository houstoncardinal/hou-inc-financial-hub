import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { fmtUSD } from '@/lib/format';

export interface DonutSlice { label: string; value: number; color: string; }

export function DonutChart({ slices, centerValue, centerLabel, size = 128, formatValue = fmtUSD }: {
  slices: DonutSlice[];
  centerValue?: string;
  centerLabel?: string;
  size?: number;
  formatValue?: (n: number) => string;
}) {
  const data = slices.filter(s => s.value > 0);
  const chartData = data.length ? data : [{ label: 'none', value: 1, color: '#e5e5e5' }];
  return (
    <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <ResponsiveContainer width={size} height={size}>
          <PieChart>
            <Pie
              data={chartData} dataKey="value" nameKey="label" cx="50%" cy="50%"
              innerRadius={size * 0.32} outerRadius={size * 0.48}
              paddingAngle={data.length > 1 ? 2 : 0} isAnimationActive={false} stroke="none"
            >
              {chartData.map((s, i) => <Cell key={i} fill={s.color} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {(centerValue || centerLabel) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            {centerValue && <div className="text-lg font-bold font-mono-tab">{centerValue}</div>}
            {centerLabel && <div className="text-[9px] uppercase tracking-wide text-muted-foreground mt-0.5 text-center px-2">{centerLabel}</div>}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        {slices.map(s => (
          <div key={s.label} className="flex items-center justify-between gap-2 text-[11px]">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
              <span className="text-muted-foreground truncate">{s.label}</span>
            </div>
            <span className="font-mono-tab font-semibold shrink-0">{formatValue(s.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
