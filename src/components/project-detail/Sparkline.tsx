import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';

const SparkDot = (props: any) => {
  const { cx, cy, index, dataLength, color } = props;
  if (index !== dataLength - 1) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={4} fill={color} fillOpacity={0.18} />
      <circle cx={cx} cy={cy} r={2} fill={color} stroke="white" strokeWidth={1} />
    </g>
  );
};

export function Sparkline({ data, color, height = 34 }: { data: number[]; color: string; height?: number }) {
  if (!data || data.length < 2) return <div style={{ height }} />;
  const points = data.map((v, i) => ({ i, v }));
  const gradId = `spark-${color.replace('#', '')}`;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={points} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.4} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Tooltip
          contentStyle={{ fontSize: 10, padding: '3px 7px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.08)' }}
          labelFormatter={() => ''}
          formatter={(v: number) => [v.toLocaleString('en-US', { maximumFractionDigits: 1 }), '']}
          isAnimationActive={false}
        />
        <Area
          type="monotone" dataKey="v" stroke={color} strokeWidth={1.75}
          fill={`url(#${gradId})`} isAnimationActive={false}
          dot={(props: any) => {
            const { key, ...rest } = props;
            return <SparkDot key={rest.index} {...rest} dataLength={points.length} color={color} />;
          }}
          activeDot={{ r: 3, fill: color, stroke: 'white', strokeWidth: 1 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
