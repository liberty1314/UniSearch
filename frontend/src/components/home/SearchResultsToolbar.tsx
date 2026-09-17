import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDownUp, Check, ChevronDown, Grid2X2, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { NumberTicker } from "@/components/ui/number-ticker";
import {
  type SearchSortMode,
} from "@/utils/searchResultSorter";

// ─── Types ────────────────────────────────────────────────────────────────────

type ViewMode = "grid" | "list";

const SORT_OPTIONS: Array<{ value: SearchSortMode; label: string }> = [
  { value: "smart", label: "综合排序" },
  { value: "newest", label: "最新优先" },
  { value: "oldest", label: "最早优先" },
];

interface SearchResultsToolbarProps {
  /** 全量结果总数 */
  totalCount: number;
  /** 当前视图模式 */
  viewMode: ViewMode;
  /** 视图模式切换回调 */
  onViewModeChange: (mode: ViewMode) => void;
  /** 当前排序模式 */
  sortMode?: SearchSortMode;
  /** 排序模式切换回调 */
  onSortModeChange?: (mode: SearchSortMode) => void;
  /** 已有结果上的刷新态 */
  isRefreshing?: boolean;
  /** 已启用高级筛选摘要 */
  activeFilterChips?: Array<{ id: string; label: string }>;
  /** 删除单个筛选条件 */
  onRemoveFilterChip?: (chipId: string) => void;
  /** 清空全部筛选条件 */
  onClearFilters?: () => void;
}

const SortMenu: React.FC<{
  sortMode: SearchSortMode;
  onSortModeChange: (mode: SearchSortMode) => void;
}> = ({ sortMode, onSortModeChange }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeLabel =
    SORT_OPTIONS.find((option) => option.value === sortMode)?.label ??
    SORT_OPTIONS[0].label;

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`排序方式：${activeLabel}`}
        data-testid="search-results-sort-trigger"
        className="flex min-h-11 items-center gap-1.5 rounded-[14px] border border-slate-200/60 bg-white/50 py-2.5 pl-3 pr-2.5 text-[13px] font-medium text-slate-600 shadow-sm transition-all duration-300 hover:bg-white/80 hover:text-blue-600 hover:shadow-md active:scale-95 dark:border-white/[0.06] dark:bg-black/20 dark:text-slate-300 dark:hover:bg-white/[0.08] dark:hover:text-blue-400"
      >
        <ArrowDownUp className="h-4 w-4" />
        <span className="hidden sm:inline">{activeLabel}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 transition-transform duration-300",
            open && "rotate-180",
          )}
        />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.ul
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            role="listbox"
            data-testid="search-results-sort-menu"
            className="absolute right-0 top-full z-30 mt-2 w-40 overflow-hidden rounded-2xl border border-white/60 bg-white/90 p-1.5 shadow-[0_16px_40px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:border-white/[0.08] dark:bg-slate-900/90"
          >
            {SORT_OPTIONS.map((option) => {
              const isActive = option.value === sortMode;
              return (
                <li key={option.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onClick={() => {
                      onSortModeChange(option.value);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-[13px] font-medium transition-colors",
                      isActive
                        ? "bg-blue-50/80 text-blue-600 dark:bg-white/[0.08] dark:text-blue-300"
                        : "text-slate-600 hover:bg-slate-100/70 dark:text-slate-300 dark:hover:bg-white/[0.05]",
                    )}
                  >
                    <span>{option.label}</span>
                    {isActive ? <Check className="h-4 w-4" /> : null}
                  </button>
                </li>
              );
            })}
          </motion.ul>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

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
      sortMode = "smart",
      onSortModeChange,
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
                    <NumberTicker value={totalCount} className="text-xs font-bold" />
                  </span>
                  <span>个结果</span>
                  <AnimatePresence initial={false}>
                    {isRefreshing && (
                      <motion.span
                        key="refreshing-hint"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.2 }}
                        className="text-[13px] text-cyan-600 dark:text-cyan-400"
                      >
                        加载中
                      </motion.span>
                    )}
                  </AnimatePresence>
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
                      className="inline-flex min-h-9 items-center rounded-full border border-cyan-300/35 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-800 transition hover:bg-cyan-500/15 dark:border-cyan-300/20 dark:bg-cyan-400/12 dark:text-cyan-100"
                    >
                      {chip.label}
                    </button>
                  ))}
                  {onClearFilters ? (
                    <button
                      type="button"
                      onClick={onClearFilters}
                      className="inline-flex min-h-9 items-center px-1 text-xs font-medium text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    >
                      清空筛选条件
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {onSortModeChange ? (
                <SortMenu
                  sortMode={sortMode}
                  onSortModeChange={onSortModeChange}
                />
              ) : null}

              {/* 视图切换按钮 */}
              <button
                onClick={handleToggle}
                className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-[14px] border border-slate-200/60 bg-white/50 p-2.5 text-slate-600 shadow-sm transition-all duration-300 hover:bg-white/80 hover:text-blue-600 hover:shadow-md active:scale-90 dark:border-white/[0.06] dark:bg-black/20 dark:text-slate-300 dark:hover:bg-white/[0.08] dark:hover:text-blue-400"
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
                      <List className="w-5 h-5 drop-shadow-sm" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="icon-grid"
                      initial={{ opacity: 0, y: -15, scale: 0.8 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 15, scale: 0.8 }}
                      transition={{ duration: 0.2, ease: "circOut" }}
                    >
                      <Grid2X2 className="w-5 h-5 drop-shadow-sm" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            </div>
          </div>
        </motion.div>
      );
    },
  );

SearchResultsToolbar.displayName = "SearchResultsToolbar";
