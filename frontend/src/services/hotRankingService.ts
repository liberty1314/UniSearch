import { apiClient } from "@/lib/api";
import type {
  HotRankingCategory,
  HotRankingMode,
  HotRankingPeriod,
  HotRankingQuery,
  HotRankingResponse,
  HotRankingSortBy,
} from "@/types/hotRanking";

const DEFAULT_MODE: HotRankingMode = "trend";
const DEFAULT_PERIOD: HotRankingPeriod = "day";
const DEFAULT_CATEGORY: HotRankingCategory = "all";
const DEFAULT_SORT_BY: HotRankingSortBy = "popularity.desc";
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 100;

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

    return apiClient.get<HotRankingResponse>(`/hot?${searchParams.toString()}`);
  }
}

export const hotRankingService = new HotRankingService();
