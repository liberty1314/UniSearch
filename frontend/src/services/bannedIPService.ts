import { apiClient } from '../lib/api';
import type { SuccessResponse } from "@/types/common";
import type {
  ListBannedIPsRequest,
  ListBannedIPsResponse,
  CreateBannedIPRequest,
  CreateBannedIPResponse,
} from "@/types/bannedIP";

/**
 * IP 封禁管理服务
 */
export class BannedIPService {
  /**
   * 获取封禁 IP 列表
   */
  static async listBannedIPs(
    page: number = 1,
    size: number = 20,
    keyword?: string
  ): Promise<ListBannedIPsResponse> {
    const params: ListBannedIPsRequest = {
      page,
      size,
    };

    if (keyword) {
      params.keyword = keyword;
    }

    const response = await apiClient.get<ListBannedIPsResponse>('/admin/banned-ips', { params });
    return response;
  }

  /**
   * 手动封禁 IP
   *
   * @param durationMinutes 0 或省略表示永久封禁，>0 表示从现在起封禁的分钟数
   */
  static async banIP(
    ip: string,
    reason?: string,
    durationMinutes?: number
  ): Promise<CreateBannedIPResponse> {
    const data: CreateBannedIPRequest = {
      ip,
    };

    if (reason) {
      data.reason = reason;
    }

    if (typeof durationMinutes === 'number' && durationMinutes > 0) {
      data.duration_minutes = durationMinutes;
    }

    const response = await apiClient.post<CreateBannedIPResponse>('/admin/banned-ips', data);
    return response;
  }

  /**
   * 解封（删除封禁记录）
   */
  static async unbanIP(id: number): Promise<void> {
    await apiClient.delete<SuccessResponse>(`/admin/banned-ips/${id}`);
  }
}
