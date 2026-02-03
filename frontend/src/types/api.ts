// API 响应和请求类型定义

/**
 * 通用 API 响应结构
 */
export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data?: T;
}

/**
 * 网盘类型枚举
 */
export enum CloudType {
  BAIDU = 'baidu',
  ALIYUN = 'aliyun',
  QUARK = 'quark',
  TIANYI = 'tianyi',
  UC = 'uc',
  MOBILE = 'mobile',
  ONE_ONE_FIVE = '115',
  XUNLEI = 'xunlei',
  ONE_TWO_THREE = '123',
  MAGNET = 'magnet',
  LANZOU = 'lanzou',
}

export type CloudTypeValue =
  | 'baidu'
  | 'aliyun'
  | 'quark'
  | 'tianyi'
  | 'uc'
  | 'mobile'
  | '115'
  | 'xunlei'
  | '123'
  | 'magnet'
  | 'lanzou';

/**
 * 过滤配置
 */
export interface FilterConfig {
  include?: string[]; // 包含关键词列表（OR关系）
  exclude?: string[]; // 排除关键词列表（AND关系）
}

/**
 * 搜索请求参数
 */
export interface SearchRequest {
  kw: string;
  channels?: string[];
  plugins?: string[];
  cloud_types?: CloudTypeValue[];
  src?: 'all' | 'tg' | 'plugin';
  res?: 'all' | 'results' | 'merge';
  conc?: number;
  refresh?: boolean;
  ext?: Record<string, any>;
  filter?: FilterConfig; // 过滤配置
}

/**
 * 前端搜索参数（更友好的接口）
 */
export interface SearchParams {
  keyword: string;
  channels?: string[];
  plugins?: string[];
  cloudTypes?: CloudTypeValue[];
  source?: 'all' | 'tg' | 'plugin';
  resultType?: 'all' | 'results' | 'merge';
  concurrency?: number;
  refresh?: boolean;
  ext?: Record<string, any>;
  filter?: FilterConfig; // 过滤配置
}

/**
 * 链接信息
 */
export interface Link {
  type: CloudTypeValue;
  cloudType?: CloudTypeValue;
  url: string;
  password: string;
  datetime?: string; // 链接更新时间（可选）
  work_title?: string; // 作品标题（用于区分同一消息中多个作品的链接）
  size?: number;
  updateTime?: string;
  title?: string;
}

/**
 * 搜索结果项
 */
export interface SearchResult {
  message_id: string;
  unique_id: string;
  channel: string;
  datetime: string;
  title: string;
  content: string;
  links: Link[];
  tags?: string[];
  images?: string[];
}

/**
 * 合并后的链接
 */
export interface MergedLink {
  url: string;
  password: string;
  note: string;
  datetime: string;
  source?: string;
  images?: string[];
}

/**
 * 按网盘类型合并的链接
 */
export type MergedLinks = Record<CloudTypeValue, MergedLink[]>;

/**
 * 搜索响应数据
 */
export interface SearchResponse {
  total: number;
  results?: SearchResult[];
  merged_by_type?: MergedLinks;
}

/**
 * 健康检查响应
 */
export interface HealthResponse {
  status: string;
  auth_enabled?: boolean; // 是否启用认证
  plugins_enabled?: boolean; // 是否启用插件
  plugin_count?: number;
  plugins?: string[];
  channels_count?: number;
  channels?: string[];
}

/**
 * 用户注册请求
 */
export interface RegisterRequest {
  username: string;
  password: string;
}

/**
 * 用户注册响应
 */
export interface RegisterResponse {
  user_id: number;
  username: string;
  message: string;
}

/**
 * 登录请求
 */
export interface LoginRequest {
  username: string;
  password: string;
}

/**
 * 登录响应
 */
export interface LoginResponse {
  token: string;
  expires_at: number;
  username: string;
}

/**
 * Token 验证响应
 */
export interface VerifyResponse {
  valid: boolean;
  username?: string;
  message?: string;
}

/**
 * 管理员登录请求
 */
export interface AdminLoginRequest {
  username: string;
  password: string;
}

/**
 * 管理员登录响应
 */
export interface AdminLoginResponse {
  token: string;
  expires_at: number;
  username?: string; // 可选字段，用于 API Key 登录
}

/**
 * 支持"记住我"的登录请求
 */
export interface LoginWithRememberRequest {
  username: string;
  password: string;
  remember_me: boolean;
  device_fingerprint?: string;
}

/**
 * 支持"记住我"的登录响应
 */
export interface LoginWithRememberResponse {
  access_token: string;
  expires_at: number;
  refresh_token?: string; // 仅在 remember_me=true 时返回
  username: string;
}

/**
 * 刷新令牌请求
 */
export interface RefreshTokenRequest {
  refresh_token: string;
  device_fingerprint: string;
}

/**
 * 刷新令牌响应
 */
export interface RefreshTokenResponse {
  access_token: string;
  expires_at: number;
  refresh_token: string; // 新的刷新令牌（Token 轮转）
}

