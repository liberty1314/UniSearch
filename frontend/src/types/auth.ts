// 认证与遗留 API Key 相关类型。

export interface RegisterRequest {
  username: string;
  password: string;
  captcha_token?: string;
}

export interface RegisterResponse {
  access_token: string;
  expires_at: number;
  refresh_token?: string;
  username: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  expires_at: number;
  username: string;
}

export interface VerifyResponse {
  valid: boolean;
  username?: string;
  message?: string;
}

export interface AdminLoginRequest {
  username: string;
  password: string;
}

export interface AdminLoginResponse {
  token: string;
  expires_at: number;
  username?: string;
}

export interface LoginWithRememberRequest {
  username: string;
  password: string;
  remember_me: boolean;
  device_fingerprint?: string;
}

export interface LoginWithRememberResponse {
  access_token: string;
  expires_at: number;
  refresh_token?: string;
  username: string;
}

export interface APIKeyInfoResponse {
  api_key: string;
  expires_at: string;
  daily_search_limit: number;
  today_search_count: number;
  remaining_searches: number;
  is_valid: boolean;
}

export interface RefreshTokenRequest {
  refresh_token: string;
  device_fingerprint: string;
}

export interface RefreshTokenResponse {
  access_token: string;
  expires_at: number;
  refresh_token: string;
}

export interface RevokeRefreshTokenRequest {
  refresh_token: string;
}

export interface CurrentUserResponse {
  id: number;
  username: string;
  role: 'admin' | 'user';
  is_enabled: boolean;
  last_login_at?: string | null;
  monthly_login_days?: string[];
  monthly_login_day_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface APIKeyInfo {
  id: number;
  key: string;
  created_at: string;
  first_used_at: string | null;
  expires_at: string;
  ttl_hours: number;
  is_enabled: boolean;
  description: string;
  daily_search_limit: number;
  today_search_count: number;
  last_search_date: string;
  last_login_at: string | null;
  is_permanent: boolean;
  is_unlimited: boolean;
}

export interface CreateAPIKeyRequest {
  ttl_hours: number;
  description: string;
}

export interface UpdateAPIKeyRequest {
  expires_at?: string;
  extend_hours?: number;
  daily_search_limit?: number;
}

export interface BatchExtendRequest {
  keys: string[];
  extend_hours: number;
}

export interface BatchOperationItem {
  key: string;
  success: boolean;
  error?: string;
  new_expires_at?: string;
}

export interface BatchOperationResult {
  success_count: number;
  failed_count: number;
  results: BatchOperationItem[];
}

export interface BatchCreateRequest {
  count: number;
  ttl_hours: number;
  description_prefix?: string;
}

export interface BatchCreateResult {
  success_count: number;
  failed_count: number;
  keys: APIKeyInfo[];
}
