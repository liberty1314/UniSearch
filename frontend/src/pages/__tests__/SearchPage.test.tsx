import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import SearchPage from "@/pages/SearchPage";

const {
  performSearchMock,
  setSearchParamsMock,
  clearResultsMock,
  removeRecentEffectiveSearchMock,
  clearRecentEffectiveSearchesMock,
  getHotRankingsMock,
} = vi.hoisted(() => ({
  performSearchMock: vi.fn(),
  setSearchParamsMock: vi.fn(),
  clearResultsMock: vi.fn(),
  removeRecentEffectiveSearchMock: vi.fn(),
  clearRecentEffectiveSearchesMock: vi.fn(),
  getHotRankingsMock: vi.fn(),
}));

let locationState: unknown = undefined;
let searchAccessStatus: "anonymous" | "authenticated" = "authenticated";
let searchStoreState = {
  searchParams: {
    keyword: "",
    source: "all" as const,
    resultType: "merge" as const,
    cloudTypes: [] as string[],
    channels: [] as string[],
    plugins: [] as string[],
    concurrency: 5,
    refresh: false,
    ext: {},
    filter: undefined,
  },
  searchResults: null as null | { resources: Array<{ id: string }> },
  searchHistory: [] as string[],
  recentEffectiveSearches: [] as Array<{
    id: string;
    keyword: string;
    total: number;
    cloudTypes: string[];
    searchedAt: string;
    params: {
      keyword: string;
      source: "all";
      resultType: "merge";
      cloudTypes: string[];
      channels: string[];
      plugins: string[];
      concurrency: number;
      refresh: boolean;
      ext: Record<string, never>;
      filter?: {
        include?: string[];
        exclude?: string[];
        mediaTypes?: string[];
      };
    };
  }>,
};

vi.mock("@/services/hotRankingService", () => ({
  hotRankingService: {
    getHotRankings: getHotRankingsMock,
  },
}));

vi.mock("@/components/SearchBox", () => ({
  __esModule: true,
  default: ({ accessHint, autoFocus }: { accessHint?: string; autoFocus?: boolean }) => (
    <div>
      search-box
      {autoFocus ? <span>auto-focus-on</span> : null}
      {accessHint ? <p>{accessHint}</p> : null}
    </div>
  ),
}));

vi.mock("@/components/SearchUnifiedFilterCard", () => ({
  __esModule: true,
  default: () => <div>unified-filter-card</div>,
}));

vi.mock("@/components/SearchResults", () => ({
  __esModule: true,
  default: () => <div>search-results</div>,
}));

vi.mock("@/stores/searchStore", () => ({
  useSearchStore: () => ({
    ...searchStoreState,
    performSearch: performSearchMock,
    setSearchParams: setSearchParamsMock,
    clearResults: clearResultsMock,
    removeRecentEffectiveSearch: removeRecentEffectiveSearchMock,
    clearRecentEffectiveSearches: clearRecentEffectiveSearchesMock,
  }),
}));

vi.mock("@/stores/searchAccessStore", () => ({
  useSearchAccessStatus: () => ({
    status: searchAccessStatus,
    initialized: true,
  }),
}));

