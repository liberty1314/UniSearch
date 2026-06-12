import React from "react";
import { ArrowUpDown } from "lucide-react";
import type { HotRankingSection, HotRankingSortBy } from "@/types/hotRanking";

interface HotSectionSummaryProps {
  section: HotRankingSection;
  showSortControl?: boolean;
  sortBy?: HotRankingSortBy;
  onSortByChange?: (value: HotRankingSortBy) => void;
}

const HotSectionSummary: React.FC<HotSectionSummaryProps> = ({
  section,
  showSortControl = false,
  sortBy = "popularity.desc",
  onSortByChange,
}) => {
  const [menuOpen, setMenuOpen] = React.useState(false);

  const options: Array<{ value: HotRankingSortBy; label: string }> = [
    { value: "popularity.desc", label: "按热度" },
    { value: "primary_release_date.desc", label: "按时间" },
    { value: "vote_average.desc", label: "按评分" },
  ];

  const currentSortLabel = options.find((opt) => opt.value === sortBy)?.label ?? "排序";

  return (
    <div className="flex items-center justify-between gap-4">
      <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
        {section.title}
      </h2>

      {showSortControl ? (
        <div className="relative">
          <button
            type="button"
            aria-label="打开排序菜单"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((current) => !current)}
            className={[
              "group flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium shadow-sm backdrop-blur-sm transition-all",
              menuOpen 
                ? "border-slate-300 bg-slate-100 text-slate-800 dark:border-cyan-300/[0.18] dark:bg-slate-950/[0.62] dark:text-slate-100"
                : "border-slate-200/60 bg-slate-50/50 text-slate-500 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-700 hover:shadow dark:border-cyan-300/[0.10] dark:bg-slate-950/[0.46] dark:text-slate-300 dark:hover:border-cyan-300/[0.22] dark:hover:bg-cyan-400/[0.08] dark:hover:text-slate-100"
            ].join(" ")}
          >
            <ArrowUpDown className="h-3.5 w-3.5 transition-transform duration-300 group-hover:scale-110" />
            <span>{currentSortLabel}</span>
          </button>

          {menuOpen ? (
            <div
              className="absolute right-0 top-14 z-20 w-36 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_18px_40px_rgba(15,23,42,0.12)] dark:border-cyan-300/[0.14] dark:bg-slate-950/95"
              role="menu"
            >
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="menuitemradio"
                  aria-checked={sortBy === option.value}
                  onClick={() => {
                    onSortByChange?.(option.value);
                    setMenuOpen(false);
                  }}
                  className={[
                    "flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition",
                    sortBy === option.value
                      ? "bg-slate-900 text-white dark:bg-cyan-500 dark:text-slate-950"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white",
                  ].join(" ")}
                >
                  <span>{option.label}</span>
                  {sortBy === option.value ? <span className="text-[11px]">当前</span> : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default HotSectionSummary;
