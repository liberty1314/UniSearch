import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronDown, ChevronUp, Database } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toStyleVars } from '@/lib/styleVars';
import {
  BLUE_CYAN_BORDER,
  BLUE_CYAN_SOFT_SURFACE,
  BLUE_CYAN_TEXT,
  BLUE_CYAN_TEXT_STRONG,
  BLUE_CYAN_ICON,
} from '@/lib/brandTheme';

export interface AdminDataTableColumn<T> {
  key: string;
  title: string | React.ReactNode;
  render: (item: T, index: number) => React.ReactNode;
  width?: string;
  hideOnMobile?: boolean;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
}

export interface AdminDataTableProps<T> {
  data: T[];
  columns: AdminDataTableColumn<T>[];
  rowKey: (item: T) => string | number;
  loading?: boolean;
  emptyText?: string;
  onRowClick?: (item: T, index: number) => void;
  className?: string;
  hoverable?: boolean;
  onSortChange?: (key: string, direction: 'asc' | 'desc' | null) => void;
  renderMobileItem?: (item: T, index: number) => React.ReactNode;
  countLabel?: string;
  showCount?: boolean;
  renderDesktopOverlay?: (item: T, close: () => void) => React.ReactNode;
  isRowInteractive?: (item: T) => boolean;
  onOverlayOpenChange?: (item: T | null) => void;
  disableInteractionsWhenOverlayOpen?: boolean;
}

