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
  PIKPAK = 'pikpak',
  XUNLEI = 'xunlei',
  ONE_TWO_THREE = '123',
  MAGNET = 'magnet',
  ED2K = 'ed2k',
  LANZOU = 'lanzou',
  ONEDRIVE = 'onedrive',
  GOOGLEDRIVE = 'googledrive'
}

export type CloudTypeValue = 
  | 'baidu'
  | 'aliyun'
  | 'quark'
  | 'tianyi'
  | 'uc'
  | 'mobile'
  | '115'
  | 'pikpak'
  | 'xunlei'
  | '123'
  | 'magnet'
  | 'ed2k'
  | 'lanzou'
  | 'onedrive'
  | 'googledrive';

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
}

/**
 * 链接信息
 */
export interface Link {
  type: CloudTypeValue;
  cloudType?: CloudTypeValue;
  url: string;
  password: string;
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
  plugins: {
    count: number;
    names: string[];
    info?: Record<string, {
      version?: string;
      description?: string;
      status?: string;
    }>;
  };
  channels: string[];
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