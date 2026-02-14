import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

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
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
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
              className="h-8 px-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
      <div className="flex items-center gap-2">
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
            className="h-9 px-3 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 focus:outline-none focus:ring-0"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">上一页</span>
          </Button>
        </motion.div>

        {/* 页码按钮 */}
        <div className="flex items-center gap-1">
          {/* 第一页（如果不在显示范围内） */}
          {pageNumbers[0] > 1 && (
            <>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    onPageChange(1);
                    (e.target as HTMLElement).blur();
                  }}
                  disabled={isLoading}
                  className="h-9 w-9 p-0 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 focus:outline-none focus:ring-0"
                >
                  1
                </Button>
              </motion.div>
              {pageNumbers[0] > 2 && (
                <span className="px-2 text-slate-400">...</span>
              )}
            </>
          )}

          {/* 中间页码 */}
          {pageNumbers.map((pageNum) => (
            <motion.div
              key={pageNum}
              whileHover={{ scale: currentPage === pageNum ? 1 : 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                variant={currentPage === pageNum ? 'default' : 'outline'}
                size="sm"
                onClick={(e) => {
                  onPageChange(pageNum);
                  (e.target as HTMLElement).blur();
                }}
                disabled={isLoading}
                className={`h-9 w-9 p-0 focus:outline-none focus:ring-0 ${currentPage === pageNum
                    ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
              >
                {pageNum}
              </Button>
            </motion.div>
          ))}

          {/* 最后一页（如果不在显示范围内） */}
          {pageNumbers[pageNumbers.length - 1] < totalPages && (
            <>
              {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
                <span className="px-2 text-slate-400">...</span>
              )}
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    onPageChange(totalPages);
                    (e.target as HTMLElement).blur();
                  }}
                  disabled={isLoading}
                  className="h-9 w-9 p-0 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 focus:outline-none focus:ring-0"
                >
                  {totalPages}
                </Button>
              </motion.div>
            </>
          )}
        </div>

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
            className="h-9 px-3 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 focus:outline-none focus:ring-0"
          >
            <span className="hidden sm:inline">下一页</span>
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
};
