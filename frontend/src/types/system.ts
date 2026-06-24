import type { PluginInfo } from '@/types/plugin';

// 系统信息、运行配置和搜索可观测性类型。

export interface SystemStats {
  plugin_count: number;
  active_plugin_count: number;
  channel_count: number;
  cache_enabled: boolean;
  proxy_enabled: boolean;
  dau: number;
  mau: number;
}

export interface SystemConfig {
  cache_path: string;
  default_concurrency: number;
  proxy_url: string;
  async_plugin_enabled: boolean;
  async_response_timeout: number;
  async_max_background_workers: number;
  async_max_background_tasks: number;
  http_max_conns: number;
  channels: string[];
}

export interface SystemInfoResponse {
  plugins: PluginInfo[];
  stats: SystemStats;
  config: SystemConfig;
}

export interface SearchKeywordStat {
  keyword: string;
  count: number;
}

export interface SearchMetricError {
  scope: string;
  plugin_name?: string;
  keyword: string;
  message: string;
}

export interface SearchObservabilitySnapshot {
  search_count: Record<string, number>;
  search_error_count: Record<string, number>;
  cache_hit_count: Record<string, number>;
  cache_miss_count: Record<string, number>;
  cache_hit_rate: Record<string, number>;
  average_duration_ms: Record<string, number>;
  result_buckets: Record<string, number>;
  timeout_count: number;
  warning_count: number;
  recent_errors: SearchMetricError[];
  top_keywords: SearchKeywordStat[];
}
