// API 响应和请求类型定义

/**
 * 通用 API 响应结构
 * 
 * 所有后端 API 接口都遵循此统一响应格式，包含状态码、消息和数据三部分。
 * 前端响应拦截器会自动解包 `data` 字段，使 Service 层直接获得业务数据对象。
 * 
 * @template T - 响应数据的类型，默认为 unknown
 * 
 * @property {number} code - HTTP 状态码（200 表示成功，4xx 表示客户端错误，5xx 表示服务器错误）
 * @property {string} message - 响应消息，成功时为操作描述，失败时为错误描述（中文）
 * @property {T} [data] - 响应数据，包含实际的业务数据对象（可选，错误响应可能不包含此字段）
 * 
 * @example
 * // 成功响应示例
 * {
 *   code: 200,
 *   message: "注册成功",
 *   data: { user_id: 1, username: "test" }
 * }
 * 
 * @example
 * // 错误响应示例
 * {
 *   code: 400,
 *   message: "用户名已存在",
 *   data: { field: "username", constraint: "unique" }
 * }
 */
export interface ApiResponse<T = unknown> {
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
  ext?: Record<string, unknown>;
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
  ext?: Record<string, unknown>;
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
 * 
 * 此类型定义了注册接口的请求参数。
 * 
 * @property {string} username - 用户名（长度限制：3-32 字符）
 * @property {string} password - 密码（长度限制：6-128 字符）
 * 
 * @see RegisterResponse - 注册响应类型
 * @see AuthService.register - 使用此类型的注册方法
 */
export interface RegisterRequest {
  username: string;
  password: string;
}

/**
 * 用户注册响应（数据部分）
 * 
 * 此类型定义了注册接口返回的业务数据结构。
 * 实际 API 返回格式为 `ApiResponse<RegisterResponse>`，即：
 * ```json
 * {
 *   "code": 200,
 *   "message": "注册成功",
 *   "data": {
 *     "user_id": 1,
 *     "username": "test"
 *   }
 * }
 * ```
 * 
 * 前端响应拦截器会自动解包 `data` 字段，Service 层直接获得 `RegisterResponse` 对象。
 * 
 * @property {number} user_id - 新创建的用户 ID
 * @property {string} username - 用户名
 * 
 * @see ApiResponse - 通用 API 响应结构
 * @see AuthService.register - 使用此类型的注册方法
 */
export interface RegisterResponse {
  user_id: number;
  username: string;
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
 * 
 * 此类型定义了基本登录接口返回的数据结构。
 * 实际 API 返回格式为 `ApiResponse<LoginResponse>`。
 * 
 * 注意：此类型用于不支持"记住我"功能的基本登录接口。
 * 如需"记住我"功能，请使用 `LoginWithRememberResponse`。
 * 
 * @property {string} token - JWT 访问令牌
 * @property {number} expires_at - 令牌过期时间（Unix 时间戳，秒）
 * @property {string} username - 用户名
 * 
 * @see ApiResponse - 通用 API 响应结构
 * @see LoginWithRememberResponse - 支持"记住我"的登录响应
 * @see LoginRequest - 登录请求参数
 */
export interface LoginResponse {
  token: string;
  expires_at: number;
  username: string;
}

/**
 * Token 验证响应
 * 
 * 此类型定义了 Token 验证接口返回的数据结构。
 * 实际 API 返回格式为 `ApiResponse<VerifyResponse>`。
 * 
 * 用于验证访问令牌是否有效，以及获取令牌关联的用户信息。
 * 
 * @property {boolean} valid - Token 是否有效
 * @property {string} [username] - 用户名（仅在 valid=true 时返回）
 * @property {string} [message] - 验证消息（通常在 valid=false 时说明原因）
 * 
 * @see ApiResponse - 通用 API 响应结构
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
 * 
 * 此类型定义了登录接口的请求参数。
 * 当 `remember_me` 为 true 时，后端会返回 refresh_token，用于长期保持登录状态。
 * 
 * @property {string} username - 用户名
 * @property {string} password - 密码
 * @property {boolean} remember_me - 是否记住登录状态（true 时返回 refresh_token）
 * @property {string} [device_fingerprint] - 设备指纹，用于识别设备（可选）
 * 
 * @see LoginWithRememberResponse - 登录响应类型
 * @see AuthService.userLogin - 使用此类型的登录方法
 */
export interface LoginWithRememberRequest {
  username: string;
  password: string;
  remember_me: boolean;
  device_fingerprint?: string;
}

/**
 * 支持"记住我"的登录响应（数据部分）
 * 
 * 此类型定义了登录接口返回的业务数据结构。
 * 实际 API 返回格式为 `ApiResponse<LoginWithRememberResponse>`，即：
 * ```json
 * {
 *   "code": 200,
 *   "message": "登录成功",
 *   "data": {
 *     "access_token": "eyJhbGc...",
 *     "expires_at": 1234567890,
 *     "refresh_token": "eyJhbGc...",
 *     "username": "test"
 *   }
 * }
 * ```
 * 
 * 前端响应拦截器会自动解包 `data` 字段，Service 层直接获得 `LoginWithRememberResponse` 对象。
 * 
 * @property {string} access_token - JWT 访问令牌，用于后续 API 请求的身份验证
 * @property {number} expires_at - 访问令牌过期时间（Unix 时间戳，秒）
 * @property {string} [refresh_token] - 刷新令牌，仅在 remember_me=true 时返回，用于获取新的访问令牌
 * @property {string} username - 用户名
 * 
 * @see ApiResponse - 通用 API 响应结构
 * @see LoginWithRememberRequest - 登录请求参数
 * @see AuthService.userLogin - 使用此类型的登录方法
 */
export interface LoginWithRememberResponse {
  access_token: string;
  expires_at: number;
  refresh_token?: string; // 仅在 remember_me=true 时返回
  username: string;
}

/**
 * 用户 API Key 信息响应（数据部分）
 * 
 * 此类型定义了获取用户 API Key 信息接口返回的业务数据结构。
 * 实际 API 返回格式为 `ApiResponse<APIKeyInfoResponse>`，即：
 * ```json
 * {
 *   "code": 200,
 *   "message": "获取成功",
 *   "data": {
 *     "api_key": "sk_test_...",
 *     "expires_at": "2024-12-31T23:59:59Z",
 *     "daily_search_limit": 100,
 *     "today_search_count": 10,
 *     "remaining_searches": 90,
 *     "is_valid": true
 *   }
 * }
 * ```
 * 
 * 前端响应拦截器会自动解包 `data` 字段，Service 层直接获得 `APIKeyInfoResponse` 对象。
 * 
 * @property {string} api_key - API Key 字符串
 * @property {string} expires_at - API Key 过期时间（ISO 8601 格式）
 * @property {number} daily_search_limit - 每日搜索次数限制（0 表示不限制）
 * @property {number} today_search_count - 今日已使用的搜索次数
 * @property {number} remaining_searches - 今日剩余可用搜索次数
 * @property {boolean} is_valid - API Key 是否有效（未过期且未被禁用）
 * 
 * @see ApiResponse - 通用 API 响应结构
 * @see AuthService.getUserApiKeyInfo - 使用此类型的获取 API Key 信息方法
 * @see AuthService.unbindApiKey - 解绑 API Key 的方法
 */
export interface APIKeyInfoResponse {
  api_key: string;
  expires_at: string;
  daily_search_limit: number;
  today_search_count: number;
  remaining_searches: number;
  is_valid: boolean;
}

/**
 * 刷新令牌请求
 * 
 * 此类型定义了刷新访问令牌的请求参数。
 * 使用 refresh_token 可以在访问令牌过期后获取新的访问令牌，无需重新登录。
 * 
 * @property {string} refresh_token - 刷新令牌（从登录响应中获得）
 * @property {string} device_fingerprint - 设备指纹，必须与登录时的设备指纹匹配
 * 
 * @see RefreshTokenResponse - 刷新令牌响应类型
 * @see LoginWithRememberResponse - 登录时获得 refresh_token
 */
export interface RefreshTokenRequest {
  refresh_token: string;
  device_fingerprint: string;
}

/**
 * 刷新令牌响应
 * 
 * 此类型定义了刷新访问令牌接口返回的数据结构。
 * 实际 API 返回格式为 `ApiResponse<RefreshTokenResponse>`。
 * 
 * 采用 Token 轮转机制：每次刷新都会返回新的 refresh_token，旧的 refresh_token 将失效。
 * 这提高了安全性，防止 refresh_token 被盗用后长期有效。
 * 
 * @property {string} access_token - 新的 JWT 访问令牌
 * @property {number} expires_at - 新访问令牌的过期时间（Unix 时间戳，秒）
 * @property {string} refresh_token - 新的刷新令牌（Token 轮转机制，旧令牌将失效）
 * 
 * @see ApiResponse - 通用 API 响应结构
 * @see RefreshTokenRequest - 刷新令牌请求参数
 */
export interface RefreshTokenResponse {
  access_token: string;
  expires_at: number;
  refresh_token: string; // 新的刷新令牌（Token 轮转）
}

/**
 * 撤销刷新令牌请求
 * 
 * 此类型定义了撤销刷新令牌的请求参数。
 * 用于用户主动登出或安全原因需要使 refresh_token 失效的场景。
 * 
 * @property {string} refresh_token - 要撤销的刷新令牌
 * 
 * @see RefreshTokenResponse - 刷新令牌响应类型
 */
export interface RevokeRefreshTokenRequest {
  refresh_token: string;
}

/**
 * API Key 信息
 */
export interface APIKeyInfo {
  id: number;
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
  last_login_at: string | null; // 最后登录时间
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
  status: 'active' | 'inactive' | 'error' | 'custom';
  plugin_type: 'builtin' | 'custom';
  is_enabled: boolean;
  description: string;
  url?: string;
}

export interface CreatePluginRequest {
  name: string;
  url: string;
  priority: number;
  description: string;
}

export interface CreatePluginResponse {
  success: boolean;
  message: string;
  plugin?: {
    name: string;
    url: string;
    priority: number;
    description: string;
    plugin_type: 'custom';
    is_enabled: boolean;
  };
}

export interface TestURLRequest {
  url: string;
}

export interface TestURLResponse {
  success: boolean;
  message: string;
  error?: string;
  status_code?: number;
}

export interface BatchPluginStatusRequest {
  plugin_names: string[];
  is_enabled: boolean;
}

export interface BatchDeletePluginsRequest {
  plugin_names: string[];
}

export interface BatchPluginOperationError {
  plugin_name: string;
  error: string;
  code: string;
}

export interface BatchPluginOperationResponse {
  success_count: number;
  failed_count: number;
  success: string[];
  failed: BatchPluginOperationError[];
}

export type AdminDialogMode = 'view' | 'edit';

/**
 * 系统统计信息
 */
export interface SystemStats {
  plugin_count: number;
  active_plugin_count: number;
  channel_count: number;
  cache_enabled: boolean;
  proxy_enabled: boolean;
  dau: number;  // 日活跃用户数
  mau: number;  // 月活跃用户数
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

// ============ TG 频道管理相关类型 ============

/**
 * Telegram 频道信息
 */
export interface TGChannel {
  id: number;
  name: string;
  is_enabled: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  health_status?: 'healthy' | 'error' | 'untested';
  last_checked_at?: string | null;
  last_error?: string;
  check_source?: 'manual_test' | 'batch_test' | 'system' | string;
}

export interface BatchChannelStatusRequest {
  channel_ids: number[];
  is_enabled: boolean;
}

export interface BatchDeleteChannelsRequest {
  channel_ids: number[];
}

export interface BatchChannelOperationError {
  channel_id: number;
  error: string;
  code: string;
}

export interface BatchChannelOperationResponse {
  success_count: number;
  failed_count: number;
  success: number[];
  failed: BatchChannelOperationError[];
}

/**
 * TG 频道健康汇总
 */
export interface ChannelHealthSummary {
  total: number;
  healthy: number;
  error: number;
  untested: number;
  enabled_error: number;
}

/**
 * TG 频道列表响应
 */
export interface ListTGChannelsResponse {
  channels: TGChannel[];
  total: number;
  health_summary?: ChannelHealthSummary;
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
  restore_if_deleted?: boolean;
}

export interface CreateUserResponse extends UserInfo {
  restored?: boolean;
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
 * 
 * 此类型定义了简单成功操作的响应数据结构。
 * 实际 API 返回格式为 `ApiResponse<SuccessResponse>`。
 * 
 * 用于不需要返回具体数据的操作，如删除、更新状态等。
 * 
 * @property {string} message - 成功消息描述
 * 
 * @see ApiResponse - 通用 API 响应结构
 * 
 * @example
 * // API 返回示例
 * {
 *   "code": 200,
 *   "message": "操作成功",
 *   "data": {
 *     "message": "API Key 解绑成功"
 *   }
 * }
 */
export interface SuccessResponse {
  message: string;
}

/**
 * 错误响应
 * 
 * 此类型定义了错误情况下的响应数据结构。
 * 实际 API 返回格式为 `ApiResponse<ErrorResponse>`。
 * 
 * 当 API 请求失败时，后端会返回此格式的错误信息。
 * 前端错误拦截器会自动提取 `message` 字段并展示给用户。
 * 
 * @property {string} error - 错误描述信息（中文）
 * @property {string} code - 错误代码（用于程序化处理）
 * 
 * @see ApiResponse - 通用 API 响应结构
 * 
 * @example
 * // API 错误响应示例
 * {
 *   "code": 400,
 *   "message": "请求参数无效",
 *   "data": {
 *     "error": "用户名长度必须在3-32字符之间",
 *     "code": "VALIDATION_ERROR"
 *   }
 * }
 */
export interface ErrorResponse {
  error: string;
  code: string;
}

// ============ 公告管理相关类型 ============

/**
 * 公告优先级
 */
export type AnnouncementPriority = 'high' | 'medium' | 'low';

/**
 * 公告信息
 * 
 * 此类型定义了公告的完整数据结构。
 * 
 * @property {number} id - 公告 ID
 * @property {string} title - 公告标题（最大 200 字符）
 * @property {string} content - 公告内容（HTML 格式）
 * @property {AnnouncementPriority} priority - 优先级（high/medium/low）
 * @property {string} start_time - 生效时间（ISO 8601 格式）
 * @property {string | null} end_time - 失效时间（ISO 8601 格式，null 表示永久有效）
 * @property {boolean} is_enabled - 是否启用
 * @property {string} created_at - 创建时间（ISO 8601 格式）
 * @property {string} updated_at - 更新时间（ISO 8601 格式）
 * @property {string} created_by - 创建者用户名
 * @property {string | null} updated_by - 最后更新者用户名（可选）
 */
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

/**
 * 创建公告请求
 * 
 * 此类型定义了创建公告接口的请求参数。
 * 
 * @property {string} title - 公告标题（必填，最大 200 字符）
 * @property {string} content - 公告内容（必填，HTML 格式）
 * @property {AnnouncementPriority} priority - 优先级（必填，high/medium/low）
 * @property {string} start_time - 生效时间（必填，ISO 8601 格式）
 * @property {string} [end_time] - 失效时间（可选，ISO 8601 格式）
 * @property {boolean} is_enabled - 是否启用（必填）
 * 
 * @see Announcement - 公告信息类型
 */
export interface CreateAnnouncementRequest {
  title: string;
  content: string;
  priority: AnnouncementPriority;
  start_time: string;
  end_time?: string;
  is_enabled: boolean;
}

/**
 * 更新公告请求
 * 
 * 此类型定义了更新公告接口的请求参数。
 * 
 * @property {string} title - 公告标题（必填，最大 200 字符）
 * @property {string} content - 公告内容（必填，HTML 格式）
 * @property {AnnouncementPriority} priority - 优先级（必填，high/medium/low）
 * @property {string} start_time - 生效时间（必填，ISO 8601 格式）
 * @property {string} [end_time] - 失效时间（可选，ISO 8601 格式）
 * @property {boolean} is_enabled - 是否启用（必填）
 * 
 * @see Announcement - 公告信息类型
 */
export interface UpdateAnnouncementRequest {
  title: string;
  content: string;
  priority: AnnouncementPriority;
  start_time: string;
  end_time?: string;
  is_enabled: boolean;
}

/**
 * 公告列表响应（数据部分）
 * 
 * 此类型定义了获取公告列表接口返回的业务数据结构。
 * 实际 API 返回格式为 `ApiResponse<ListAnnouncementsResponse>`。
 * 
 * @property {Announcement[]} announcements - 公告列表
 * @property {number} total - 总数量
 * @property {number} page - 当前页码
 * @property {number} page_size - 每页数量
 * @property {number} total_pages - 总页数
 * 
 * @see ApiResponse - 通用 API 响应结构
 * @see Announcement - 公告信息类型
 */
export interface ListAnnouncementsResponse {
  announcements: Announcement[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

/**
 * 设置公告状态请求
 * 
 * 此类型定义了设置公告启用/禁用状态的请求参数。
 * 
 * @property {boolean} is_enabled - 是否启用
 */
export interface SetAnnouncementStatusRequest {
  is_enabled: boolean;
}

/**
 * 公告功能启用状态响应（数据部分）
 * 
 * 此类型定义了获取公告功能启用状态接口返回的业务数据结构。
 * 实际 API 返回格式为 `ApiResponse<AnnouncementFeatureEnabledResponse>`。
 * 
 * @property {boolean} enabled - 公告功能是否启用
 * 
 * @see ApiResponse - 通用 API 响应结构
 */
export interface AnnouncementFeatureEnabledResponse {
  enabled: boolean;
}

/**
 * 设置公告功能启用状态请求
 * 
 * 此类型定义了设置公告功能启用/禁用状态的请求参数。
 * 
 * @property {boolean} enabled - 是否启用公告功能
 */
export interface SetAnnouncementFeatureEnabledRequest {
  enabled: boolean;
}

/**
 * 已读状态存储结构
 * 
 * 此类型定义了本地存储中公告已读状态的数据结构。
 * 存储在 localStorage 中，key 为 `announcement_read_status`。
 * 
 * @example
 * {
 *   "1": true,
 *   "2": true,
 *   "5": true
 * }
 * 
 * @description
 * - key: 公告 ID（数字）
 * - value: true 表示用户选择了"不再提示"
 */
export interface AnnouncementReadStatus {
  [announcementId: number]: boolean;
}
