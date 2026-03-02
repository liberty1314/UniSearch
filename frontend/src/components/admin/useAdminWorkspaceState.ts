import { useEffect, useMemo, useRef, useState } from 'react';
import type { UnifiedStatusFilter } from './previewFilters';

interface UseAdminWorkspaceStateOptions<T, K extends string | number> {
  isOpen: boolean;
  items: T[];
  getKey: (item: T) => K;
  compareItems: (a: T, b: T) => number;
  matchesKeyword: (item: T, keyword: string) => boolean;
  matchesStatus: (item: T, filter: UnifiedStatusFilter) => boolean;
  pageSize: number;
}

interface UseAdminWorkspaceStateResult<T, K extends string | number> {
  searchKeyword: string;
  setSearchKeyword: (value: string) => void;
  statusFilter: UnifiedStatusFilter;
  setStatusFilter: (value: UnifiedStatusFilter) => void;
  currentPage: number;
  setCurrentPage: (value: number) => void;
  orderedItems: T[];
  filteredItems: T[];
  pagedItems: T[];
  totalPages: number;
  selectedKeys: Set<K>;
  selectedCount: number;
  selectKey: (key: K, checked: boolean) => void;
  selectAllFiltered: () => void;
  clearSelected: () => void;
}

export const useAdminWorkspaceState = <T, K extends string | number>({
  isOpen,
  items,
  getKey,
  compareItems,
  matchesKeyword,
  matchesStatus,
  pageSize,
}: UseAdminWorkspaceStateOptions<T, K>): UseAdminWorkspaceStateResult<T, K> => {
  const [searchKeyword, setSearchKeywordState] = useState('');
  const [statusFilter, setStatusFilterState] = useState<UnifiedStatusFilter>('all');
  const [currentPage, setCurrentPageState] = useState(1);
  const [selectedKeys, setSelectedKeys] = useState<Set<K>>(new Set());
  const [sessionOrderMap, setSessionOrderMap] = useState<Record<string, number>>({});
  const sessionInitializedRef = useRef(false);

  useEffect(() => {
    if (isOpen) return;
    sessionInitializedRef.current = false;
    setSearchKeywordState('');
    setStatusFilterState('all');
    setCurrentPageState(1);
    setSelectedKeys(new Set());
    setSessionOrderMap({});
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || sessionInitializedRef.current) return;

    const sorted = [...items].sort(compareItems);
    const nextOrderMap: Record<string, number> = {};
    sorted.forEach((item, index) => {
      nextOrderMap[String(getKey(item))] = index;
    });

    setSessionOrderMap(nextOrderMap);
    sessionInitializedRef.current = true;
  }, [compareItems, getKey, isOpen, items]);

  useEffect(() => {
    if (!isOpen || !sessionInitializedRef.current) return;

    setSessionOrderMap((prev) => {
      const existingKeys = new Set(Object.keys(prev));
      const nextOrderMap: Record<string, number> = {};
      let nextIndex = 0;

      items.forEach((item) => {
        const key = String(getKey(item));
        if (existingKeys.has(key)) {
          nextOrderMap[key] = prev[key];
          nextIndex = Math.max(nextIndex, prev[key] + 1);
        }
      });

      const newItems = items
        .filter((item) => nextOrderMap[String(getKey(item))] === undefined)
        .sort(compareItems);

      newItems.forEach((item) => {
        nextOrderMap[String(getKey(item))] = nextIndex;
        nextIndex += 1;
      });

      return nextOrderMap;
    });
  }, [compareItems, getKey, isOpen, items]);

  useEffect(() => {
    const existingKeySet = new Set(items.map((item) => getKey(item)));
    setSelectedKeys((prev) => {
      const next = new Set<K>();
      prev.forEach((key) => {
        if (existingKeySet.has(key)) {
          next.add(key);
        }
      });
      return next;
    });
  }, [getKey, items]);

  const orderedItems = useMemo(
    () =>
      [...items].sort((a, b) => {
        const aOrder = sessionOrderMap[String(getKey(a))];
        const bOrder = sessionOrderMap[String(getKey(b))];
        if (aOrder !== undefined && bOrder !== undefined) return aOrder - bOrder;
        if (aOrder !== undefined) return -1;
        if (bOrder !== undefined) return 1;
        return compareItems(a, b);
      }),
    [compareItems, getKey, items, sessionOrderMap]
  );

  const filteredItems = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();
    return orderedItems.filter(
      (item) => matchesKeyword(item, keyword) && matchesStatus(item, statusFilter)
    );
  }, [matchesKeyword, matchesStatus, orderedItems, searchKeyword, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPageState(totalPages);
    }
  }, [currentPage, totalPages]);

  const pagedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [currentPage, filteredItems, pageSize]);

  const setSearchKeyword = (value: string) => {
    setSearchKeywordState(value);
    setCurrentPageState(1);
  };

  const setStatusFilter = (value: UnifiedStatusFilter) => {
    setStatusFilterState(value);
    setCurrentPageState(1);
  };

  const setCurrentPage = (value: number) => {
    setCurrentPageState(value);
  };

  const selectKey = (key: K, checked: boolean) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelectedKeys(new Set(filteredItems.map((item) => getKey(item))));
  };

  const clearSelected = () => {
    setSelectedKeys(new Set());
  };

  return {
    searchKeyword,
    setSearchKeyword,
    statusFilter,
    setStatusFilter,
    currentPage,
    setCurrentPage,
    orderedItems,
    filteredItems,
    pagedItems,
    totalPages,
    selectedKeys,
    selectedCount: selectedKeys.size,
    selectKey,
    selectAllFiltered,
    clearSelected,
  };
};
