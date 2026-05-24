import type {
  HotRankingCategory,
  HotRankingItem,
  HotRankingPeriod,
  HotRankingResponse,
  HotRankingSection,
} from "@/types/hotRanking";

export interface RankedHotRankingItem {
  rank: number;
  item: HotRankingItem;
}

export interface HotPageMeta {
  categoryLabel: string;
  periodLabel: string;
  note?: string;
  sectionCount: number;
  updatedAtLabel?: string;
  sourceLabel?: string;
}

const categoryLabelMap: Record<HotRankingCategory, string> = {
  all: "全部热门",
  movie: "电影",
  tv: "电视剧",
  anime: "动漫",
};

const periodLabelMap: Record<HotRankingPeriod, string> = {
  day: "日榜",
  week: "周榜",
  month: "月榜",
  year: "年榜",
};

const sourceLabelMap: Record<HotRankingResponse["source"], string> = {
  tmdb: "热门趋势",
};

export function getHotCategoryLabel(category: HotRankingCategory): string {
  return categoryLabelMap[category];
}

export function resolvePrimarySection(
  sections: HotRankingSection[] = [],
): HotRankingSection | null {
  if (sections.length === 0) {
    return null;
  }

  return (
    sections.find((section) => section.category === "movie") ??
    sections.find((section) => section.category === "tv") ??
    sections.find((section) => section.category === "anime") ??
    sections[0]
  );
}

export function resolveSecondarySections(
  sections: HotRankingSection[] = [],
): HotRankingSection[] {
  const primarySection = resolvePrimarySection(sections);
  if (!primarySection) {
    return [];
  }

  return sections.filter((section) => section.category !== primarySection.category);
}

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
  response: HotRankingResponse | null,
  category: HotRankingCategory,
): HotPageMeta {
  return {
    categoryLabel: categoryLabelMap[category],
    periodLabel: response ? periodLabelMap[response.period] : periodLabelMap.day,
    note: response?.note,
    sectionCount: response?.sections.length ?? 0,
    updatedAtLabel: response?.updated_at || "",
    sourceLabel: response?.source ? sourceLabelMap[response.source] : "热门趋势",
  };
}
