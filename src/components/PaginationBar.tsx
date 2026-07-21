interface PaginationBarProps {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  itemLabel?: string;
  className?: string;
}

const btnCls =
  'h-8 min-w-8 px-2.5 border border-border bg-background text-[10px] font-black uppercase tracking-[0.08em] ' +
  'transition-colors hover:bg-secondary/60 hover:border-foreground/22 ' +
  'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-background disabled:hover:border-border';

/** Shared pagination footer — same visual language across every finance list screen. */
export function PaginationBar({ page, pageCount, total, pageSize, onPageChange, itemLabel = 'items', className = '' }: PaginationBarProps) {
  if (total <= pageSize) return null;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1 ${className}`}>
      <div className="text-[10px] text-muted-foreground font-mono-tab">
        Showing {start}-{end} of {total} {itemLabel}
      </div>
      <div className="flex items-center justify-center gap-1.5">
        <button className={btnCls} onClick={() => onPageChange(1)} disabled={page === 1}>First</button>
        <button className={btnCls} onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page === 1}>Prev</button>
        <span className="px-2 text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground whitespace-nowrap">Page {page}/{pageCount}</span>
        <button className={btnCls} onClick={() => onPageChange(Math.min(pageCount, page + 1))} disabled={page === pageCount}>Next</button>
        <button className={btnCls} onClick={() => onPageChange(pageCount)} disabled={page === pageCount}>Last</button>
      </div>
    </div>
  );
}
