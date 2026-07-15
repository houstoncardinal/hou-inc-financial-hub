import { AreaChart, Area, ResponsiveContainer } from 'recharts';

export function Sparkline({ data, color, height = 32 }: { data: number[]; color: string; height?: number }) {
  if (!data || data.length < 2) return <div style={{ height }} />;
  const points = data.map((v, i) => ({ i, v }));
  const gradId = `spark-${color.replace('#', '')}`;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={points} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone" dataKey="v" stroke={color} strokeWidth={1.75}
          fill={`url(#${gradId})`} isAnimationActive={false} dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
