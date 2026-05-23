import React from "react";
import type { HotRankingItem } from "@/types/hotRanking";
import type { HotRankingSection } from "@/types/hotRanking";
import HotMediaCard from "@/components/trending/HotMediaCard";
import { buildRankedItems } from "@/components/trending/hotRankingPresentation";

interface HotMediaGridProps {
  section: HotRankingSection;
  onSearch: (item: HotRankingItem) => void;
}

const HotMediaGrid: React.FC<HotMediaGridProps> = ({ section, onSearch }) => {
  const rankedItems = buildRankedItems(section.items, section.spotlight ? 2 : 1);

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          {section.title}
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {rankedItems.map(({ rank, item }) => (
          <HotMediaCard
            key={`${section.category}-${item.id}`}
            item={item}
            rank={rank}
            onSearch={onSearch}
          />
        ))}
      </div>
    </section>
  );
};

export default HotMediaGrid;
