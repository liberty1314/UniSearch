import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { getRequestErrorMessage, requestAuthedJson } from '@/components/admin/adminWorkspaceApi';
import { refreshAuthTokenSingleFlight } from '@/lib/authRefreshManager';
import type { ListTGChannelsResponse, TGChannel } from '@/types/channel';
import type {
  ChannelErrorLog,
  ChannelErrorLogsResponse,
  ChannelMetricStatusFilter,
  ChannelMetricsListResponse,
  ChannelMetricsRealtimeItem,
  ChannelMetricsRealtimeSnapshot,
  ChannelObservabilityRow,
  ChannelPerformanceMetric,
  ChannelTrendPoint,
} from '@/types/channelMetrics';

const AUTO_REFRESH_MS = 30_000;
const METRIC_LIMIT = 200;
const ERROR_LOG_PAGE_SIZE = 20;
const ACCESS_TOKEN_REFRESH_TIMEOUT_MS = 8_000;

const EMPTY_REALTIME_SNAPSHOT: ChannelMetricsRealtimeSnapshot = {
  active_channel_count: 0,
  avg_response_ms: 0,
  success_rate: 0,
  timeout_rate: 0,
  error_count: 0,
  items: [],
};

const normalizeName = (value: string) => value.trim().toLowerCase();

const rateFromMetric = (metric: ChannelPerformanceMetric | undefined, key: 'success' | 'timeout') => {
  if (!metric || metric.request_count <= 0) {
    return 0;
  }
  const count = key === 'success' ? metric.success_count : metric.timeout_count;
  return count / metric.request_count;
};

const withTimeout = async <T>(promise: Promise<T>, timeoutMS: number, timeoutMessage: string): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMS);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
};

const latestMetricByChannel = (metrics: ChannelPerformanceMetric[]) => {
  const result = new Map<string, ChannelPerformanceMetric>();
  metrics.forEach((metric) => {
    const key = normalizeName(metric.channel_name);
    const current = result.get(key);
    if (!current || new Date(metric.bucket_started_at).getTime() > new Date(current.bucket_started_at).getTime()) {
      result.set(key, metric);
    }
  });
  return result;
};

const buildSnapshotFromMetrics = (metrics: ChannelPerformanceMetric[]): ChannelMetricsRealtimeSnapshot => {
  const latestMetrics = Array.from(latestMetricByChannel(metrics).values());
  if (latestMetrics.length === 0) {
    return EMPTY_REALTIME_SNAPSHOT;
  }

  const totals = latestMetrics.reduce(
    (summary, metric) => {
      summary.requestCount += metric.request_count;
      summary.successCount += metric.success_count;
      summary.timeoutCount += metric.timeout_count;
      summary.errorCount += metric.error_count;
      summary.weightedDuration += metric.avg_response_ms * metric.request_count;
      return summary;
    },
    {
      requestCount: 0,
      successCount: 0,
      timeoutCount: 0,
      errorCount: 0,
      weightedDuration: 0,
    }
  );

  return {
    active_channel_count: latestMetrics.length,
    avg_response_ms: totals.requestCount > 0 ? Math.round(totals.weightedDuration / totals.requestCount) : 0,
    success_rate: totals.requestCount > 0 ? totals.successCount / totals.requestCount : 0,
    timeout_rate: totals.requestCount > 0 ? totals.timeoutCount / totals.requestCount : 0,
    error_count: totals.errorCount,
    items: [],
  };
};

const toRow = (
  channelName: string,
  channel: TGChannel | undefined,
  realtimeItem: ChannelMetricsRealtimeItem | undefined,
  latestMetric: ChannelPerformanceMetric | undefined
): ChannelObservabilityRow => {
  const healthStatus = channel?.health_status || 'untested';

  return {
    channelName,
    displayName: channel?.name || channelName,
    enabled: Boolean(channel?.is_enabled),
    tags: channel?.tags || [],
    requestCount: realtimeItem?.request_count ?? latestMetric?.request_count ?? 0,
    successRate: realtimeItem?.success_rate ?? rateFromMetric(latestMetric, 'success'),
    timeoutRate: realtimeItem?.timeout_rate ?? rateFromMetric(latestMetric, 'timeout'),
    errorCount: realtimeItem?.error_count ?? latestMetric?.error_count ?? 0,
    cacheHitCount: realtimeItem?.cache_hit_count ?? latestMetric?.cache_hit_count ?? 0,
    resultCount: realtimeItem?.result_count ?? latestMetric?.result_count ?? 0,
    avgResponseMS: realtimeItem?.avg_response_ms ?? latestMetric?.avg_response_ms ?? 0,
    p95ResponseMS: realtimeItem?.p95_response_ms ?? latestMetric?.p95_response_ms ?? 0,
    p99ResponseMS: realtimeItem?.p99_response_ms ?? latestMetric?.p99_response_ms ?? 0,
    maxConcurrentRequests: realtimeItem?.max_concurrent_requests ?? latestMetric?.max_concurrent_requests ?? 0,
    healthStatus,
    lastCheckedAt: channel?.last_checked_at,
    lastError: channel?.last_error || realtimeItem?.last_error,
    checkSource: channel?.check_source,
    channel,
    latestMetric,
    realtimeItem,
  };
};

