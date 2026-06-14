import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { SearchParams, SearchResponse } from "@/types/api";
import { SearchService } from "@/services/searchService";
import { getErrorCode, getErrorMessage } from "@/lib/error";
import {
  readJsonStorage,
  removeStorage,
  writeJsonStorage,
} from "@/lib/safeStorage";
import { writeRecentResourceSnapshots } from "@/lib/resourceSnapshot";
import {
  createSearchRequestId,
  invalidateSearchRequests,
  isLatestSearchRequest,
} from "@/stores/searchRequestGuard";
import { normalizeFilterConfig, normalizeFilterValues } from "@/utils/searchFilters";
import type { RecentEffectiveSearch } from "@/components/search/searchLaunchpadTypes";

/**
 * 搜索历史最大保存条数（同时作为 UI 展示上限）
 */
export const MAX_SEARCH_HISTORY = 8;
export const MAX_RECENT_EFFECTIVE_SEARCHES = 5;
export const RECENT_EFFECTIVE_SEARCHES_STORAGE_KEY =
  "unisearch_recent_effective_searches";

/**
 * 搜索状态接口
 */
interface SearchState {
  // 搜索参数
  searchParams: SearchParams;

  // 搜索结果（全量数据）
  searchResults: SearchResponse | null;

  // 加载状态
  isLoading: boolean;
  isRefreshing: boolean;

  // 错误信息
  error: string | null;

  // 最近一次成功完成的搜索参数快照
  lastCompletedSearchParams: SearchParams | null;

  // 搜索历史
  searchHistory: string[];
  recentEffectiveSearches: RecentEffectiveSearch[];

  // 可用选项
  availableChannels: string[];
  availablePlugins: string[];

  // 懒加载状态
  displayedCount: number; // 当前显示的结果数量
  pageSize: number; // 每页显示数量（固定48）
  hasMore: boolean; // 是否还有更多数据

  // 操作方法
  setSearchParams: (params: Partial<SearchParams>) => void;
  performSearch: (
    params?: Partial<SearchParams>,
    options?: { preserveResults?: boolean },
  ) => Promise<void>;
  clearResults: () => void;
  setError: (error: string | null) => void;
  addToHistory: (keyword: string) => void;
  clearHistory: () => void;
  removeFromHistory: (keyword: string) => void;
  removeRecentEffectiveSearch: (id: string) => void;
  clearRecentEffectiveSearches: () => void;
  loadAvailableOptions: () => Promise<void>;
  loadMore: () => void; // 前端懒加载，不再是异步
  reset: () => void;
}

/**
 * 默认搜索参数
 */
const defaultSearchParams: SearchParams = {
  keyword: "",
  source: "all",
  resultType: "merge",
  cloudTypes: [],
  channels: [],
  plugins: [],
  concurrency: 5,
  refresh: false,
  ext: {},
};

const sortStringValues = <T extends string>(values?: T[]) =>
  [...(values || [])].sort((left, right) => left.localeCompare(right, "zh-CN"));

const normalizeSearchParams = (params: SearchParams): SearchParams => ({
  ...params,
  cloudTypes: sortStringValues(params.cloudTypes),
  channels: sortStringValues(params.channels),
  plugins: sortStringValues(params.plugins),
  filter: (() => {
    const normalizedFilter = normalizeFilterConfig(params.filter);
    if (!normalizedFilter) {
      return undefined;
    }

    return Object.fromEntries(
      Object.entries(normalizedFilter).map(([field, values]) => [
        field,
        sortStringValues(normalizeFilterValues(values)),
      ]),
    ) as SearchParams["filter"];
  })(),
});

const areSearchParamsEqual = (
  left: SearchParams | null,
  right: SearchParams,
): boolean => {
  if (!left) {
    return false;
  }

  return JSON.stringify(normalizeSearchParams(left)) ===
    JSON.stringify(normalizeSearchParams(right));
};

const isRecentEffectiveSearch = (
  value: unknown,
): value is RecentEffectiveSearch => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const snapshot = value as Partial<RecentEffectiveSearch>;
  return Boolean(
    typeof snapshot.id === "string" &&
      typeof snapshot.keyword === "string" &&
      typeof snapshot.total === "number" &&
      typeof snapshot.searchedAt === "string" &&
      snapshot.params &&
      typeof snapshot.params.keyword === "string",
  );
};

const readRecentEffectiveSearches = () =>
  readJsonStorage<unknown[]>(RECENT_EFFECTIVE_SEARCHES_STORAGE_KEY, []).filter(
    isRecentEffectiveSearch,
  );

