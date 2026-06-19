import { describe, expect, it } from "vitest";
import { buildTrendingLaunchEntries } from "@/components/search/searchLaunchpadPresets";
import type { HotRankingItem } from "@/types/hotRanking";

const createTrendingItem = (overrides: Partial<HotRankingItem> = {}): HotRankingItem => ({
  id: 1,
  tmdb_id: 1,
  media_type: "movie",
  ranking_category: "movie",
  title: "沙丘 2",
  original_title: "Dune: Part Two",
  overview: "测试",
  poster_url: "",
  backdrop_url: "",
  vote_average: 8,
  vote_count: 100,
  popularity: 100,
  release_date: "2024-03-01",
  genre_names: ["剧情"],
  tmdb_url: "",
  availability_status: "released",
  search_available: true,
  search_hint: "",
  ...overrides,
});

describe("buildTrendingLaunchEntries", () => {
  it("过滤不可搜索的未上映榜单条目", () => {
    const entries = buildTrendingLaunchEntries([
      createTrendingItem(),
      createTrendingItem({
        id: 2,
        title: "蜘蛛侠：崭新之日",
        release_date: "2026-07-29",
        availability_status: "upcoming",
        search_available: false,
        days_until_release: 40,
        search_hint: "预计 2026-07-29 上映，当前站内资源可能不可用",
      }),
    ]);

    expect(entries).toHaveLength(1);
    expect(entries[0].title).toBe("沙丘 2");
  });
});
