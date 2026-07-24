// 后台 IP 封禁管理相关类型。

export type BannedIPSource = 'auto' | 'manual';

export interface BannedIP {
  id: number;
  ip: string;
  reason: string;
  source: BannedIPSource;
  expires_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ListBannedIPsRequest {
  page?: number;
  size?: number;
  keyword?: string;
}

export interface ListBannedIPsResponse {
  items: BannedIP[];
  total: number;
  page: number;
  size: number;
}

export interface CreateBannedIPRequest {
  ip: string;
  reason?: string;
  duration_minutes?: number;
}

export interface CreateBannedIPResponse {
  success: boolean;
  item: BannedIP;
}
