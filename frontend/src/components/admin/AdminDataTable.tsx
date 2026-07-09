import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronDown, ChevronUp, Database } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toStyleVars } from '@/lib/styleVars';
import {
  ADMIN_PANEL_SURFACE_CLASSES,
  ADMIN_PANEL_SURFACE_HOVER_CLASSES,
} from '@/components/admin/adminDesign';

export interface AdminDataTableColumn<T> {
  key: string;
  title: string | React.ReactNode;
  render: (item: T, index: number) => React.ReactNode;
  width?: string;
  desktopGridClassName?: string;
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
  desktopVariant?: 'table' | 'management-grid';
  desktopGridGapClassName?: string;
  desktopGridTemplateColumns?: string;
  desktopGridMinWidth?: string;
  getRowAccentClassName?: (item: T, index: number) => string;
  getRowTestId?: (item: T, index: number) => string;
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
  desktopVariant = 'table',
  desktopGridGapClassName = 'gap-4',
  desktopGridTemplateColumns,
  desktopGridMinWidth,
  getRowAccentClassName,
  getRowTestId,
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

  const renderSortIndicator = (column: AdminDataTableColumn<T>) => (
    column.sortable ? (
      <div className="flex flex-col">
        <ChevronUp
          className={cn(
            'h-3 w-3 -mb-1 transition-colors',
            sortKey === column.key && sortDirection === 'asc'
              ? 'text-blue-600 dark:text-cyan-300'
              : 'text-slate-300 dark:text-slate-600'
          )}
        />
        <ChevronDown
          className={cn(
            'h-3 w-3 transition-colors',
            sortKey === column.key && sortDirection === 'desc'
              ? 'text-blue-600 dark:text-cyan-300'
              : 'text-slate-300 dark:text-slate-600'
          )}
        />
      </div>
    ) : null
  );

  const desktopGridStyle = desktopGridTemplateColumns
    ? { gridTemplateColumns: desktopGridTemplateColumns }
    : undefined;
  const desktopGridContentStyle = desktopGridMinWidth
    ? { minWidth: desktopGridMinWidth }
    : undefined;

