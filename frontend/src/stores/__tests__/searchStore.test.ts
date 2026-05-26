import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SearchResponse } from "@/types/api";

const searchMock = vi.fn();

vi.mock("@/services/searchService", () => ({
  SearchService: {
    search: (...args: unknown[]) => searchMock(...args),
    validateSearchParams: () => ({ valid: true }),
    getChannels: vi.fn(),
    getPlugins: vi.fn(),
  },
}));

const buildSearchResults = (title = "测试资源"): SearchResponse => ({
  total: 1,
  resources: [
    {
      id: "resource-1",
      title,
      source: {
        type: "plugin",
        name: "测试来源",
      },
      links: [],
      capabilities: {},
      actions: [],
      detail: {},
    },
  ],
  facets: {
    cloud_types: {},
    source_types: {},
    media_types: {},
    target_types: {},
    capabilities: {},
    action_types: {},
  },
});

describe("searchStore", () => {
  beforeEach(async () => {
    localStorage.clear();
    searchMock.mockReset();
    const { useSearchStore } = await import("@/stores/searchStore");
    const { resetSearchRequestGuard } = await import("@/stores/searchRequestGuard");
    resetSearchRequestGuard();
    useSearchStore.getState().reset();
  });

  it("在已有搜索结果时会正常清空状态", async () => {
    const { useSearchStore } = await import("@/stores/searchStore");

    useSearchStore.setState((state) => ({
      ...state,
      searchResults: buildSearchResults(),
      error: "旧错误",
      isRefreshing: true,
      searchParams: {
        ...state.searchParams,
        keyword: "电影",
      },
    }));

    let updateCount = 0;
    const unsubscribe = useSearchStore.subscribe(() => {
      updateCount += 1;
    });

    useSearchStore.getState().clearResults();

    unsubscribe();

    const nextState = useSearchStore.getState();
    expect(updateCount).toBe(1);
    expect(nextState.searchResults).toBeNull();
    expect(nextState.error).toBeNull();
    expect(nextState.isRefreshing).toBe(false);
    expect(nextState.searchParams.keyword).toBe("");
  });

  it("在空状态下重复清空不会产生额外更新", async () => {
    const { useSearchStore } = await import("@/stores/searchStore");

    let updateCount = 0;
    const unsubscribe = useSearchStore.subscribe(() => {
      updateCount += 1;
    });

    useSearchStore.getState().clearResults();

    unsubscribe();

    expect(updateCount).toBe(0);
    expect(useSearchStore.getState().searchResults).toBeNull();
    expect(useSearchStore.getState().searchParams.keyword).toBe("");
  });

  it("慢搜索请求晚返回时不会覆盖快请求结果", async () => {
    const { useSearchStore } = await import("@/stores/searchStore");

    let resolveSlowSearch: (value: SearchResponse) => void = () => {};
    const slowSearch = new Promise<SearchResponse>((resolve) => {
      resolveSlowSearch = resolve;
    });
    const fastSearch = Promise.resolve(buildSearchResults("快请求结果"));
    searchMock.mockReturnValueOnce(slowSearch).mockReturnValueOnce(fastSearch);

    const slowPromise = useSearchStore
      .getState()
      .performSearch({ keyword: "慢请求" });
    const fastPromise = useSearchStore
      .getState()
      .performSearch({ keyword: "快请求" });

    await fastPromise;
    resolveSlowSearch(buildSearchResults("慢请求结果"));
    await slowPromise;

    expect(useSearchStore.getState().searchResults?.resources[0]?.title).toBe(
      "快请求结果",
    );
  });
});
