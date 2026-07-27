import { apiClient } from '../lib/api';
import type {
  ListAdminAuditParams,
  ListAdminAuditResponse,
  CleanupAdminAuditResponse,
} from '@/types/adminAudit';

/**
 * 操作审计日志服务
 */
export class AdminAuditService {
  /**
   * 分页查询操作审计记录
   */
  static async list(params: ListAdminAuditParams): Promise<ListAdminAuditResponse> {
    const query: Record<string, string | number> = {
      page: params.page,
      size: params.size,
    };
    if (params.operator) query.operator = params.operator;
    if (params.action) query.action = params.action;
    if (params.path) query.path = params.path;
    if (params.start) query.start = params.start;
    if (params.end) query.end = params.end;

    return apiClient.get<ListAdminAuditResponse>('/admin/admin-audit', { params: query });
  }

  /**
   * 清理指定留存天数之前的操作审计记录
   */
  static async cleanup(days: number): Promise<CleanupAdminAuditResponse> {
    return apiClient.delete<CleanupAdminAuditResponse>('/admin/admin-audit', {
      params: { days },
    });
  }
}