  const renderOverlayLayer = () => (
    <AnimatePresence>
      {activeOverlayItem && renderDesktopOverlay ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="absolute inset-0 z-20 flex rounded-[1.5rem] bg-white/82 backdrop-blur-xl dark:bg-slate-950/82"
        >
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 12, scale: 0.98 }}
            animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
            exit={shouldReduceMotion ? undefined : { opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="flex-1 overflow-auto rounded-[1.5rem] border-[0.5px] border-slate-200/50 bg-white/90 p-5 shadow-[0_24px_60px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:border-cyan-300/[0.14] dark:bg-slate-950/95"
          >
            {renderDesktopOverlay(activeOverlayItem, closeOverlay)}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  const renderManagementGridDesktopView = () => (
    <div className="relative hidden md:block">
      <div className="overflow-x-auto px-2 pb-2">
        <div className="min-w-full space-y-2" style={desktopGridContentStyle}>
        <div
          className={cn('grid grid-cols-12 px-5 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400', desktopGridGapClassName)}
          style={desktopGridStyle}
        >
          {columns.map((column) => (
            <button
              key={column.key}
              type="button"
              className={cn(
                'flex items-center gap-2 text-left',
                column.desktopGridClassName,
                column.align === 'center' && 'justify-center text-center',
                column.align === 'right' && 'justify-end text-right',
                column.sortable ? 'cursor-pointer select-none transition-colors hover:text-slate-800 dark:hover:text-slate-100' : 'cursor-default'
              )}
              onClick={() => column.sortable && handleSort(column.key)}
              role="columnheader"
            >
              <span className="whitespace-nowrap">{column.title}</span>
              {renderSortIndicator(column)}
            </button>
          ))}
        </div>

        <AnimatePresence mode="popLayout">
          {sortedData.map((item, index) => {
            const itemKey = rowKey(item);
            const accentClassName = getRowAccentClassName?.(item, index);
            const rowInteractive = Boolean(onRowClick || renderDesktopOverlay);

            return (
              <motion.div
                key={itemKey}
                initial={shouldReduceMotion ? false : { opacity: 0, x: -18, scale: 0.98, filter: 'blur(3px)' }}
                animate={shouldReduceMotion ? undefined : { opacity: 1, x: 0, scale: 1, filter: 'blur(0px)' }}
                exit={shouldReduceMotion ? undefined : { opacity: 0, x: 12, scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 360, damping: 30, mass: 0.7, delay: shouldReduceMotion ? 0 : index * 0.02 }}
                className={cn(
                  'relative rounded-2xl',
                  rowInteractive && 'cursor-pointer',
                  activeOverlayItem && itemKey === rowKey(activeOverlayItem) && 'ring-1 ring-cyan-200/70 dark:ring-cyan-700/70',
                  activeOverlayItem && disableInteractionsWhenOverlayOpen && itemKey !== rowKey(activeOverlayItem) && 'opacity-35'
                )}
                data-testid={getRowTestId?.(item, index)}
                onClick={rowInteractive ? () => handleDesktopRowClick(item, index) : undefined}
                role="row"
              >
                <motion.div
                  whileHover={shouldReduceMotion ? undefined : { y: -1 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 26 }}
                  className={cn(
                    'relative min-h-[72px] overflow-hidden rounded-2xl border border-slate-200/60 bg-white/45 px-5 py-4 text-sm shadow-sm backdrop-blur-xl transition-colors dark:border-cyan-300/[0.14] dark:bg-slate-950/[0.48]',
                    hoverable && 'hover:bg-white/65 dark:hover:bg-cyan-400/[0.08]'
                  )}
                >
                  {accentClassName ? (
                    <div
                      className={cn('pointer-events-none absolute inset-0 bg-gradient-to-l', accentClassName)}
                      style={{
                        backgroundSize: '32% 100%',
                        backgroundPosition: 'right',
                        backgroundRepeat: 'no-repeat',
                      }}
                    />
                  ) : null}

                  <div
                    className={cn('relative grid min-h-10 grid-cols-12 items-center', desktopGridGapClassName)}
                    style={desktopGridStyle}
                  >
                    {columns.map((column) => (
                      <div
                        key={column.key}
                        className={cn(
                          'min-w-0 text-slate-800 dark:text-slate-100',
                          column.desktopGridClassName,
                          column.align === 'center' && 'text-center',
                          column.align === 'right' && 'text-right'
                        )}
                        role="cell"
                      >
                        {column.render(item, index)}
                      </div>
                    ))}
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        </div>
      </div>

      {renderOverlayLayer()}
    </div>
  );

  const renderLoading = () => (
    <div className="flex min-h-[300px] items-center justify-center px-6 py-16">
      <div className="flex flex-col items-center gap-4 text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
          className="flex h-12 w-12 items-center justify-center rounded-2xl border-[0.5px] border-slate-200/50 bg-white/40 backdrop-blur-md dark:border-cyan-300/[0.14] dark:bg-slate-950/[0.48]"
        >
          <Database className="h-5 w-5 text-blue-600 dark:text-cyan-300" />
        </motion.div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-800 dark:text-white">正在整理列表数据</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">同步当前筛选结果与状态信息</p>
        </div>
      </div>
    </div>
  );

  const renderEmpty = () => (
    <div className="flex min-h-[260px] items-center justify-center px-6 py-14">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-[0.5px] border-slate-200/50 bg-white/40 backdrop-blur-md dark:border-cyan-300/[0.14] dark:bg-slate-950/[0.48]">
          <Database className="h-5 w-5 text-blue-600 dark:text-cyan-300" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-800 dark:text-white">{emptyText}</p>
          <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
            当前筛选条件下没有可展示的记录，稍后可以调整筛选或刷新列表。
          </p>
        </div>
      </div>
    </div>
  );

  const renderDesktopView = () => desktopVariant === 'management-grid' ? renderManagementGridDesktopView() : (
    <div className="relative hidden md:block">
      <div className="overflow-x-auto px-2 pb-2">
        <table className="min-w-full border-separate border-spacing-y-2" role="table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    'px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400',
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
                    {renderSortIndicator(column)}
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
                    'rounded-2xl bg-white/40 dark:bg-slate-950/[0.48]',
                    activeOverlayItem && rowKey(item) === rowKey(activeOverlayItem) && 'ring-1 ring-cyan-200/70 dark:ring-cyan-700/70',
                    activeOverlayItem && disableInteractionsWhenOverlayOpen && rowKey(item) !== rowKey(activeOverlayItem) && 'opacity-35',
                    hoverable && 'hover:bg-white/60 dark:hover:bg-cyan-400/[0.08]',
                    (onRowClick || renderDesktopOverlay) && 'cursor-pointer'
                  )}
                  data-testid={getRowTestId?.(item, index)}
                  onClick={(onRowClick || renderDesktopOverlay) ? () => handleDesktopRowClick(item, index) : undefined}
                  role="row"
                >
                  {columns.map((column) => (
                    <td
                    key={column.key}
                    className={cn(
                        'border-y border-slate-200/60 px-5 py-4 text-sm text-slate-800 dark:border-white/5 dark:text-slate-100',
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

      {renderOverlayLayer()}
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
              'overflow-hidden rounded-2xl border-[0.5px] border-slate-200/50 bg-white/40 px-4 py-4 shadow-sm backdrop-blur-md dark:border-cyan-300/[0.14] dark:bg-slate-950/[0.48]',
              onRowClick && 'cursor-pointer'
            )}
            data-testid={getRowTestId ? `${getRowTestId(item, index)}-mobile` : undefined}
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
                      <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-300">
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
        ADMIN_PANEL_SURFACE_CLASSES,
        ADMIN_PANEL_SURFACE_HOVER_CLASSES,
        'relative overflow-hidden rounded-[1.75rem] shadow-[0_24px_70px_rgba(15,23,42,0.08)] dark:shadow-[0_24px_70px_rgba(2,6,23,0.55)]',
        className
      )}
      role="region"
      aria-label="数据表格"
    >
      <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-white/20" />

      {showCount && (
        <div className="flex justify-end px-5 pt-4">
          <div className="inline-flex items-center gap-2 self-start rounded-full border-[0.5px] border-slate-200/50 bg-white/40 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm backdrop-blur-md dark:border-cyan-300/[0.14] dark:bg-slate-950/[0.48] dark:text-slate-200">
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
