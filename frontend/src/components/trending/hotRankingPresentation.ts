import type {
  HotRankingCategory,
  HotRankingItem,
  HotRankingResponse,
  HotRankingSection,
} from "@/types/hotRanking";

export interface RankedHotRankingItem {
  rank: number;
  item: HotRankingItem;
}

export interface HotPageMeta {
  categoryLabel: string;
}

const categoryLabelMap: Record<HotRankingCategory, string> = {
  movie: "电影",
  tv: "电视剧",
  anime: "动漫",
};

export function filterDuplicateSpotlight(
  spotlight?: HotRankingItem,
  items: HotRankingItem[] = [],
) {
  if (!spotlight) {
    return items;
  }

  return items.filter((item, index) => !(index === 0 && item.id === spotlight.id));
}

export function buildRankedItems(items: HotRankingItem[], startRank = 1): RankedHotRankingItem[] {
  return items.map((item, index) => ({
    rank: startRank + index,
    item,
  }));
}

export function buildHeroItems(
  section?: HotRankingSection | null,
  limit = 5,
): HotRankingItem[] {
  if (!section) {
    return [];
  }

  const merged = [section.spotlight, ...section.items].filter(
    (item): item is HotRankingItem => Boolean(item),
  );
  const seen = new Set<number>();

  return merged.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }

    seen.add(item.id);
    return true;
  }).slice(0, limit);
}

export function buildHotPageMeta(
  _response: HotRankingResponse | null,
  category: HotRankingCategory,
): HotPageMeta {
  return {
    categoryLabel: categoryLabelMap[category],
  };
}
