import { apiClient } from '../lib/api';
import type {
  Announcement,
  CreateAnnouncementRequest,
  UpdateAnnouncementRequest,
  ListAnnouncementsResponse,
  ListAnnouncementsFilters,
  SetAnnouncementStatusRequest,
  AnnouncementFeatureEnabledResponse,
  SetAnnouncementFeatureEnabledRequest,
} from '../types/api';

/**
 * 公告管理服务
 * 
 * 提供公告的 CRUD 操作、状态管理和功能开关控制。
 * 所有管理接口需要管理员权限，用户接口需要登录认证。
 */
export class AnnouncementService {
  /**
   * 获取公告列表（管理员）
   * 
   * @param page - 页码（默认 1）
   * @param pageSize - 每页数量（默认 20）
   * @param sortBy - 排序字段（created_at/priority/start_time，默认 created_at）
   * @param sortOrder - 排序方向（asc/desc，默认 desc）
   * @returns 公告列表响应
   * 
   * @example
   * const response = await AnnouncementService.listAnnouncements(1, 20, 'created_at', 'desc');
   */
  static async listAnnouncements(
    page: number = 1,
    pageSize: number = 20,
    sortBy?: string,
    sortOrder?: 'asc' | 'desc',
    filters?: ListAnnouncementsFilters
  ): Promise<ListAnnouncementsResponse> {
    const params: Record<string, unknown> = {
      page,
      page_size: pageSize,
    };

    if (sortBy) {
      params.sort_by = sortBy;
    }

    if (sortOrder) {
      params.sort_order = sortOrder;
    }
    if (filters?.keyword) {
      params.keyword = filters.keyword;
    }
    if (filters?.priority) {
      params.priority = filters.priority;
    }
    if (typeof filters?.is_enabled === 'boolean') {
      params.is_enabled = filters.is_enabled;
    }
    if (filters?.lifecycle_status) {
      params.lifecycle_status = filters.lifecycle_status;
    }

    const response = await apiClient.get<ListAnnouncementsResponse>('/announcements', { params });
    return response;
  }

  /**
   * 获取当前有效公告（用户端）
   * 
   * 返回满足以下条件的公告：
   * - 启用状态为 true
   * - 当前时间 >= 生效时间
   * - 失效时间为空 OR 当前时间 <= 失效时间
   * - 按优先级（high > medium > low）和创建时间倒序排序
   * 
   * 注意：此接口会检查系统设置中的公告功能开关，如果功能未启用，返回空数组。
   * 
   * @returns 有效公告列表
   * 
   * @example
   * const announcements = await AnnouncementService.getActiveAnnouncements();
   */
  static async getActiveAnnouncements(): Promise<Announcement[]> {
    const response = await apiClient.get<Announcement[]>('/announcements/active');
    return response;
  }

  /**
   * 获取单个公告（管理员）
   * 
   * @param id - 公告 ID
   * @returns 公告详细信息
   * 
   * @example
   * const announcement = await AnnouncementService.getAnnouncement(1);
   */
  static async getAnnouncement(id: number): Promise<Announcement> {
    const response = await apiClient.get<Announcement>(`/announcements/${id}`);
    return response;
  }

  /**
   * 创建公告（管理员）
   * 
   * @param data - 创建公告请求数据（内容字段使用 Markdown）
   * @returns 创建的公告信息
   * 
   * @example
   * const announcement = await AnnouncementService.createAnnouncement({
   *   title: '系统维护通知',
   *   content: '## 系统维护通知\n\n系统将于今晚进行维护...',
   *   priority: 'high',
   *   start_time: '2024-01-20T00:00:00Z',
   *   end_time: '2024-01-21T00:00:00Z',
   *   is_enabled: true
   * });
   */
  static async createAnnouncement(data: CreateAnnouncementRequest): Promise<Announcement> {
    const response = await apiClient.post<Announcement>('/announcements', data);
    return response;
  }

  /**
   * 更新公告（管理员）
   * 
   * @param id - 公告 ID
   * @param data - 更新公告请求数据（内容字段使用 Markdown）
   * @returns 更新后的公告信息
   * 
   * @example
   * const announcement = await AnnouncementService.updateAnnouncement(1, {
   *   title: '系统维护通知(更新)',
   *   content: '维护时间调整到今晚 23:00',
   *   priority: 'medium',
   *   start_time: '2024-01-20T02:00:00Z',
   *   end_time: '2024-01-21T02:00:00Z',
   *   is_enabled: true
   * });
   */
  static async updateAnnouncement(
    id: number,
    data: UpdateAnnouncementRequest
  ): Promise<Announcement> {
    const response = await apiClient.put<Announcement>(`/announcements/${id}`, data);
    return response;
  }

  /**
   * 删除公告（管理员）
   * 
   * @param id - 公告 ID
   * 
   * @example
   * await AnnouncementService.deleteAnnouncement(1);
   */
  static async deleteAnnouncement(id: number): Promise<void> {
    await apiClient.delete<void>(`/announcements/${id}`);
  }

  /**
   * 设置公告状态（管理员）
   * 
   * @param id - 公告 ID
   * @param isEnabled - 是否启用
   * 
   * @example
   * await AnnouncementService.setAnnouncementStatus(1, false);
   */
  static async setAnnouncementStatus(id: number, isEnabled: boolean): Promise<void> {
    const data: SetAnnouncementStatusRequest = {
      is_enabled: isEnabled,
    };

    await apiClient.post<void>(`/announcements/${id}/status`, data);
  }

  /**
   * 获取公告功能启用状态（公开接口）
   * 
   * 此接口无需认证，用于前端判断是否显示公告相关功能。
   * 
   * @returns 公告功能是否启用
   * 
   * @example
   * const enabled = await AnnouncementService.getAnnouncementFeatureEnabled();
   */
  static async getAnnouncementFeatureEnabled(): Promise<boolean> {
    const response = await apiClient.get<AnnouncementFeatureEnabledResponse>(
      '/system-settings/announcement-enabled'
    );
    return response.enabled;
  }

  /**
   * 设置公告功能启用状态（管理员）
   * 
   * @param enabled - 是否启用公告功能
   * 
   * @example
   * await AnnouncementService.setAnnouncementFeatureEnabled(true);
   */
  static async setAnnouncementFeatureEnabled(enabled: boolean): Promise<void> {
    const data: SetAnnouncementFeatureEnabledRequest = {
      enabled,
    };

    await apiClient.post<void>('/system-settings/announcement-enabled', data);
  }
}
