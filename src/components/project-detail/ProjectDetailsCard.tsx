import { Pencil } from 'lucide-react';
import { fmtDate } from '@/lib/format';

export interface ProjectDetailsData {
  name: string;
  code?: string | null;
  clientName?: string | null;
  clientHref?: string | null;
  projectManager?: string | null;
  status: string;
  statusColor?: string;
  contractType?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  location?: string | null;
  department?: string | null;
}

export function ProjectDetailsCard({ data, onEdit, onViewSettings }: {
  data: ProjectDetailsData;
  onEdit?: () => void;
  onViewSettings?: () => void;
}) {
  const rows: [string, string | null | undefined, string?][] = [
    ['Project Code', data.code],
    ['Client', data.clientName, data.clientHref ?? undefined],
    ['Project Manager', data.projectManager],
    ['Contract Type', data.contractType],
    ['Start Date', data.startDate ? fmtDate(data.startDate) : null],
    ['End Date', data.endDate ? fmtDate(data.endDate) : null],
    ['Location', data.location],
    ['Department', data.department],
  ];

  return (
    <div className="pdv2-card overflow-hidden">
      <div className="pdv2-card-header flex items-center justify-between">
        <div className="text-[11px] font-bold uppercase tracking-wide">Project Details</div>
        {onEdit && (
          <button onClick={onEdit} className="pdv2-link flex items-center gap-1">
            <Pencil className="w-3 h-3" /> Edit
          </button>
        )}
      </div>
      <div className="p-4 space-y-2.5">
        <div className="flex justify-between items-baseline text-[12px] gap-3">
          <span className="text-muted-foreground shrink-0">Project Name</span>
          <span className="font-semibold text-right truncate">{data.name}</span>
        </div>
        <div className="flex justify-between items-center text-[12px] gap-3">
          <span className="text-muted-foreground shrink-0">Status</span>
          <span className={`text-[9px] uppercase tracking-wide font-bold px-2 py-0.5 rounded-full ${data.statusColor || 'bg-secondary text-foreground'}`}>
            {data.status}
          </span>
        </div>
        {rows.filter(([, v]) => v).map(([label, val, href]) => (
          <div key={label} className="flex justify-between items-baseline gap-3 text-[12px]">
            <span className="text-muted-foreground shrink-0">{label}</span>
            {href ? (
              <a href={href} className="font-medium text-right truncate text-blue-500 hover:underline">{val}</a>
            ) : (
              <span className="font-medium text-right truncate">{val}</span>
            )}
          </div>
        ))}
      </div>
      {onViewSettings && (
        <div className="px-4 pb-3.5">
          <button onClick={onViewSettings} className="pdv2-link">View project settings →</button>
        </div>
      )}
    </div>
  );
}
