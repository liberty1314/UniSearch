import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import HotPage from "@/pages/HotPage";
import type { HotRankingResponse } from "@/types/hotRanking";

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

const findHeroSlideByLabel = async (label: string) => {
  const hero = await screen.findByTestId("hot-page-hero");
  await waitFor(() => {
    const nextSlide = hero.querySelector<HTMLElement>(`[aria-label="${label}"]`);
    expect(nextSlide).not.toBeNull();
  });
  return hero.querySelector<HTMLElement>(`[aria-label="${label}"]`) as HTMLElement;
};

describe("HotPage", () => {
  beforeEach(() => {
    getHotRankingsMock.mockReset();
    buildSearchUrlMock.mockReset();
    buildSearchUrlMock.mockImplementation(
      ({ keyword }: { keyword: string }) => `/search?q=${encodeURIComponent(keyword)}`,
    );
  });

  it("默认请求每日趋势总榜并渲染轮播与列表", async () => {
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

    const activeSlide = await findActiveHeroSlide();

    expect(within(activeSlide).getByText("每日热门内容")).toBeInTheDocument();
    expect(within(activeSlide).getByRole("heading", { level: 1, name: "沙丘 2" })).toBeInTheDocument();
    expect(within(activeSlide).queryByRole("button", { name: "查看其他轮播项" })).not.toBeInTheDocument();
    expect(screen.getAllByTestId("hot-media-card")).toHaveLength(6);
    expect(screen.getAllByText("沙丘 2").length).toBeGreaterThan(1);
  });

  it("切换到每周动漫趋势榜时会重新请求", async () => {
    getHotRankingsMock.mockResolvedValue(createResponse());

    renderHotPage();
    await screen.findByRole("heading", { level: 1, name: "沙丘 2" });

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
    await screen.findByRole("heading", { level: 1, name: "沙丘 2" });

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
    await screen.findByRole("heading", { level: 1, name: "沙丘 2" });

    expect(screen.queryByRole("button", { name: "每月" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "每年" })).not.toBeInTheDocument();
    expect(screen.queryByText("时间筛选")).not.toBeInTheDocument();
    expect(screen.getByLabelText("打开排序菜单")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "每日" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "每周" })).toBeInTheDocument();
  });

  it("控制台标签按钮保持单行稳定布局", async () => {
    getHotRankingsMock.mockResolvedValue(createResponse());

    renderHotPage();
    await screen.findByRole("heading", { level: 1, name: "沙丘 2" });

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

  it("控制台会展示当前模式周期和分类摘要", async () => {
    getHotRankingsMock.mockResolvedValue(createResponse());

    renderHotPage();
    await screen.findByRole("heading", { level: 1, name: "沙丘 2" });
    const toolbarSummary = screen.getByTestId("hot-toolbar-summary");

    expect(within(toolbarSummary).getByText("当前模式")).toBeInTheDocument();
    expect(within(toolbarSummary).getByText("当前分类")).toBeInTheDocument();
    expect(toolbarSummary).toHaveTextContent("趋势榜");
    expect(toolbarSummary).toHaveTextContent("全部内容");

    fireEvent.click(screen.getByRole("button", { name: "热门榜" }));
    fireEvent.click(screen.getByRole("button", { name: "每月" }));
    fireEvent.click(screen.getByRole("button", { name: "电影" }));

    await waitFor(() => {
      expect(toolbarSummary).toHaveTextContent(/每月 · \d{4}-\d{2}/);
      expect(toolbarSummary).toHaveTextContent("电影");
    });

    fireEvent.click(screen.getByLabelText("打开排序菜单"));
    fireEvent.click(await screen.findByRole("menuitemradio", { name: "按评分" }));

    await waitFor(() => {
      expect(toolbarSummary).toHaveTextContent("当前排序：按评分");
    });
  });

  it("热门榜下会把时间筛选收敛到附属区并给出说明文案", async () => {
    getHotRankingsMock.mockResolvedValue(createResponse());

    renderHotPage();
    await screen.findByRole("heading", { level: 1, name: "沙丘 2" });

    fireEvent.click(screen.getByRole("button", { name: "热门榜" }));

    await waitFor(() => {
      expect(screen.getByText("附加时间条件")).toBeInTheDocument();
    });

    const timeFilterPanel = screen.getByTestId("hot-toolbar-time-panel");
    expect(timeFilterPanel).toHaveTextContent("附加时间条件");
    expect(timeFilterPanel).toHaveTextContent("先确定模式、周期和分类，再按需要缩小时间范围。");
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
    await screen.findByRole("heading", { level: 1, name: "沙丘 2" });

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
    await screen.findByRole("heading", { level: 1, name: "沙丘 2" });

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
    getHotRankingsMock.mockResolvedValue(createResponse());

    renderHotPage();
    await screen.findByRole("heading", { level: 1, name: "沙丘 2" });

    fireEvent.click(screen.getByRole("button", { name: "热门榜" }));
    fireEvent.click(screen.getByRole("button", { name: "电影" }));
    fireEvent.click(await screen.findByLabelText("打开排序菜单"));
    fireEvent.click(await screen.findByRole("menuitemradio", { name: "按评分" }));
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

    fireEvent.click(screen.getByRole("button", { name: "重置筛选" }));

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

    expect(screen.getByRole("button", { name: "趋势榜" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "全部" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("切换到热门月榜后会带上月份参数请求", async () => {
    getHotRankingsMock.mockResolvedValue(createResponse());

    renderHotPage();
    await screen.findByRole("heading", { level: 1, name: "沙丘 2" });

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
    await screen.findByRole("heading", { level: 1, name: "沙丘 2" });

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
    await screen.findByRole("heading", { level: 1, name: "沙丘 2" });

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

  it("点击轮播搜索按钮会跳转到搜索页", async () => {
    getHotRankingsMock.mockResolvedValue(createResponse());

    renderHotPage();

    const activeSlide = await findActiveHeroSlide();
    fireEvent.click(within(activeSlide).getByRole("button", { name: "立即搜索榜首内容" }));

    expect(await screen.findByTestId("location-probe")).toHaveTextContent('"pathname":"/search"');
    expect(screen.getByTestId("location-probe")).toHaveTextContent(
      '"search":"?q=%E6%B2%99%E4%B8%98%202"',
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

    expect(screen.getByTestId("hot-page-skeleton")).toBeInTheDocument();
    expect(screen.getByTestId("hot-page-skeleton-hero")).toBeInTheDocument();
    expect(screen.getAllByTestId("hot-page-skeleton-card")).toHaveLength(4);
  });

  it("筛选切换刷新时保留当前内容并展示局部刷新层", async () => {
    let resolveNextRequest: ((value: HotRankingResponse) => void) | null = null;
    getHotRankingsMock
      .mockResolvedValueOnce(createResponse())
      .mockImplementationOnce(() => new Promise<HotRankingResponse>((resolve) => {
        resolveNextRequest = resolve;
      }));

    renderHotPage();
    await screen.findByRole("heading", { level: 1, name: "沙丘 2" });

    fireEvent.click(screen.getByRole("button", { name: "每周" }));

    expect(screen.queryByTestId("hot-page-skeleton")).not.toBeInTheDocument();
    expect(screen.getByTestId("hot-page-refresh-overlay")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "沙丘 2" })).toBeInTheDocument();

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

    await waitFor(() => {
      expect(screen.queryByTestId("hot-page-refresh-overlay")).not.toBeInTheDocument();
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
  });

  it("点击轮播缩略项后会切换激活内容", async () => {
    getHotRankingsMock.mockResolvedValue(
      createResponse({
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
        ],
      }),
    );

    renderHotPage();
    await screen.findByRole("heading", { level: 1, name: "沙丘 2" });

    const previewButton = screen.getByRole("button", { name: /切换到第 2 项：奥本海默/ });
    fireEvent.click(previewButton);

    await waitFor(async () => {
      const activeSlide = await findHeroSlideByLabel("2 / 2");
      expect(within(activeSlide).getByRole("heading", { level: 1, name: "奥本海默" })).toBeInTheDocument();
    });
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
