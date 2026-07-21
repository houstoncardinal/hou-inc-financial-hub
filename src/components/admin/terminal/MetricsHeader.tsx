import { useRef } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip } from 'recharts';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

export interface MetricSparkPoint {
  v: number;
  label?: string;
}

export interface TerminalMetric {
  key: string;
  label: string;
  value: string;
  sub?: string;
  detail?: string;
  color: string;
  format?: 'currency' | 'number' | 'percent';
  deltaPct: number | null;
  invert?: boolean;
  spark: MetricSparkPoint[];
  timelineLabel?: string;
  onClick?: () => void;
}

function MetricTooltip({ active, payload, color, format = 'currency' }: any) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  return (
    <div className="rounded-xl border border-black/10 bg-white/95 px-3 py-2 shadow-[0_14px_35px_rgba(0,0,0,.14)] backdrop-blur-sm">
      <div className="text-[8px] font-black uppercase tracking-[0.16em] text-black/35">{point?.label || 'Timeline'}</div>
      <div className="mt-0.5 text-[12px] font-black tabular-nums" style={{ color }}>
        {format === 'currency' ? '$' : ''}{Number(point?.v || 0).toLocaleString('en-US', { maximumFractionDigits: format === 'percent' ? 1 : 0 })}{format === 'percent' ? '%' : ''}
      </div>
    </div>
  );
}

function MetricTile({ metric }: { metric: TerminalMetric }) {
  const { label, value, sub, detail, color, format, deltaPct, invert, spark, onClick, timelineLabel } = metric;
  const favorable = deltaPct === null ? null : invert ? deltaPct <= 0 : deltaPct >= 0;
  const deltaColor = favorable === null ? '#737373' : favorable ? '#16A34A' : '#DC2626';
  const DeltaIcon = deltaPct !== null && deltaPct < 0 ? ArrowDownRight : ArrowUpRight;
  const ref = useRef<HTMLButtonElement>(null);
  const gradientId = `metric-fill-${metric.key.replace(/[^a-z0-9]/gi, '-')}`;

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    ref.current!.style.setProperty('--spot-x', `${e.clientX - rect.left}px`);
    ref.current!.style.setProperty('--spot-y', `${e.clientY - rect.top}px`);
  };

  return (
    <button ref={ref} onClick={onClick} onMouseMove={handleMouseMove}
      className="kpi-lux group relative min-h-[210px] overflow-hidden rounded-[22px] border border-black/10 bg-white p-4 sm:p-5 text-left shadow-[0_12px_35px_rgba(0,0,0,.065)] transition-all duration-300 hover:-translate-y-1 hover:border-black/25 hover:shadow-[0_22px_55px_rgba(0,0,0,.13)]">
      <span aria-hidden className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: `radial-gradient(360px circle at var(--spot-x, 50%) var(--spot-y, 50%), ${color}12, transparent 68%)` }} />
      <span className="absolute inset-x-6 top-0 h-px opacity-70" style={{ background: `linear-gradient(90deg,transparent,${color},transparent)` }} />

      <div className="relative flex items-start justify-between gap-3">
        <div>
          <div className="text-[9px] font-black uppercase tracking-[0.17em] text-black/45">{label}</div>
          {detail && <div className="mt-1 text-[9px] text-black/30">{detail}</div>}
        </div>
        <span className="h-2.5 w-2.5 rounded-full shadow-[0_0_0_5px_rgba(0,0,0,.025)]" style={{ backgroundColor: color }} />
      </div>

      <div className="relative mt-3 flex items-end justify-between gap-3">
        <div className="text-[24px] sm:text-[28px] font-black tracking-[-0.035em] tabular-nums text-black leading-none">{value}</div>
        {deltaPct !== null && (
          <span className="mb-0.5 inline-flex items-center gap-0.5 rounded-full border px-2 py-1 text-[9px] font-black tabular-nums"
            style={{ color: deltaColor, borderColor: `${deltaColor}28`, backgroundColor: `${deltaColor}08` }}>
            <DeltaIcon className="w-3 h-3" strokeWidth={2.7} />{Math.abs(deltaPct).toFixed(1)}%
          </span>
        )}
      </div>
      {sub && <div className="relative mt-1.5 text-[10px] text-black/40 tabular-nums">{sub}</div>}

      <div className="relative mt-3 h-[72px] -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={spark} margin={{ top: 7, right: 4, left: 4, bottom: 1 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.30} />
                <stop offset="100%" stopColor={color} stopOpacity={0.015} />
              </linearGradient>
            </defs>
            <Tooltip content={<MetricTooltip color={color} format={format} />} cursor={{ stroke: color, strokeOpacity: 0.18, strokeDasharray: '3 3' }} />
            <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill={`url(#${gradientId})`} dot={false}
              activeDot={{ r: 4, fill: '#fff', stroke: color, strokeWidth: 2 }} isAnimationActive animationDuration={700} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="relative flex items-center justify-between border-t border-black/[0.055] pt-2 text-[8px] font-black uppercase tracking-[0.14em] text-black/25">
        <span>{timelineLabel || 'Selected period'}</span><span className="transition-colors group-hover:text-black/55">Explore →</span>
      </div>
    </button>
  );
}

export function MetricsHeader({ metrics }: { metrics: TerminalMetric[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
      {metrics.map(metric => <MetricTile key={metric.key} metric={metric} />)}
    </div>
  );
}
