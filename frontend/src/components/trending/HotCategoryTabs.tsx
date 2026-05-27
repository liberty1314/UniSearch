import React from "react";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import type { HotRankingCategory } from "@/types/hotRanking";

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

const HotCategoryTabs: React.FC<HotCategoryTabsProps> = ({ value, onChange }) => (
  <SegmentedControl
    ariaLabel="内容分类"
    value={value}
    onChange={onChange}
    options={options}
    testId="hot-category-tabs"
    className="w-full overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    buttonClassName="min-w-14 flex-1 shrink-0 whitespace-nowrap px-3"
  />
);

export default HotCategoryTabs;
