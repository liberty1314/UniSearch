import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  SearchParams,
  SearchResponse,
} from '@/types/api';
import { SearchService } from '@/services/searchService';

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

  // 错误信息
  error: string | null;

  // 搜索历史
  searchHistory: string[];

  // 可用选项
  availableChannels: string[];
  availablePlugins: string[];

  // 懒加载状态
  displayedCount: number; // 当前显示的结果数量
  pageSize: number; // 每页显示数量（固定48）
  hasMore: boolean; // 是否还有更多数据

  // 操作方法
  setSearchParams: (params: Partial<SearchParams>) => void;
  performSearch: (params?: Partial<SearchParams>) => Promise<void>;
  clearResults: () => void;
  setError: (error: string | null) => void;
  addToHistory: (keyword: string) => void;
  clearHistory: () => void;
  removeFromHistory: (keyword: string) => void;
  loadAvailableOptions: () => Promise<void>;
  loadMore: () => void; // 前端懒加载，不再是异步
  reset: () => void;
}

/**
 * 默认搜索参数
 */
const defaultSearchParams: SearchParams = {
  keyword: '',
  source: 'all',
  resultType: 'merge',
  cloudTypes: [],
  channels: [],
  plugins: [],
  concurrency: 5,
  refresh: false,
  ext: {},
};



/**
 * 搜索状态管理
 */
export const useSearchStore = create<SearchState>()(devtools(
  (set, get) => ({
    // 初始状态
    searchParams: defaultSearchParams,
    searchResults: null,
    isLoading: false,
    error: null,
    searchHistory: JSON.parse(localStorage.getItem('unisearch_search_history') || '[]'),
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
    performSearch: async (params) => {
      const state = get();
      const finalParams = { ...state.searchParams, ...params };

      // 验证搜索参数
      const validation = SearchService.validateSearchParams(finalParams);
      if (!validation.valid) {
        set({ error: validation.error });
        return;
      }

      set({
        isLoading: true,
        error: null,
        searchResults: null,
        searchParams: finalParams,
        displayedCount: state.pageSize, // 重置为初始显示数量
        hasMore: false,
      });

      try {
        const results = await SearchService.search(finalParams);

        // 计算总结果数量
        const totalCount = Object.values(results.merged_by_type || {})
          .reduce((sum, links) => sum + links.length, 0);

        set({
          searchResults: results,
          isLoading: false,
          hasMore: totalCount > state.pageSize, // 判断是否有更多数据
        });

        // 添加到搜索历史
        if (finalParams.keyword) {
          get().addToHistory(finalParams.keyword);
        }
      } catch (error: any) {
        set({
          error: error.message || '搜索失败',
          isLoading: false,
          searchResults: null,
        });
      }
    },

    /**
     * 清空搜索结果
     */
    clearResults: () => {
      set((state) => ({
        searchResults: null,
        error: null,
        displayedCount: state.pageSize,
        hasMore: false,
        searchParams: { ...state.searchParams, keyword: '' },
      }));
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
      const history = state.searchHistory.filter(item => item !== keyword);
      const newHistory = [keyword, ...history].slice(0, 10); // 保留最近10条

      set({ searchHistory: newHistory });
      localStorage.setItem('unisearch_search_history', JSON.stringify(newHistory));
    },

    /**
     * 清空搜索历史
     */
    clearHistory: () => {
      set({ searchHistory: [] });
      localStorage.removeItem('unisearch_search_history');
    },

    /**
     * 从搜索历史中删除单条记录
     */
    removeFromHistory: (keyword) => {
      const state = get();
      const newHistory = state.searchHistory.filter(item => item !== keyword);
      set({ searchHistory: newHistory });
      if (newHistory.length > 0) {
        localStorage.setItem('unisearch_search_history', JSON.stringify(newHistory));
      } else {
        localStorage.removeItem('unisearch_search_history');
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
        console.error('Failed to load available options:', error);
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

      // 计算总结果数量
      const totalCount = Object.values(state.searchResults.merged_by_type || {})
        .reduce((sum, links) => sum + links.length, 0);

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
      set((state) => ({
        searchParams: defaultSearchParams,
        searchResults: null,
        isLoading: false,
        error: null,
        displayedCount: state.pageSize,
        hasMore: false,
      }));
    },
  }),
  {
    name: 'search-store',
  }
));

// 导出便捷的选择器
export const useSearchParams = () => useSearchStore(state => state.searchParams);
export const useSearchResults = () => useSearchStore(state => state.searchResults);
export const useSearchLoading = () => useSearchStore(state => state.isLoading);
export const useSearchError = () => useSearchStore(state => state.error);
export const useSearchHistory = () => useSearchStore(state => state.searchHistory);
export const useAvailableOptions = () => useSearchStore(state => ({
  channels: state.availableChannels,
  plugins: state.availablePlugins,
}));
