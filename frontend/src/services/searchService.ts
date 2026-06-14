import { apiClient } from '@/lib/api';
import type {
  SearchParams,
  SearchRequest,
  SearchResponse,
  HealthResponse,
  CloudTypeValue,
  FilterConfig,
  ScanTransferRefreshRequest,
  ScanTransferRefreshResponse,
} from '@/types/api';
import type { HotRankingItem } from '@/types/hotRanking';
import { normalizeFilterConfig } from '@/utils/searchFilters';

const HEALTH_CACHE_TTL_MS = 5000;
let healthCache:
  | {
      value: HealthResponse;
      expiresAt: number;
    }
  | null = null;
let healthRequest: Promise<HealthResponse> | null = null;

export interface TrendingSearchAction {
  key: 'title' | 'original_title' | 'title_4k';
  label: string;
  keyword: string;
  isPrimary: boolean;
}

/**
 * 搜索服务类
 */
export class SearchService {
  /**
   * 执行搜索
   * @param params 搜索参数
   * @returns 搜索结果
   */
  static async search(params: SearchParams): Promise<SearchResponse> {
    const normalizedFilter = normalizeFilterConfig(params.filter);

    // 转换前端参数为后端API格式
    const requestData: SearchRequest = {
      kw: params.keyword,
      channels: params.channels,
      plugins: params.plugins,
      cloud_types: params.cloudTypes,
      src: params.source || 'all',
      res: params.resultType || 'merge',
      conc: params.concurrency,
      refresh: params.refresh || false,
      ext: params.ext || {},
      filter: normalizedFilter,
    };

    // 移除空值参数
    const cleanedData = Object.fromEntries(
      Object.entries(requestData).filter(([, value]) => {
        if (Array.isArray(value)) {
          return value.length > 0;
        }
        return value !== undefined && value !== null && value !== '';
      })
    );

    try {
      const response = await apiClient.post<SearchResponse>('/search', cleanedData);

      if (response) {
        return response;
      } else {
        throw new Error('搜索失败');
      }
    } catch (error) {
      console.error('Search error:', error);
      throw error;
    }
  }

  /**
   * 刷新当前资源的扫码转存载荷。
   */
  static async refreshScanTransfer(
    payload: ScanTransferRefreshRequest,
  ): Promise<ScanTransferRefreshResponse> {
    try {
      const response = await apiClient.post<ScanTransferRefreshResponse>(
        '/resources/scan-transfer/refresh',
        payload,
      );

      if (response) {
        return response;
      }

      throw new Error('刷新二维码失败');
    } catch (error) {
      console.error('Refresh scan transfer error:', error);
      throw error;
    }
  }

  /**
   * 获取系统健康状态
   * @returns 健康状态信息
   */
  static async getHealth(): Promise<HealthResponse> {
    const now = Date.now();
    if (healthCache && healthCache.expiresAt > now) {
      return healthCache.value;
    }

    if (healthRequest) {
      return healthRequest;
    }

    healthRequest = apiClient
      .get<HealthResponse>('/health')
      .then((response) => {
        if (!response) {
          throw new Error('获取系统状态失败');
        }

        healthCache = {
          value: response,
          expiresAt: Date.now() + HEALTH_CACHE_TTL_MS,
        };
        return response;
      })
      .catch((error) => {
        console.error('Health check error:', error);
        throw error;
      })
      .finally(() => {
        healthRequest = null;
      });

    return healthRequest;
  }

  static clearHealthCacheForTest(): void {
    healthCache = null;
    healthRequest = null;
  }

  /**
   * 获取可用插件列表
   * @returns 插件信息
   */
  static async getPlugins(): Promise<string[]> {
    try {
      const healthData = await this.getHealth();
      return healthData.plugins || [];
    } catch (error) {
      console.error('Get plugins error:', error);
      return [];
    }
  }

  /**
   * 获取可用频道列表
   * @returns 频道列表
   */
  static async getChannels(): Promise<string[]> {
    try {
      const healthData = await this.getHealth();
      return healthData.channels || [];
    } catch (error) {
      console.error('Get channels error:', error);
      return [];
    }
  }

  /**
   * 验证搜索参数
   * @param params 搜索参数
   * @returns 验证结果
   */
  static validateSearchParams(params: SearchParams): { valid: boolean; error?: string } {
    if (!params.keyword || params.keyword.trim().length === 0) {
      return { valid: false, error: '搜索关键词不能为空' };
    }

    if (params.keyword.trim().length < 2) {
      return { valid: false, error: '搜索关键词至少需要2个字符' };
    }

    if (params.concurrency && (params.concurrency < 1 || params.concurrency > 20)) {
      return { valid: false, error: '并发数应在1-20之间' };
    }

    return { valid: true };
  }

