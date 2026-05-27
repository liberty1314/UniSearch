import React from "react";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import type { HotRankingPeriod } from "@/types/hotRanking";

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

const HotPeriodTabs: React.FC<HotPeriodTabsProps> = ({ value, onChange, options: enabledOptions }) => (
  <SegmentedControl
    ariaLabel="时间维度"
    value={value}
    onChange={onChange}
    options={options.map((option) => ({
      ...option,
      disabled: enabledOptions ? !enabledOptions.includes(option.value) : false,
    }))}
    testId="hot-period-tabs"
    className="w-full overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    buttonClassName="min-w-12 flex-1 shrink-0 whitespace-nowrap px-3"
  />
);

export default HotPeriodTabs;
