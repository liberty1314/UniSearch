// 公告管理和公告已读状态相关类型。

export type AnnouncementPriority = 'high' | 'medium' | 'low';
export type AnnouncementLifecycleStatus = 'scheduled' | 'active' | 'expired';

export interface Announcement {
  id: number;
  title: string;
  content: string;
  priority: AnnouncementPriority;
  start_time: string;
  end_time: string | null;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string | null;
}

export interface CreateAnnouncementRequest {
  title: string;
  content: string;
  priority: AnnouncementPriority;
  start_time: string;
  end_time?: string;
  is_enabled: boolean;
}

export interface UpdateAnnouncementRequest {
  title: string;
  content: string;
  priority: AnnouncementPriority;
  start_time: string;
  end_time?: string;
  is_enabled: boolean;
}

export interface ListAnnouncementsResponse {
  announcements: Announcement[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ListAnnouncementsFilters {
  keyword?: string;
  priority?: AnnouncementPriority;
  is_enabled?: boolean;
  lifecycle_status?: AnnouncementLifecycleStatus;
}

export interface SetAnnouncementStatusRequest {
  is_enabled: boolean;
}

export interface AnnouncementFeatureEnabledResponse {
  enabled: boolean;
}

export interface SetAnnouncementFeatureEnabledRequest {
  enabled: boolean;
}

export interface AnnouncementReadStatus {
  [announcementId: number]: boolean;
}
