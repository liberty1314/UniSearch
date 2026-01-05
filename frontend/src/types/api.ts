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
  password: string;
}

/**
 * 管理员登录响应
 */
export interface AdminLoginResponse {
  token: string;
  expires_at: number;
}

/**
 * API Key 信息
 */
export interface APIKeyInfo {
  key: string;
  created_at: string;
  expires_at: string;
  is_enabled: boolean;
  description: string;
}

/**
 * 创建 API Key 请求
 */
export interface CreateAPIKeyRequest {
  ttl_hours: number;
  description: string;
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
  enabled: boolean;
  status?: 'active' | 'inactive' | 'error';
  description?: string;
}