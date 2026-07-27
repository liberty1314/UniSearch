export interface SearchAuditLog {
  id: number;
  user_id: number;
  username: string;
  keyword: string;
  result_count: number;
  scope: string;
  client_ip: string;
  request_id: string;
  created_at: string;
}

export interface ListSearchAuditParams {
  page: number;
  size: number;
  username?: string;
  keyword?: string;
  ip?: string;
  start?: string;
  end?: string;
}

export interface ListSearchAuditResponse {
  items: SearchAuditLog[];
  total: number;
  page: number;
  size: number;
}

export interface CleanupSearchAuditResponse {
  success: boolean;
  deleted: number;
}
