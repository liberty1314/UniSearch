// 通用 API 类型，供业务领域类型复用。

export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data?: T;
}

export interface HealthResponse {
  status: string;
  auth_enabled?: boolean;
  plugins_enabled?: boolean;
  plugin_count?: number;
  plugins?: string[];
  channels_count?: number;
  channels?: string[];
}

export interface SuccessResponse {
  message: string;
}

export interface ErrorResponse {
  error: string;
  code: string;
}
