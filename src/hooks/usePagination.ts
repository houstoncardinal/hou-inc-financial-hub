import { useEffect, useMemo, useState } from 'react';

/**
 * Shared client-side pagination — slices `items` into pages and clamps the
 * current page whenever the list shrinks (e.g. a filter narrows results).
 * Pass `resetKey` (e.g. a filter/search value) to jump back to page 1
 * whenever it changes, mirroring the pattern already used in HgpJobs.tsx.
 */
export function usePagination<T>(items: T[], pageSize: number, resetKey?: unknown) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(1, page), pageCount);

  const paged = useMemo(
    () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [items, safePage, pageSize]
  );

  return { page: safePage, setPage, pageCount, paged, total: items.length, pageSize };
}
