import React from "react";
import type { HotRankingCategory } from "@/types/hotRanking";
import { cn } from "@/lib/utils";

const options: Array<{ value: HotRankingCategory; label: string }> = [
  { value: "movie", label: "电影" },
  { value: "tv", label: "电视剧" },
  { value: "anime", label: "动漫" },
];

interface HotCategoryTabsProps {
  value: HotRankingCategory;
  onChange: (value: HotRankingCategory) => void;
}

const HotCategoryTabs: React.FC<HotCategoryTabsProps> = ({ value, onChange }) => {
  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={cn(
            "rounded-2xl border border-transparent px-4 py-2.5 text-sm font-medium transition-all duration-200",
            value === option.value
              ? "bg-gradient-to-r from-slate-900 to-slate-700 text-white shadow-[0_10px_24px_rgba(15,23,42,0.18)] dark:from-cyan-500 dark:to-blue-500"
              : "bg-white/72 text-slate-600 hover:border-cyan-200 hover:bg-white hover:text-slate-900 dark:bg-slate-900/45 dark:text-slate-300 dark:hover:border-cyan-400/35 dark:hover:bg-slate-900/70 dark:hover:text-white",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};

export default HotCategoryTabs;
