import { beforeEach, describe, expect, it, vi } from "vitest";
import { hotRankingService } from "@/services/hotRankingService";

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
});
