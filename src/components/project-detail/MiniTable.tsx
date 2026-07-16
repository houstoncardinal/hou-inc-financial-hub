import type { ReactNode } from 'react';

export interface MiniTableColumn {
  key: string;
  label: string;
  align?: 'left' | 'right';
  render?: (row: any) => ReactNode;
}

export function MiniTable({ title, columns, rows, onViewAll, emptyText, emptyAction }: {
  title: string;
  columns: MiniTableColumn[];
  rows: any[];
  onViewAll?: () => void;
  emptyText?: string;
  emptyAction?: ReactNode;
}) {
  return (
    <div className="pdv2-card overflow-hidden flex flex-col">
      <div className="pdv2-card-header flex items-center justify-between">
        <div className="text-[11px] font-bold uppercase tracking-wide">{title}</div>
        {onViewAll && rows.length > 0 && (
          <button onClick={onViewAll} className="pdv2-link">View all →</button>
        )}
      </div>
      {rows.length === 0 ? (
        <div className="p-6 text-center text-xs text-muted-foreground flex-1 flex flex-col items-center justify-center">
          {emptyText || 'Nothing here yet.'}
          {emptyAction && <div className="mt-3">{emptyAction}</div>}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-border">
                {columns.map(c => (
                  <th key={c.key} className={`px-3 py-2 text-[9px] uppercase tracking-wide text-muted-foreground font-semibold whitespace-nowrap ${c.align === 'right' ? 'text-right' : 'text-left'}`}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.id ?? i} className="border-b border-border last:border-b-0 pdv2-row-hover transition-colors">
                  {columns.map(c => (
                    <td key={c.key} className={`px-3 py-2.5 whitespace-nowrap ${c.align === 'right' ? 'text-right font-mono-tab font-medium' : ''}`}>
                      {c.render ? c.render(row) : row[c.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
