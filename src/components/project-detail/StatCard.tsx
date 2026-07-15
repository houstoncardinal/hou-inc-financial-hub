import { Sparkline } from './Sparkline';

export function StatCard({ label, value, sub, subColor, trend, trendColor, icon: Icon }: {
  label: string;
  value: string;
  sub?: string;
  subColor?: string;
  /** Real historical series only — omit entirely rather than fabricate a trend. */
  trend?: number[];
  trendColor?: string;
  icon?: any;
}) {
  return (
    <div className="pdv2-card p-4 min-w-0">
      <div className="pdv2-label mb-2 flex items-center gap-1.5">
        {Icon && <Icon className="w-3 h-3" />}
        {label}
      </div>
      <div className="text-xl font-bold font-mono-tab leading-tight truncate">{value}</div>
      {sub && <div className={`text-[11px] mt-1 truncate ${subColor || 'text-muted-foreground'}`}>{sub}</div>}
      {trend && trend.length > 1 && (
        <div className="mt-2 -mx-1">
          <Sparkline data={trend} color={trendColor || '#9D7E3F'} />
        </div>
      )}
    </div>
  );
}