vi.mock("@/stores/authStore", () => ({
  useAuthStore: () => ({
    isAuthenticated: true,
  }),
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

const renderSearchPage = (
  initialEntry: string,
  options?: {
    initialEntries?: Array<{ pathname: string; search?: string; state?: unknown }>;
    initialIndex?: number;
  },
) =>
  render(
    <HelmetProvider>
      <MemoryRouter
        initialEntries={
          options?.initialEntries ?? [
            {
              pathname: initialEntry.split("?")[0],
              search: initialEntry.includes("?") ? `?${initialEntry.split("?")[1]}` : "",
              state: locationState,
            },
          ]
        }
        initialIndex={options?.initialIndex}
      >
        <Routes>
          <Route path="/" element={<LocationProbe />} />
          <Route path="/trending" element={<LocationProbe />} />
          <Route path="/login" element={<LocationProbe />} />
          <Route
            path="/search"
            element={(
              <>
                <SearchPage />
                <LocationProbe />
              </>
            )}
          />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>
  );

describe("SearchPage", () => {
  beforeEach(() => {
    localStorage.clear();
    performSearchMock.mockReset();
    setSearchParamsMock.mockReset();
    clearResultsMock.mockReset();
    removeRecentEffectiveSearchMock.mockReset();
    clearRecentEffectiveSearchesMock.mockReset();
    locationState = undefined;
    searchAccessStatus = "authenticated";
    searchStoreState = {
      searchParams: {
        keyword: "",
        source: "all",
        resultType: "merge",
        cloudTypes: [],
        channels: [],
        plugins: [],
        concurrency: 5,
        refresh: false,
        ext: {},
        filter: undefined,
      },
      searchResults: null,
      searchHistory: [],
      recentEffectiveSearches: [],
    };
    getHotRankingsMock.mockReset();
    getHotRankingsMock.mockResolvedValue({
      sections: [],
    });
  });

  it("syncs URL params into the search store and triggers a search on the standalone page", async () => {
    searchStoreState.searchParams.keyword = "电影";

    renderSearchPage("/search?q=%E7%94%B5%E5%BD%B1&types=quark");

    expect(screen.getByText("unified-filter-card")).toBeInTheDocument();

    await waitFor(() => {
      expect(setSearchParamsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          keyword: "电影",
          cloudTypes: ["quark"],
        })
      );
    });

    expect(performSearchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        keyword: "电影",
        source: "all",
        resultType: "merge",
        cloudTypes: ["quark"],
      }),
      { preserveResults: false }
    );
  });

  it("uses account default cloud filters when the search URL has no explicit type filter", async () => {
    localStorage.setItem(
      "unisearch_account_preferences",
      JSON.stringify({
        theme: "system",
        resultView: "merge",
        defaultCloudTypes: ["aliyun", "quark"],
        announcementReminder: true,
      }),
    );
    searchStoreState.searchParams.keyword = "电影";

    renderSearchPage("/search?q=%E7%94%B5%E5%BD%B1");

    await waitFor(() => {
      expect(setSearchParamsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          keyword: "电影",
          cloudTypes: ["aliyun", "quark"],
        }),
      );
    });

    expect(performSearchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        keyword: "电影",
        source: "all",
        resultType: "merge",
        cloudTypes: ["aliyun", "quark"],
      }),
      { preserveResults: false },
    );
  });

  it("匿名访问搜索页时展示搜索准入提示", async () => {
    searchAccessStatus = "anonymous";
    searchStoreState = {
      ...searchStoreState,
      searchResults: {
        resources: [{ id: "resource-1" }],
      },
    };

    renderSearchPage("/search");

    await waitFor(() => {
      expect(clearResultsMock).toHaveBeenCalled();
    });
    expect(performSearchMock).not.toHaveBeenCalled();
    expect(screen.getByText("search-box")).toBeInTheDocument();
    expect(
      screen.getByText(
        "搜索结果需要登录后查看，您可以先输入关键词，系统会保留本次搜索意图。",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("search-results")).not.toBeInTheDocument();
  });

  it("登录后不展示搜索页准入提示", async () => {
    renderSearchPage("/search");

    await waitFor(() => {
      expect(clearResultsMock).toHaveBeenCalled();
    });
    expect(screen.queryByText(
      "搜索结果需要登录后查看，您可以先输入关键词，系统会保留本次搜索意图。",
    )).not.toBeInTheDocument();
    expect(screen.getByText("search-box")).toBeInTheDocument();
  });

  it("无关键词时展示最近有效搜索、热榜直搜和精准模板", async () => {
    searchStoreState.recentEffectiveSearches = [
      {
        id: "recent-1",
        keyword: "三体 4K",
        total: 12,
        cloudTypes: ["quark", "aliyun"],
        searchedAt: "2026-06-14T15:00:00.000Z",
        params: {
          keyword: "三体 4K",
          source: "all",
          resultType: "merge",
          cloudTypes: ["quark", "aliyun"],
          channels: [],
          plugins: [],
          concurrency: 5,
          refresh: false,
          ext: {},
          filter: {
            include: ["4K"],
            exclude: ["枪版"],
          },
        },
      },
    ];
    getHotRankingsMock.mockResolvedValue({
      sections: [
        {
          category: "movie",
          title: "电影热榜",
          description: "desc",
          items: [
            {
              id: 1,
              tmdb_id: 1,
              media_type: "movie",
              ranking_category: "movie",
              title: "沙丘 2",
              original_title: "Dune: Part Two",
              overview: "desc",
              poster_url: "",
              backdrop_url: "",
              vote_average: 8.8,
              vote_count: 1000,
              popularity: 999,
              release_date: "2026-01-01",
              genre_names: ["科幻"],
              tmdb_url: "https://example.com",
            },
          ],
        },
      ],
    });

    renderSearchPage("/search");

    expect(screen.getByTestId("search-empty-workbench")).toBeInTheDocument();
    expect(screen.getByText("搜索启动台")).toBeInTheDocument();
    expect(screen.getByText("最近有效搜索")).toBeInTheDocument();
    expect(screen.getByText("精准模板")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "恢复搜索 三体 4K" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "删除最近有效搜索 三体 4K" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "清空最近有效搜索" })).toBeInTheDocument();
    expect(screen.getByText("12 条结果 · 夸克 / 阿里")).toBeInTheDocument();
    const hotRankingLink = screen.getByRole("link", { name: /查看热门榜单/ });
    expect(hotRankingLink).toHaveAttribute("href", "/trending");
    expect(hotRankingLink.className).not.toContain("bg-gradient-to-r");
    expect(screen.getByText("auto-focus-on")).toBeInTheDocument();
    expect(screen.queryByText("还没有想法？")).not.toBeInTheDocument();
    expect(screen.queryByText("search-results")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("热榜直搜")).toBeInTheDocument();
    });
    expect(screen.getByText("沙丘 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "搜 4K 沙丘 2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "按模板搜索 电影 4K" })).toBeInTheDocument();
  });

  it("从热门榜单进入时展示来源提示", () => {
    searchStoreState.searchParams.keyword = "沙丘 2";

    renderSearchPage("/search?q=%E6%B2%99%E4%B8%98%202&include=4K&exclude=%E9%A2%84%E5%91%8A%2C%E6%9E%AA%E7%89%88", {
      initialEntries: [
        {
          pathname: "/search",
          search: "?q=%E6%B2%99%E4%B8%98%202&include=4K&exclude=%E9%A2%84%E5%91%8A%2C%E6%9E%AA%E7%89%88",
          state: {
            fromTrending: {
              title: "沙丘 2",
              originalTitle: "Dune: Part Two",
              keyword: "沙丘 2",
            },
          },
        },
      ],
    });

    expect(screen.getByText("来自热门榜单：沙丘 2")).toBeInTheDocument();
  });

  it("点击精准模板会携带完整筛选条件发起搜索并同步地址", async () => {
    renderSearchPage("/search");

    await waitFor(() => {
      expect(screen.getByText("精准模板")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "按模板搜索 电影 4K" }));

    await waitFor(() => {
      expect(setSearchParamsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          keyword: "电影 4K",
          cloudTypes: ["quark", "aliyun"],
          channels: [],
          plugins: [],
          filter: {
            include: ["4K"],
            exclude: ["预告", "枪版"],
          },
        }),
      );
    });
    await waitFor(() => {
      expect(performSearchMock).toHaveBeenCalledWith(
        expect.objectContaining({
          keyword: "电影 4K",
          cloudTypes: ["quark", "aliyun"],
          channels: [],
          plugins: [],
          filter: {
            include: ["4K"],
            exclude: ["预告", "枪版"],
          },
        }),
        { preserveResults: false },
      );
    });
    expect(screen.getByTestId("location-probe")).toHaveTextContent('"pathname":"/search"');
    expect(screen.getByTestId("location-probe")).toHaveTextContent('"search":"?q=%E7%94%B5%E5%BD%B1+4K');
    expect(screen.getByTestId("location-probe")).toHaveTextContent('include=4K');
    expect(screen.getByTestId("location-probe")).toHaveTextContent('"forceSkeleton":true');
    expect(screen.getByTestId("location-probe")).not.toHaveTextContent("skipSearchSync");
    expect(screen.getByTestId("location-probe")).not.toHaveTextContent("mediaTypes=");
  });

  it("匿名点击精准模板会进入登录并保留完整搜索意图", async () => {
    searchAccessStatus = "anonymous";

    renderSearchPage("/search");

    await waitFor(() => {
      expect(screen.getByText("精准模板")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "按模板搜索 电影 4K" }));

    expect(performSearchMock).not.toHaveBeenCalled();
    expect(screen.getByTestId("location-probe")).toHaveTextContent('"pathname":"/login"');
    expect(screen.getByTestId("location-probe")).toHaveTextContent('"pendingSearch":{"keyword":"电影 4K"');
    expect(screen.getByTestId("location-probe")).toHaveTextContent('"cloudTypes":["quark","aliyun"]');
    expect(screen.getByTestId("location-probe")).toHaveTextContent('"include":["4K"]');
    expect(screen.getByTestId("location-probe")).not.toHaveTextContent('"mediaTypes"');
  });

  it("点击热榜 4K 搜索不会注入隐藏媒体类型筛选", async () => {
    getHotRankingsMock.mockResolvedValue({
      sections: [
        {
          category: "movie",
          title: "电影热榜",
          description: "desc",
          items: [
            {
              id: 1,
              tmdb_id: 1,
              media_type: "movie",
              ranking_category: "movie",
              title: "沙丘 2",
              original_title: "Dune: Part Two",
              overview: "desc",
              poster_url: "",
              backdrop_url: "",
              vote_average: 8.8,
              vote_count: 1000,
              popularity: 999,
              release_date: "2026-01-01",
              genre_names: ["科幻"],
              tmdb_url: "https://example.com",
            },
          ],
        },
      ],
    });

    renderSearchPage("/search");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "搜 4K 沙丘 2" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "搜 4K 沙丘 2" }));

    await waitFor(() => {
      expect(setSearchParamsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          keyword: "沙丘 2",
          filter: {
            include: ["4K"],
            exclude: ["预告", "枪版"],
          },
        }),
      );
    });
    await waitFor(() => {
      expect(performSearchMock).toHaveBeenCalledWith(
        expect.objectContaining({
          keyword: "沙丘 2",
          filter: {
            include: ["4K"],
            exclude: ["预告", "枪版"],
          },
        }),
        { preserveResults: false },
      );
    });
    expect(screen.getByTestId("location-probe")).toHaveTextContent('"search":"?q=%E6%B2%99%E4%B8%98+2&include=4K');
    expect(screen.getByTestId("location-probe")).toHaveTextContent('"forceSkeleton":true');
    expect(screen.getByTestId("location-probe")).not.toHaveTextContent("skipSearchSync");
    expect(screen.getByTestId("location-probe")).not.toHaveTextContent("mediaTypes=");
  });

  it("点击最近有效搜索会恢复完整搜索参数", async () => {
    searchStoreState.recentEffectiveSearches = [
      {
        id: "recent-restore-1",
        keyword: "三体 4K",
        total: 12,
        cloudTypes: ["quark", "aliyun"],
        searchedAt: "2026-06-14T15:00:00.000Z",
        params: {
          keyword: "三体 4K",
          source: "all",
          resultType: "merge",
          cloudTypes: ["quark", "aliyun"],
          channels: [],
          plugins: [],
          concurrency: 5,
          refresh: false,
          ext: {},
          filter: {
            include: ["4K"],
            exclude: ["枪版"],
          },
        },
      },
    ];

    renderSearchPage("/search");

    fireEvent.click(await screen.findByRole("button", { name: "恢复搜索 三体 4K" }));

    expect(setSearchParamsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        keyword: "三体 4K",
        cloudTypes: ["quark", "aliyun"],
        filter: {
          include: ["4K"],
          exclude: ["枪版"],
        },
      }),
    );
    expect(performSearchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        keyword: "三体 4K",
        cloudTypes: ["quark", "aliyun"],
        filter: {
          include: ["4K"],
          exclude: ["枪版"],
        },
      }),
      { preserveResults: false },
    );
  });

  it("点击最近有效搜索的删除按钮只清除当前记录", async () => {
    searchStoreState.recentEffectiveSearches = [
      {
        id: "recent-remove-1",
        keyword: "三体 4K",
        total: 12,
        cloudTypes: ["quark", "aliyun"],
        searchedAt: "2026-06-14T15:00:00.000Z",
        params: {
          keyword: "三体 4K",
          source: "all",
          resultType: "merge",
          cloudTypes: ["quark", "aliyun"],
          channels: [],
          plugins: [],
          concurrency: 5,
          refresh: false,
          ext: {},
          filter: {
            include: ["4K"],
            exclude: ["枪版"],
          },
        },
      },
    ];

    renderSearchPage("/search");

    fireEvent.click(await screen.findByRole("button", { name: "删除最近有效搜索 三体 4K" }));

    expect(removeRecentEffectiveSearchMock).toHaveBeenCalledWith("recent-remove-1");
    expect(setSearchParamsMock).not.toHaveBeenCalled();
    expect(performSearchMock).not.toHaveBeenCalled();
  });

  it("点击最近有效搜索的清空按钮只清空记录", async () => {
    searchStoreState.recentEffectiveSearches = [
      {
        id: "recent-clear-1",
        keyword: "三体 4K",
        total: 12,
        cloudTypes: ["quark", "aliyun"],
        searchedAt: "2026-06-14T15:00:00.000Z",
        params: {
          keyword: "三体 4K",
          source: "all",
          resultType: "merge",
          cloudTypes: ["quark", "aliyun"],
          channels: [],
          plugins: [],
          concurrency: 5,
          refresh: false,
          ext: {},
          filter: {
            include: ["4K"],
            exclude: ["枪版"],
          },
        },
      },
    ];

    renderSearchPage("/search");

    fireEvent.click(await screen.findByRole("button", { name: "清空最近有效搜索" }));

    expect(clearRecentEffectiveSearchesMock).toHaveBeenCalledTimes(1);
    expect(setSearchParamsMock).not.toHaveBeenCalled();
    expect(performSearchMock).not.toHaveBeenCalled();
  });

  it("returns to the homepage when the standalone search page has no previous history", async () => {
    renderSearchPage("/search?q=%E7%94%B5%E5%BD%B1");

    fireEvent.click(await screen.findByRole("button", { name: "返回" }));

    expect(clearResultsMock).toHaveBeenCalled();
    expect(setSearchParamsMock).toHaveBeenCalledWith({ keyword: "" });
    expect(screen.getByTestId("location-probe")).toHaveTextContent('"pathname":"/"');
    expect(screen.getByTestId("location-probe")).toHaveTextContent(
      '"skipHomeEntrance":true',
    );
    expect(screen.getByTestId("location-probe")).toHaveTextContent(
      '"routeTransition":"backward"',
    );
    expect(screen.getByTestId("location-probe")).toHaveTextContent(
      '"resetHomeSearchBox":true',
    );
  });

  it("returns to the previous page when entering search from the trending page", async () => {
    renderSearchPage("/search?q=%E7%94%B5%E5%BD%B1", {
      initialEntries: [
        { pathname: "/trending" },
        { pathname: "/search", search: "?q=%E7%94%B5%E5%BD%B1" },
      ],
      initialIndex: 1,
    });

    fireEvent.click(await screen.findByRole("button", { name: "返回" }));

    expect(clearResultsMock).toHaveBeenCalled();
    expect(setSearchParamsMock).toHaveBeenCalledWith({ keyword: "" });
    expect(screen.getByTestId("location-probe")).toHaveTextContent('"pathname":"/trending"');
  });
});
