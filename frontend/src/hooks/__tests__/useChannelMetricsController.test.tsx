import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useChannelMetricsController } from '../useChannelMetricsController';

const { authState, refreshAuthTokenSingleFlightMock, useAuthStoreMock } = vi.hoisted(() => {
  const state = {
    token: 'test-token' as string | null,
    refreshToken: null as string | null,
  };
  return {
    authState: state,
    refreshAuthTokenSingleFlightMock: vi.fn(),
    useAuthStoreMock: Object.assign(vi.fn(() => state), {
      getState: vi.fn(() => state),
    }),
  };
});

vi.mock('@/stores/authStore', () => ({
  useAuthStore: useAuthStoreMock,
}));

vi.mock('@/lib/authRefreshManager', () => ({
  refreshAuthTokenSingleFlight: refreshAuthTokenSingleFlightMock,
}));

const createFetchResponse = (body: unknown, ok = true) => ({
  ok,
  json: async () => body,
});

const mockChannelFetch = (options: { emptyRealtime?: boolean } = {}) => {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();

    if (url === '/api/admin/channel-metrics/realtime') {
      return createFetchResponse(options.emptyRealtime ? {
        active_channel_count: 0,
        avg_response_ms: 0,
        success_rate: 0,
        timeout_rate: 0,
        error_count: 0,
        items: [],
      } : {
        active_channel_count: 1,
        avg_response_ms: 300,
        success_rate: 0.8,
        timeout_rate: 0.1,
        error_count: 1,
        items: [
          {
            channel_name: 'tg-alpha',
            request_count: 10,
            success_count: 8,
            timeout_count: 1,
            error_count: 1,
            cache_hit_count: 2,
            result_count: 16,
            max_concurrent_requests: 2,
            avg_response_ms: 300,
            p50_response_ms: 260,
            p95_response_ms: 680,
            p99_response_ms: 900,
            success_rate: 0.8,
            timeout_rate: 0.1,
            last_error: '频道超时',
          },
        ],
      });
    }

    if (url === '/api/admin/channel-metrics?limit=200') {
      return createFetchResponse({
        items: [
          {
            id: 1,
            channel_name: 'tg-alpha',
            bucket_started_at: '2026-07-05T09:00:00Z',
            bucket_ended_at: '2026-07-05T09:05:00Z',
            request_count: 10,
            success_count: 8,
            timeout_count: 1,
            error_count: 1,
            cache_hit_count: 2,
            result_count: 16,
            max_concurrent_requests: 2,
            avg_response_ms: 300,
            p50_response_ms: 260,
            p95_response_ms: 680,
            p99_response_ms: 900,
          },
        ],
        range: {},
        granularity: '5m',
      });
    }

    if (url === '/api/admin/channel-metrics/errors?page=1&page_size=20') {
      return createFetchResponse({
        items: [
          {
            id: 11,
            channel_name: 'tg-alpha',
            keyword_hash: 'abc123',
            error_type: 'timeout',
            error_message: '频道超时',
            duration_ms: 4000,
            occurred_at: '2026-07-05T09:01:00Z',
          },
        ],
        page: 1,
        page_size: 20,
        total: 1,
      });
    }

    if (url === '/api/admin/channels') {
      return createFetchResponse({
        channels: [
          {
            id: 1,
            name: 'tg-alpha',
            is_enabled: true,
            sort_order: 1,
            tags: ['影视'],
            created_at: '2026-07-05T08:00:00Z',
            updated_at: '2026-07-05T08:00:00Z',
            health_status: 'error',
            last_checked_at: '2026-07-05T09:01:00Z',
            last_error: '频道超时',
            check_source: 'timeout',
          },
        ],
        total: 1,
      });
    }

    return createFetchResponse({}, false);
  });

  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

describe('useChannelMetricsController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.token = 'test-token';
    authState.refreshToken = null;
    mockChannelFetch();
  });

  it('会合并频道配置、实时指标和错误日志', async () => {
    const { result } = renderHook(() => useChannelMetricsController());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.rows).toHaveLength(1);
    expect(result.current.rows[0]).toMatchObject({
      channelName: 'tg-alpha',
      enabled: true,
      healthStatus: 'error',
      errorCount: 1,
      resultCount: 16,
    });
    expect(result.current.selectedRow).toBeNull();
    expect(result.current.selectedErrorLogs).toHaveLength(0);

    act(() => {
      result.current.setSelectedChannelName('tg-alpha');
    });

    expect(result.current.selectedErrorLogs).toHaveLength(1);
  });

  it('实时窗口为空时会使用聚合指标兜底', async () => {
    mockChannelFetch({ emptyRealtime: true });
    const { result } = renderHook(() => useChannelMetricsController());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.snapshot.active_channel_count).toBe(1);
    expect(result.current.snapshot.avg_response_ms).toBe(300);
  });
});
