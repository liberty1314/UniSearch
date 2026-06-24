import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SearchResponse } from "@/types/search";
import type { RecentEffectiveSearch } from "@/components/search/searchLaunchpadTypes";

const searchMock = vi.fn();
const searchProgressiveMock = vi.fn();
const getSettingsCachedMock = vi.fn();

vi.mock("@/services/searchService", () => ({
  SearchService: {
    searchProgressive: (...args: unknown[]) => searchProgressiveMock(...args),
    search: (...args: unknown[]) => searchMock(...args),
    validateSearchParams: () => ({ valid: true }),
    getChannels: vi.fn(),
    getPlugins: vi.fn(),
  },
}));

vi.mock("@/services/systemSettingsService", () => ({
  SystemSettingsService: {
    getSettingsCached: (...args: unknown[]) => getSettingsCachedMock(...args),
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

const buildManySearchResults = (count: number): SearchResponse => ({
  ...buildSearchResults("批量资源"),
  total: count,
  resources: Array.from({ length: count }, (_, index) => ({
    ...buildSearchResults(`资源 ${index + 1}`).resources[0],
    id: `resource-${index + 1}`,
    title: `资源 ${index + 1}`,
  })),
});

describe("searchStore", () => {
  beforeEach(async () => {
    localStorage.clear();
    searchMock.mockReset();
    searchProgressiveMock.mockReset();
    getSettingsCachedMock.mockReset();
    searchProgressiveMock.mockImplementation((...args: unknown[]) => searchMock(...args));
    getSettingsCachedMock.mockResolvedValue({ progressive_search_enabled: true });
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

  it("成功搜索且有结果时会写入最近有效搜索", async () => {
    const { useSearchStore } = await import("@/stores/searchStore");

    searchMock.mockResolvedValueOnce(buildSearchResults("沙丘 2 4K"));

    await useSearchStore.getState().performSearch({
      keyword: "沙丘 2 4K",
      cloudTypes: ["quark", "aliyun"],
      filter: {
        include: ["4K"],
        exclude: ["枪版"],
      },
    });

    expect(useSearchStore.getState().recentEffectiveSearches[0]).toMatchObject({
      keyword: "沙丘 2 4K",
      total: 1,
      cloudTypes: ["aliyun", "quark"],
      params: {
        keyword: "沙丘 2 4K",
        cloudTypes: ["aliyun", "quark"],
        filter: {
          include: ["4K"],
          exclude: ["枪版"],
        },
      },
    });

    expect(
      JSON.parse(localStorage.getItem("unisearch_recent_effective_searches") || "[]")[0],
    ).toMatchObject({
      keyword: "沙丘 2 4K",
      total: 1,
    });
  });

  it("渐进式首批结果返回后会立即展示并更新来源进度", async () => {
    const { useSearchStore } = await import("@/stores/searchStore");

    searchProgressiveMock.mockImplementationOnce(async (_params, handlers) => {
      handlers.onEvent({
        type: "started",
        completed_sources: 0,
        total_sources: 2,
        received_batches: 0,
      });
      handlers.onEvent({
        type: "batch",
        resources: buildSearchResults("首批结果").resources,
        warnings: [],
        completed_sources: 1,
        total_sources: 2,
        received_batches: 1,
      });
      expect(useSearchStore.getState().searchResults?.resources[0]?.title).toBe("首批结果");
      return buildSearchResults("最终结果");
    });

    await useSearchStore.getState().performSearch({ keyword: "首批" });

    const state = useSearchStore.getState();
    expect(state.progressiveStatus).toBe("complete");
    expect(state.completedSources).toBe(1);
    expect(state.totalSources).toBe(2);
    expect(state.receivedBatches).toBe(1);
    expect(state.searchResults?.resources[0]?.title).toBe("最终结果");
  });

  it("渐进式搜索失败时会回退普通搜索", async () => {
    const { useSearchStore } = await import("@/stores/searchStore");

    searchProgressiveMock.mockRejectedValueOnce(new Error("流式失败"));
    searchMock.mockResolvedValueOnce(buildSearchResults("回退结果"));

    await useSearchStore.getState().performSearch({ keyword: "回退" });

    expect(searchMock).toHaveBeenCalled();
    expect(useSearchStore.getState().progressiveStatus).toBe("fallback");
    expect(useSearchStore.getState().searchResults?.resources[0]?.title).toBe("回退结果");
  });

  it("后台关闭渐进式搜索时直接使用普通搜索", async () => {
    const { useSearchStore } = await import("@/stores/searchStore");

    getSettingsCachedMock.mockResolvedValueOnce({ progressive_search_enabled: false });
    searchMock.mockResolvedValueOnce(buildSearchResults("普通结果"));

    await useSearchStore.getState().performSearch({ keyword: "普通" });

    expect(searchProgressiveMock).not.toHaveBeenCalled();
    expect(searchMock).toHaveBeenCalled();
    expect(useSearchStore.getState().progressiveStatus).toBe("complete");
    expect(useSearchStore.getState().searchResults?.resources[0]?.title).toBe("普通结果");
  });

  it("首屏展示 48 条，继续加载每次追加 24 条", async () => {
    const { useSearchStore } = await import("@/stores/searchStore");

    searchMock.mockResolvedValueOnce(buildManySearchResults(100));

    await useSearchStore.getState().performSearch({ keyword: "批量" });

    expect(useSearchStore.getState().displayedCount).toBe(48);
    expect(useSearchStore.getState().hasMore).toBe(true);

    useSearchStore.getState().loadMore();
    expect(useSearchStore.getState().displayedCount).toBe(72);
    expect(useSearchStore.getState().hasMore).toBe(true);

    useSearchStore.getState().loadMore();
    expect(useSearchStore.getState().displayedCount).toBe(96);
  });

  it("支持删除单条最近有效搜索并同步本地存储", async () => {
    const { useSearchStore } = await import("@/stores/searchStore");

    const searches: RecentEffectiveSearch[] = [
      {
        id: "recent-1",
        keyword: "三体 4K",
        total: 12,
        cloudTypes: ["quark"],
        searchedAt: "2026-06-14T15:00:00.000Z",
        params: {
          ...useSearchStore.getState().searchParams,
          keyword: "三体 4K",
          cloudTypes: ["quark"],
        },
      },
      {
        id: "recent-2",
        keyword: "大濛",
        total: 3,
        cloudTypes: [],
        searchedAt: "2026-06-14T16:00:00.000Z",
        params: {
          ...useSearchStore.getState().searchParams,
          keyword: "大濛",
        },
      },
    ];

    useSearchStore.setState({ recentEffectiveSearches: searches });
    localStorage.setItem(
      "unisearch_recent_effective_searches",
      JSON.stringify(searches),
    );

    useSearchStore.getState().removeRecentEffectiveSearch("recent-1");

    expect(useSearchStore.getState().recentEffectiveSearches).toHaveLength(1);
    expect(useSearchStore.getState().recentEffectiveSearches[0].id).toBe("recent-2");
    expect(
      JSON.parse(localStorage.getItem("unisearch_recent_effective_searches") || "[]"),
    ).toEqual([expect.objectContaining({ id: "recent-2" })]);

    useSearchStore.getState().removeRecentEffectiveSearch("recent-2");

    expect(useSearchStore.getState().recentEffectiveSearches).toHaveLength(0);
    expect(localStorage.getItem("unisearch_recent_effective_searches")).toBeNull();
  });

  it("支持清空最近有效搜索并移除本地存储", async () => {
    const { useSearchStore } = await import("@/stores/searchStore");

    const searches: RecentEffectiveSearch[] = [
      {
        id: "recent-clear-1",
        keyword: "三体 4K",
        total: 12,
        cloudTypes: ["quark"],
        searchedAt: "2026-06-14T15:00:00.000Z",
        params: {
          ...useSearchStore.getState().searchParams,
          keyword: "三体 4K",
          cloudTypes: ["quark"],
        },
      },
    ];

    useSearchStore.setState({ recentEffectiveSearches: searches });
    localStorage.setItem(
      "unisearch_recent_effective_searches",
      JSON.stringify(searches),
    );

    useSearchStore.getState().clearRecentEffectiveSearches();

    expect(useSearchStore.getState().recentEffectiveSearches).toEqual([]);
    expect(localStorage.getItem("unisearch_recent_effective_searches")).toBeNull();
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
