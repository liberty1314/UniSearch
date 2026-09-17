import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { SearchParams, SearchProgressiveEvent, SearchResponse } from "@/types/search";
import type { ResourceLink, ScanTransferInfo } from "@/types/resource";
import { SearchService } from "@/services/searchService";
import { SystemSettingsService } from "@/services/systemSettingsService";
import { getErrorCode, getErrorMessage } from "@/lib/error";
import {
  readJsonStorage,
  removeStorage,
  writeJsonStorage,
} from "@/lib/safeStorage";
import { writeRecentResourceSnapshots } from "@/lib/resourceSnapshot";
import { readAccountSearchDefaults } from "@/lib/accountPreferences";
import {
  createSearchRequestId,
  invalidateSearchRequests,
  isLatestSearchRequest,
} from "@/stores/searchRequestGuard";
import { normalizeFilterConfig, normalizeFilterValues } from "@/utils/searchFilters";

/**
 * 搜索历史最大保存条数（同时作为 UI 展示上限）
 */
export const MAX_SEARCH_HISTORY = 8;
const initialDisplayCount = 48;
const loadMoreIncrement = 24;

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
  progressiveStatus: "idle" | "running" | "complete" | "fallback" | "error";
  completedSources: number;
  totalSources: number;
  receivedBatches: number;

  // 错误信息
  error: string | null;

  // 最近一次成功完成的搜索参数快照
  lastCompletedSearchParams: SearchParams | null;
  activeSearchParams: SearchParams | null;

  // 搜索历史
  searchHistory: string[];

  // 可用选项
  availableChannels: string[];
  availablePlugins: string[];

  // 懒加载状态
  displayedCount: number; // 当前显示的结果数量
  pageSize: number; // 首屏显示数量
  hasMore: boolean; // 是否还有更多数据

  // 操作方法
  setSearchParams: (params: Partial<SearchParams>) => void;
  performSearch: (
    params?: Partial<SearchParams>,
    options?: { preserveResults?: boolean },
  ) => Promise<void>;
  canReuseCurrentSearch: (
    params: Partial<SearchParams>,
    options?: { forceSkeleton?: boolean },
  ) => boolean;
  clearResults: () => void;
  setError: (error: string | null) => void;
  addToHistory: (keyword: string) => void;
  clearHistory: () => void;
  removeFromHistory: (keyword: string) => void;
  loadAvailableOptions: () => Promise<void>;
  loadMore: () => void; // 前端懒加载，不再是异步
  updateResourceScanTransfer: (resourceId: string, linkUrl: string, scanTransfer: ScanTransferInfo) => void;
  updateResolvedResourceLink: (resourceId: string, linkId: string, resolvedLink: ResourceLink) => void;
  markResourceLinkInvalid: (resourceId: string, linkId: string) => void;
  reset: () => void;
}

/**
 * 默认搜索参数
 */
const buildDefaultSearchParams = (): SearchParams => ({
  keyword: "",
  source: "all",
  resultType: readAccountSearchDefaults().resultType || "merge",
  cloudTypes: [...(readAccountSearchDefaults().cloudTypes || [])],
  channels: [],
  plugins: [],
  concurrency: 5,
  refresh: false,
  ext: {},
});

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

/**
 * 递归按键名排序后再序列化。
 * JSON.stringify 直接比较时，ext 等嵌套对象会因插入顺序不同产生不同字符串，
 * 导致语义相同的参数被误判为“已变化”而触发重搜。
 */
