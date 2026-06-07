import React from "react";
import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import HotPage from "@/pages/HotPage";
import type { HotRankingResponse } from "@/types/hotRanking";

const { getHotRankingsMock, buildSearchUrlMock, buildTrendingSearchActionsMock } = vi.hoisted(() => ({
  getHotRankingsMock: vi.fn(),
  buildSearchUrlMock: vi.fn(),
  buildTrendingSearchActionsMock: vi.fn(),
}));

vi.mock("@/services/hotRankingService", () => ({
  hotRankingService: {
    getHotRankings: getHotRankingsMock,
  },
}));

vi.mock("@/services/searchService", () => ({
  SearchService: {
    buildSearchUrl: buildSearchUrlMock,
    buildTrendingSearchActions: buildTrendingSearchActionsMock,
  },
}));

const LocationProbe = () => {
  const location = useLocation();
  return (
    <div data-testid="location-probe">
      {JSON.stringify({
        pathname: location.pathname,
        search: location.search,
        state: location.state ?? null,
      })}
    </div>
  );
};

const createItem = (
  id: number,
  title: string,
  category: "movie" | "tv" | "anime",
  mediaType: "movie" | "tv",
) => ({
  id,
  tmdb_id: id,
  media_type: mediaType,
  ranking_category: category,
  title,
  original_title: `${title} Original`,
  overview: `${title} 的剧情简介`,
  poster_url: `https://image.tmdb.org/t/p/w500/poster-${id}.jpg`,
  backdrop_url: `https://image.tmdb.org/t/p/w500/backdrop-${id}.jpg`,
  vote_average: 8.5,
  vote_count: 1000,
  popularity: 900 - id,
  release_date: "2026-05-24",
  genre_names: category === "anime" ? ["动画"] : ["剧情"],
  tmdb_url: `https://www.themoviedb.org/${mediaType}/${id}`,
});

const createResponse = (overrides?: Partial<HotRankingResponse>): HotRankingResponse => ({
  mode: "trend",
  period: "day",
  time_key: "current",
  time_label: "当前周期",
  page: 1,
  page_size: 100,
  has_more: false,
  updated_at: "2026-05-24T10:00:00Z",
  source: "tmdb",
  note: "当前趋势榜单",
  sections: [
    {
      category: "movie",
      title: "热门电影",
      description: "按热门趋势整理的电影热门内容。",
      spotlight: createItem(1, "沙丘 2", "movie", "movie"),
      items: [
        createItem(1, "沙丘 2", "movie", "movie"),
        createItem(2, "奥本海默", "movie", "movie"),
      ],
    },
    {
      category: "tv",
      title: "热门电视剧",
      description: "按热门趋势整理的电视剧热门内容。",
      spotlight: createItem(3, "最后生还者", "tv", "tv"),
      items: [
        createItem(3, "最后生还者", "tv", "tv"),
        createItem(4, "人生切割术", "tv", "tv"),
      ],
    },
    {
      category: "anime",
      title: "热门动漫",
      description: "按热门趋势整理的动漫热门内容。",
      spotlight: createItem(5, "葬送的芙莉莲", "anime", "tv"),
      items: [
        createItem(5, "葬送的芙莉莲", "anime", "tv"),
        createItem(6, "药屋少女的呢喃", "anime", "tv"),
      ],
    },
  ],
  ...overrides,
});

const renderHotPage = () =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={["/trending"]}>
        <Routes>
          <Route path="/" element={<LocationProbe />} />
          <Route path="/trending" element={<HotPage />} />
          <Route path="/search" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );

