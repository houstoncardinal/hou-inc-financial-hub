import { useMemo } from 'react';

interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
  className?: string;
}

export default function SparklineChart({
  data,
  color = 'var(--positive)',
  height = 28,
  className = '',
}: SparklineProps) {
  const path = useMemo(() => {
    if (!data.length) return '';
    const width = data.length * 8; // 8px per bar
    const max = Math.max(...data.map(Math.abs), 1);
    const barWidth = Math.max(3, width / data.length - 1);

    return data
      .map((val, i) => {
        const h = Math.max(2, (Math.abs(val) / max) * height);
        const x = i * (barWidth + 1);
        const y = height - h;
        // Determine fill color based on value
        const fill = val >= 0 ? color : 'var(--accent)';
        return `<rect x="${x}" y="${y}" width="${barWidth}" height="${h}" fill="${fill}" rx="1" />`;
      })
      .join('');
  }, [data, color, height]);

  if (!data.length) return null;

  const totalWidth = data.length * 8;

  return (
    <div className={`inline-flex items-end ${className}`}>
      <svg
        width={totalWidth}
        height={height}
        viewBox={`0 0 ${totalWidth} ${height}`}
        className="overflow-visible"
        style={{ minWidth: totalWidth }}
      >
        <g dangerouslySetInnerHTML={{ __html: path }} />
      </svg>
    </div>
  );
}