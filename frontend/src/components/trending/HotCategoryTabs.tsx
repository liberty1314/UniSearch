import React from "react";
import type { HotRankingCategory } from "@/types/hotRanking";
import {
  buildHotToolbarTabClassName,
  hotToolbarRailClassName,
} from "@/components/trending/hotToolbarTabStyles";

const options: Array<{ value: HotRankingCategory; label: string }> = [
  { value: "all", label: "全部" },
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
    <div>
      <div className={hotToolbarRailClassName} data-testid="hot-category-tabs">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={value === option.value}
            className={buildHotToolbarTabClassName(
              value === option.value,
              "bg-gradient-to-r from-slate-900 to-slate-700 text-white shadow-[0_10px_24px_rgba(15,23,42,0.18)] dark:from-cyan-500 dark:to-blue-500",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default HotCategoryTabs;
