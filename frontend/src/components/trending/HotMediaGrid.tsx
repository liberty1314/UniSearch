import React from "react";
import type { HotRankingItem, HotRankingSection, HotRankingSortBy } from "@/types/hotRanking";
import HotMediaCard from "@/components/trending/HotMediaCard";
import HotSectionSummary, { type HotMediaLayoutMode } from "@/components/trending/HotSectionSummary";
import { buildRankedItems } from "@/components/trending/hotRankingPresentation";

interface HotMediaGridProps {
  section: HotRankingSection;
  variant?: "primary" | "secondary";
  onSearch: (item: HotRankingItem) => void;
  showSortControl?: boolean;
  sortBy?: HotRankingSortBy;
  onSortByChange?: (value: HotRankingSortBy) => void;
  layoutMode?: HotMediaLayoutMode;
  onLayoutModeChange?: (value: HotMediaLayoutMode) => void;
}

const HotMediaGrid: React.FC<HotMediaGridProps> = ({
  section,
  onSearch,
  showSortControl = false,
  sortBy,
  onSortByChange,
  layoutMode = "double",
  onLayoutModeChange,
}) => {
  const rankedItems = buildRankedItems(section.items, 1);
  const gridClassName = layoutMode === "double"
    ? "grid grid-cols-1 gap-4 lg:grid-cols-2"
    : "grid grid-cols-1 gap-4";

  return (
    <section className="space-y-5">
      <HotSectionSummary
        section={section}
        showSortControl={showSortControl}
        sortBy={sortBy}
        onSortByChange={onSortByChange}
        layoutMode={layoutMode}
        onLayoutModeChange={showSortControl ? onLayoutModeChange : undefined}
      />

      <div
        className={gridClassName}
        data-layout-mode={layoutMode}
        data-testid="hot-media-grid"
      >
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
