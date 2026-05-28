import type {
  ResourceAction,
  ResourceCapabilities,
  ResourceFacets,
  ResourceObject,
} from '@/types/resource';

// 搜索请求、结果和网盘链接相关类型。

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

export interface FilterConfig {
  include?: string[];
  exclude?: string[];
  mediaTypes?: string[];
}

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
  filter?: FilterConfig;
}

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
  filter?: FilterConfig;
}

export interface Link {
  type: CloudTypeValue;
  cloudType?: CloudTypeValue;
  url: string;
  password: string;
  datetime?: string;
  work_title?: string;
  size?: number;
  updateTime?: string;
  title?: string;
}

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
  source_plugin_id?: string;
  source_type?: string;
  source_name?: string;
  media_type?: string;
  target_type?: string;
  detail_url?: string;
  capabilities?: ResourceCapabilities;
  actions?: ResourceAction[];
  meta?: Record<string, unknown>;
}

export interface MergedLink {
  url: string;
  password: string;
  note: string;
  datetime: string;
  source?: string;
  images?: string[];
}

export type MergedLinks = Record<CloudTypeValue, MergedLink[]>;

export interface SearchSourceWarning {
  source: string;
  message: string;
}

export interface SearchResponse {
  total: number;
  resources: ResourceObject[];
  facets: ResourceFacets;
  warnings?: SearchSourceWarning[];
}
