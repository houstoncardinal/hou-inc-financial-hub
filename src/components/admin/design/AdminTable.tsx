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
    <div className="overflow-x-auto admin-table-wrap">
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
  );
}
