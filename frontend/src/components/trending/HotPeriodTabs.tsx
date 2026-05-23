import React from "react";
import type { HotRankingPeriod } from "@/types/hotRanking";
import { cn } from "@/lib/utils";

const options: Array<{ value: HotRankingPeriod; label: string }> = [
  { value: "day", label: "每日" },
  { value: "week", label: "每周" },
  { value: "month", label: "每月" },
  { value: "year", label: "每年" },
];

interface HotPeriodTabsProps {
  value: HotRankingPeriod;
  onChange: (value: HotRankingPeriod) => void;
}

const HotPeriodTabs: React.FC<HotPeriodTabsProps> = ({ value, onChange }) => {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={cn(
            "rounded-2xl border border-transparent px-4 py-2.5 text-sm font-medium transition-all duration-200",
            value === option.value
              ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-[0_12px_30px_rgba(14,165,233,0.3)]"
              : "bg-white/72 text-slate-600 hover:border-cyan-200 hover:bg-white hover:text-slate-900 dark:bg-slate-900/45 dark:text-slate-300 dark:hover:border-cyan-400/35 dark:hover:bg-slate-900/70 dark:hover:text-white",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};

export default HotPeriodTabs;
