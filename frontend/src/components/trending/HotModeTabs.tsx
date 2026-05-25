import React from "react";
import type { HotRankingMode } from "@/types/hotRanking";
import {
  buildHotToolbarTabClassName,
  hotToolbarRailClassName,
} from "@/components/trending/hotToolbarTabStyles";

const options: Array<{ value: HotRankingMode; label: string }> = [
  { value: "trend", label: "趋势榜" },
  { value: "popular", label: "热门榜" },
];

interface HotModeTabsProps {
  value: HotRankingMode;
  onChange: (value: HotRankingMode) => void;
}

const HotModeTabs: React.FC<HotModeTabsProps> = ({ value, onChange }) => {
  return (
    <div>
      <div className={hotToolbarRailClassName} data-testid="hot-mode-tabs">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={value === option.value}
            className={buildHotToolbarTabClassName(
              value === option.value,
              "bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-[0_12px_30px_rgba(14,165,233,0.3)]",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default HotModeTabs;