export function AdminDataTable<T extends object>({
  data,
  columns,
  rowKey,
  loading = false,
  emptyText = '暂无数据',
  onRowClick,
  className,
  hoverable = true,
  onSortChange,
  renderMobileItem,
  countLabel = '条记录',
  showCount = true,
  renderDesktopOverlay,
  isRowInteractive,
  onOverlayOpenChange,
  disableInteractionsWhenOverlayOpen = true,
}: AdminDataTableProps<T>) {
  const shouldReduceMotion = useReducedMotion();
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);
  const [activeOverlayKey, setActiveOverlayKey] = useState<string | number | null>(null);

  const handleSort = (key: string) => {
    let newDirection: 'asc' | 'desc' | null = 'asc';

    if (sortKey === key) {
      if (sortDirection === 'asc') {
        newDirection = 'desc';
      } else if (sortDirection === 'desc') {
        newDirection = null;
      }
    }

    setSortKey(newDirection ? key : null);
    setSortDirection(newDirection);
    onSortChange?.(key, newDirection);
  };

  const sortedData = useMemo(() => {
    if (!sortKey || !sortDirection) {
      return data;
    }

    return [...data].sort((a, b) => {
      const aRecord = a as Record<string, unknown>;
      const bRecord = b as Record<string, unknown>;
      const aValue = aRecord[sortKey];
      const bValue = bRecord[sortKey];

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue, 'zh-CN');
        return sortDirection === 'asc' ? comparison : -comparison;
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      if (aValue instanceof Date && bValue instanceof Date) {
        const comparison = aValue.getTime() - bValue.getTime();
        return sortDirection === 'asc' ? comparison : -comparison;
      }

      const canParseDate =
        (typeof aValue === 'string' || typeof aValue === 'number' || aValue instanceof Date) &&
        (typeof bValue === 'string' || typeof bValue === 'number' || bValue instanceof Date);
      if (canParseDate) {
        const aDate = new Date(aValue);
        const bDate = new Date(bValue);
        if (!Number.isNaN(aDate.getTime()) && !Number.isNaN(bDate.getTime())) {
          const comparison = aDate.getTime() - bDate.getTime();
          return sortDirection === 'asc' ? comparison : -comparison;
        }
      }

      const comparison = String(aValue).localeCompare(String(bValue), 'zh-CN');
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [data, sortDirection, sortKey]);

  const activeOverlayItem = useMemo(() => {
    if (activeOverlayKey === null) {
      return null;
    }

    return sortedData.find((item) => rowKey(item) === activeOverlayKey) ?? null;
  }, [activeOverlayKey, rowKey, sortedData]);

  useEffect(() => {
    if (activeOverlayKey === null) {
      return;
    }

    const hasItem = data.some((item) => rowKey(item) === activeOverlayKey);
    if (!hasItem) {
      setActiveOverlayKey(null);
      onOverlayOpenChange?.(null);
    }
  }, [activeOverlayKey, data, onOverlayOpenChange, rowKey]);

  const closeOverlay = () => {
    setActiveOverlayKey(null);
    onOverlayOpenChange?.(null);
  };

  const handleDesktopRowClick = (item: T, index: number) => {
    onRowClick?.(item, index);

    if (!renderDesktopOverlay) {
      return;
    }

    if (isRowInteractive && !isRowInteractive(item)) {
      return;
    }

    setActiveOverlayKey(rowKey(item));
    onOverlayOpenChange?.(item);
  };

  const renderLoading = () => (
    <div className="flex min-h-[300px] items-center justify-center px-6 py-16">
      <div className="flex flex-col items-center gap-4 text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
          className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${BLUE_CYAN_BORDER} ${BLUE_CYAN_SOFT_SURFACE}`}
        >
          <Database className={`h-5 w-5 ${BLUE_CYAN_ICON}`} />
        </motion.div>
        <div className="space-y-1">
          <p className={`text-sm font-semibold ${BLUE_CYAN_TEXT_STRONG}`}>正在整理列表数据</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">同步当前筛选结果与状态信息</p>
        </div>
      </div>
    </div>
  );

  const renderEmpty = () => (
    <div className="flex min-h-[260px] items-center justify-center px-6 py-14">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl border ${BLUE_CYAN_BORDER} ${BLUE_CYAN_SOFT_SURFACE}`}>
          <Database className={`h-5 w-5 ${BLUE_CYAN_ICON}`} />
        </div>
        <div className="space-y-1">
          <p className={`text-sm font-semibold ${BLUE_CYAN_TEXT_STRONG}`}>{emptyText}</p>
          <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
            当前筛选条件下没有可展示的记录，稍后可以调整筛选或刷新列表。
          </p>
        </div>
      </div>
    </div>
  );

  const renderDesktopView = () => (
    <div className="relative hidden md:block">
      <div className="overflow-x-auto px-2 pb-2">
        <table className="min-w-full border-separate border-spacing-y-2" role="table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    'px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400',
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right',
                    column.sortable && 'cursor-pointer select-none transition-colors hover:text-slate-800 dark:hover:text-slate-100'
                  )}
                  style={column.width ? { ...toStyleVars({ '--table-column-width': column.width }), width: column.width } : undefined}
                  onClick={() => column.sortable && handleSort(column.key)}
                  role="columnheader"
                >
                  <div
                    className={cn(
                      'flex items-center gap-2',
                      column.align === 'center' && 'justify-center',
                      column.align === 'right' && 'justify-end'
                    )}
                  >
                    <span className="whitespace-nowrap">{column.title}</span>
                    {column.sortable ? (
                      <div className="flex flex-col">
                        <ChevronUp
                          className={cn(
                            'h-3 w-3 -mb-1 transition-colors',
                            sortKey === column.key && sortDirection === 'asc'
                              ? BLUE_CYAN_ICON
                              : 'text-slate-300 dark:text-slate-600'
                          )}
                        />
                        <ChevronDown
                          className={cn(
                            'h-3 w-3 transition-colors',
                            sortKey === column.key && sortDirection === 'desc'
                              ? BLUE_CYAN_ICON
                              : 'text-slate-300 dark:text-slate-600'
                          )}
                        />
                      </div>
                    ) : null}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode="popLayout">
              {sortedData.map((item, index) => (
                <motion.tr
                  key={rowKey(item)}
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                  exit={shouldReduceMotion ? undefined : { opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, delay: shouldReduceMotion ? 0 : index * 0.02 }}
                  className={cn(
                    'rounded-2xl bg-white dark:bg-slate-900/70',
                    activeOverlayItem && rowKey(item) === rowKey(activeOverlayItem) && 'ring-1 ring-cyan-300/80 dark:ring-cyan-700/70',
                    activeOverlayItem && disableInteractionsWhenOverlayOpen && rowKey(item) !== rowKey(activeOverlayItem) && 'opacity-35',
                    hoverable && 'hover:bg-slate-50 dark:hover:bg-slate-800/70',
                    (onRowClick || renderDesktopOverlay) && 'cursor-pointer'
                  )}
                  onClick={() => handleDesktopRowClick(item, index)}
                  role="row"
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        'border-y border-slate-200/80 px-4 py-4 text-sm text-slate-800 dark:border-slate-800 dark:text-slate-100',
                        'first:rounded-l-2xl first:border-l last:rounded-r-2xl last:border-r',
                        column.align === 'center' && 'text-center',
                        column.align === 'right' && 'text-right'
                      )}
                      role="cell"
                    >
                      {column.render(item, index)}
                    </td>
                  ))}
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {activeOverlayItem && renderDesktopOverlay ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 z-10 flex rounded-[24px] bg-white/88 backdrop-blur-sm dark:bg-slate-950/88"
          >
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 12, scale: 0.98 }}
              animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
              exit={shouldReduceMotion ? undefined : { opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="flex-1 overflow-auto rounded-[24px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.98),rgba(255,255,255,0.96))] p-5 shadow-[0_24px_60px_rgba(15,23,42,0.12)] dark:border-slate-800 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(2,6,23,0.98))]"
            >
              {renderDesktopOverlay(activeOverlayItem, closeOverlay)}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );

  const renderMobileView = () => (
    <div className="space-y-3 px-1 md:hidden">
      <AnimatePresence mode="popLayout">
        {sortedData.map((item, index) => (
          <motion.div
            key={rowKey(item)}
            initial={shouldReduceMotion ? false : { opacity: 0, y: 8, scale: 0.98 }}
            animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
            exit={shouldReduceMotion ? undefined : { opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18, delay: shouldReduceMotion ? 0 : index * 0.02 }}
            className={cn(
              'overflow-hidden rounded-2xl border border-slate-200/80 bg-white px-4 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70',
              onRowClick && 'cursor-pointer'
            )}
            onClick={() => onRowClick?.(item, index)}
            role="article"
          >
            {renderMobileItem ? (
              renderMobileItem(item, index)
            ) : (
              <div className="space-y-3">
                {columns
                  .filter((column) => !column.hideOnMobile)
                  .map((column) => (
                    <div key={column.key} className="space-y-1">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                        {column.title}
                      </span>
                      <div className="text-sm text-slate-800 dark:text-slate-100">
                        {column.render(item, index)}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[28px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.95),rgba(255,255,255,0.92))] shadow-[0_24px_70px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.96))] dark:shadow-[0_24px_70px_rgba(2,6,23,0.55)]',
        className
      )}
      role="region"
      aria-label="数据表格"
    >
      <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/80 to-transparent" />

      {showCount && (
        <div className="flex justify-end px-5 pt-4">
          <div className={`inline-flex items-center gap-2 self-start rounded-full border px-3 py-1.5 text-xs font-medium ${BLUE_CYAN_SOFT_SURFACE} ${BLUE_CYAN_BORDER} ${BLUE_CYAN_TEXT}`}>
            <span className={`inline-block h-2 w-2 rounded-full bg-cyan-500 ${loading ? 'animate-pulse' : ''}`} />
            {loading ? '同步中' : `共 ${sortedData.length} ${countLabel}`}
          </div>
        </div>
      )}

      <div className="px-3 pb-3 pt-2">
        {loading ? renderLoading() : sortedData.length === 0 ? renderEmpty() : (
          <>
            {renderDesktopView()}
            {renderMobileView()}
          </>
        )}
      </div>
    </div>
  );
}
