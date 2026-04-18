import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IoGridOutline, IoListOutline } from "react-icons/io5";

// ─── Types ────────────────────────────────────────────────────────────────────

type ViewMode = "grid" | "list";

interface SearchResultsToolbarProps {
  /** 全量结果总数 */
  totalCount: number;
  /** 当前已显示的结果数 */
  displayedCount: number;
  /** 当前视图模式 */
  viewMode: ViewMode;
  /** 视图模式切换回调 */
  onViewModeChange: (mode: ViewMode) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * 搜索结果工具栏
 *
 * 显示结果总数（及已显示数量）和网格 / 列表视图切换按钮。
 * 从 SearchResults 中拆分出来，职责单一、易于独立测试。
 */
export const SearchResultsToolbar: React.FC<SearchResultsToolbarProps> =
  React.memo(({ totalCount, displayedCount, viewMode, onViewModeChange }) => {
    const handleToggle = () =>
      onViewModeChange(viewMode === "grid" ? "list" : "grid");

    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        data-testid="search-results-toolbar"
        className="flex items-center justify-between gap-4 p-4 rounded-[20px] bg-white/60 dark:bg-slate-950/40 backdrop-blur-xl border border-white/60 dark:border-white/[0.06] shadow-[0_8px_24px_rgba(15,23,42,0.03)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.3)] mb-2"
      >
        {/* 结果计数 */}
        <div className="flex items-center gap-4">
          <div className="text-[14px] font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
            <span className="flex items-center justify-center min-w-6 h-6 px-1.5 rounded-full bg-blue-50/80 text-blue-600 text-xs font-bold border border-blue-200/50 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-300 shadow-sm">
              {totalCount}
            </span>
            <span>个结果</span>
            {displayedCount < totalCount && (
              <span className="text-slate-400 dark:text-slate-500 text-[13px] ml-1">
                (已显示 {displayedCount})
              </span>
            )}
          </div>
        </div>

        {/* 视图切换按钮 */}
        <button
          onClick={handleToggle}
          className="bg-white/50 dark:bg-black/20 p-2.5 rounded-[14px] flex items-center justify-center border border-slate-200/60 dark:border-white/[0.06] shadow-sm hover:shadow-md transition-all duration-300 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white/80 dark:hover:bg-white/[0.08] active:scale-90"
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
      </motion.div>
    );
  });

SearchResultsToolbar.displayName = "SearchResultsToolbar";
