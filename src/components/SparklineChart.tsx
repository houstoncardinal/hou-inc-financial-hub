import { useMemo } from 'react';

interface SparklineProps {
  data: number[];
  color?: string;
  positiveColor?: string;
  negativeColor?: string;
  height?: number;
  width?: number;
  className?: string;
  showDot?: boolean;
}

export default function SparklineChart({
  data,
  color = 'var(--positive)',
  positiveColor,
  negativeColor,
  height = 32,
  width,
  className = '',
  showDot = false,
}: SparklineProps) {
  const posColor = positiveColor || color;
  const negColor = negativeColor || 'var(--accent)';

  const { pathDef, gradientId, areaPath, dotCx, dotCy } = useMemo(() => {
    if (!data.length) return { pathDef: '', gradientId: '', areaPath: '', dotCx: 0, dotCy: 0 };

    const w = width || data.length * 12;
    const padding = 2;
    const chartW = w - padding * 2;
    const chartH = height - padding * 2;

    const values = data.map(v => Math.abs(v));
    const max = Math.max(...values, 1);
    const min = Math.min(...data, 0);

    const range = Math.max(max - min, 1);
    const xStep = data.length > 1 ? chartW / (data.length - 1) : chartW / 2;

    const points = data.map((val, i) => {
      const x = padding + i * xStep;
      const normalizedY = (val - min) / range;
      const y = padding + chartH - normalizedY * chartH;
      return { x, y, val };
    });

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('');

    const areaPts = [
      `M${points[0].x.toFixed(1)},${(padding + chartH).toFixed(1)}`,
      `L${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`,
      points.slice(1).map(p => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(''),
      `L${points[points.length - 1].x.toFixed(1)},${(padding + chartH).toFixed(1)}Z`,
    ].join('');

    const lastPoint = points[points.length - 1];

    return {
      pathDef: linePath,
      gradientId: `spark-grad-${Math.random().toString(36).slice(2, 8)}`,
      areaPath: areaPts,
      dotCx: lastPoint.x,
      dotCy: lastPoint.y,
    };
  }, [data, color, height, width]);

  if (!data.length) return null;

  const w = width || data.length * 12;

  return (
    <div className={`inline-flex items-end ${className}`}>
      <svg
        width={w}
        height={height}
        viewBox={`0 0 ${w} ${height}`}
        className="overflow-visible"
        style={{ minWidth: w }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>

        {/* Area fill */}
        <path d={areaPath} fill={`url(#${gradientId})`} />

        {/* Line */}
        <path
          d={pathDef}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* End dot */}
        {showDot && (
          <circle cx={dotCx} cy={dotCy} r={3} fill={color} stroke="var(--background)" strokeWidth={1.5} />
        )}
      </svg>
    </div>
  );
}