import React from "react";
import { ArrowUpDown, Columns2, LayoutList } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { HotRankingSection, HotRankingSortBy } from "@/types/hotRanking";

export type HotMediaLayoutMode = "single" | "double";

interface HotSectionSummaryProps {
  section: HotRankingSection;
  showSortControl?: boolean;
  sortBy?: HotRankingSortBy;
  onSortByChange?: (value: HotRankingSortBy) => void;
  layoutMode?: HotMediaLayoutMode;
  onLayoutModeChange?: (value: HotMediaLayoutMode) => void;
}

const DEFAULT_SORT_BY: HotRankingSortBy = "popularity.desc";

const SORT_OPTIONS: Array<{ value: HotRankingSortBy; label: string }> = [
  { value: "popularity.desc", label: "按热度" },
  { value: "primary_release_date.desc", label: "按时间" },
  { value: "vote_average.desc", label: "近期高分" },
];

const isHotRankingSortBy = (value: string): value is HotRankingSortBy =>
  SORT_OPTIONS.some((option) => option.value === value);

const HotSectionSummary: React.FC<HotSectionSummaryProps> = ({
  section,
  showSortControl = false,
  sortBy = "popularity.desc",
  onSortByChange,
  layoutMode = "double",
  onLayoutModeChange,
}) => {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const resolvedSortBy = isHotRankingSortBy(sortBy) ? sortBy : DEFAULT_SORT_BY;
  const currentSortLabel = SORT_OPTIONS.find((opt) => opt.value === resolvedSortBy)?.label ?? "排序";
  const nextLayoutMode: HotMediaLayoutMode = layoutMode === "double" ? "single" : "double";
  const LayoutIcon = layoutMode === "double" ? Columns2 : LayoutList;

  const handleSortChange = (value: string) => {
    if (!isHotRankingSortBy(value) || value === resolvedSortBy) {
      setMenuOpen(false);
      return;
    }

    onSortByChange?.(value);
    setMenuOpen(false);
  };

  return (
    <div className="flex items-center justify-between gap-4">
      <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
        {section.title}
      </h2>

      {showSortControl ? (
        <div className="flex shrink-0 items-center gap-2">
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen} modal={false}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="打开排序菜单"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className={cn(
                  "group flex h-9 items-center gap-2 rounded-full border px-3.5 text-xs font-medium shadow-[0_8px_24px_rgba(15,23,42,0.06)] ring-1 ring-white/70 backdrop-blur-xl backdrop-saturate-150 transition-all duration-300",
                  menuOpen
                    ? "border-slate-300/80 bg-white/75 text-slate-900 shadow-[0_12px_30px_rgba(15,23,42,0.12)] dark:border-cyan-300/[0.20] dark:bg-slate-950/[0.68] dark:text-slate-50"
                    : "border-slate-200/70 bg-white/58 text-slate-600 hover:border-slate-300/80 hover:bg-white/78 hover:text-slate-900 dark:border-cyan-300/[0.10] dark:bg-slate-950/[0.46] dark:text-slate-300 dark:hover:border-cyan-300/[0.24] dark:hover:bg-cyan-400/[0.08] dark:hover:text-slate-100",
                )}
              >
                <ArrowUpDown
                  className={cn(
                    "h-3.5 w-3.5 transition duration-300 group-hover:scale-110",
                    menuOpen && "scale-110 text-cyan-600 dark:text-cyan-300",
                  )}
                />
                <span className="whitespace-nowrap">{currentSortLabel}</span>
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              side="bottom"
              className="w-48 p-2"
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-90 dark:via-slate-500/40"
              />
              <DropdownMenuRadioGroup value={resolvedSortBy} onValueChange={handleSortChange}>
                {SORT_OPTIONS.map((option) => {
                  const isCurrent = resolvedSortBy === option.value;

                  return (
                    <DropdownMenuRadioItem
                      key={option.value}
                      value={option.value}
                      aria-label={option.label}
                      className={cn(
                        "relative justify-start gap-3 pl-5",
                        // 悬浮/键盘高亮态：青色填充，覆盖基础组件的 focus:bg-white/70
                        "transition-colors duration-200 focus-visible:bg-cyan-50/80 focus-visible:text-slate-900 data-[highlighted]:bg-cyan-50/80 data-[highlighted]:text-slate-900 dark:focus-visible:bg-cyan-400/10 dark:focus-visible:text-slate-50 dark:data-[highlighted]:bg-cyan-400/10 dark:data-[highlighted]:text-slate-50",
                        isCurrent
                          ? "bg-cyan-100/90 font-semibold text-cyan-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] dark:bg-cyan-400/[0.16] dark:text-cyan-50 dark:shadow-none"
                          : "text-slate-700 dark:text-slate-300",
                      )}
                    >
                      {/* 选中项左侧指示条：唯一选中标识 */}
                      {isCurrent ? (
                        <span
                          aria-hidden="true"
                          className="absolute left-1.5 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-cyan-500 dark:bg-cyan-300"
                        />
                      ) : null}
                      <span className="whitespace-nowrap">{option.label}</span>
                    </DropdownMenuRadioItem>
                  );
                })}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          {onLayoutModeChange ? (
            <button
              type="button"
              aria-label={`切换为${nextLayoutMode === "double" ? "双列" : "单列"}布局`}
              aria-pressed={layoutMode === "double"}
              onClick={() => onLayoutModeChange(nextLayoutMode)}
              className="group flex h-8 items-center gap-1.5 rounded-full border border-slate-200/60 bg-slate-50/50 px-3 text-xs font-medium text-slate-500 shadow-sm backdrop-blur-sm transition-all hover:border-slate-300 hover:bg-slate-100 hover:text-slate-700 hover:shadow dark:border-cyan-300/[0.10] dark:bg-slate-950/[0.46] dark:text-slate-300 dark:hover:border-cyan-300/[0.22] dark:hover:bg-cyan-400/[0.08] dark:hover:text-slate-100"
              data-testid="hot-layout-toggle"
            >
              <LayoutIcon className="h-3.5 w-3.5 transition-transform duration-300 group-hover:scale-110" />
              <span>{layoutMode === "double" ? "双列" : "单列"}</span>
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default HotSectionSummary;
