import React from "react";
import type { HotRankingItem, HotRankingSection, HotRankingSortBy } from "@/types/hotRanking";
import HotMediaCard from "@/components/trending/HotMediaCard";
import HotSectionSummary from "@/components/trending/HotSectionSummary";
import { buildRankedItems } from "@/components/trending/hotRankingPresentation";

interface HotMediaGridProps {
  section: HotRankingSection;
  variant?: "primary" | "secondary";
  onSearch: (item: HotRankingItem) => void;
  showSortControl?: boolean;
  sortBy?: HotRankingSortBy;
  onSortByChange?: (value: HotRankingSortBy) => void;
}

const HotMediaGrid: React.FC<HotMediaGridProps> = ({
  section,
  onSearch,
  showSortControl = false,
  sortBy,
  onSortByChange,
}) => {
  const rankedItems = buildRankedItems(section.items, 1);

  return (
    <section className="space-y-5">
      <HotSectionSummary
        section={section}
        showSortControl={showSortControl}
        sortBy={sortBy}
        onSortByChange={onSortByChange}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {rankedItems.map(({ rank, item }) => (
          <HotMediaCard
            key={`${section.category}-${item.id}`}
            item={item}
            rank={rank}
            category={section.category}
            onSearch={onSearch}
          />
        ))}
      </div>
    </section>
  );
};

export default HotMediaGrid;
