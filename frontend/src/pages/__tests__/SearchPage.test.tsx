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
} = vi.hoisted(() => ({
  performSearchMock: vi.fn(),
  setSearchParamsMock: vi.fn(),
  clearResultsMock: vi.fn(),
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
};

vi.mock("@/components/SearchBox", () => ({
  __esModule: true,
  default: ({ accessHint }: { accessHint?: string }) => (
    <div>
      search-box
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
          <Route path="/hot" element={<LocationProbe />} />
          <Route path="/search" element={<SearchPage />} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>
  );

describe("SearchPage", () => {
  beforeEach(() => {
    performSearchMock.mockReset();
    setSearchParamsMock.mockReset();
    clearResultsMock.mockReset();
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
    };
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
    expect(screen.getByText("search-results")).toBeInTheDocument();
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

  it("无关键词时展示搜索工作台建议而不是单一空状态", () => {
    renderSearchPage("/search");

    expect(screen.getByTestId("search-empty-workbench")).toBeInTheDocument();
    expect(screen.getByText("可以这样开始")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /查看热门榜单/ })).toHaveAttribute("href", "/hot");
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

  it("returns to the previous page when entering search from the hot ranking page", async () => {
    renderSearchPage("/search?q=%E7%94%B5%E5%BD%B1", {
      initialEntries: [
        { pathname: "/hot" },
        { pathname: "/search", search: "?q=%E7%94%B5%E5%BD%B1" },
      ],
      initialIndex: 1,
    });

    fireEvent.click(await screen.findByRole("button", { name: "返回" }));

    expect(clearResultsMock).toHaveBeenCalled();
    expect(setSearchParamsMock).toHaveBeenCalledWith({ keyword: "" });
    expect(screen.getByTestId("location-probe")).toHaveTextContent('"pathname":"/hot"');
  });
});
