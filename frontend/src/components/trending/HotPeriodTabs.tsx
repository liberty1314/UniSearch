import React from "react";
import type { HotRankingPeriod } from "@/types/hotRanking";
import {
  buildHotToolbarTabClassName,
  hotToolbarHintClassName,
  hotToolbarRailClassName,
} from "@/components/trending/hotToolbarTabStyles";

const options: Array<{ value: HotRankingPeriod; label: string }> = [
  { value: "day", label: "每日" },
  { value: "week", label: "每周" },
  { value: "month", label: "每月" },
  { value: "year", label: "每年" },
];

interface HotPeriodTabsProps {
  value: HotRankingPeriod;
  onChange: (value: HotRankingPeriod) => void;
  options?: HotRankingPeriod[];
}

const HotPeriodTabs: React.FC<HotPeriodTabsProps> = ({ value, onChange, options: enabledOptions }) => {
  const renderOptions = enabledOptions
    ? options.filter((option) => enabledOptions.includes(option.value))
    : options;

  return (
    <div>
      <div className={hotToolbarRailClassName} data-testid="hot-period-tabs">
        {renderOptions.map((option) => (
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
      <p className={hotToolbarHintClassName}>
        当前按“{renderOptions.find((option) => option.value === value)?.label ?? "每日"}”维度查看。
      </p>
    </div>
  );
};

export default HotPeriodTabs;
