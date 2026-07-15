export interface ActivityEntry {
  id: string;
  title: string;
  amount?: string;
  timestamp: string;
  dotColor?: string;
}

export function ActivityFeedCard({ entries, onViewAll, limit = 5 }: {
  entries: ActivityEntry[];
  onViewAll?: () => void;
  limit?: number;
}) {
  const shown = entries.slice(0, limit);
  return (
    <div className="pdv2-card overflow-hidden">
      <div className="pdv2-card-header flex items-center justify-between">
        <div className="text-[11px] font-bold uppercase tracking-wide">Project Activity</div>
        {onViewAll && entries.length > 0 && (
          <button onClick={onViewAll} className="pdv2-link">View all →</button>
        )}
      </div>
      {shown.length === 0 ? (
        <div className="p-6 text-center text-xs text-muted-foreground">No activity recorded yet.</div>
      ) : (
        <div className="divide-y divide-border">
          {shown.map(e => (
            <div key={e.id} className="px-4 py-3 flex items-start gap-2.5">
              <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${e.dotColor || 'bg-[#9D7E3F]'}`} />
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-medium truncate">
                  {e.title}
                  {e.amount && <span className="font-mono-tab text-muted-foreground"> · {e.amount}</span>}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{e.timestamp}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
