import { Check } from 'lucide-react';
import { fmtDate } from '@/lib/format';

export interface TimelineMilestone {
  id: string;
  title: string;
  date?: string | null;
  status: 'completed' | 'active' | 'pending';
}

export function MilestoneTimeline({ milestones }: { milestones: TimelineMilestone[] }) {
  if (milestones.length === 0) {
    return <div className="text-sm text-muted-foreground py-6 text-center">No milestones yet.</div>;
  }
  return (
    <div className="flex overflow-x-auto sm:overflow-visible gap-1 -mx-1 px-1">
      {milestones.map((m, i) => {
        const prevDone = i === 0 || milestones[i - 1].status !== 'pending';
        const nextDone = m.status !== 'pending';
        return (
          <div key={m.id} className="flex-1 min-w-[104px] flex flex-col items-center">
            <div className="flex items-center w-full">
              <div className={`flex-1 h-px ${i === 0 ? 'bg-transparent' : prevDone ? 'bg-[#9D7E3F]' : 'bg-border'}`} />
              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border-2 ${
                m.status === 'completed' ? 'bg-[#9D7E3F] border-[#9D7E3F]'
                  : m.status === 'active' ? 'bg-[#9D7E3F]/15 border-[#9D7E3F]'
                    : 'bg-background border-border'
              }`}>
                {m.status === 'completed' && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                {m.status === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-[#9D7E3F]" />}
              </div>
              <div className={`flex-1 h-px ${i === milestones.length - 1 ? 'bg-transparent' : nextDone ? 'bg-[#9D7E3F]' : 'bg-border'}`} />
            </div>
            <div className="text-center mt-2 px-1">
              <div className="text-[11px] font-semibold truncate max-w-[110px]">{m.title}</div>
              <div className="text-[9px] text-muted-foreground mt-0.5">{m.date ? fmtDate(m.date) : '—'}</div>
              <div className={`text-[8px] uppercase tracking-wide font-bold mt-0.5 ${
                m.status === 'completed' ? 'text-positive' : m.status === 'active' ? 'text-[#9D7E3F]' : 'text-muted-foreground/60'
              }`}>
                {m.status === 'completed' ? 'Completed' : m.status === 'active' ? 'In Progress' : 'Pending'}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
