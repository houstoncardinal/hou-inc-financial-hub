import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { Sparkline } from './Sparkline';

export function StatCard({ label, value, sub, subColor, trend, trendColor, icon: Icon, deltaTone = 'directional', deltaMode = 'relative', onClick }: {
  label: string;
  value: string;
  sub?: string;
  subColor?: string;
  /** Real historical series only — omit entirely rather than fabricate a trend. */
  trend?: number[];
  trendColor?: string;
  icon?: any;
  /** 'directional' colors the delta green/red by up/down (default — use when up is unambiguously good,
   *  e.g. cash position). 'neutral' shows the same delta in gray for metrics where more isn't necessarily
   *  better or worse (e.g. budget used — rising is just progress, not a win or a loss). */
  deltaTone?: 'directional' | 'neutral';
  /** 'relative' (default) shows the delta as a % change of the trend's starting value — use for dollar
   *  metrics. 'absolute' shows the raw point change instead — use when the metric itself is already a
   *  percentage (e.g. budget used), where a "% change of a %" reads as misleading. */
  deltaMode?: 'relative' | 'absolute';
  onClick?: () => void;
}) {
  const hasTrend = trend && trend.length > 1;
  const delta = hasTrend ? trend[trend.length - 1] - trend[0] : 0;
  const pctDelta = hasTrend && trend[0] !== 0 ? (delta / Math.abs(trend[0])) * 100 : 0;
  const displayDelta = deltaMode === 'absolute' ? delta : pctDelta;
  const deltaDir = delta > 0.001 ? 'up' : delta < -0.001 ? 'down' : 'flat';
  const chipClass = deltaTone === 'neutral' ? 'pdv2-trend-flat' : deltaDir === 'up' ? 'pdv2-trend-up' : deltaDir === 'down' ? 'pdv2-trend-down' : 'pdv2-trend-flat';

  return (
    <div className={`pdv2-card p-4 min-w-0 ${onClick ? 'cursor-pointer' : ''}`} onClick={onClick}>
      <div className="flex items-start justify-between gap-1.5 mb-2">
        <div className="pdv2-label flex items-start gap-1.5 min-w-0">
          {Icon && (
            <span className="pdv2-icon-chip shrink-0" style={{ backgroundColor: `${trendColor || '#9D7E3F'}1a` }}>
              <Icon className="w-3 h-3" style={{ color: trendColor || '#9D7E3F' }} />
            </span>
          )}
          <span className="leading-snug pt-1">{label}</span>
        </div>
        {hasTrend && Math.abs(displayDelta) > 0.05 && (
          <span className={`shrink-0 inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${chipClass}`}>
            {deltaDir === 'up' ? <ArrowUpRight className="w-2.5 h-2.5" /> : deltaDir === 'down' ? <ArrowDownRight className="w-2.5 h-2.5" /> : <Minus className="w-2.5 h-2.5" />}
            {Math.abs(displayDelta).toFixed(1)}{deltaMode === 'absolute' ? ' pts' : '%'}
          </span>
        )}
      </div>
      <div className="text-xl font-bold font-mono-tab leading-tight truncate">{value}</div>
      {sub && <div className={`text-[11px] mt-1 truncate ${subColor || 'text-muted-foreground'}`}>{sub}</div>}
      {hasTrend && (
        <div className="mt-2 -mx-1">
          <Sparkline data={trend} color={trendColor || '#9D7E3F'} />
        </div>
      )}
    </div>
  );
}
