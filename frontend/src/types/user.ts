// 后台用户管理相关类型。

export interface UserInfo {
  id: number;
  username: string;
  role: 'admin' | 'user';
  is_enabled: boolean;
  last_login_at: string | null;
  monthly_login_days?: string[];
  monthly_login_day_count?: number;
  created_at: string;
  updated_at: string;
}

export interface ListUsersRequest {
  page?: number;
  page_size?: number;
  keyword?: string;
  role?: 'admin' | 'user';
}

export interface ListUsersResponse {
  users: UserInfo[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface AdminUserStats {
  total_users: number;
  month_new_users: number;
  seven_day_active_users: number;
  inactive_30_day_users: number;
}

export interface CreateUserRequest {
  username: string;
  password: string;
  role: 'admin' | 'user';
  restore_if_deleted?: boolean;
}

export interface CreateUserResponse extends UserInfo {
  restored?: boolean;
}

export interface UpdateUserRequest {
  username: string;
  role: 'admin' | 'user';
}

export interface ResetPasswordRequest {
  password: string;
}

export interface SetUserStatusRequest {
  is_enabled: boolean;
}

export interface BatchDeleteUsersRequest {
  user_ids: number[];
}

export interface BatchUpdateRoleRequest {
  user_ids: number[];
  role: 'admin' | 'user';
}

export interface BatchUserOperationError {
  id: number;
  error: string;
}

export interface BatchUserOperationResult {
  success_count: number;
  failed_count: number;
  success: number[];
  failed: BatchUserOperationError[];
}
