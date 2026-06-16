import { apiClient } from "@/lib/api";
import type {
  HotRankingCategory,
  HotRankingItem,
  HotRankingMode,
  HotRankingPeriod,
  HotRankingQuery,
  HotRankingResponse,
  HotRankingSection,
  HotRankingSortBy,
} from "@/types/hotRanking";

const DEFAULT_MODE: HotRankingMode = "trend";
const DEFAULT_PERIOD: HotRankingPeriod = "day";
const DEFAULT_CATEGORY: HotRankingCategory = "all";
const DEFAULT_SORT_BY: HotRankingSortBy = "popularity.desc";
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 100;

function normalizeHotRankingItem(item: HotRankingItem): HotRankingItem {
  return {
    ...item,
    genre_names: Array.isArray(item.genre_names) ? item.genre_names : [],
    origin_countries: Array.isArray(item.origin_countries) ? item.origin_countries : [],
  };
}

function normalizeHotRankingSection(section: HotRankingSection): HotRankingSection {
  return {
    ...section,
    spotlight: section.spotlight ? normalizeHotRankingItem(section.spotlight) : undefined,
    items: Array.isArray(section.items) ? section.items.map(normalizeHotRankingItem) : [],
  };
}

export function normalizeHotRankingResponse(response: HotRankingResponse): HotRankingResponse {
  return {
    ...response,
    sections: Array.isArray(response.sections) ? response.sections.map(normalizeHotRankingSection) : [],
  };
}

class HotRankingService {
  async getHotRankings(query: HotRankingQuery = {}): Promise<HotRankingResponse> {
    const mode = query.mode || DEFAULT_MODE;
    const period = query.period || DEFAULT_PERIOD;
    const category = query.category || DEFAULT_CATEGORY;
    const searchParams = new URLSearchParams({
      mode,
      period,
      category,
      page: String(query.page || DEFAULT_PAGE),
      page_size: String(query.page_size || DEFAULT_PAGE_SIZE),
    });
    if (query.sort_by && query.sort_by !== DEFAULT_SORT_BY) {
      searchParams.set("sort_by", query.sort_by);
    }
    if (query.date) searchParams.set("date", query.date);
    if (query.week_start) searchParams.set("week_start", query.week_start);
    if (query.month) searchParams.set("month", query.month);
    if (query.year) searchParams.set("year", query.year);

    const response = await apiClient.get<HotRankingResponse>(`/hot?${searchParams.toString()}`);
    return normalizeHotRankingResponse(response);
  }
}

export const hotRankingService = new HotRankingService();