const buildRows = (
  channels: TGChannel[],
  realtimeItems: ChannelMetricsRealtimeItem[],
  metrics: ChannelPerformanceMetric[]
) => {
  const names = new Set<string>();
  const channelByName = new Map<string, TGChannel>();
  const realtimeByName = new Map<string, ChannelMetricsRealtimeItem>();
  const latestByName = latestMetricByChannel(metrics);

  channels.forEach((channel) => {
    const key = normalizeName(channel.name);
    if (!key) return;
    names.add(key);
    channelByName.set(key, channel);
  });
  realtimeItems.forEach((item) => {
    const key = normalizeName(item.channel_name);
    if (!key) return;
    names.add(key);
    realtimeByName.set(key, item);
  });
  metrics.forEach((metric) => {
    const key = normalizeName(metric.channel_name);
    if (key) names.add(key);
  });

  return Array.from(names)
    .map((name) => toRow(name, channelByName.get(name), realtimeByName.get(name), latestByName.get(name)))
    .sort((a, b) => {
      if (a.healthStatus === 'error' && b.healthStatus !== 'error') return -1;
      if (b.healthStatus === 'error' && a.healthStatus !== 'error') return 1;
      if (a.errorCount !== b.errorCount) return b.errorCount - a.errorCount;
      if (a.avgResponseMS !== b.avgResponseMS) return b.avgResponseMS - a.avgResponseMS;
      return a.displayName.localeCompare(b.displayName, 'zh-CN');
    });
};

const buildTrendPoints = (
  metrics: ChannelPerformanceMetric[],
  visibleRows: ChannelObservabilityRow[]
): ChannelTrendPoint[] => {
  const visibleNames = new Set(visibleRows.map((row) => row.channelName));
  const bucketMap = new Map<string, { totalDuration: number; requestCount: number; errorCount: number }>();

  metrics.forEach((metric) => {
    const channelName = normalizeName(metric.channel_name);
    if (visibleNames.size > 0 && !visibleNames.has(channelName)) {
      return;
    }
    const bucket = metric.bucket_started_at;
    const current = bucketMap.get(bucket) ?? { totalDuration: 0, requestCount: 0, errorCount: 0 };
    current.totalDuration += metric.avg_response_ms * metric.request_count;
    current.requestCount += metric.request_count;
    current.errorCount += metric.error_count;
    bucketMap.set(bucket, current);
  });

  return Array.from(bucketMap.entries())
    .sort(([left], [right]) => new Date(left).getTime() - new Date(right).getTime())
    .slice(-24)
    .map(([bucketStartedAt, bucket]) => ({
      bucketStartedAt,
      avgResponseMS: bucket.requestCount > 0 ? Math.round(bucket.totalDuration / bucket.requestCount) : 0,
      requestCount: bucket.requestCount,
      errorCount: bucket.errorCount,
    }));
};

const matchesStatus = (row: ChannelObservabilityRow, statusFilter: ChannelMetricStatusFilter) => {
  if (statusFilter === 'all') return true;
  if (statusFilter === 'healthy') return row.healthStatus === 'healthy';
  if (statusFilter === 'error') return row.healthStatus === 'error' || row.errorCount > 0;
  if (statusFilter === 'untested') return row.healthStatus === 'untested';
  if (statusFilter === 'enabled') return row.enabled;
  return !row.enabled;
};