describe("HotPage", () => {
  beforeEach(() => {
    getHotRankingsMock.mockReset();
    buildSearchUrlMock.mockReset();
    buildTrendingSearchActionsMock.mockReset();
    buildSearchUrlMock.mockImplementation(
      ({ keyword }: { keyword: string }) => `/search?q=${encodeURIComponent(keyword)}`,
    );
    buildTrendingSearchActionsMock.mockImplementation(
      (item: { title: string; original_title: string }) => [
        {
          key: "title",
          label: "搜片名",
          keyword: item.title,
          isPrimary: true,
        },
        {
          key: "original_title",
          label: "搜原名",
          keyword: item.original_title,
          isPrimary: false,
        },
        {
          key: "title_4k",
          label: "搜 4K",
          keyword: `${item.title} 4K`,
          isPrimary: false,
        },
        {
          key: "title_collection",
          label: "搜合集",
          keyword: `${item.title} 合集`,
          isPrimary: false,
        },
      ],
    );
  });

  it("默认请求每日趋势总榜并直接渲染控制台与列表", async () => {
    getHotRankingsMock.mockResolvedValue(createResponse());

    renderHotPage();

    await waitFor(() => {
      expect(getHotRankingsMock).toHaveBeenCalledWith({
        mode: "trend",
        period: "day",
        category: "all",
        sort_by: "popularity.desc",
        date: undefined,
        week_start: undefined,
        month: undefined,
        year: undefined,
        page: 1,
        page_size: 100,
      });
    });

    expect(screen.queryByTestId("hot-page-hero")).not.toBeInTheDocument();
    expect(screen.queryByTestId("hot-hero-frame")).not.toBeInTheDocument();
    expect(screen.getByText("热榜控制台")).toBeInTheDocument();
    expect(screen.getAllByTestId("hot-media-card")).toHaveLength(6);
    expect(screen.getByRole("heading", { level: 3, name: "沙丘 2" })).toBeInTheDocument();
  });

  it("切换到每周动漫趋势榜时会重新请求", async () => {
    getHotRankingsMock.mockResolvedValue(createResponse());

    renderHotPage();
    await screen.findByRole("heading", { level: 3, name: "沙丘 2" });

    fireEvent.click(screen.getByRole("button", { name: "每周" }));
    fireEvent.click(screen.getByRole("button", { name: "动漫" }));

    await waitFor(() => {
      expect(getHotRankingsMock).toHaveBeenLastCalledWith({
        mode: "trend",
        period: "week",
        category: "anime",
        sort_by: "popularity.desc",
        date: undefined,
        week_start: undefined,
        month: undefined,
        year: undefined,
        page: 1,
        page_size: 100,
      });
    });
  });

  it("趋势榜在切换排序后仍然允许切换分类", async () => {
    getHotRankingsMock.mockResolvedValue(createResponse());

    renderHotPage();
    await screen.findByRole("heading", { level: 3, name: "沙丘 2" });

    fireEvent.click(screen.getByLabelText("打开排序菜单"));
    fireEvent.click(await screen.findByRole("menuitemradio", { name: "按评分" }));

    await waitFor(() => {
      expect(getHotRankingsMock).toHaveBeenLastCalledWith({
        mode: "trend",
        period: "day",
        category: "all",
        sort_by: "vote_average.desc",
        date: undefined,
        week_start: undefined,
        month: undefined,
        year: undefined,
        page: 1,
        page_size: 100,
      });
    });

    fireEvent.click(screen.getByRole("button", { name: "电影" }));

    await waitFor(() => {
      expect(getHotRankingsMock).toHaveBeenLastCalledWith({
        mode: "trend",
        period: "day",
        category: "movie",
        sort_by: "vote_average.desc",
        date: undefined,
        week_start: undefined,
        month: undefined,
        year: undefined,
        page: 1,
        page_size: 100,
      });
    });
  });

  it("趋势榜下会隐藏每月每年和时间筛选卡片", async () => {
    getHotRankingsMock.mockResolvedValue(createResponse());

    renderHotPage();
    await screen.findByRole("heading", { level: 3, name: "沙丘 2" });

    expect(screen.getByRole("button", { name: "每月" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "每年" })).toBeDisabled();
    expect(screen.getByLabelText("打开排序菜单")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "每日" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "每周" })).toBeInTheDocument();
  });

  it("控制台标签按钮保持单行稳定布局", async () => {
    getHotRankingsMock.mockResolvedValue(createResponse());

    renderHotPage();
    await screen.findByRole("heading", { level: 3, name: "沙丘 2" });

    const modeTabs = screen.getByTestId("hot-mode-tabs");
    const periodTabs = screen.getByTestId("hot-period-tabs");
    const categoryTabs = screen.getByTestId("hot-category-tabs");

    expect(modeTabs.className).toContain("overflow-x-auto");
    expect(periodTabs.className).toContain("overflow-x-auto");
    expect(categoryTabs.className).toContain("overflow-x-auto");

    expect(screen.getByRole("button", { name: "电视剧" }).className).toContain("whitespace-nowrap");

    fireEvent.click(screen.getByRole("button", { name: "热门榜" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "每月" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "每年" })).toBeInTheDocument();
    });

    expect(screen.getByTestId("hot-period-tabs").className).toContain("overflow-x-auto");
  });

  it("控制台移除摘要卡片并保留重置与移动调整入口", async () => {
    getHotRankingsMock.mockResolvedValue(createResponse());

    renderHotPage();
    await screen.findByRole("heading", { level: 3, name: "沙丘 2" });

    expect(screen.queryByTestId("hot-toolbar-summary")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "重置条件" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "调整榜单" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "热门榜" }));
    fireEvent.click(screen.getByRole("button", { name: "每月" }));
    fireEvent.click(screen.getByRole("button", { name: "电影" }));

    await waitFor(() => {
      expect(screen.getByLabelText("指定月份")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "电影" })).toHaveAttribute("aria-pressed", "true");
    });

    fireEvent.click(screen.getByLabelText("打开排序菜单"));
    fireEvent.click(await screen.findByRole("menuitemradio", { name: "按评分" }));

    await waitFor(() => {
      expect(getHotRankingsMock).toHaveBeenLastCalledWith({
        mode: "popular",
        period: "month",
        category: "movie",
        sort_by: "vote_average.desc",
        date: undefined,
        week_start: undefined,
        month: expect.stringMatching(/^\d{4}-\d{2}$/),
        year: undefined,
        page: 1,
        page_size: 100,
      });
    });
  });

  it("热门榜下会展示附属时间筛选区", async () => {
    getHotRankingsMock.mockResolvedValue(createResponse());

    renderHotPage();
    await screen.findByRole("heading", { level: 3, name: "沙丘 2" });

    fireEvent.click(screen.getByRole("button", { name: "热门榜" }));

    await waitFor(() => {
      expect(screen.getByTestId("hot-toolbar-time-panel")).toBeInTheDocument();
    });

    expect(screen.getByLabelText("指定日期")).toBeInTheDocument();
  });

  it("热门榜单单分类支持按时间和评分排序", async () => {
    getHotRankingsMock
      .mockResolvedValueOnce(createResponse())
      .mockResolvedValueOnce(
        createResponse({
          mode: "popular",
          period: "day",
          sections: [
            {
              category: "movie",
              title: "热门电影",
              description: "按热度排序的电影内容。",
              spotlight: createItem(11, "热度优先电影", "movie", "movie"),
              items: [
                createItem(11, "热度优先电影", "movie", "movie"),
                createItem(12, "第二热门电影", "movie", "movie"),
              ],
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        createResponse({
          mode: "popular",
          period: "day",
          sections: [
            {
              category: "movie",
              title: "热门电影",
              description: "按时间排序的电影内容。",
              spotlight: createItem(13, "最新上映电影", "movie", "movie"),
              items: [
                createItem(13, "最新上映电影", "movie", "movie"),
                createItem(14, "院线新片", "movie", "movie"),
              ],
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        createResponse({
          mode: "popular",
          period: "day",
          sections: [
            {
              category: "movie",
              title: "热门电影",
              description: "按评分排序的电影内容。",
              spotlight: createItem(15, "高分电影", "movie", "movie"),
              items: [
                createItem(15, "高分电影", "movie", "movie"),
                createItem(16, "口碑佳作", "movie", "movie"),
              ],
            },
          ],
        }),
      );

    renderHotPage();
    await screen.findByRole("heading", { level: 3, name: "沙丘 2" });

    fireEvent.click(screen.getByRole("button", { name: "热门榜" }));
    await waitFor(() => {
      expect(getHotRankingsMock).toHaveBeenLastCalledWith({
        mode: "popular",
        period: "day",
        category: "all",
        sort_by: "popularity.desc",
        date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        week_start: undefined,
        month: undefined,
        year: undefined,
        page: 1,
        page_size: 100,
      });
    });

    fireEvent.click(screen.getByRole("button", { name: "电影" }));

    await waitFor(() => {
      expect(getHotRankingsMock).toHaveBeenLastCalledWith({
        mode: "popular",
        period: "day",
        category: "movie",
        sort_by: "popularity.desc",
        date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        week_start: undefined,
        month: undefined,
        year: undefined,
        page: 1,
        page_size: 100,
      });
    });

    fireEvent.click(screen.getByLabelText("打开排序菜单"));

    fireEvent.click(await screen.findByRole("menuitemradio", { name: "按时间" }));

    await waitFor(() => {
      expect(getHotRankingsMock).toHaveBeenLastCalledWith({
        mode: "popular",
        period: "day",
        category: "movie",
        sort_by: "primary_release_date.desc",
        date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        week_start: undefined,
        month: undefined,
        year: undefined,
        page: 1,
        page_size: 100,
      });
    });

    fireEvent.click(screen.getByLabelText("打开排序菜单"));
    fireEvent.click(await screen.findByRole("menuitemradio", { name: "按评分" }));

    await waitFor(() => {
      expect(getHotRankingsMock).toHaveBeenLastCalledWith({
        mode: "popular",
        period: "day",
        category: "movie",
        sort_by: "vote_average.desc",
        date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        week_start: undefined,
        month: undefined,
        year: undefined,
        page: 1,
        page_size: 100,
      });
    });
  });

  it("趋势榜和聚合分类也支持排序切换", async () => {
    getHotRankingsMock.mockResolvedValue(createResponse());

    renderHotPage();
    await screen.findByRole("heading", { level: 3, name: "沙丘 2" });

    fireEvent.click(screen.getByLabelText("打开排序菜单"));
    fireEvent.click(await screen.findByRole("menuitemradio", { name: "按时间" }));

    await waitFor(() => {
      expect(getHotRankingsMock).toHaveBeenLastCalledWith({
        mode: "trend",
        period: "day",
        category: "all",
        sort_by: "primary_release_date.desc",
        date: undefined,
        week_start: undefined,
        month: undefined,
        year: undefined,
        page: 1,
        page_size: 100,
      });
    });

    fireEvent.click(screen.getByRole("button", { name: "热门榜" }));

    await waitFor(() => {
      expect(getHotRankingsMock).toHaveBeenLastCalledWith({
        mode: "popular",
        period: "day",
        category: "all",
        sort_by: "primary_release_date.desc",
        date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        week_start: undefined,
        month: undefined,
        year: undefined,
        page: 1,
        page_size: 100,
      });
    });

    fireEvent.click(screen.getByLabelText("打开排序菜单"));
    fireEvent.click(await screen.findByRole("menuitemradio", { name: "按评分" }));

    await waitFor(() => {
      expect(getHotRankingsMock).toHaveBeenLastCalledWith({
        mode: "popular",
        period: "day",
        category: "all",
        sort_by: "vote_average.desc",
        date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        week_start: undefined,
        month: undefined,
        year: undefined,
        page: 1,
        page_size: 100,
      });
    });
  });

  it("点击重置筛选会恢复默认状态并重新请求默认榜单", async () => {
    const user = userEvent.setup();
    getHotRankingsMock.mockResolvedValue(createResponse());

    renderHotPage();
    await screen.findByRole("heading", { level: 3, name: "沙丘 2" });

    await user.click(screen.getByRole("button", { name: "热门榜" }));
    await user.click(screen.getByRole("button", { name: "电影" }));
    await user.click(await screen.findByLabelText("打开排序菜单"));
    await user.click(await screen.findByRole("menuitemradio", { name: "按评分" }));
    fireEvent.change(screen.getByLabelText("指定日期"), { target: { value: "2026-03-23" } });

    await waitFor(() => {
      expect(getHotRankingsMock).toHaveBeenLastCalledWith({
        mode: "popular",
        period: "day",
        category: "movie",
        sort_by: "vote_average.desc",
        date: "2026-03-23",
        week_start: undefined,
        month: undefined,
        year: undefined,
        page: 1,
        page_size: 100,
      });
    });

    await user.click(screen.getByRole("button", { name: "重置条件" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "趋势榜" })).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByRole("button", { name: "全部" })).toHaveAttribute("aria-pressed", "true");
    });

    await waitFor(() => {
      expect(getHotRankingsMock).toHaveBeenLastCalledWith({
        mode: "trend",
        period: "day",
        category: "all",
        sort_by: "popularity.desc",
        date: undefined,
        week_start: undefined,
        month: undefined,
        year: undefined,
        page: 1,
        page_size: 100,
      });
    });
  });

  it("切换到热门月榜后会带上月份参数请求", async () => {
    getHotRankingsMock.mockResolvedValue(createResponse());

    renderHotPage();
    await screen.findByRole("heading", { level: 3, name: "沙丘 2" });

    fireEvent.click(screen.getByRole("button", { name: "热门榜" }));
    fireEvent.click(screen.getByRole("button", { name: "每月" }));

    await waitFor(() => {
      expect(getHotRankingsMock).toHaveBeenLastCalledWith({
        mode: "popular",
        period: "month",
        category: "all",
        sort_by: "popularity.desc",
        date: undefined,
        week_start: undefined,
        month: expect.stringMatching(/^\d{4}-\d{2}$/),
        year: undefined,
        page: 1,
        page_size: 100,
      });
    });

    const monthInput = screen.getByLabelText("指定月份");
    fireEvent.change(monthInput, { target: { value: "2026-04" } });

    await waitFor(() => {
      expect(getHotRankingsMock).toHaveBeenLastCalledWith({
        mode: "popular",
        period: "month",
        category: "all",
        sort_by: "popularity.desc",
        date: undefined,
        week_start: undefined,
        month: "2026-04",
        year: undefined,
        page: 1,
        page_size: 100,
      });
    });
  });

  it("切换到热门年榜后会带上年份参数请求", async () => {
    getHotRankingsMock.mockResolvedValue(createResponse());

    renderHotPage();
    await screen.findByRole("heading", { level: 3, name: "沙丘 2" });

    fireEvent.click(screen.getByRole("button", { name: "热门榜" }));
    fireEvent.click(screen.getByRole("button", { name: "每年" }));

    await waitFor(() => {
      expect(getHotRankingsMock).toHaveBeenLastCalledWith({
        mode: "popular",
        period: "year",
        category: "all",
        sort_by: "popularity.desc",
        date: undefined,
        week_start: undefined,
        month: undefined,
        year: expect.stringMatching(/^\d{4}$/),
        page: 1,
        page_size: 100,
      });
    });

    const yearInput = screen.getByLabelText("指定年份");
    fireEvent.change(yearInput, { target: { value: "2025" } });

    await waitFor(() => {
      expect(getHotRankingsMock).toHaveBeenLastCalledWith({
        mode: "popular",
        period: "year",
        category: "all",
        sort_by: "popularity.desc",
        date: undefined,
        week_start: undefined,
        month: undefined,
        year: "2025",
        page: 1,
        page_size: 100,
      });
    });
  });

  it("切换到热门日榜后修改日期会重新请求", async () => {
    getHotRankingsMock.mockResolvedValue(createResponse());

    renderHotPage();
    await screen.findByRole("heading", { level: 3, name: "沙丘 2" });

    fireEvent.click(screen.getByRole("button", { name: "热门榜" }));

    await waitFor(() => {
      expect(getHotRankingsMock).toHaveBeenLastCalledWith({
        mode: "popular",
        period: "day",
        category: "all",
        sort_by: "popularity.desc",
        date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        week_start: undefined,
        month: undefined,
        year: undefined,
        page: 1,
        page_size: 100,
      });
    });

    const dateInput = screen.getByLabelText("指定日期");
    fireEvent.change(dateInput, { target: { value: "2026-05-01" } });

    await waitFor(() => {
      expect(getHotRankingsMock).toHaveBeenLastCalledWith({
        mode: "popular",
        period: "day",
        category: "all",
        sort_by: "popularity.desc",
        date: "2026-05-01",
        week_start: undefined,
        month: undefined,
        year: undefined,
        page: 1,
        page_size: 100,
      });
    });
  });

  it("点击榜单卡片搜索按钮会跳转到搜索页", async () => {
    getHotRankingsMock.mockResolvedValue(createResponse());

    renderHotPage();

    await screen.findByRole("heading", { level: 3, name: "沙丘 2" });
    fireEvent.click(screen.getAllByRole("button", { name: "搜索" })[0]);

    expect(await screen.findByTestId("location-probe")).toHaveTextContent('"pathname":"/search"');
    expect(screen.getByTestId("location-probe")).toHaveTextContent(
      '"search":"?q=%E6%B2%99%E4%B8%98%202"',
    );
    expect(screen.getByTestId("location-probe")).toHaveTextContent(
      '"fromTrending"',
    );
    expect(screen.getByTestId("location-probe")).toHaveTextContent(
      '"actionKey":"title"',
    );
  });

  it("点击榜单卡片快捷搜索入口会使用更明确的搜索线索", async () => {
    getHotRankingsMock.mockResolvedValue(createResponse());

    renderHotPage();

    await screen.findByRole("heading", { level: 3, name: "沙丘 2" });
    fireEvent.click(screen.getAllByRole("button", { name: "搜 4K" })[0]);

    expect(await screen.findByTestId("location-probe")).toHaveTextContent('"pathname":"/search"');
    expect(screen.getByTestId("location-probe")).toHaveTextContent(
      '"search":"?q=%E6%B2%99%E4%B8%98%202%204K"',
    );
    expect(screen.getByTestId("location-probe")).toHaveTextContent(
      '"keyword":"沙丘 2 4K"',
    );
    expect(screen.getByTestId("location-probe")).toHaveTextContent(
      '"actionKey":"title_4k"',
    );
  });

  it("加载更多会追加下一页内容", async () => {
    getHotRankingsMock
      .mockResolvedValueOnce(
        createResponse({
          mode: "popular",
          period: "month",
          has_more: true,
          next_page: 2,
          sections: [
            {
              category: "movie",
              title: "热门电影",
              description: "按热度排序的电影内容。",
              spotlight: createItem(7, "疯狂的麦克斯：狂暴女神", "movie", "movie"),
              items: [
                createItem(7, "疯狂的麦克斯：狂暴女神", "movie", "movie"),
                createItem(8, "异形：夺命舰", "movie", "movie"),
              ],
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        createResponse({
          mode: "popular",
          period: "month",
          page: 1,
          has_more: true,
          next_page: 2,
          sections: [
            {
              category: "movie",
              title: "热门电影",
              description: "按热度排序的电影内容。",
              spotlight: createItem(1, "沙丘 2", "movie", "movie"),
              items: [
                createItem(7, "疯狂的麦克斯：狂暴女神", "movie", "movie"),
                createItem(8, "异形：夺命舰", "movie", "movie"),
              ],
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        createResponse({
          mode: "popular",
          period: "month",
          page: 2,
          has_more: false,
          next_page: undefined,
          sections: [
            {
              category: "movie",
              title: "热门电影",
              description: "按热度排序的电影内容。",
              spotlight: createItem(1, "沙丘 2", "movie", "movie"),
              items: [
                createItem(9, "哥斯拉大战金刚 2：帝国崛起", "movie", "movie"),
                createItem(10, "猩球崛起：新世界", "movie", "movie"),
              ],
            },
          ],
        }),
      );

    renderHotPage();
    fireEvent.click(screen.getByRole("button", { name: "热门榜" }));
    fireEvent.click(screen.getByRole("button", { name: "每月" }));

    await waitFor(() => {
      expect(getHotRankingsMock).toHaveBeenLastCalledWith({
        mode: "popular",
        period: "month",
        category: "all",
        sort_by: "popularity.desc",
        date: undefined,
        week_start: undefined,
        month: expect.stringMatching(/^\d{4}-\d{2}$/),
        year: undefined,
        page: 1,
        page_size: 100,
      });
    });

    expect(getHotRankingsMock).toHaveBeenNthCalledWith(3, {
      mode: "popular",
      period: "month",
      category: "all",
      sort_by: "popularity.desc",
      date: undefined,
      week_start: undefined,
      month: expect.stringMatching(/^\d{4}-\d{2}$/),
      year: undefined,
      page: 1,
      page_size: 100,
    });
  });

  it("请求失败时展示错误态并支持重试", async () => {
    getHotRankingsMock
      .mockRejectedValueOnce({ message: "获取热门榜单失败" })
      .mockResolvedValueOnce(createResponse());

    renderHotPage();

    expect(await screen.findByText("获取热门内容失败")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "重新加载" }));

    await waitFor(() => {
      expect(getHotRankingsMock).toHaveBeenCalledTimes(2);
    });
  });

  it("加载中展示骨架屏", () => {
    getHotRankingsMock.mockReturnValue(new Promise(() => {}));

    renderHotPage();

    expect(screen.queryByTestId("hot-page-skeleton")).not.toBeInTheDocument();
    expect(screen.queryByTestId("hot-page-skeleton-hero")).not.toBeInTheDocument();
    expect(screen.getByText("热榜控制台")).toBeInTheDocument();
    expect(screen.getByTestId("hot-media-grid-skeleton")).toBeInTheDocument();
    expect(screen.getAllByTestId("hot-media-card-skeleton")).toHaveLength(6);
    expect(screen.queryByTestId("hot-page-skeleton-card")).not.toBeInTheDocument();
  });

  it("筛选切换刷新时不展示轮播并展示局部刷新层", async () => {
    let resolveNextRequest: ((value: HotRankingResponse) => void) | null = null;
    getHotRankingsMock
      .mockResolvedValueOnce(createResponse())
      .mockImplementationOnce(() => new Promise<HotRankingResponse>((resolve) => {
        resolveNextRequest = resolve;
      }));

    renderHotPage();
    await screen.findByRole("heading", { level: 3, name: "沙丘 2" });

    fireEvent.click(screen.getByRole("button", { name: "每周" }));

    expect(screen.queryByTestId("hot-page-skeleton")).not.toBeInTheDocument();
    expect(screen.queryByTestId("hot-page-hero")).not.toBeInTheDocument();
    expect(screen.getByTestId("hot-media-grid-skeleton")).toBeInTheDocument();

    await act(async () => {
      resolveNextRequest?.(createResponse({
        period: "week",
        time_label: "最近一周",
        note: "当前每周趋势榜",
        sections: [
          {
            category: "movie",
            title: "热门电影",
            description: "按热门趋势整理的电影热门内容。",
            spotlight: createItem(7, "头脑特工队 2", "movie", "movie"),
            items: [
              createItem(7, "头脑特工队 2", "movie", "movie"),
              createItem(8, "加菲猫家族", "movie", "movie"),
            ],
          },
        ],
      }));
    });

    expect(getHotRankingsMock).toHaveBeenLastCalledWith({
      mode: "trend",
      period: "week",
      category: "all",
      sort_by: "popularity.desc",
      date: undefined,
      week_start: undefined,
      month: undefined,
      year: undefined,
      page: 1,
      page_size: 100,
    });
    expect(await screen.findByRole("heading", { level: 3, name: "头脑特工队 2" })).toBeInTheDocument();
    expect(screen.queryByTestId("hot-media-grid-skeleton")).not.toBeInTheDocument();
  });

  it("当前筛选无数据时展示空态引导", async () => {
    getHotRankingsMock.mockResolvedValue(
      createResponse({
        sections: [
          {
            category: "movie",
            title: "热门电影",
            description: "暂无数据",
            spotlight: undefined,
            items: [],
          },
        ],
      }),
    );

    renderHotPage();

    expect(await screen.findByText("当前筛选暂无上榜内容")).toBeInTheDocument();
    expect(screen.getByText(/切换时间维度或内容分类/)).toBeInTheDocument();
    expect(screen.getByText(/当前分类：全部热门/)).toBeInTheDocument();
  });
});
