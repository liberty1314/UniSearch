import { beforeEach, describe, expect, it } from "vitest";
import type { SearchResponse } from "@/types/api";

const buildSearchResults = (): SearchResponse => ({
  total: 1,
  resources: [
    {
      id: "resource-1",
      title: "测试资源",
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
    const { useSearchStore } = await import("@/stores/searchStore");
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
});
