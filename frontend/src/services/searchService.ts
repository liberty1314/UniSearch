import { apiClient } from '@/lib/api';
import type {
  SearchParams,
  SearchRequest,
  SearchResponse,
  HealthResponse,
  ApiResponse,
} from '@/types/api';

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
    };

    // 移除空值参数
    const cleanedData = Object.fromEntries(
      Object.entries(requestData).filter(([_, value]) => {
        if (Array.isArray(value)) {
          return value.length > 0;
        }
        return value !== undefined && value !== null && value !== '';
      })
    );

    try {
      const response = await apiClient.post<SearchResponse>('/search', cleanedData);

      if (response.code === 0 && response.data) {
        return response.data;
      } else {
        throw new Error(response.message || '搜索失败');
      }
    } catch (error: any) {
      console.error('Search error:', error);
      throw new Error(error.message || '搜索请求失败');
    }
  }

  /**
   * 获取系统健康状态
   * @returns 健康状态信息
   */
  static async getHealth(): Promise<HealthResponse> {
    try {
      const response = await apiClient.get<HealthResponse>('/health');

      if (response.code === 0 && response.data) {
        return response.data;
      } else {
        throw new Error(response.message || '获取系统状态失败');
      }
    } catch (error: any) {
      console.error('Health check error:', error);
      throw new Error(error.message || '健康检查请求失败');
    }
  }

  /**
   * 获取可用插件列表
   * @returns 插件信息
   */
  static async getPlugins(): Promise<string[]> {
    try {
      const healthData = await this.getHealth();
      return healthData.plugins || [];
    } catch (error: any) {
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
    } catch (error: any) {
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
   * 构建搜索URL（用于分享或书签）
   * @param params 搜索参数
   * @returns URL字符串
   */
  static buildSearchUrl(params: SearchParams): string {
    const searchParams = new URLSearchParams();

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

    const queryString = searchParams.toString();
    return queryString ? `/?${queryString}` : '/';
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
      params.cloudTypes = cloudTypes.split(',').filter(Boolean) as any;
    }

    const channels = searchParams.get('channels');
    if (channels) {
      params.channels = channels.split(',').filter(Boolean);
    }

    const plugins = searchParams.get('plugins');
    if (plugins) {
      params.plugins = plugins.split(',').filter(Boolean);
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