import { beforeEach, describe, expect, it, vi } from "vitest";
import { hotRankingService, normalizeHotRankingResponse } from "@/services/hotRankingService";

const { getMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  apiClient: {
    get: getMock,
  },
}));

describe("hotRankingService", () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it("serializes period and category query params", async () => {
    getMock.mockResolvedValue({
      mode: "trend",
      period: "day",
      page: 1,
      page_size: 50,
      has_more: false,
      updated_at: "2026-05-23T12:00:00Z",
      source: "tmdb",
      sections: [],
    });

    await hotRankingService.getHotRankings({
      mode: "popular",
      period: "week",
      category: "anime",
      date: "2026-05-24",
      page: 2,
    });

    expect(getMock).toHaveBeenCalledWith("/hot?mode=popular&period=week&category=anime&page=2&page_size=100&date=2026-05-24");
  });

  it("uses default params when omitted", async () => {
    getMock.mockResolvedValue({
      mode: "trend",
      period: "day",
      page: 1,
      page_size: 50,
      has_more: false,
      updated_at: "2026-05-23T12:00:00Z",
      source: "tmdb",
      sections: [],
    });

    await hotRankingService.getHotRankings();

    expect(getMock).toHaveBeenCalledWith("/hot?mode=trend&period=day&category=all&page=1&page_size=100");
  });

  it("forwards api errors", async () => {
    const apiError = { code: 500, message: "获取热门榜单失败" };
    getMock.mockRejectedValue(apiError);

    await expect(hotRankingService.getHotRankings()).rejects.toBe(apiError);
  });

  it("normalizes nullable section arrays from api response", async () => {
    getMock.mockResolvedValue({
      mode: "popular",
      period: "day",
      page: 1,
      page_size: 50,
      has_more: false,
      updated_at: "2026-05-23T12:00:00Z",
      source: "tmdb",
      sections: [
        {
          category: "movie",
          title: "热门电影",
          description: "测试",
          spotlight: null,
          items: null,
        },
      ],
    });

    const response = await hotRankingService.getHotRankings({
      mode: "popular",
      period: "day",
      category: "movie",
    });

    expect(response.sections).toEqual([
      {
        category: "movie",
        title: "热门电影",
        description: "测试",
        spotlight: undefined,
        items: [],
      },
    ]);
  });

  it("归一化旧榜单响应时会补齐默认可搜索状态", () => {
    const response = normalizeHotRankingResponse({
      mode: "trend",
      period: "day",
      page: 1,
      page_size: 50,
      has_more: false,
      updated_at: "2026-05-23T12:00:00Z",
      source: "tmdb",
      sections: [
        {
          category: "movie",
          title: "热门电影",
          description: "测试",
          items: [
            {
              id: 1,
              tmdb_id: 1,
              media_type: "movie",
              ranking_category: "movie",
              title: "旧缓存影片",
              original_title: "Legacy Movie",
              overview: "测试",
              poster_url: "",
              backdrop_url: "",
              vote_average: 0,
              vote_count: 0,
              popularity: 1,
              release_date: "2026-05-01",
              genre_names: null,
              tmdb_url: "",
            },
          ],
        },
      ],
    });

    expect(response.sections[0].items[0]).toMatchObject({
      availability_status: "released",
      search_available: true,
      search_hint: "",
    });
  });

  it("归一化时会用未来上映日期覆盖错误的可搜索状态", () => {
    const response = normalizeHotRankingResponse({
      mode: "trend",
      period: "day",
      page: 1,
      page_size: 50,
      has_more: false,
      updated_at: "2026-06-19T12:00:00Z",
      source: "tmdb",
      sections: [
        {
          category: "movie",
          title: "热门电影",
          description: "测试",
          items: [
            {
              id: 2,
              tmdb_id: 2,
              media_type: "movie",
              ranking_category: "movie",
              title: "蜘蛛侠：崭新之日",
              original_title: "Spider-Man: Brand New Day",
              overview: "测试",
              poster_url: "",
              backdrop_url: "",
              vote_average: 0,
              vote_count: 0,
              popularity: 77,
              release_date: "2099-07-29",
              availability_status: "released",
              search_available: true,
              search_hint: "",
              genre_names: null,
              tmdb_url: "",
            },
          ],
        },
      ],
    });

    expect(response.sections[0].items[0]).toMatchObject({
      availability_status: "upcoming",
      search_available: false,
      search_hint: "预计 2099-07-29 上映，当前站内资源可能不可用",
    });
  });
});
