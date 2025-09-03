import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  SearchParams,
  SearchResponse,
  CloudTypeValue,
} from '@/types/api';
import { SearchService } from '@/services/searchService';

/**
 * 搜索状态接口
 */
interface SearchState {
  // 搜索参数
  searchParams: SearchParams;
  
  // 搜索结果
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
  
  // 分页状态
  currentPage: number;
  hasMore: boolean;
  
  // 操作方法
  setSearchParams: (params: Partial<SearchParams>) => void;
  performSearch: (params?: Partial<SearchParams>) => Promise<void>;
  clearResults: () => void;
  setError: (error: string | null) => void;
  addToHistory: (keyword: string) => void;
  clearHistory: () => void;
  removeFromHistory: (keyword: string) => void;
  loadAvailableOptions: () => Promise<void>;
  loadMore: () => Promise<void>;
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
      currentPage: 1,
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
          searchParams: finalParams,
          currentPage: 1,
        });

        try {
          const results = await SearchService.search(finalParams);
          
          set({ 
            searchResults: results,
            isLoading: false,
            hasMore: Object.values(results.merged_by_type || {}).some(links => links.length >= 20), // 假设每页20条
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
        set({ 
          searchResults: null, 
          error: null,
          currentPage: 1,
          hasMore: false,
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
       * 加载更多结果（懒加载）
       */
      loadMore: async () => {
        const state = get();
        if (state.isLoading || !state.hasMore || !state.searchResults) {
          return;
        }

        set({ isLoading: true });

        try {
          // 这里需要根据后端API实际支持的分页方式来实现
          // 目前假设通过修改搜索参数来获取更多结果
          const nextPage = state.currentPage + 1;
          const params = {
            ...state.searchParams,
            // 如果后端支持分页，可以添加 page 参数
            ext: {
              ...state.searchParams.ext,
              page: nextPage,
            },
          };

          const results = await SearchService.search(params);
          
          // 合并结果
          const mergedResults: SearchResponse = {
            ...results,
            merged_by_type: {
              ...state.searchResults.merged_by_type,
              ...Object.entries(results.merged_by_type || {}).reduce((acc, [cloudType, links]) => {
                acc[cloudType as keyof typeof acc] = [
                  ...(state.searchResults.merged_by_type?.[cloudType as keyof typeof state.searchResults.merged_by_type] || []),
                  ...links,
                ];
                return acc;
              }, {} as typeof results.merged_by_type),
            },
          };

          set({ 
            searchResults: mergedResults,
            currentPage: nextPage,
            hasMore: Object.values(results.merged_by_type || {}).some(links => links.length >= 20),
            isLoading: false,
          });
        } catch (error: any) {
          set({ 
            error: error.message || '加载更多失败',
            isLoading: false,
          });
        }
      },

      /**
       * 重置状态
       */
      reset: () => {
        set({
          searchParams: defaultSearchParams,
          searchResults: null,
          isLoading: false,
          error: null,
          currentPage: 1,
          hasMore: false,
        });
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