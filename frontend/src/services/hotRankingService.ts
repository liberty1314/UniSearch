import { apiClient } from "@/lib/api";
import type {
  HotRankingCategory,
  HotRankingPeriod,
  HotRankingQuery,
  HotRankingResponse,
} from "@/types/hotRanking";

const DEFAULT_PERIOD: HotRankingPeriod = "day";
const DEFAULT_CATEGORY: HotRankingCategory = "movie";

class HotRankingService {
  async getHotRankings(query: HotRankingQuery = {}): Promise<HotRankingResponse> {
    const period = query.period || DEFAULT_PERIOD;
    const category = query.category || DEFAULT_CATEGORY;
    const searchParams = new URLSearchParams({
      period,
      category,
    });

    return apiClient.get<HotRankingResponse>(`/hot?${searchParams.toString()}`);
  }
}

export const hotRankingService = new HotRankingService();
