import { FileText, Image as ImageIcon, FileCheck2 } from 'lucide-react';
import { fmtBytes, fmtDate } from '@/lib/format';
import { DOC_TYPE_COLORS, DocType } from '@/hooks/useDocuments';

function iconFor(docType?: string) {
  if (docType === 'photo') return ImageIcon;
  if (docType === 'contract' || docType === 'permit' || docType === 'insurance') return FileCheck2;
  return FileText;
}

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
          {shown.map(d => {
            const color = DOC_TYPE_COLORS[d.doc_type as DocType] || '#78716c';
            const Icon = iconFor(d.doc_type);
            const uploaded = d.created_at || d.uploaded_at;
            return (
              <div key={d.id} className="px-4 py-2.5 flex items-center gap-2.5 pdv2-row-hover transition-colors">
                <span className="pdv2-icon-chip" style={{ backgroundColor: `${color}1a` }}>
                  <Icon className="w-3.5 h-3.5" style={{ color }} strokeWidth={1.75} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-medium truncate">{d.title || d.file_name}</div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    {(d.doc_type || '').toUpperCase()}{d.doc_type && d.file_size ? ' · ' : ''}{fmtBytes(d.file_size)}
                    {uploaded ? ` · ${fmtDate(uploaded)}` : ''}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
