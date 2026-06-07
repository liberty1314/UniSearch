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
      isLoading: true,
      isRefreshing: true,
      lastCompletedSearchParams: {
        ...state.searchParams,
        keyword: "电影",
      },
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
    expect(nextState.isLoading).toBe(false);
    expect(nextState.isRefreshing).toBe(false);
    expect(nextState.lastCompletedSearchParams).toBeNull();
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

  it("成功搜索后会写入最近资源快照", async () => {
    const { useSearchStore } = await import("@/stores/searchStore");

    searchMock.mockResolvedValueOnce(buildSearchResults("你的名字 4K"));

    await useSearchStore
      .getState()
      .performSearch({ keyword: "你的名字" });

    const snapshots = JSON.parse(
      localStorage.getItem("unisearch_recent_resource_snapshots") || "[]",
    ) as Array<{
      keyword?: string;
      resource?: {
        id?: string;
        title?: string;
      };
    }>;

    expect(snapshots[0]).toMatchObject({
      keyword: "你的名字",
      resource: {
        id: "resource-1",
        title: "你的名字 4K",
      },
    });
    expect(snapshots.length).toBeLessThanOrEqual(20);
  });

  it("清空结果会作废尚未完成的搜索请求", async () => {
    const { useSearchStore } = await import("@/stores/searchStore");

    let resolveSearch: (value: SearchResponse) => void = () => {};
    const pendingSearch = new Promise<SearchResponse>((resolve) => {
      resolveSearch = resolve;
    });
    searchMock.mockReturnValueOnce(pendingSearch);

    const searchPromise = useSearchStore
      .getState()
      .performSearch({ keyword: "速度与激情" });

    expect(useSearchStore.getState().isLoading).toBe(true);

    useSearchStore.getState().clearResults();

    expect(useSearchStore.getState().isLoading).toBe(false);
    expect(useSearchStore.getState().searchResults).toBeNull();

    resolveSearch(buildSearchResults("旧请求结果"));
    await searchPromise;

    const nextState = useSearchStore.getState();
    expect(nextState.searchResults).toBeNull();
    expect(nextState.lastCompletedSearchParams).toBeNull();
    expect(nextState.searchParams.keyword).toBe("");
  });
});
