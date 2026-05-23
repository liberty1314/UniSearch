import { describe, expect, it } from "vitest";
import type { HotRankingItem, HotRankingResponse } from "@/types/hotRanking";
import {
  buildHeroItems,
  buildHotPageMeta,
  buildRankedItems,
  filterDuplicateSpotlight,
} from "@/components/trending/hotRankingPresentation";

const spotlight: HotRankingItem = {
  id: 1,
  tmdb_id: 1,
  media_type: "movie",
  ranking_category: "movie",
  title: "沙丘 2",
  original_title: "Dune: Part Two",
  overview: "test overview",
  poster_url: "https://image.tmdb.org/t/p/w500/poster.jpg",
  backdrop_url: "https://image.tmdb.org/t/p/w500/backdrop.jpg",
  vote_average: 8.8,
  vote_count: 1000,
  popularity: 999,
  release_date: "2024-03-01",
  genre_names: ["科幻", "冒险"],
  tmdb_url: "https://www.themoviedb.org/movie/1",
};

const nextItem: HotRankingItem = {
  ...spotlight,
  id: 2,
  tmdb_id: 2,
  title: "奥本海默",
  original_title: "Oppenheimer",
  tmdb_url: "https://www.themoviedb.org/movie/2",
};

const response: HotRankingResponse = {
  period: "day",
  updated_at: "2026-05-23T12:00:00Z",
  source: "tmdb",
  note: "每日、每周使用 TMDB 趋势口径。",
  sections: [],
};

describe("hotRankingPresentation", () => {
  it("会过滤与榜首相同的第一条列表项", () => {
    const items = [spotlight, nextItem];

    expect(filterDuplicateSpotlight(spotlight, items)).toEqual([nextItem]);
  });

  it("会为列表项补充连续名次", () => {
    const rankedItems = buildRankedItems([nextItem], 2);

    expect(rankedItems).toHaveLength(1);
    expect(rankedItems[0].rank).toBe(2);
    expect(rankedItems[0].item.title).toBe("奥本海默");
  });

  it("会生成去重后的 Hero 轮播条目", () => {
    const heroItems = buildHeroItems({
      category: "movie",
      title: "热门电影",
      description: "test",
      spotlight,
      items: [spotlight, nextItem],
    });

    expect(heroItems).toHaveLength(2);
    expect(heroItems[0].title).toBe("沙丘 2");
    expect(heroItems[1].title).toBe("奥本海默");
  });

  it("会生成头部展示元信息", () => {
    expect(buildHotPageMeta(response, "movie")).toMatchObject({
      categoryLabel: "电影",
    });
  });
});
