import { FileText } from 'lucide-react';
import { fmtBytes } from '@/lib/format';

export function DocumentsCard({ documents, onViewAll, limit = 5 }: {
  documents: any[];
  onViewAll?: () => void;
  limit?: number;
}) {
  const shown = documents.slice(0, limit);
  return (
    <div className="pdv2-card overflow-hidden">
      <div className="pdv2-card-header flex items-center justify-between">
        <div className="text-[11px] font-bold uppercase tracking-wide">Documents</div>
        {onViewAll && documents.length > 0 && (
          <button onClick={onViewAll} className="pdv2-link">View all →</button>
        )}
      </div>
      {shown.length === 0 ? (
        <div className="p-6 text-center text-xs text-muted-foreground">No documents uploaded yet.</div>
      ) : (
        <div className="divide-y divide-border">
          {shown.map(d => (
            <div key={d.id} className="px-4 py-2.5 flex items-center gap-2.5">
              <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" strokeWidth={1.5} />
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-medium truncate">{d.title || d.file_name}</div>
                <div className="text-[10px] text-muted-foreground">
                  {(d.doc_type || '').toUpperCase()}{d.doc_type && d.file_size ? ' · ' : ''}{fmtBytes(d.file_size)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
