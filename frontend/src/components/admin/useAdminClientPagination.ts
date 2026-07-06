import { useCallback, useEffect, useMemo, useState } from 'react';

export const PERFORMANCE_TABLE_PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const;

export const DEFAULT_PERFORMANCE_TABLE_PAGE_SIZE = 5;

interface UseAdminClientPaginationOptions {
  initialPageSize?: number;
}

export function useAdminClientPagination<T>(
  items: readonly T[],
  options: UseAdminClientPaginationOptions = {}
) {
  const [currentPage, setCurrentPageState] = useState(1);
  const [pageSize, setPageSizeState] = useState(options.initialPageSize ?? DEFAULT_PERFORMANCE_TABLE_PAGE_SIZE);

  const totalItems = items.length;
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalItems / pageSize)),
    [pageSize, totalItems]
  );

  useEffect(() => {
    setCurrentPageState((page) => Math.min(Math.max(page, 1), totalPages));
  }, [totalPages]);

  const pagedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [currentPage, items, pageSize]);

  const setCurrentPage = useCallback((page: number) => {
    setCurrentPageState(Math.min(Math.max(page, 1), totalPages));
  }, [totalPages]);

  const setPageSize = useCallback((nextPageSize: number) => {
    setPageSizeState(nextPageSize);
    setCurrentPageState(1);
  }, []);

  const resetPage = useCallback(() => {
    setCurrentPageState(1);
  }, []);

  return {
    currentPage,
    pageSize,
    pagedItems,
    resetPage,
    setCurrentPage,
    setPageSize,
    totalItems,
    totalPages,
  };
}