const writeRecentEffectiveSearches = (searches: RecentEffectiveSearch[]) => {
  writeJsonStorage(RECENT_EFFECTIVE_SEARCHES_STORAGE_KEY, searches);
};

const buildRecentEffectiveSearch = (
  params: SearchParams,
  total: number,
): RecentEffectiveSearch => ({
  id: `${params.keyword.trim().toLocaleLowerCase()}::${Date.now()}`,
  keyword: params.keyword.trim(),
  total,
  cloudTypes: sortStringValues(params.cloudTypes),
  searchedAt: new Date().toISOString(),
  params: normalizeSearchParams(params),
});

/**
 * 搜索状态管理
 */
export const useSearchStore = create<SearchState>()(
  devtools(
    (set, get) => ({
      // 初始状态
      searchParams: defaultSearchParams,
      searchResults: null,
      isLoading: false,
      isRefreshing: false,
      error: null,
      lastCompletedSearchParams: null,
      searchHistory: readJsonStorage<string[]>(
        "unisearch_search_history",
        [],
      ),
      recentEffectiveSearches: readRecentEffectiveSearches(),
      availableChannels: [],
      availablePlugins: [],
      displayedCount: 48, // 初始显示48条
      pageSize: 48, // 每页48条
      hasMore: false,

      /**
       * 设置搜索参数
       */
      setSearchParams: (params) => {
        set((state) => ({
          searchParams: { ...state.searchParams, ...params },
        }));
      },

      /**
       * 执行搜索
       */
      performSearch: async (params, options) => {
        const requestId = createSearchRequestId();
        const state = get();
        const finalParams = { ...state.searchParams, ...params };
        const preserveResults = Boolean(
          (options?.preserveResults ||
            areSearchParamsEqual(state.lastCompletedSearchParams, finalParams)) &&
            state.searchResults,
        );

        // 验证搜索参数
        const validation = SearchService.validateSearchParams(finalParams);
        if (!validation.valid) {
          set({ error: validation.error });
          return;
        }

        set({
          isLoading: !preserveResults,
          isRefreshing: preserveResults,
          error: null,
          searchResults: preserveResults ? state.searchResults : null,
          searchParams: finalParams,
          displayedCount: state.pageSize, // 重置为初始显示数量
          hasMore: false,
        });

        try {
          const results = await SearchService.search(finalParams);

          if (!isLatestSearchRequest(requestId)) {
            return;
          }

          const totalCount = results.resources?.length ?? 0;

          set({
            searchResults: results,
            isLoading: false,
            isRefreshing: false,
            lastCompletedSearchParams: normalizeSearchParams(finalParams),
            hasMore: totalCount > state.pageSize, // 判断是否有更多数据
          });
          writeRecentResourceSnapshots(results.resources, finalParams.keyword);

          // 添加到搜索历史
          if (finalParams.keyword) {
            get().addToHistory(finalParams.keyword);
          }

          if (finalParams.keyword && totalCount > 0) {
            const currentState = get();
            const recentSearch = buildRecentEffectiveSearch(finalParams, totalCount);
            const dedupedRecentSearches = currentState.recentEffectiveSearches.filter(
              (item) =>
                JSON.stringify(normalizeSearchParams(item.params)) !==
                JSON.stringify(normalizeSearchParams(recentSearch.params)),
            );
            const nextRecentSearches = [recentSearch, ...dedupedRecentSearches].slice(
              0,
              MAX_RECENT_EFFECTIVE_SEARCHES,
            );

            set({
              recentEffectiveSearches: nextRecentSearches,
            });
            writeRecentEffectiveSearches(nextRecentSearches);
          }
        } catch (error) {
          if (!isLatestSearchRequest(requestId)) {
            return;
          }

          // 特殊处理：将登录引导错误继续抛给调用方处理跳转
          const errorCode = getErrorCode(error);
          if (errorCode === 401 || errorCode === 403 || errorCode === 404) {
            set({
              error: getErrorMessage(error, "搜索失败"),
              isLoading: false,
              isRefreshing: false,
              searchResults: preserveResults ? state.searchResults : null,
            });
            // 抛出错误，让调用方处理跳转逻辑
            throw error;
          }

          set({
            error: getErrorMessage(error, "搜索失败"),
            isLoading: false,
            isRefreshing: false,
            searchResults: preserveResults ? state.searchResults : null,
          });
        }
      },

      /**
       * 清空搜索结果
       */
      clearResults: () => {
        invalidateSearchRequests();
        set((state) => {
          const keyword = state.searchParams.keyword?.trim() || "";
          const isAlreadyCleared =
            !state.searchResults &&
            !state.error &&
            !state.isLoading &&
            !state.isRefreshing &&
            keyword.length === 0;

          // 空状态下直接复用旧引用，避免结果页无关键词时触发无意义的重复渲染。
          if (isAlreadyCleared) {
            return state;
          }

          return {
            searchResults: null,
            error: null,
            isLoading: false,
            isRefreshing: false,
            lastCompletedSearchParams: null,
            displayedCount: state.pageSize,
            hasMore: false,
            searchParams: { ...state.searchParams, keyword: "" },
          };
        });
      },

      /**
       * 设置错误信息
       */
      setError: (error) => {
        set({ error });
      },

      /**
       * 添加到搜索历史
       */
      addToHistory: (keyword) => {
        const state = get();
        const history = state.searchHistory.filter((item) => item !== keyword);
        const newHistory = [keyword, ...history].slice(0, MAX_SEARCH_HISTORY);

        set({ searchHistory: newHistory });
        writeJsonStorage("unisearch_search_history", newHistory);
      },

      /**
       * 清空搜索历史
       */
      clearHistory: () => {
        set({ searchHistory: [] });
        removeStorage("unisearch_search_history");
      },

      /**
       * 从搜索历史中删除单条记录
       */
      removeFromHistory: (keyword) => {
        const state = get();
        const newHistory = state.searchHistory.filter(
          (item) => item !== keyword,
        );
        set({ searchHistory: newHistory });
        if (newHistory.length > 0) {
          writeJsonStorage("unisearch_search_history", newHistory);
        } else {
          removeStorage("unisearch_search_history");
        }
      },

      /**
       * 从最近有效搜索中删除单条记录
       */
      removeRecentEffectiveSearch: (id) => {
        const state = get();
        const nextRecentSearches = state.recentEffectiveSearches.filter(
          (item) => item.id !== id,
        );

        set({ recentEffectiveSearches: nextRecentSearches });
        if (nextRecentSearches.length > 0) {
          writeRecentEffectiveSearches(nextRecentSearches);
        } else {
          removeStorage(RECENT_EFFECTIVE_SEARCHES_STORAGE_KEY);
        }
      },

      /**
       * 清空最近有效搜索
       */
      clearRecentEffectiveSearches: () => {
        set({ recentEffectiveSearches: [] });
        removeStorage(RECENT_EFFECTIVE_SEARCHES_STORAGE_KEY);
      },

      /**
       * 加载可用选项
       */
      loadAvailableOptions: async () => {
        try {
          const [channels, plugins] = await Promise.all([
            SearchService.getChannels(),
            SearchService.getPlugins(),
          ]);

          set({
            availableChannels: channels,
            availablePlugins: plugins,
          });
        } catch (error) {
          console.error("Failed to load available options:", error);
        }
      },

      /**
       * 加载更多结果（前端分批渲染）
       */
      loadMore: () => {
        const state = get();
        if (!state.hasMore || !state.searchResults) {
          return;
        }

        const totalCount = state.searchResults.resources?.length ?? 0;

        // 增加显示数量
        const newDisplayedCount = state.displayedCount + state.pageSize;

        set({
          displayedCount: newDisplayedCount,
          hasMore: newDisplayedCount < totalCount,
        });
      },

      /**
       * 重置状态
       */
      reset: () => {
        invalidateSearchRequests();
        set((state) => ({
          searchParams: defaultSearchParams,
          searchResults: null,
          isLoading: false,
          isRefreshing: false,
          error: null,
          lastCompletedSearchParams: null,
          displayedCount: state.pageSize,
          hasMore: false,
        }));
      },
    }),
    {
      name: "search-store",
    },
  ),
);

// 导出便捷的选择器
export const useSearchParams = () =>
  useSearchStore((state) => state.searchParams);
export const useSearchResults = () =>
  useSearchStore((state) => state.searchResults);
export const useSearchLoading = () =>
  useSearchStore((state) => state.isLoading);
export const useSearchError = () => useSearchStore((state) => state.error);
export const useSearchHistory = () =>
  useSearchStore((state) => state.searchHistory);
export const useRecentEffectiveSearches = () =>
  useSearchStore((state) => state.recentEffectiveSearches);
export const useAvailableOptions = () =>
  useSearchStore((state) => ({
    channels: state.availableChannels,
    plugins: state.availablePlugins,
  }));
