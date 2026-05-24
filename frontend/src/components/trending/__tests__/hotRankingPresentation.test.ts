import { describe, expect, it } from "vitest";
import type { HotRankingItem, HotRankingResponse } from "@/types/hotRanking";
import {
  buildHeroItems,
  buildHotPageMeta,
  buildRankedItems,
  resolvePrimarySection,
  resolveSecondarySections,
} from "@/components/trending/hotRankingPresentation";

const spotlight: HotRankingItem = {
  id: 1,
  tmdb_id: 1,
  media_type: "movie",
  ranking_category: "movie",
  title: "沙丘 2",
  original_title: "Dune: Part Two",
  overview: "保罗踏上新的征程，在预言、家族与沙丘权力之间做出抉择。",
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
  mode: "trend",
  period: "day",
  page: 1,
  page_size: 100,
  has_more: false,
  updated_at: "2026-05-23T12:00:00Z",
  source: "tmdb",
  note: "每日、每周按热门趋势整理。",
  sections: [],
};

const aggregatedResponse: HotRankingResponse = {
  mode: "trend",
  period: "week",
  page: 1,
  page_size: 100,
  has_more: false,
  updated_at: "2026-05-24T02:00:00Z",
  source: "tmdb",
  note: "每日、每周按热门趋势整理。",
  sections: [
    {
      category: "movie",
      title: "热门电影",
      description: "movie",
      spotlight,
      items: [spotlight, nextItem],
    },
    {
      category: "tv",
      title: "热门电视剧",
      description: "tv",
      spotlight: {
        ...spotlight,
        id: 3,
        tmdb_id: 3,
        media_type: "tv",
        ranking_category: "tv",
        title: "最后生还者",
        original_title: "The Last of Us",
        tmdb_url: "https://www.themoviedb.org/tv/3",
      },
      items: [],
    },
    {
      category: "anime",
      title: "热门动漫",
      description: "anime",
      spotlight: {
        ...spotlight,
        id: 4,
        tmdb_id: 4,
        media_type: "tv",
        ranking_category: "anime",
        title: "葬送的芙莉莲",
        original_title: "葬送のフリーレン",
        tmdb_url: "https://www.themoviedb.org/tv/4",
      },
      items: [],
    },
  ],
};

describe("hotRankingPresentation", () => {
  it("会为列表项补充连续名次", () => {
    const rankedItems = buildRankedItems([nextItem], 1);

    expect(rankedItems).toHaveLength(1);
    expect(rankedItems[0].rank).toBe(1);
    expect(rankedItems[0].item.title).toBe("奥本海默");
  });

  it("会生成去重后的 Hero 轮播条目", () => {
    const heroItems = buildHeroItems({
      category: "movie",
      title: "热门电影",
      description: "按热门趋势整理的电影热门内容。",
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

  it("会在聚合模式下选出主分区与次级分区", () => {
    expect(resolvePrimarySection(aggregatedResponse.sections)?.category).toBe("movie");
    expect(resolveSecondarySections(aggregatedResponse.sections)).toHaveLength(2);
    expect(resolveSecondarySections(aggregatedResponse.sections)[0].category).toBe("tv");
  });

  it("会生成聚合页的头部展示元信息", () => {
    expect(buildHotPageMeta(aggregatedResponse, "all")).toMatchObject({
      categoryLabel: "全部热门",
      periodLabel: "周榜",
      note: "每日、每周按热门趋势整理。",
      sectionCount: 3,
      sourceLabel: "热门趋势",
    });
  });
});
