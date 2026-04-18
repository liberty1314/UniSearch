import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ADMIN_GENTLE_SPRING } from '@/components/admin/adminDesign';

interface ApplePaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  isLoading?: boolean;
  pageSizeOptions?: number[];
}

/**
 * 苹果风格分页组件
 * 
 * 特点:
 * - 简洁优雅的设计
 * - 流畅的动画效果
 * - 支持自定义每页显示数量
 * - 响应式布局
 */
export const ApplePagination: React.FC<ApplePaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  isLoading = false,
  pageSizeOptions = [10, 20, 50, 100],
}) => {
  /**
   * 计算显示的页码范围
   */
  const getPageNumbers = (): number[] => {
    const maxVisible = 5; // 最多显示5个页码按钮
    const pages: number[] = [];

    if (totalPages <= maxVisible) {
      // 总页数小于等于最大显示数，显示所有页码
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // 总页数大于最大显示数，智能显示
      if (currentPage <= 3) {
        // 当前页在前3页
        for (let i = 1; i <= maxVisible; i++) {
          pages.push(i);
        }
      } else if (currentPage >= totalPages - 2) {
        // 当前页在后3页
        for (let i = totalPages - maxVisible + 1; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // 当前页在中间
        for (let i = currentPage - 2; i <= currentPage + 2; i++) {
          pages.push(i);
        }
      }
    }

    return pages;
  };

  /**
   * 计算当前显示的数据范围
   */
  const getDisplayRange = (): { start: number; end: number } => {
    const start = (currentPage - 1) * pageSize + 1;
    const end = Math.min(currentPage * pageSize, totalItems);
    return { start, end };
  };

  const { start, end } = getDisplayRange();
  const pageNumbers = getPageNumbers();

  return (
    <div className="flex flex-col gap-4 rounded-[1.35rem] border-[0.5px] border-slate-200/50 bg-white/30 p-4 backdrop-blur-md dark:border-white/10 dark:bg-slate-900/30 sm:flex-row sm:items-center sm:justify-between">
      {/* 左侧：显示信息和每页数量选择 */}
      <div className="hidden sm:flex items-center gap-4">
        {/* 显示范围信息 */}
        <div className="text-sm text-slate-600 dark:text-slate-400">
          显示第 <span className="font-medium text-slate-900 dark:text-white">{start}</span> - <span className="font-medium text-slate-900 dark:text-white">{end}</span> 条，
          共 <span className="font-medium text-slate-900 dark:text-white">{totalItems}</span> 条
        </div>

        {/* 每页数量选择器 */}
        {onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600 dark:text-slate-400">每页</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              disabled={isLoading}
            className="h-8 rounded-xl border-[0.5px] border-slate-200/50 bg-white/60 px-2 text-sm text-slate-900 shadow-sm backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-slate-900/40 dark:text-white"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size} 条
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 右侧：分页按钮 */}
      <div className="flex items-center gap-3">
        {/* 上一页按钮 */}
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              onPageChange(currentPage - 1);
              (e.target as HTMLElement).blur();
            }}
            disabled={currentPage === 1 || isLoading}
            className="h-9 rounded-full border-[0.5px] border-slate-200/50 bg-white/40 px-3 text-slate-700 shadow-sm backdrop-blur-md hover:bg-white/60 focus:outline-none focus:ring-0 dark:border-white/10 dark:bg-slate-800/40 dark:text-slate-200 dark:hover:bg-slate-800/60"
          >
            <ChevronLeft className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">上一页</span>
          </Button>
        </motion.div>

        {/* 页码按钮与胶囊背景 */}
        <motion.div layout className="flex items-center gap-1 rounded-full border-[0.5px] border-slate-200/50 bg-white/40 p-1 shadow-inner backdrop-blur-md dark:border-white/10 dark:bg-slate-800/40">
          <AnimatePresence mode="popLayout" initial={false}>
            {/* 第一页（如果不在显示范围内） */}
            {pageNumbers[0] > 1 && (
              <motion.div key="first-page" layout initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} className="flex items-center">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onPageChange(1)}
                  disabled={isLoading}
                className="relative flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium text-slate-700 transition-colors hover:bg-white/60 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
                >
                  1
                </motion.button>
                {pageNumbers[0] > 2 && (
                  <span className="px-1 text-slate-400">...</span>
                )}
              </motion.div>
            )}

            {/* 中间页码 */}
            {pageNumbers.map((pageNum) => (
              <motion.button
                key={`page-${pageNum}`}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                whileHover={{ scale: currentPage === pageNum ? 1 : 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onPageChange(pageNum)}
                disabled={isLoading}
                className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${currentPage === pageNum
                  ? 'text-white'
                  : 'text-slate-700 hover:bg-white/60 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white'
                  }`}
              >
                {currentPage === pageNum && (
                  <motion.div
                    layoutId="activePageIndicator"
                    className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 shadow-md pointer-events-none"
                    transition={ADMIN_GENTLE_SPRING}
                  />
                )}
                <span className="relative z-10">{pageNum}</span>
              </motion.button>
            ))}

            {/* 最后一页（如果不在显示范围内） */}
            {pageNumbers[pageNumbers.length - 1] < totalPages && (
              <motion.div key="last-page" layout initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} className="flex items-center">
                {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
                  <span className="px-1 text-slate-400">...</span>
                )}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onPageChange(totalPages)}
                  disabled={isLoading}
                className="relative flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium text-slate-700 transition-colors hover:bg-white/60 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
                >
                  {totalPages}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* 下一页按钮 */}
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              onPageChange(currentPage + 1);
              (e.target as HTMLElement).blur();
            }}
            disabled={currentPage === totalPages || isLoading}
            className="h-9 rounded-full border-[0.5px] border-slate-200/50 bg-white/40 px-3 text-slate-700 shadow-sm backdrop-blur-md hover:bg-white/60 focus:outline-none focus:ring-0 dark:border-white/10 dark:bg-slate-800/40 dark:text-slate-200 dark:hover:bg-slate-800/60"
          >
            <span className="hidden sm:inline">下一页</span>
            <ChevronRight className="w-4 h-4 ml-0 sm:ml-1" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
};
