import type { ReactNode } from 'react';

export interface AdminTableColumn {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  render?: (row: any) => ReactNode;
  className?: string;
}

export function AdminTable({ columns, rows, keyField = 'id', emptyText = 'Nothing here yet.', onRowClick }: {
  columns: AdminTableColumn[];
  rows: any[];
  keyField?: string;
  emptyText?: string;
  onRowClick?: (row: any) => void;
}) {
  if (rows.length === 0) {
    return <div className="py-16 text-center text-[13px] text-muted-foreground">{emptyText}</div>;
  }
  return (
    <div className="admin-table-wrap">
      <div className="hidden xl:block overflow-x-auto">
        <table className="w-full text-[12px] admin-table">
          <thead className="bg-secondary/45">
            <tr className="border-b border-border">
              {columns.map(c => (
                <th key={c.key} className={`px-4 py-3.5 text-[8px] uppercase tracking-[0.24em] text-muted-foreground font-black whitespace-nowrap ${c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left'}`}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row[keyField] ?? i}
                className={`border-b border-border last:border-b-0 pdv2-row-hover transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map(c => (
                  <td key={c.key} className={`px-4 py-3.5 align-middle ${c.align === 'right' ? 'text-right font-mono-tab' : c.align === 'center' ? 'text-center' : ''} ${c.className || ''}`}>
                    {c.render ? c.render(row) : row[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="xl:hidden divide-y divide-border">
        {rows.map((row, i) => {
          const primary = columns[0];
          const actions = columns.filter(c => !c.label.trim());
          const details = columns.slice(1).filter(c => c.label.trim());
          return (
            <div
              key={row[keyField] ?? i}
              role={onRowClick ? 'button' : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              onClick={() => onRowClick?.(row)}
              onKeyDown={e => {
                if (!onRowClick) return;
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onRowClick(row);
                }
              }}
              className={`w-full text-left px-3.5 sm:px-4 py-3.5 bg-background transition-colors ${onRowClick ? 'hover:bg-secondary/35' : 'cursor-default'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {primary.render ? primary.render(row) : row[primary.key]}
                </div>
                {actions.length > 0 && (
                  <div className="shrink-0 flex flex-wrap justify-end gap-1.5 max-w-[48%]" onClick={e => e.stopPropagation()}>
                    {actions.map(c => <span key={c.key}>{c.render ? c.render(row) : row[c.key]}</span>)}
                  </div>
                )}
              </div>
              {details.length > 0 && (
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {details.map(c => (
                    <div key={c.key} className="min-w-0 border border-border bg-secondary/20 px-2.5 py-2">
                      <div className="text-[7.5px] uppercase tracking-[0.14em] font-black text-muted-foreground truncate">{c.label}</div>
                      <div className={`mt-1 text-[10.5px] text-foreground min-w-0 ${c.align === 'right' ? 'font-mono-tab' : ''}`}>
                        {c.render ? c.render(row) : row[c.key]}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