  /**
   * 为热门内容生成可执行的搜索线索。
   */
  static buildTrendingSearchActions(
    item: Pick<HotRankingItem, 'title' | 'original_title'>,
  ): TrendingSearchAction[] {
    const title = item.title.trim();
    const originalTitle = item.original_title.trim();
    const baseTitle = title || originalTitle;
    const candidates: TrendingSearchAction[] = [
      {
        key: 'title',
        label: '搜片名',
        keyword: baseTitle,
        isPrimary: true,
      },
      {
        key: 'original_title',
        label: '搜原名',
        keyword: originalTitle,
        isPrimary: false,
      },
      {
        key: 'title_4k',
        label: '搜 4K',
        keyword: baseTitle,
        isPrimary: false,
      },
    ];
    const seenKeywords = new Set<string>();

    return candidates.filter((action) => {
      const keyword = action.keyword.trim();
      const normalizedKeyword = keyword.toLocaleLowerCase();
      if (!keyword) {
        return false;
      }

      if (action.key === 'original_title' && seenKeywords.has(normalizedKeyword)) {
        return false;
      }

      seenKeywords.add(normalizedKeyword);
      action.keyword = keyword;
      return true;
    });
  }

  /**
   * 构建搜索URL（用于分享或书签）
   * @param params 搜索参数
   * @returns URL字符串
   */
  static buildSearchUrl(params: SearchParams): string {
    const searchParams = new URLSearchParams();
    const normalizedFilter = normalizeFilterConfig(params.filter);

    if (params.keyword) {
      searchParams.set('q', params.keyword);
    }

    if (params.source && params.source !== 'all') {
      searchParams.set('src', params.source);
    }

    if (params.resultType && params.resultType !== 'merge') {
      searchParams.set('res', params.resultType);
    }

    if (params.cloudTypes && params.cloudTypes.length > 0) {
      searchParams.set('types', params.cloudTypes.join(','));
    }

    if (params.channels && params.channels.length > 0) {
      searchParams.set('channels', params.channels.join(','));
    }

    if (params.plugins && params.plugins.length > 0) {
      searchParams.set('plugins', params.plugins.join(','));
    }

    const filterFieldMap: Array<[keyof FilterConfig, string]> = [
      ['include', 'include'],
      ['exclude', 'exclude'],
      ['mediaTypes', 'mediaTypes'],
    ];

    filterFieldMap.forEach(([field, queryKey]) => {
      const values = normalizedFilter?.[field];
      if (values && values.length > 0) {
        searchParams.set(queryKey, values.join(','));
      }
    });

    const queryString = searchParams.toString();
    return queryString ? `/search?${queryString}` : '/search';
  }

  /**
   * 从URL解析搜索参数
   * @param url URL字符串或URLSearchParams
   * @returns 搜索参数
   */
  static parseSearchUrl(url: string | URLSearchParams): Partial<SearchParams> {
    const searchParams = typeof url === 'string'
      ? new URLSearchParams(url.split('?')[1] || '')
      : url;

    const params: Partial<SearchParams> = {};

    const keyword = searchParams.get('q');
    if (keyword) {
      params.keyword = keyword;
    }

    const source = searchParams.get('src') as 'all' | 'tg' | 'plugin';
    if (source && ['all', 'tg', 'plugin'].includes(source)) {
      params.source = source;
    }

    const resultType = searchParams.get('res') as 'all' | 'results' | 'merge';
    if (resultType && ['all', 'results', 'merge'].includes(resultType)) {
      params.resultType = resultType;
    }

    const cloudTypes = searchParams.get('types');
    if (cloudTypes) {
      params.cloudTypes = cloudTypes.split(',').filter(Boolean) as CloudTypeValue[];
    }

    const channels = searchParams.get('channels');
    if (channels) {
      params.channels = channels.split(',').filter(Boolean);
    }

    const plugins = searchParams.get('plugins');
    if (plugins) {
      params.plugins = plugins.split(',').filter(Boolean);
    }

    const filterFieldMap: Array<[keyof FilterConfig, string]> = [
      ['include', 'include'],
      ['exclude', 'exclude'],
      ['mediaTypes', 'mediaTypes'],
    ];

    const filter: FilterConfig = {};
    filterFieldMap.forEach(([field, queryKey]) => {
      const rawValue = searchParams.get(queryKey);
      if (!rawValue) {
        return;
      }

      const values = rawValue.split(',').map((value) => value.trim()).filter(Boolean);
      if (values.length > 0) {
        filter[field] = values;
      }
    });

    const normalizedFilter = normalizeFilterConfig(filter);
    if (normalizedFilter) {
      params.filter = normalizedFilter;
    }

    return params;
  }
}

// 导出便捷方法
export const {
  search,
  getHealth,
  getPlugins,
  getChannels,
  validateSearchParams,
  buildSearchUrl,
  parseSearchUrl,
} = SearchService;
