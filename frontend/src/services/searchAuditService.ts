import { apiClient } from '../lib/api';
import type {
  ListSearchAuditParams,
  ListSearchAuditResponse,
  CleanupSearchAuditResponse,
} from '@/types/searchAudit';

/**
 * 搜索审计日志服务
 */
export class SearchAuditService {
  /**
   * 分页查询搜索审计记录
   */
  static async list(params: ListSearchAuditParams): Promise<ListSearchAuditResponse> {
    const query: Record<string, string | number> = {
      page: params.page,
      size: params.size,
    };
    if (params.username) query.username = params.username;
    if (params.keyword) query.keyword = params.keyword;
    if (params.ip) query.ip = params.ip;
    if (params.start) query.start = params.start;
    if (params.end) query.end = params.end;

    return apiClient.get<ListSearchAuditResponse>('/admin/search-audit', { params: query });
  }

  /**
   * 清理指定留存天数之前的搜索审计记录
   */
  static async cleanup(days: number): Promise<CleanupSearchAuditResponse> {
    return apiClient.delete<CleanupSearchAuditResponse>('/admin/search-audit', {
      params: { days },
    });
  }
}
