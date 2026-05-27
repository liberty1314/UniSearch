import React from "react";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import type { HotRankingMode } from "@/types/hotRanking";

const options: Array<{ value: HotRankingMode; label: string }> = [
  { value: "trend", label: "趋势榜" },
  { value: "popular", label: "热门榜" },
];

interface HotModeTabsProps {
  value: HotRankingMode;
  onChange: (value: HotRankingMode) => void;
}

const HotModeTabs: React.FC<HotModeTabsProps> = ({ value, onChange }) => (
  <SegmentedControl
    ariaLabel="榜单模式"
    value={value}
    onChange={onChange}
    options={options}
    testId="hot-mode-tabs"
    className="w-full overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    buttonClassName="flex-1 shrink-0 whitespace-nowrap"
  />
);

export default HotModeTabs;
