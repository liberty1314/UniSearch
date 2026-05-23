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
      period: "day",
      updated_at: "2026-05-23T12:00:00Z",
      source: "tmdb",
      sections: [],
    });

    await hotRankingService.getHotRankings({
      period: "week",
      category: "anime",
    });

    expect(getMock).toHaveBeenCalledWith("/hot?period=week&category=anime");
  });

  it("uses default params when omitted", async () => {
    getMock.mockResolvedValue({
      period: "day",
      updated_at: "2026-05-23T12:00:00Z",
      source: "tmdb",
      sections: [],
    });

    await hotRankingService.getHotRankings();

    expect(getMock).toHaveBeenCalledWith("/hot?period=day&category=movie");
  });

  it("forwards api errors", async () => {
    const apiError = { code: 500, message: "获取热门榜单失败" };
    getMock.mockRejectedValue(apiError);

    await expect(hotRankingService.getHotRankings()).rejects.toBe(apiError);
  });
});
