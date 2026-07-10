import type { PluginInfo } from '@/types/plugin';

export interface PluginMetricsRealtimeSnapshot {
  active_plugin_count: number;
  avg_response_ms: number;
  success_rate: number;
  timeout_rate: number;
  error_count: number;
  items: PluginMetricsRealtimeItem[];
}

export interface PluginMetricsRealtimeItem {
  plugin_name: string;
  request_count: number;
  success_count: number;
  timeout_count: number;
  deferred_count?: number;
  partial_success_count?: number;
  detail_success_count?: number;
  fallback_count?: number;
  error_count: number;
  cache_hit_count: number;
  max_concurrent_requests: number;
  avg_response_ms: number;
  p50_response_ms: number;
  p95_response_ms: number;
  p99_response_ms: number;
  success_rate: number;
  timeout_rate: number;
  last_error?: string;
}

export interface PluginPerformanceMetric {
  id: number;
  plugin_name: string;
  bucket_started_at: string;
  bucket_ended_at: string;
  request_count: number;
  success_count: number;
  timeout_count: number;
  deferred_count?: number;
  partial_success_count?: number;
  detail_success_count?: number;
  fallback_count?: number;
  error_count: number;
  cache_hit_count: number;
  max_concurrent_requests: number;
  avg_response_ms: number;
  p50_response_ms: number;
  p95_response_ms: number;
  p99_response_ms: number;
  created_at?: string;
}

export interface PluginMetricsListResponse {
  items: PluginPerformanceMetric[];
  range: {
    from?: string | null;
    to?: string | null;
  };
  granularity: string;
}

export interface PluginErrorLog {
  id: number;
  plugin_name: string;
  keyword_hash: string;
  error_type: string;
  error_message: string;
  duration_ms: number;
  occurred_at: string;
  created_at?: string;
}

export interface PluginErrorLogsResponse {
  items: PluginErrorLog[];
  page: number;
  page_size: number;
  total: number;
}

export interface PluginObservabilityRow {
  pluginName: string;
  displayName: string;
  enabled: boolean;
  installed: boolean;
  requestCount: number;
  successRate: number;
  timeoutRate: number;
  deferredCount: number;
  partialSuccessCount: number;
  detailSuccessCount: number;
  fallbackCount: number;
  errorCount: number;
  avgResponseMS: number;
  p95ResponseMS: number;
  p99ResponseMS: number;
  maxConcurrentRequests: number;
  circuitState: string;
  circuitCooldownUntil?: string;
  healthStatus: 'healthy' | 'unhealthy' | 'unknown';
  lastCheckedAt?: string;
  lastError?: string;
  checkSource?: string;
  catalogItem?: PluginInfo;
  latestMetric?: PluginPerformanceMetric;
  realtimeItem?: PluginMetricsRealtimeItem;
}

export interface PluginTrendPoint {
  bucketStartedAt: string;
  avgResponseMS: number;
  requestCount: number;
  errorCount: number;
}

export type PluginMetricStatusFilter = 'all' | 'healthy' | 'unhealthy' | 'open' | 'half_open' | 'error';