/**
 * 撤销刷新令牌请求
 */
export interface RevokeRefreshTokenRequest {
  refresh_token: string;
}

/**
 * API Key 信息
 */
export interface APIKeyInfo {
  key: string;
  created_at: string;
  first_used_at: string | null; // 首次使用时间，null 表示未使用
  expires_at: string;
  ttl_hours: number; // 有效期（小时）
  is_enabled: boolean;
  description: string;
  daily_search_limit: number; // 每日搜索次数限制（0表示不限制）
  today_search_count: number; // 今日已搜索次数
  last_search_date: string; // 上次搜索日期
  is_permanent: boolean; // 是否为永久密钥（管理员专用，不可编辑删除）
  is_unlimited: boolean; // 是否无限制（无搜索次数限制）
}

/**
 * 创建 API Key 请求
 */
export interface CreateAPIKeyRequest {
  ttl_hours: number;
  description: string;
}

/**
 * 更新 API Key 请求
 */
export interface UpdateAPIKeyRequest {
  expires_at?: string; // 可选：直接设置过期时间（ISO 8601 格式）
  extend_hours?: number; // 可选：延长小时数
  daily_search_limit?: number; // 可选：每日搜索次数限制
}

/**
 * 批量延长请求
 */
export interface BatchExtendRequest {
  keys: string[];
  extend_hours: number;
}

/**
 * 批量操作单项结果
 */
export interface BatchOperationItem {
  key: string;
  success: boolean;
  error?: string;
  new_expires_at?: string;
}

/**
 * 批量操作结果
 */
export interface BatchOperationResult {
  success_count: number;
  failed_count: number;
  results: BatchOperationItem[];
}

/**
 * 批量创建请求
 */
export interface BatchCreateRequest {
  count: number;
  ttl_hours: number;
  description_prefix?: string;
}

/**
 * 批量创建结果
 */
export interface BatchCreateResult {
  success_count: number;
  failed_count: number;
  keys: APIKeyInfo[];
}

/**
 * 网盘类型配置
 */
export interface CloudTypeConfig {
  type: CloudTypeValue;
  name: string;
  color: string;
  icon?: string;
}

/**
 * 插件信息
 */
export interface PluginInfo {
  name: string;
  priority: number;
  status: 'active' | 'inactive' | 'error';
  description: string;
}

/**
 * 系统统计信息
 */
export interface SystemStats {
  plugin_count: number;
  active_plugin_count: number;
  channel_count: number;
  cache_enabled: boolean;
  proxy_enabled: boolean;
}

/**
 * 系统配置信息
 */
export interface SystemConfig {
  // 缓存配置
  cache_path: string;
  cache_max_size_mb: number;
  cache_ttl_minutes: number;

  // 并发配置
  default_concurrency: number;

  // 代理配置
  proxy_url: string;

  // 异步插件配置
  async_plugin_enabled: boolean;
  async_response_timeout: number;
  async_max_background_workers: number;
  async_max_background_tasks: number;

  // HTTP服务器配置
  http_max_conns: number;

  // 频道列表
  channels: string[];
}

/**
 * 系统信息响应
 */
export interface SystemInfoResponse {
  plugins: PluginInfo[];
  stats: SystemStats;
  config: SystemConfig;
}

// ============ 用户管理相关类型 ============

/**
 * 用户信息
 */
export interface UserInfo {
  id: number;
  username: string;
  role: 'admin' | 'user';
  is_enabled: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * 用户列表查询请求
 */
export interface ListUsersRequest {
  page?: number;
  page_size?: number;
  keyword?: string;
  role?: 'admin' | 'user';
}

/**
 * 用户列表查询响应
 */
export interface ListUsersResponse {
  users: UserInfo[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

/**
 * 创建用户请求
 */
export interface CreateUserRequest {
  username: string;
  password: string;
  role: 'admin' | 'user';
}

/**
 * 更新用户请求
 */
export interface UpdateUserRequest {
  username: string;
  role: 'admin' | 'user';
}

/**
 * 重置密码请求
 */
export interface ResetPasswordRequest {
  password: string;
}

/**
 * 设置用户状态请求
 */
export interface SetUserStatusRequest {
  is_enabled: boolean;
}

/**
 * 批量删除用户请求
 */
export interface BatchDeleteUsersRequest {
  user_ids: number[];
}

/**
 * 批量修改角色请求
 */
export interface BatchUpdateRoleRequest {
  user_ids: number[];
  role: 'admin' | 'user';
}

/**
 * 批量操作错误项
 */
export interface BatchUserOperationError {
  id: number;
  error: string;
}

/**
 * 批量操作结果
 */
export interface BatchUserOperationResult {
  success_count: number;
  failed_count: number;
  success: number[];
  failed: BatchUserOperationError[];
}

/**
 * 成功响应
 */
export interface SuccessResponse {
  message: string;
}

/**
 * 错误响应
 */
export interface ErrorResponse {
  error: string;
  code: string;
}
