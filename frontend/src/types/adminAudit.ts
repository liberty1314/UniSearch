export interface AdminAuditLog {
  id: number;
  operator_id: number;
  operator: string;
  method: string;
  path: string;
  action: string;
  target: string;
  status_code: number;
  client_ip: string;
  request_id: string;
  created_at: string;
}

export interface ListAdminAuditParams {
  page: number;
  size: number;
  operator?: string;
  action?: string;
  path?: string;
  start?: string;
  end?: string;
}

export interface ListAdminAuditResponse {
  items: AdminAuditLog[];
  total: number;
  page: number;
  size: number;
}

export interface CleanupAdminAuditResponse {
  success: boolean;
  deleted: number;
}
