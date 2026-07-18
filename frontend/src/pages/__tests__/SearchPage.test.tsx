import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SearchPage from "@/pages/SearchPage";
import type { SearchParams } from "@/types/search";

const {
  performSearchMock,
  setSearchParamsMock,
  clearResultsMock,
  canReuseCurrentSearchMock,
} = vi.hoisted(() => ({
  performSearchMock: vi.fn(),
  setSearchParamsMock: vi.fn(),
  clearResultsMock: vi.fn(),
  canReuseCurrentSearchMock: vi.fn(),
}));

type ProgressiveStatus = "idle" | "running" | "complete" | "fallback" | "error";

interface SearchStoreTestState {
  searchParams: SearchParams;
  searchResults: null | { resources: Array<{ id: string }> };
  isLoading: boolean;
  isRefreshing: boolean;
  progressiveStatus: ProgressiveStatus;
  completedSources: number;
  totalSources: number;
  receivedBatches: number;
  error: string | null;
}

const buildSearchParams = (): SearchParams => ({
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
});

const buildSearchStoreState = (): SearchStoreTestState => ({
  searchParams: buildSearchParams(),
  searchResults: null,
  isLoading: false,
  isRefreshing: false,
  progressiveStatus: "idle",
  completedSources: 0,
  totalSources: 0,
  receivedBatches: 0,
  error: null,
});

let searchAccessStatus: "anonymous" | "authenticated" = "authenticated";
let searchStoreState = buildSearchStoreState();

vi.mock("@/components/SearchBox", () => ({
  __esModule: true,
  default: ({
    accessHint,
    autoFocus,
  }: {
    accessHint?: string;
    autoFocus?: boolean;
  }) => (
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
    canReuseCurrentSearch: canReuseCurrentSearchMock,
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
    initialEntries?: Array<{
      pathname: string;
      search?: string;
      state?: unknown;
    }>;
    initialIndex?: number;
  },
) => render(
  <HelmetProvider>
    <MemoryRouter
      initialEntries={options?.initialEntries ?? [
        {
          pathname: initialEntry.split("?")[0],
          search: initialEntry.includes("?")
            ? `?${initialEntry.split("?")[1]}`
            : "",
        },
      ]}
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
  </HelmetProvider>,
);

describe("SearchPage", () => {
  beforeEach(() => {
    localStorage.clear();
    performSearchMock.mockReset();
    setSearchParamsMock.mockReset();
    clearResultsMock.mockReset();
    canReuseCurrentSearchMock.mockReset();
    canReuseCurrentSearchMock.mockReturnValue(false);
    searchAccessStatus = "authenticated";
    searchStoreState = buildSearchStoreState();
  });

  it("将 URL 参数同步到搜索状态并触发独立页搜索", async () => {
    searchStoreState.searchParams.keyword = "电影";

    renderSearchPage("/search?q=%E7%94%B5%E5%BD%B1&types=quark");

    expect(screen.getByText("unified-filter-card")).toBeInTheDocument();

    await waitFor(() => {
      expect(setSearchParamsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          keyword: "电影",
          cloudTypes: ["quark"],
        }),
      );
    });
    expect(performSearchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        keyword: "电影",
        source: "all",
        resultType: "merge",
        cloudTypes: ["quark"],
      }),
      { preserveResults: false },
    );
  });

  it("URL 未指定来源时使用账户默认来源", async () => {
    localStorage.setItem(
      "unisearch_account_preferences",
      JSON.stringify({
        theme: "system",
        resultView: "merge",
        defaultCloudTypes: ["aliyun", "quark"],
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
        cloudTypes: ["aliyun", "quark"],
      }),
      { preserveResults: false },
    );
  });

  it("匿名访问空搜索页时展示准入提示且不展示结果", async () => {
    searchAccessStatus = "anonymous";
    searchStoreState.searchResults = {
      resources: [{ id: "resource-1" }],
    };

    renderSearchPage("/search");

    await waitFor(() => {
      expect(clearResultsMock).toHaveBeenCalled();
    });
    expect(performSearchMock).not.toHaveBeenCalled();
    expect(screen.getByText("search-box")).toBeInTheDocument();
    expect(screen.getByText(
      "搜索结果需要登录后查看，您可以先输入关键词，系统会保留本次搜索意图。",
    )).toBeInTheDocument();
    expect(screen.queryByText("search-results")).not.toBeInTheDocument();
  });

  it("登录后不展示搜索准入提示", async () => {
    renderSearchPage("/search");

    await waitFor(() => {
      expect(clearResultsMock).toHaveBeenCalled();
    });
    expect(screen.queryByText(
      "搜索结果需要登录后查看，您可以先输入关键词，系统会保留本次搜索意图。",
    )).not.toBeInTheDocument();
    expect(screen.getByText("search-box")).toBeInTheDocument();
  });

  it("无关键词时只展示碎片搜索画布", async () => {
    renderSearchPage("/search");

    await waitFor(() => {
      expect(clearResultsMock).toHaveBeenCalled();
    });

    expect(screen.getByTestId("search-stage")).toBeInTheDocument();
    expect(screen.getByText("输入资源名称，其他交给聚合")).toBeInTheDocument();
    expect(screen.getByText("auto-focus-on")).toBeInTheDocument();
    expect(screen.queryByText("搜索启动台")).not.toBeInTheDocument();
    expect(screen.queryByText("最近有效搜索")).not.toBeInTheDocument();
    expect(screen.queryByText("热榜直搜")).not.toBeInTheDocument();
    expect(screen.queryByText("search-results")).not.toBeInTheDocument();
  });

  it("渐进式搜索时查询条展示真实来源进度", () => {
    searchStoreState = {
      ...searchStoreState,
      searchParams: {
        ...searchStoreState.searchParams,
        keyword: "电影",
      },
      isLoading: true,
      isRefreshing: false,
      progressiveStatus: "running",
      completedSources: 2,
      totalSources: 5,
      receivedBatches: 1,
      error: null,
    };

    renderSearchPage("/search?q=%E7%94%B5%E5%BD%B1");

    expect(screen.getByTestId("search-query-dock")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("已完成 2/5 个来源");
    expect(screen.getByText("unified-filter-card")).toBeInTheDocument();
    expect(screen.getByText("search-results")).toBeInTheDocument();
  });

  it("从热门榜单进入时展示来源提示", () => {
    searchStoreState.searchParams.keyword = "沙丘 2";

    renderSearchPage("/search?q=%E6%B2%99%E4%B8%98%202", {
      initialEntries: [
        {
          pathname: "/search",
          search: "?q=%E6%B2%99%E4%B8%98%202",
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

  it("无历史记录时返回首页并保留返回过渡状态", async () => {
    searchStoreState.searchParams.keyword = "电影";
    renderSearchPage("/search?q=%E7%94%B5%E5%BD%B1");

    fireEvent.click(await screen.findByRole("button", { name: "返回" }));

    expect(clearResultsMock).toHaveBeenCalled();
    expect(setSearchParamsMock).toHaveBeenCalledWith({ keyword: "" });
    expect(screen.getByTestId("location-probe")).toHaveTextContent(
      '"pathname":"/"',
    );
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

  it("从热门页进入搜索时返回上一页", async () => {
    searchStoreState.searchParams.keyword = "电影";
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
    expect(screen.getByTestId("location-probe")).toHaveTextContent(
      '"pathname":"/trending"',
    );
  });
});