export function useChannelMetricsController() {
  const { token, refreshToken } = useAuthStore();
  const hasAuthSession = Boolean(token || refreshToken);
  const [snapshot, setSnapshot] = useState<ChannelMetricsRealtimeSnapshot>(EMPTY_REALTIME_SNAPSHOT);
  const [metrics, setMetrics] = useState<ChannelPerformanceMetric[]>([]);
  const [errorLogs, setErrorLogs] = useState<ChannelErrorLog[]>([]);
  const [channels, setChannels] = useState<TGChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<ChannelMetricStatusFilter>('all');
  const [selectedChannelName, setSelectedChannelName] = useState<string | null>(null);
  const requestInFlightRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async (options: { silent?: boolean } = {}) => {
    if (requestInFlightRef.current) {
      return;
    }
    requestInFlightRef.current = true;

    if (options.silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setErrorMessage(null);

    try {
      const authState = useAuthStore.getState();
      let requestToken = authState.token;
      if (!requestToken) {
        if (!authState.refreshToken) {
          throw new Error('缺少管理员登录状态');
        }
        const payload = await withTimeout(
          refreshAuthTokenSingleFlight(),
          ACCESS_TOKEN_REFRESH_TIMEOUT_MS,
          '恢复管理员登录状态超时，请重新登录后再试'
        );
        requestToken = payload.access_token || useAuthStore.getState().token;
      }
      if (!requestToken) {
        throw new Error('恢复管理员登录状态失败，请重新登录后再试');
      }

      const [nextSnapshot, metricResponse, errorResponse, channelResponse] = await Promise.all([
        requestAuthedJson<ChannelMetricsRealtimeSnapshot>(
          '/api/admin/channel-metrics/realtime',
          requestToken,
          '获取频道实时指标失败'
        ),
        requestAuthedJson<ChannelMetricsListResponse>(
          `/api/admin/channel-metrics?limit=${METRIC_LIMIT}`,
          requestToken,
          '获取频道聚合指标失败'
        ),
        requestAuthedJson<ChannelErrorLogsResponse>(
          `/api/admin/channel-metrics/errors?page=1&page_size=${ERROR_LOG_PAGE_SIZE}`,
          requestToken,
          '获取频道错误日志失败'
        ),
        requestAuthedJson<ListTGChannelsResponse>(
          '/api/admin/channels',
          requestToken,
          '获取频道列表失败'
        ),
      ]);

      if (!mountedRef.current) {
        return;
      }

      const nextMetrics = metricResponse.items ?? [];
      const normalizedSnapshot = { ...EMPTY_REALTIME_SNAPSHOT, ...nextSnapshot, items: nextSnapshot.items ?? [] };
      setSnapshot(normalizedSnapshot.items.length > 0 ? normalizedSnapshot : buildSnapshotFromMetrics(nextMetrics));
      setMetrics(nextMetrics);
      setErrorLogs(errorResponse.items ?? []);
      setChannels(channelResponse.channels ?? []);
      setLastUpdatedAt(new Date());
    } catch (error) {
      if (!mountedRef.current) {
        return;
      }
      setErrorMessage(getRequestErrorMessage(error, '获取频道性能监控数据失败'));
    } finally {
      requestInFlightRef.current = false;
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!hasAuthSession) {
      setLoading(false);
      setErrorMessage('缺少管理员登录状态');
      return undefined;
    }
    void refresh();
    return undefined;
  }, [hasAuthSession, refresh]);

  useEffect(() => {
    if (!hasAuthSession) {
      return undefined;
    }
    const interval = window.setInterval(() => {
      void refresh({ silent: true });
    }, AUTO_REFRESH_MS);
    return () => window.clearInterval(interval);
  }, [hasAuthSession, refresh]);

  const rows = useMemo(
    () => buildRows(channels, snapshot.items, metrics),
    [channels, metrics, snapshot.items]
  );

  const filteredRows = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();
    return rows.filter((row) => {
      const textMatched =
        keyword === '' ||
        row.displayName.toLowerCase().includes(keyword) ||
        row.channelName.toLowerCase().includes(keyword) ||
        row.lastError?.toLowerCase().includes(keyword) ||
        row.tags.some((tag) => tag.toLowerCase().includes(keyword));
      return textMatched && matchesStatus(row, statusFilter);
    });
  }, [rows, searchKeyword, statusFilter]);

  const trendPoints = useMemo(
    () => buildTrendPoints(metrics, filteredRows.length > 0 ? filteredRows : rows),
    [filteredRows, metrics, rows]
  );

  const selectedRow = useMemo(() => {
    if (!selectedChannelName) {
      return filteredRows[0] ?? rows[0] ?? null;
    }
    return rows.find((row) => row.channelName === selectedChannelName) ?? filteredRows[0] ?? null;
  }, [filteredRows, rows, selectedChannelName]);

  const selectedErrorLogs = useMemo(() => {
    if (!selectedRow) {
      return [];
    }
    return errorLogs.filter((log) => normalizeName(log.channel_name) === selectedRow.channelName);
  }, [errorLogs, selectedRow]);

  useEffect(() => {
    if (selectedChannelName && rows.every((row) => row.channelName !== selectedChannelName)) {
      setSelectedChannelName(null);
    }
  }, [rows, selectedChannelName]);

  return {
    snapshot,
    loading,
    refreshing,
    errorMessage,
    lastUpdatedAt,
    searchKeyword,
    setSearchKeyword,
    statusFilter,
    setStatusFilter,
    rows,
    filteredRows,
    trendPoints,
    errorLogs,
    selectedRow,
    selectedErrorLogs,
    setSelectedChannelName,
    refresh,
    autoRefreshMs: AUTO_REFRESH_MS,
  };
}
