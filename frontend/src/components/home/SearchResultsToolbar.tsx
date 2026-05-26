import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IoGridOutline, IoListOutline } from "react-icons/io5";

// ─── Types ────────────────────────────────────────────────────────────────────

type ViewMode = "grid" | "list";

interface SearchResultsToolbarProps {
  /** 全量结果总数 */
  totalCount: number;
  /** 当前视图模式 */
  viewMode: ViewMode;
  /** 视图模式切换回调 */
  onViewModeChange: (mode: ViewMode) => void;
  /** 已有结果上的刷新态 */
  isRefreshing?: boolean;
  /** 已启用高级筛选摘要 */
  activeFilterChips?: Array<{ id: string; label: string }>;
  /** 删除单个筛选条件 */
  onRemoveFilterChip?: (chipId: string) => void;
  /** 清空全部筛选条件 */
  onClearFilters?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * 搜索结果工具栏
 *
 * 显示结果总数和网格 / 列表视图切换按钮。
 * 从 SearchResults 中拆分出来，职责单一、易于独立测试。
 */
export const SearchResultsToolbar: React.FC<SearchResultsToolbarProps> =
  React.memo(
    ({
      totalCount,
      viewMode,
      onViewModeChange,
      isRefreshing = false,
      activeFilterChips = [],
      onRemoveFilterChip,
      onClearFilters,
    }) => {
    const handleToggle = () =>
      onViewModeChange(viewMode === "grid" ? "list" : "grid");

      return (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          data-testid="search-results-toolbar"
          className="sticky top-20 z-20 mb-2 rounded-[20px] border border-white/60 bg-white/75 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)] backdrop-blur-xl dark:border-white/[0.06] dark:bg-slate-950/65 dark:shadow-[0_8px_24px_rgba(0,0,0,0.3)]"
        >
          <div className="flex min-h-10 items-center justify-between gap-4">
            <div
              data-testid="search-results-toolbar-meta"
              className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-3 sm:flex-nowrap"
            >
              <div className="flex min-w-0 flex-col gap-2">
                <div className="flex shrink-0 flex-wrap items-center gap-2 text-[14px] font-medium text-slate-600 dark:text-slate-400">
                  <span className="flex items-center justify-center min-w-6 h-6 px-1.5 rounded-full bg-blue-50/80 text-blue-600 text-xs font-bold border border-blue-200/50 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-300 shadow-sm">
                    {totalCount}
                  </span>
                  <span>个结果</span>
                  {isRefreshing && (
                    <span className="text-[13px] text-cyan-600 dark:text-cyan-400">
                      刷新中
                    </span>
                  )}
                </div>
              </div>

              {activeFilterChips.length > 0 ? (
                <div
                  data-testid="search-results-toolbar-filters"
                  className="flex min-w-0 flex-wrap items-center gap-2 sm:flex-nowrap"
                >
                  {activeFilterChips.map((chip) => (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => onRemoveFilterChip?.(chip.id)}
                      className="rounded-full border border-cyan-300/35 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-800 transition hover:bg-cyan-500/15 dark:border-cyan-300/20 dark:bg-cyan-400/12 dark:text-cyan-100"
                    >
                      {chip.label}
                    </button>
                  ))}
                  {onClearFilters ? (
                    <button
                      type="button"
                      onClick={onClearFilters}
                      className="text-xs font-medium text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    >
                      清空筛选条件
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>

            {/* 视图切换按钮 */}
            <button
              onClick={handleToggle}
              className="flex shrink-0 items-center justify-center rounded-[14px] border border-slate-200/60 bg-white/50 p-2.5 text-slate-600 shadow-sm transition-all duration-300 hover:bg-white/80 hover:text-blue-600 hover:shadow-md active:scale-90 dark:border-white/[0.06] dark:bg-black/20 dark:text-slate-300 dark:hover:bg-white/[0.08] dark:hover:text-blue-400"
              title={viewMode === "grid" ? "切换为列表视图" : "切换为网格视图"}
              aria-label={viewMode === "grid" ? "切换为列表视图" : "切换为网格视图"}
            >
              <AnimatePresence mode="wait" initial={false}>
                {viewMode === "grid" ? (
                  <motion.div
                    key="icon-list"
                    initial={{ opacity: 0, y: 15, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -15, scale: 0.8 }}
                    transition={{ duration: 0.2, ease: "circOut" }}
                  >
                    <IoListOutline className="w-5 h-5 drop-shadow-sm" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="icon-grid"
                    initial={{ opacity: 0, y: -15, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 15, scale: 0.8 }}
                    transition={{ duration: 0.2, ease: "circOut" }}
                  >
                    <IoGridOutline className="w-5 h-5 drop-shadow-sm" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>
        </motion.div>
      );
    },
  );

SearchResultsToolbar.displayName = "SearchResultsToolbar";
