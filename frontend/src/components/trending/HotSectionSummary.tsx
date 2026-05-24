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
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-cyan-300 hover:text-slate-900 dark:border-white/10 dark:bg-slate-900/45 dark:text-slate-300 dark:hover:border-cyan-400/35 dark:hover:text-white"
          >
            <ArrowUpDown className="h-4.5 w-4.5" />
          </button>

          {menuOpen ? (
            <div
              className="absolute right-0 top-14 z-20 w-36 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_18px_40px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-slate-950/95"
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
