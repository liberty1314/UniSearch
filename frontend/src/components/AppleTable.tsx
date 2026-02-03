import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * 表格列配置接口
 */
export interface AppleTableColumn<T> {
  /** 列的唯一标识 */
  key: string;
  /** 列标题 */
  title: string;
  /** 数据渲染函数 */
  render: (item: T, index: number) => React.ReactNode;
  /** 列宽度（仅 PC 端生效） */
  width?: string;
  /** 是否在移动端隐藏 */
  hideOnMobile?: boolean;
  /** 是否可排序 */
  sortable?: boolean;
  /** 对齐方式 */
  align?: 'left' | 'center' | 'right';
}

/**
 * 表格属性接口
 */
export interface AppleTableProps<T> {
  /** 数据源 */
  data: T[];
  /** 列配置 */
  columns: AppleTableColumn<T>[];
  /** 行的唯一键提取函数 */
  rowKey: (item: T) => string | number;
  /** 是否加载中 */
  loading?: boolean;
  /** 空状态提示 */
  emptyText?: string;
  /** 点击行的回调 */
  onRowClick?: (item: T, index: number) => void;
  /** 自定义类名 */
  className?: string;
  /** 是否显示悬停效果 */
  hoverable?: boolean;
  /** 排序变化回调 */
  onSortChange?: (key: string, direction: 'asc' | 'desc' | null) => void;
}

/**
 * Apple 风格响应式表格组件
 * 
 * 设计特点：
 * - PC 端：标准表格布局，支持 Hover 高亮
 * - 移动端：卡片式布局，优化小屏幕体验
 * - 毛玻璃效果、细腻阴影、流畅动画
 * - 完整的可访问性支持
 */
export function AppleTable<T>({
  data,
  columns,
  rowKey,
  loading = false,
  emptyText = '暂无数据',
  onRowClick,
  className,
  hoverable = true,
  onSortChange,
}: AppleTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);

  /**
   * 处理排序
   */
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

  /**
   * 对数据进行排序
   */
  const sortedData = useMemo(() => {
    if (!sortKey || !sortDirection) {
      return data;
    }

    return [...data].sort((a, b) => {
      // 获取要比较的值
      const aValue = (a as any)[sortKey];
      const bValue = (b as any)[sortKey];

      // 处理 null/undefined
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      // 字符串比较
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue, 'zh-CN');
        return sortDirection === 'asc' ? comparison : -comparison;
      }

      // 数字比较
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      // 日期比较
      if (aValue instanceof Date && bValue instanceof Date) {
        const comparison = aValue.getTime() - bValue.getTime();
        return sortDirection === 'asc' ? comparison : -comparison;
      }

      // 尝试将字符串转换为日期进行比较
      const aDate = new Date(aValue);
      const bDate = new Date(bValue);
      if (!isNaN(aDate.getTime()) && !isNaN(bDate.getTime())) {
        const comparison = aDate.getTime() - bDate.getTime();
        return sortDirection === 'asc' ? comparison : -comparison;
      }

      // 默认字符串比较
      const comparison = String(aValue).localeCompare(String(bValue), 'zh-CN');
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [data, sortKey, sortDirection]);

  /**
   * 渲染加载状态
   */
  const renderLoading = () => (
    <div className="flex items-center justify-center py-16">
      <div className="flex flex-col items-center gap-3">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-4 border-gray-200/50 dark:border-gray-700/50" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-apple-blue animate-spin" />
        </div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
          加载中...
        </p>
      </div>
    </div>
  );

  /**
   * 渲染空状态
   */
  const renderEmpty = () => (
    <div className="flex items-center justify-center py-16">
      <div className="flex flex-col items-center gap-3">
        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-gray-400 dark:text-gray-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {emptyText}
        </p>
      </div>
    </div>
  );

  /**
   * 渲染 PC 端表格视图
   */
  const renderDesktopView = () => (
    <div className="hidden sm:block overflow-x-auto">
      <table className="w-full" role="table">
        <thead>
          <tr className="border-b border-gray-200/50 dark:border-gray-700/50">
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn(
                  'px-6 py-4 text-left',
                  'text-xs font-medium uppercase tracking-wider',
                  'text-gray-500 dark:text-gray-400',
                  column.align === 'center' && 'text-center',
                  column.align === 'right' && 'text-right',
                  column.sortable && 'cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-300 transition-colors'
                )}
                style={{ width: column.width }}
                onClick={() => column.sortable && handleSort(column.key)}
                role="columnheader"
              >
                <div className="flex items-center gap-2">
                  <span>{column.title}</span>
                  {column.sortable && (
                    <div className="flex flex-col">
                      <ChevronUp
                        className={cn(
                          'w-3 h-3 -mb-1 transition-colors',
                          sortKey === column.key && sortDirection === 'asc'
                            ? 'text-apple-blue'
                            : 'text-gray-300 dark:text-gray-600'
                        )}
                      />
                      <ChevronDown
                        className={cn(
                          'w-3 h-3 transition-colors',
                          sortKey === column.key && sortDirection === 'desc'
                            ? 'text-apple-blue'
                            : 'text-gray-300 dark:text-gray-600'
                        )}
                      />
                    </div>
                  )}
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
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{
                  type: 'spring',
                  stiffness: 500,
                  damping: 30,
                  delay: index * 0.02,
                }}
                className={cn(
                  'border-b border-gray-100/50 dark:border-gray-800/50',
                  'transition-all duration-200',
                  'max-h-[80px]', // 限制最大行高
                  hoverable && 'hover:bg-gray-50/50 dark:hover:bg-gray-800/30',
                  onRowClick && 'cursor-pointer active:scale-[0.99]'
                )}
                onClick={() => onRowClick?.(item, index)}
                role="row"
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      'px-6 py-3', // 减小垂直内边距
                      'text-sm text-gray-900 dark:text-gray-100',
                      'max-h-[80px] overflow-hidden', // 限制单元格高度
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
  );

  /**
   * 渲染移动端卡片视图
   */
  const renderMobileView = () => (
    <div className="sm:hidden space-y-3">
      <AnimatePresence mode="popLayout">
        {sortedData.map((item, index) => (
          <motion.div
            key={rowKey(item)}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 25,
              delay: index * 0.03,
            }}
            className={cn(
              'relative overflow-hidden',
              'bg-white/80 dark:bg-gray-800/80',
              'backdrop-blur-xl',
              'rounded-2xl',
              'border border-gray-200/50 dark:border-gray-700/50',
              'shadow-sm hover:shadow-md',
              'transition-all duration-300',
              onRowClick && 'active:scale-[0.98] cursor-pointer'
            )}
            onClick={() => onRowClick?.(item, index)}
            role="article"
          >
            <div className="p-4 space-y-3">
              {columns
                .filter((column) => !column.hideOnMobile)
                .map((column) => (
                  <div key={column.key} className="flex flex-col gap-1">
                    <span className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      {column.title}
                    </span>
                    <div className="text-sm text-gray-900 dark:text-gray-100">
                      {column.render(item, index)}
                    </div>
                  </div>
                ))}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );

  return (
    <div
      className={cn(
        'relative overflow-hidden',
        'bg-white/80 dark:bg-gray-800/80',
        'backdrop-blur-xl',
        'rounded-2xl',
        'border border-gray-200/50 dark:border-gray-700/50',
        'shadow-sm',
        className
      )}
      role="region"
      aria-label="数据表格"
    >
      {loading ? (
        renderLoading()
      ) : sortedData.length === 0 ? (
        renderEmpty()
      ) : (
        <>
          {renderDesktopView()}
          {renderMobileView()}
        </>
      )}
    </div>
  );
}
