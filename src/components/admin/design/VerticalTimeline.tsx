import type { ReactNode, CSSProperties } from 'react';

export interface VerticalTimelineEntry {
  id: string;
  icon: ReactNode;
  iconClassName?: string;
  iconStyle?: CSSProperties;
  title: ReactNode;
  meta?: ReactNode;
  body?: ReactNode;
}

export function VerticalTimeline({ entries, emptyText = 'No activity recorded yet.' }: {
  entries: VerticalTimelineEntry[];
  emptyText?: string;
}) {
  if (entries.length === 0) {
    return <div className="py-16 text-center text-sm text-muted-foreground">{emptyText}</div>;
  }
  return (
    <div className="relative">
      <div className="absolute left-[13px] top-2 bottom-2 w-px bg-border" />
      <div className="space-y-3">
        {entries.map(e => (
          <div key={e.id} className="relative flex gap-3.5">
            <span
              className={`pdv2-icon-chip relative z-10 shrink-0 ${e.iconClassName || (!e.iconStyle ? 'bg-secondary text-muted-foreground' : '')}`}
              style={{ width: 26, height: 26, ...e.iconStyle }}
            >
              {e.icon}
            </span>
            <div className="flex-1 min-w-0 pdv2-card px-4 py-3">
              <div className="text-[12px] font-semibold text-foreground">{e.title}</div>
              {e.meta && <div className="text-[10px] text-muted-foreground mt-0.5">{e.meta}</div>}
              {e.body && <div className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">{e.body}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
