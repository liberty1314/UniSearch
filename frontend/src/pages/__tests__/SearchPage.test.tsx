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
  default: () => <div>search-box</div>,
}));

vi.mock("@/components/CloudTypeFilter", () => ({
  __esModule: true,
  default: () => <div>cloud-filter</div>,
}));

vi.mock("@/components/SearchAdvancedFilterPanel", () => ({
  __esModule: true,
  default: () => <div>advanced-filter</div>,
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
    status: "authenticated",
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

const renderSearchPage = (initialEntry: string) =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[{ pathname: initialEntry.split("?")[0], search: initialEntry.includes("?") ? `?${initialEntry.split("?")[1]}` : "", state: locationState }]}>
        <Routes>
          <Route path="/" element={<LocationProbe />} />
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
    renderSearchPage("/search?q=%E7%94%B5%E5%BD%B1&types=quark");

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

  it("clears stale results when opening the standalone page without a keyword", async () => {
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
    expect(screen.getByText("search-results")).toBeInTheDocument();
  });

  it("returns to the homepage from the standalone search page", async () => {
    renderSearchPage("/search?q=%E7%94%B5%E5%BD%B1");

    fireEvent.click(await screen.findByRole("button", { name: "返回首页" }));

    expect(clearResultsMock).toHaveBeenCalled();
    expect(screen.getByTestId("location-probe")).toHaveTextContent('"pathname":"/"');
    expect(screen.getByTestId("location-probe")).toHaveTextContent(
      '"skipHomeEntrance":true',
    );
    expect(screen.getByTestId("location-probe")).toHaveTextContent(
      '"routeTransition":"backward"',
    );
  });
});
