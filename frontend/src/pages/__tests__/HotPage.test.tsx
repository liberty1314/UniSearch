import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import HotPage from "@/pages/HotPage";

const { getHotRankingsMock, buildSearchUrlMock } = vi.hoisted(() => ({
  getHotRankingsMock: vi.fn(),
  buildSearchUrlMock: vi.fn(),
}));

vi.mock("@/services/hotRankingService", () => ({
  hotRankingService: {
    getHotRankings: getHotRankingsMock,
  },
}));

vi.mock("@/services/searchService", () => ({
  SearchService: {
    buildSearchUrl: buildSearchUrlMock,
  },
}));

const LocationProbe = () => {
  const location = useLocation();
  return (
    <div data-testid="location-probe">
      {JSON.stringify({
        pathname: location.pathname,
        search: location.search,
      })}
    </div>
  );
};

const response = {
  period: "day" as const,
  updated_at: "2026-05-23T12:00:00Z",
  source: "tmdb" as const,
  note: "每日、每周使用 TMDB 趋势口径。",
  sections: [
    {
      category: "movie" as const,
      title: "热门电影",
      description: "基于 TMDB 数据整理的电影热门内容。",
      spotlight: {
        id: 1,
        tmdb_id: 1,
        media_type: "movie" as const,
        ranking_category: "movie" as const,
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
      },
      items: [
        {
          id: 1,
          tmdb_id: 1,
          media_type: "movie" as const,
          ranking_category: "movie" as const,
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
        },
        {
          id: 2,
          tmdb_id: 2,
          media_type: "movie" as const,
          ranking_category: "movie" as const,
          title: "奥本海默",
          original_title: "Oppenheimer",
          overview: "another overview",
          poster_url: "https://image.tmdb.org/t/p/w500/poster-2.jpg",
          backdrop_url: "https://image.tmdb.org/t/p/w500/backdrop-2.jpg",
          vote_average: 8.4,
          vote_count: 800,
          popularity: 800,
          release_date: "2023-08-30",
          genre_names: ["剧情"],
          tmdb_url: "https://www.themoviedb.org/movie/2",
        },
      ],
    },
  ],
};

const renderHotPage = () =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={["/hot"]}>
        <Routes>
          <Route path="/" element={<LocationProbe />} />
          <Route path="/hot" element={<HotPage />} />
          <Route path="/search" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );

const findActiveHeroSlide = async () => {
  const hero = await screen.findByTestId("hot-page-hero");
  const activeSlide = hero.querySelector<HTMLElement>('[data-active="true"]');

  expect(activeSlide).not.toBeNull();

  return activeSlide as HTMLElement;
};

describe("HotPage", () => {
  beforeEach(() => {
    getHotRankingsMock.mockReset();
    buildSearchUrlMock.mockReset();
    buildSearchUrlMock.mockImplementation(
      ({ keyword }: { keyword: string }) => `/search?q=${encodeURIComponent(keyword)}`,
    );
  });

  it("requests default day movie rankings on mount", async () => {
    getHotRankingsMock.mockResolvedValue(response);

    renderHotPage();

    await waitFor(() => {
      expect(getHotRankingsMock).toHaveBeenCalledWith({
        period: "day",
        category: "movie",
      });
    });

    const activeSlide = await findActiveHeroSlide();

    expect(within(activeSlide).getByText("每日热门内容")).toBeInTheDocument();
    expect(within(activeSlide).getByRole("heading", { level: 1, name: "沙丘 2" })).toBeInTheDocument();
  });

  it("renders carousel hero and the deduplicated list content", async () => {
    getHotRankingsMock.mockResolvedValue(response);

    renderHotPage();

    expect(await screen.findByTestId("hot-page-hero")).toBeInTheDocument();
    expect(screen.queryByTestId("hot-page-highlight")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "热门电影" })).toBeInTheDocument();
    expect(screen.getAllByText("奥本海默").length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("hot-media-card")).toHaveLength(1);
    expect(screen.queryByText("基于 TMDB 数据整理的电影热门内容。")).not.toBeInTheDocument();
  });

  it("renders hero category information from ranking response", async () => {
    getHotRankingsMock.mockResolvedValue(response);

    renderHotPage();

    const activeSlide = await findActiveHeroSlide();

    expect(within(activeSlide).getByText("分类")).toBeInTheDocument();
    expect(within(activeSlide).getByText("热度")).toBeInTheDocument();
    expect(within(activeSlide).getByText("评分")).toBeInTheDocument();
    expect(within(activeSlide).getByRole("heading", { level: 1, name: "沙丘 2" })).toBeInTheDocument();
    expect(screen.getAllByText("电影").length).toBeGreaterThan(0);
    expect(screen.queryByText("当前分类")).not.toBeInTheDocument();
    expect(screen.queryByText("数据来源")).not.toBeInTheDocument();
    expect(screen.queryByText("已更新")).not.toBeInTheDocument();
  });

  it("requests data again when switching period and category", async () => {
    getHotRankingsMock.mockResolvedValue(response);

    renderHotPage();

    await screen.findByRole("heading", { level: 1, name: "沙丘 2" });

    fireEvent.click(screen.getByRole("button", { name: "每周" }));
    fireEvent.click(screen.getByRole("button", { name: "动漫" }));

    expect(screen.getByRole("button", { name: "每周" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "动漫" })).toHaveAttribute("aria-pressed", "true");

    await waitFor(() => {
      expect(getHotRankingsMock).toHaveBeenLastCalledWith({
        period: "week",
        category: "anime",
      });
    });
  });

  it("navigates to the search page when clicking the search action", async () => {
    getHotRankingsMock.mockResolvedValue(response);

    renderHotPage();

    const activeSlide = await findActiveHeroSlide();
    fireEvent.click(within(activeSlide).getByRole("button", { name: "搜索" }));

    expect(await screen.findByTestId("location-probe")).toHaveTextContent(
      '"pathname":"/search"',
    );
    expect(screen.getByTestId("location-probe")).toHaveTextContent(
      '"search":"?q=%E6%B2%99%E4%B8%98%202"',
    );
  });

  it("renders error state and supports retry", async () => {
    getHotRankingsMock
      .mockRejectedValueOnce({ message: "获取热门榜单失败" })
      .mockResolvedValueOnce(response);

    renderHotPage();

    expect(await screen.findByText("获取热门内容失败")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "重新加载" }));

    await waitFor(() => {
      expect(getHotRankingsMock).toHaveBeenCalledTimes(2);
    });
  });

  it("在加载中展示贴近真实结构的骨架屏", () => {
    getHotRankingsMock.mockReturnValue(new Promise(() => {}));

    renderHotPage();

    expect(screen.getByTestId("hot-page-skeleton")).toBeInTheDocument();
    expect(screen.getByTestId("hot-page-skeleton-hero")).toBeInTheDocument();
    expect(screen.getAllByTestId("hot-page-skeleton-card")).toHaveLength(4);
  });

  it("在当前筛选暂无数据时展示切换引导", async () => {
    getHotRankingsMock.mockResolvedValue({
      ...response,
      sections: [
        {
          ...response.sections[0],
          spotlight: undefined,
          items: [],
        },
      ],
    });

    renderHotPage();

    expect(await screen.findByText("当前筛选暂无上榜内容")).toBeInTheDocument();
    expect(screen.getByText(/切换时间维度或内容分类/)).toBeInTheDocument();
    expect(screen.getByText(/当前分类：电影/)).toBeInTheDocument();
  });
});
