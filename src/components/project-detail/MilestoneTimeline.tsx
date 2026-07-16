import { Check } from 'lucide-react';
import { fmtDate } from '@/lib/format';

export interface TimelineMilestone {
  id: string;
  title: string;
  date?: string | null;
  status: 'completed' | 'active' | 'pending';
  percentComplete?: number;
}

function NodeRing({ pct, size = 22 }: { pct: number; size?: number }) {
  const r = (size - 3) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.min(100, Math.max(0, pct)) / 100);
  return (
    <svg width={size} height={size} className="absolute inset-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--border))" strokeWidth={1.5} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#9D7E3F" strokeWidth={1.5}
        strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset .3s ease' }}
      />
    </svg>
  );
}

export function MilestoneTimeline({ milestones }: { milestones: TimelineMilestone[] }) {
  if (milestones.length === 0) {
    return <div className="text-sm text-muted-foreground py-6 text-center">No milestones yet.</div>;
  }

  const completedCount = milestones.filter(m => m.status === 'completed').length;
  const overallPct = milestones.length
    ? milestones.reduce((s, m) => s + (m.status === 'completed' ? 100 : (m.percentComplete ?? 0)), 0) / milestones.length
    : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[11px] font-bold">{completedCount}</span>
          <span className="text-[11px] text-muted-foreground">of {milestones.length} complete</span>
        </div>
        <div className="flex items-center gap-2 flex-1 max-w-[220px]">
          <div className="flex-1 h-1.5 rounded-full bg-secondary/60 overflow-hidden">
            <div className="h-full rounded-full bg-[#9D7E3F]" style={{ width: `${overallPct}%`, transition: 'width .3s ease' }} />
          </div>
          <span className="text-[10px] font-bold text-[#9D7E3F] tabular-nums w-9 text-right">{overallPct.toFixed(0)}%</span>
        </div>
      </div>
      <div className="flex overflow-x-auto sm:overflow-visible gap-1 -mx-1 px-1">
        {milestones.map((m, i) => {
          const prevDone = i === 0 || milestones[i - 1].status !== 'pending';
          const nextDone = m.status !== 'pending';
          const pct = m.percentComplete ?? 0;
          return (
            <div key={m.id} className="flex-1 min-w-[104px] flex flex-col items-center">
              <div className="flex items-center w-full">
                <div className={`flex-1 h-px ${i === 0 ? 'bg-transparent' : prevDone ? 'bg-[#9D7E3F]' : 'bg-border'}`} />
                <div className="relative shrink-0" style={{ width: 22, height: 22 }}>
                  {m.status === 'active' && <NodeRing pct={pct} size={22} />}
                  <div className={`absolute inset-0 m-auto rounded-full flex items-center justify-center border-2 ${
                    m.status === 'completed' ? 'bg-[#9D7E3F] border-[#9D7E3F] w-5 h-5'
                      : m.status === 'active' ? 'bg-[#9D7E3F]/15 border-[#9D7E3F]/40 w-3.5 h-3.5'
                        : 'bg-background border-border w-5 h-5'
                  }`}>
                    {m.status === 'completed' && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                    {m.status === 'active' && <span className="w-1 h-1 rounded-full bg-[#9D7E3F]" />}
                  </div>
                </div>
                <div className={`flex-1 h-px ${i === milestones.length - 1 ? 'bg-transparent' : nextDone ? 'bg-[#9D7E3F]' : 'bg-border'}`} />
              </div>
              <div className="text-center mt-2 px-1">
                <div className="text-[11px] font-semibold truncate max-w-[110px]">{m.title}</div>
                <div className="text-[9px] text-muted-foreground mt-0.5">{m.date ? fmtDate(m.date) : '—'}</div>
                <div className={`text-[8px] uppercase tracking-wide font-bold mt-0.5 ${
                  m.status === 'completed' ? 'text-positive' : m.status === 'active' ? 'text-[#9D7E3F]' : 'text-muted-foreground/60'
                }`}>
                  {m.status === 'completed' ? 'Completed' : m.status === 'active' ? `${pct.toFixed(0)}% In Progress` : 'Pending'}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
