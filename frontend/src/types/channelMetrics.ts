import type { TGChannel } from '@/types/channel';

export interface ChannelMetricsRealtimeSnapshot {
  active_channel_count: number;
  avg_response_ms: number;
  success_rate: number;
  timeout_rate: number;
  error_count: number;
  items: ChannelMetricsRealtimeItem[];
}

export interface ChannelMetricsRealtimeItem {
  channel_name: string;
  request_count: number;
  success_count: number;
  timeout_count: number;
  error_count: number;
  cache_hit_count: number;
  result_count: number;
  max_concurrent_requests: number;
  avg_response_ms: number;
  p50_response_ms: number;
  p95_response_ms: number;
  p99_response_ms: number;
  success_rate: number;
  timeout_rate: number;
  last_error?: string;
}

export interface ChannelPerformanceMetric {
  id: number;
  channel_name: string;
  bucket_started_at: string;
  bucket_ended_at: string;
  request_count: number;
  success_count: number;
  timeout_count: number;
  error_count: number;
  cache_hit_count: number;
  result_count: number;
  max_concurrent_requests: number;
  avg_response_ms: number;
  p50_response_ms: number;
  p95_response_ms: number;
  p99_response_ms: number;
  created_at?: string;
}

export interface ChannelMetricsListResponse {
  items: ChannelPerformanceMetric[];
  range: {
    from?: string | null;
    to?: string | null;
  };
  granularity: string;
}

export interface ChannelErrorLog {
  id: number;
  channel_name: string;
  keyword_hash: string;
  error_type: string;
  error_message: string;
  duration_ms: number;
  occurred_at: string;
  created_at?: string;
}

export interface ChannelErrorLogsResponse {
  items: ChannelErrorLog[];
  page: number;
  page_size: number;
  total: number;
}

export interface ChannelObservabilityRow {
  channelName: string;
  displayName: string;
  enabled: boolean;
  tags: string[];
  requestCount: number;
  successRate: number;
  timeoutRate: number;
  errorCount: number;
  cacheHitCount: number;
  resultCount: number;
  avgResponseMS: number;
  p95ResponseMS: number;
  p99ResponseMS: number;
  maxConcurrentRequests: number;
  healthStatus: 'healthy' | 'error' | 'untested';
  lastCheckedAt?: string | null;
  lastError?: string;
  checkSource?: string;
  channel?: TGChannel;
  latestMetric?: ChannelPerformanceMetric;
  realtimeItem?: ChannelMetricsRealtimeItem;
}

export interface ChannelTrendPoint {
  bucketStartedAt: string;
  avgResponseMS: number;
  requestCount: number;
  errorCount: number;
}

export type ChannelMetricStatusFilter = 'all' | 'healthy' | 'error' | 'untested' | 'enabled' | 'disabled';
