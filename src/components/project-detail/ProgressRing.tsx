export function ProgressRing({ pct, size = 88, label = 'done', color = '#9D7E3F' }: { pct: number; size?: number; label?: string; color?: string }) {
  const sw = 6, r = (size - sw * 2) / 2, c = 2 * Math.PI * r, arc = Math.min(Math.max(pct, 0), 100) / 100 * c;
  const gradId = `ring-${color.replace('#', '')}`;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ display: 'block', transform: 'rotate(-90deg)' }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.65} />
            <stop offset="100%" stopColor={color} stopOpacity={1} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`${color}24`} strokeWidth={sw} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`url(#${gradId})`} strokeWidth={sw} strokeLinecap="round"
          strokeDasharray={`${arc} ${c - arc}`}
          style={{ transition: 'stroke-dasharray .4s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-bold font-mono-tab" style={{ fontSize: size * 0.24 }}>{Math.round(pct)}%</div>
        <div className="text-[8px] uppercase tracking-wide text-muted-foreground font-bold mt-0.5">{label}</div>
      </div>
    </div>
  );
}