const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`);
    return `{${entries.join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
};

const areSearchParamsEqual = (
  left: SearchParams | null,
  right: SearchParams,
): boolean => {
  if (!left) {
    return false;
  }

  return stableStringify(normalizeSearchParams(left)) ===
    stableStringify(normalizeSearchParams(right));
};

const emptyFacets = {
  cloud_types: {},
  source_types: {},
  media_types: {},
  target_types: {},
  capabilities: {},
  action_types: {},
};

const buildPartialSearchResponse = (event: SearchProgressiveEvent): SearchResponse => ({
  total: event.resources?.length ?? 0,
  resources: event.resources || [],
  facets: emptyFacets,
  warnings: event.warnings,
});

/**
 * 搜索状态管理
 */
export const useSearchStore = create<SearchState>()(
  devtools(
    (set, get) => ({
      // 初始状态
      searchParams: buildDefaultSearchParams(),
      searchResults: null,
      isLoading: false,
      isRefreshing: false,
      progressiveStatus: "idle",
      completedSources: 0,
      totalSources: 0,
      receivedBatches: 0,
      error: null,
      lastCompletedSearchParams: null,
      activeSearchParams: null,
      searchHistory: readJsonStorage<string[]>(
        "unisearch_search_history",
        [],
      ),
      availableChannels: [],
      availablePlugins: [],
      displayedCount: initialDisplayCount,
      pageSize: initialDisplayCount,
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
          set({ activeSearchParams: null, error: validation.error });
          return;
        }

        const normalizedFinalParams = normalizeSearchParams(finalParams);

        set({
          activeSearchParams: normalizedFinalParams,
          isLoading: !preserveResults,
          isRefreshing: preserveResults,
          progressiveStatus: "running",
          completedSources: 0,
          totalSources: 0,
          receivedBatches: 0,
          error: null,
          searchResults: preserveResults ? state.searchResults : null,
          searchParams: finalParams,
          // 复用已有结果（如从详情页返回）时保留当前已展开的条数，
          // 使列表高度得以恢复，配合 ScrollToTop 的 scrollY 恢复让浏览进度连续；
          // 全新搜索则重置回初始条数。
          displayedCount: preserveResults ? state.displayedCount : initialDisplayCount,
          hasMore: preserveResults
            ? state.displayedCount < (state.searchResults?.resources.length ?? 0)
            : false,
        });

        const commitCompletedSearch = (results: SearchResponse, status: SearchState["progressiveStatus"]) => {
          const totalCount = results.resources?.length ?? 0;

          set({
            searchResults: results,
            isLoading: false,
            isRefreshing: false,
            progressiveStatus: status,
            lastCompletedSearchParams: normalizedFinalParams,
            hasMore: totalCount > initialDisplayCount,
          });
          writeRecentResourceSnapshots(results.resources, finalParams.keyword);

          if (finalParams.keyword) {
            get().addToHistory(finalParams.keyword);
          }
        };

        try {
          const publicSettings = await SystemSettingsService.getSettingsCached().catch(() => null);
          if (publicSettings?.progressive_search_enabled === false) {
            const results = await SearchService.search(finalParams);
            if (!isLatestSearchRequest(requestId)) {
              return;
            }
            commitCompletedSearch(results, "complete");
            return;
          }

          const results = await SearchService.searchProgressive(finalParams, {
            onEvent: (event) => {
              if (!isLatestSearchRequest(requestId)) {
                return;
              }
              if (event.type === "started") {
                set({
                  progressiveStatus: "running",
                  completedSources: event.completed_sources || 0,
                  totalSources: event.total_sources || 0,
                  receivedBatches: event.received_batches || 0,
                });
              }
              if (event.type === "batch" || event.type === "warning") {
                const partial = buildPartialSearchResponse(event);
                const totalReceived = partial.resources.length;
                // 保留用户已通过“加载更多”展开的条数，避免新批次到达时把列表收回首屏数量。
                const nextDisplayCount = Math.max(
                  get().displayedCount,
                  initialDisplayCount,
                );
                set({
                  searchResults:
                    partial.resources.length > 0 || partial.warnings?.length
                      ? partial
                      : get().searchResults,
                  isLoading: partial.resources.length > 0 ? false : get().isLoading,
                  isRefreshing: true,
                  progressiveStatus: "running",
                  completedSources: event.completed_sources || 0,
                  totalSources: event.total_sources || 0,
                  receivedBatches: event.received_batches || 0,
                  displayedCount: nextDisplayCount,
                  hasMore: totalReceived > nextDisplayCount,
                });
              }
            },
          });

          if (!isLatestSearchRequest(requestId)) {
            return;
          }

          commitCompletedSearch(results, "complete");
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
              progressiveStatus: "error",
              searchResults: preserveResults ? state.searchResults : null,
              activeSearchParams: null,
            });
            // 抛出错误，让调用方处理跳转逻辑
            throw error;
          }

          try {
            set({ progressiveStatus: "fallback" });
            const fallbackResults = await SearchService.search(finalParams);
            if (!isLatestSearchRequest(requestId)) {
              return;
            }
            commitCompletedSearch(fallbackResults, "fallback");
          } catch (fallbackError) {
            if (!isLatestSearchRequest(requestId)) {
              return;
            }
            set({
              error: getErrorMessage(fallbackError, getErrorMessage(error, "搜索失败")),
              isLoading: false,
              isRefreshing: false,
              progressiveStatus: "error",
              searchResults: preserveResults ? state.searchResults : null,
              activeSearchParams: null,
            });
          }
        }
      },

      canReuseCurrentSearch: (params, options) => {
        if (options?.forceSkeleton || params.refresh) {
          return false;
        }

        const state = get();
        const targetParams = {
          ...state.searchParams,
          ...params,
        };

        if (
          state.progressiveStatus === "running" &&
          areSearchParamsEqual(state.activeSearchParams, targetParams)
        ) {
          return true;
        }

        return Boolean(
          state.searchResults &&
            areSearchParamsEqual(state.lastCompletedSearchParams, targetParams),
        );
      },

      /**
       * 清空搜索结果
       */
      clearResults: () => {
        const state = get();
        const keyword = state.searchParams.keyword?.trim() || "";
        const isAlreadyCleared =
          !state.searchResults &&
          !state.error &&
          !state.isLoading &&
          !state.isRefreshing &&
          keyword.length === 0;

        // 空状态下直接返回：既避免无意义的重复渲染，
        // 也避免误作废正在进行的搜索请求（URL 无关的 effect 触发不应中断在途请求）。
        if (isAlreadyCleared) {
          return;
        }

        invalidateSearchRequests();
        set({
          searchResults: null,
          error: null,
          isLoading: false,
          isRefreshing: false,
          progressiveStatus: "idle",
          completedSources: 0,
          totalSources: 0,
          receivedBatches: 0,
          lastCompletedSearchParams: null,
          activeSearchParams: null,
          displayedCount: initialDisplayCount,
          hasMore: false,
          searchParams: { ...state.searchParams, keyword: "" },
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
        const newDisplayedCount = state.displayedCount + loadMoreIncrement;

        set({
          displayedCount: newDisplayedCount,
          hasMore: newDisplayedCount < totalCount,
        });
      },

      updateResourceScanTransfer: (resourceId, linkUrl, scanTransfer) => {
        const trimmedResourceId = resourceId.trim();
        const trimmedLinkUrl = linkUrl.trim();
        if (!trimmedResourceId || !trimmedLinkUrl) {
          return;
        }

        set((state) => {
          if (!state.searchResults) {
            return state;
          }

          let didUpdate = false;
          const nextResources = state.searchResults.resources.map((resource) => {
            if (resource.id !== trimmedResourceId) {
              return resource;
            }

            const nextLinks = resource.links.map((link) => {
              if (link.url !== trimmedLinkUrl) {
                return link;
              }
              didUpdate = true;
              return {
                ...link,
                access_mode: "scan_transfer" as const,
                scan_transfer: { ...scanTransfer },
              };
            });

            return didUpdate ? { ...resource, links: nextLinks } : resource;
          });

          if (!didUpdate) {
            return state;
          }

          return {
            searchResults: {
              ...state.searchResults,
              resources: nextResources,
            },
          };
        });
      },

      updateResolvedResourceLink: (resourceId, linkId, resolvedLink) => {
        const trimmedResourceId = resourceId.trim();
        const trimmedLinkId = linkId.trim();
        if (!trimmedResourceId || !trimmedLinkId) {
          return;
        }

        set((state) => {
          if (!state.searchResults) {
            return state;
          }

          let changed = false;
          const resources = state.searchResults.resources.map((resource) => {
            if (resource.id !== trimmedResourceId) {
              return resource;
            }
            let resourceChanged = false;
            const links = resource.links.map((link) => {
              if (link.id !== trimmedLinkId) {
                return link;
              }
              resourceChanged = true;
              changed = true;
              return { ...resolvedLink, id: trimmedLinkId };
            });
            return resourceChanged ? { ...resource, links } : resource;
          });

          return changed
            ? { searchResults: { ...state.searchResults, resources } }
            : state;
        });
      },

      markResourceLinkInvalid: (resourceId, linkId) => {
        const trimmedResourceId = resourceId.trim();
        const trimmedLinkId = linkId.trim();
        if (!trimmedResourceId || !trimmedLinkId) {
          return;
        }

        set((state) => {
          if (!state.searchResults) {
            return state;
          }

          let changed = false;
          const resources = state.searchResults.resources.map((resource) => {
            if (resource.id !== trimmedResourceId) {
              return resource;
            }
            let resourceChanged = false;
            const links = resource.links.map((link) => {
              if (link.id !== trimmedLinkId) {
                return link;
              }
              resourceChanged = true;
              changed = true;
              return {
                ...link,
                resolution: { ...link.resolution, status: "invalid" as const },
              };
            });
            return resourceChanged ? { ...resource, links } : resource;
          });

          return changed
            ? { searchResults: { ...state.searchResults, resources } }
            : state;
        });
      },

      /**
       * 重置状态
       */
      reset: () => {
        invalidateSearchRequests();
        set({
          searchParams: buildDefaultSearchParams(),
          searchResults: null,
          isLoading: false,
          isRefreshing: false,
          progressiveStatus: "idle",
          completedSources: 0,
          totalSources: 0,
          receivedBatches: 0,
          error: null,
          lastCompletedSearchParams: null,
          activeSearchParams: null,
          displayedCount: initialDisplayCount,
          hasMore: false,
        });
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
