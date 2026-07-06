import React from 'react';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PluginPerformanceDashboard } from '../PluginPerformanceDashboard';

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

const futureCooldown = '2099-01-01T00:00:00Z';

const createFetchResponse = (body: unknown, ok = true) => ({
  ok,
  json: async () => body,
});

const mockSuccessfulFetch = (options: { emptyRealtime?: boolean; extraPluginCount?: number } = {}) => {
  const extraPluginNames = Array.from({ length: options.extraPluginCount ?? 0 }, (_, index) => `perf-plugin-${String(index + 1).padStart(2, '0')}`);
  const realtimeItems = [
    {
      plugin_name: 'sidhub',
      request_count: 10,
      success_count: 8,
      timeout_count: 1,
      error_count: 2,
      cache_hit_count: 1,
      max_concurrent_requests: 3,
      avg_response_ms: 420,
      p50_response_ms: 380,
      p95_response_ms: 900,
      p99_response_ms: 1100,
      success_rate: 0.8,
      timeout_rate: 0.1,
      last_error: '远端响应超时',
    },
    {
      plugin_name: 'pansearch',
      request_count: 20,
      success_count: 20,
      timeout_count: 0,
      error_count: 0,
      cache_hit_count: 3,
      max_concurrent_requests: 2,
      avg_response_ms: 120,
      p50_response_ms: 100,
      p95_response_ms: 180,
      p99_response_ms: 210,
      success_rate: 1,
      timeout_rate: 0,
    },
    ...extraPluginNames.map((pluginName, index) => ({
      plugin_name: pluginName,
      request_count: 10 + index,
      success_count: 10 + index,
      timeout_count: 0,
      error_count: 0,
      cache_hit_count: 0,
      max_concurrent_requests: 1,
      avg_response_ms: 150 + index,
      p50_response_ms: 120 + index,
      p95_response_ms: 220 + index,
      p99_response_ms: 260 + index,
      success_rate: 1,
      timeout_rate: 0,
    })),
  ];
  const metricItems = [
    {
      id: 1,
      plugin_name: 'sidhub',
      bucket_started_at: '2026-07-04T14:00:00Z',
      bucket_ended_at: '2026-07-04T14:05:00Z',
      request_count: 5,
      success_count: 4,
      timeout_count: 1,
      error_count: 1,
      cache_hit_count: 0,
      max_concurrent_requests: 2,
      avg_response_ms: 500,
      p50_response_ms: 450,
      p95_response_ms: 900,
      p99_response_ms: 1200,
    },
    {
      id: 2,
      plugin_name: 'pansearch',
      bucket_started_at: '2026-07-04T14:05:00Z',
      bucket_ended_at: '2026-07-04T14:10:00Z',
      request_count: 10,
      success_count: 10,
      timeout_count: 0,
      error_count: 0,
      cache_hit_count: 2,
      max_concurrent_requests: 2,
      avg_response_ms: 120,
      p50_response_ms: 100,
      p95_response_ms: 180,
      p99_response_ms: 210,
    },
    ...extraPluginNames.map((pluginName, index) => ({
      id: 100 + index,
      plugin_name: pluginName,
      bucket_started_at: '2026-07-04T14:10:00Z',
      bucket_ended_at: '2026-07-04T14:15:00Z',
      request_count: 8 + index,
      success_count: 8 + index,
      timeout_count: 0,
      error_count: 0,
      cache_hit_count: 0,
      max_concurrent_requests: 1,
      avg_response_ms: 150 + index,
      p50_response_ms: 120 + index,
      p95_response_ms: 220 + index,
      p99_response_ms: 260 + index,
    })),
  ];
  const catalogItems = [
    {
      id: 'search.sidhub',
      name: 'sidhub',
      version: '1.0.0',
      category: 'search',
      description: 'SeedHub 资源搜索插件',
      plugin_type: 'builtin',
      source_type: 'builtin',
      is_local: true,
      is_remote: false,
      installed: true,
      is_enabled: true,
      status: 'error',
      priority: 3,
      available_actions: ['detail'],
      health: {
        is_healthy: false,
        check_source: 'search_failure',
        last_error: '连续失败',
        last_checked_at: '2026-07-04T14:06:00Z',
        circuit_state: 'open',
        circuit_cooldown_until: futureCooldown,
      },
    },
    {
      id: 'search.pansearch',
      name: 'pansearch',
      version: '1.0.0',
      category: 'search',
      description: '网盘搜索插件',
      plugin_type: 'builtin',
      source_type: 'builtin',
      is_local: true,
      is_remote: false,
      installed: true,
      is_enabled: true,
      status: 'active',
      priority: 5,
      available_actions: ['detail'],
      health: {
        is_healthy: true,
        check_source: 'search_success',
        last_checked_at: '2026-07-04T14:05:00Z',
        circuit_state: 'closed',
      },
    },
    ...extraPluginNames.map((pluginName, index) => ({
      id: `search.${pluginName}`,
      name: pluginName,
      version: '1.0.0',
      category: 'search',
      description: `性能分页测试插件 ${index + 1}`,
      plugin_type: 'builtin',
      source_type: 'builtin',
      is_local: true,
      is_remote: false,
      installed: true,
      is_enabled: true,
      status: 'active',
      priority: 10 + index,
      available_actions: ['detail'],
      health: {
        is_healthy: true,
        check_source: 'search_success',
        last_checked_at: '2026-07-04T14:05:00Z',
        circuit_state: 'closed',
      },
    })),
  ];

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    void init;

    if (url === '/api/admin/plugin-metrics/realtime') {
      if (options.emptyRealtime) {
        return createFetchResponse({
          active_plugin_count: 0,
          avg_response_ms: 0,
          success_rate: 0,
          timeout_rate: 0,
          error_count: 0,
          items: [],
        });
      }

      return createFetchResponse({
        active_plugin_count: realtimeItems.length,
        avg_response_ms: 250,
        success_rate: 0.9,
        timeout_rate: 0.05,
        error_count: 2,
        items: realtimeItems,
      });
    }

    if (url === '/api/admin/plugin-metrics?limit=200') {
      return createFetchResponse({
        items: metricItems,
        range: {},
        granularity: '5m',
      });
    }

    if (url === '/api/admin/plugin-metrics/errors?page=1&page_size=20') {
      return createFetchResponse({
        items: [
          {
            id: 11,
            plugin_name: 'sidhub',
            keyword_hash: 'abc123',
            error_type: 'timeout',
            error_message: '插件搜索超时',
            duration_ms: 3000,
            occurred_at: '2026-07-04T14:06:00Z',
          },
        ],
        page: 1,
        page_size: 20,
        total: 1,
      });
    }

    if (url === '/api/admin/plugin-center/catalog?refresh=false') {
      return createFetchResponse({
        version: '2026.07',
        source: 'all',
        items: catalogItems,
      });
    }

    return createFetchResponse({});
  });

  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

describe('PluginPerformanceDashboard', () => {
  beforeEach(() => {
    vi.useRealTimers();
    authState.token = 'test-token';
    authState.refreshToken = null;
    useAuthStoreMock.mockClear();
    useAuthStoreMock.getState.mockClear();
    refreshAuthTokenSingleFlightMock.mockReset();
    mockSuccessfulFetch();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('展示实时指标、趋势图、性能表和熔断详情抽屉', async () => {
    render(<PluginPerformanceDashboard />);

    expect(screen.getByRole('heading', { name: '插件性能监控' })).toBeInTheDocument();
    expect(await screen.findByText('250 ms')).toBeInTheDocument();
    expect(screen.getByText('90.0%')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '插件响应时间趋势图' })).toBeInTheDocument();
    expect(screen.getAllByText('sidhub').length).toBeGreaterThan(0);
    expect(screen.getAllByText('pansearch').length).toBeGreaterThan(0);
    expect(screen.getAllByText('熔断中').length).toBeGreaterThan(0);

    const drawer = await screen.findByTestId('plugin-performance-drawer');
    expect(within(drawer).getByText(/恢复倒计时：/)).toBeInTheDocument();
    expect(within(drawer).getByText('插件搜索超时')).toBeInTheDocument();
    expect(within(drawer).getByText(/耗时 3000 ms/)).toBeInTheDocument();
  });

  it('刷新页面仅保留刷新令牌时先恢复访问令牌再加载数据', async () => {
    authState.token = null;
    authState.refreshToken = 'refresh-token';
    refreshAuthTokenSingleFlightMock.mockResolvedValue({
      access_token: 'restored-token',
      refresh_token: 'new-refresh-token',
      expires_at: 1_782_534_400,
    });
    const fetchMock = mockSuccessfulFetch();

    render(<PluginPerformanceDashboard />);

    expect(await screen.findByText('250 ms')).toBeInTheDocument();
    expect(refreshAuthTokenSingleFlightMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/plugin-metrics/realtime',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer restored-token',
        }),
      })
    );
  });

  it('实时窗口为空时使用最近聚合指标填充顶部摘要', async () => {
    mockSuccessfulFetch({ emptyRealtime: true });

    render(<PluginPerformanceDashboard />);

    expect(await screen.findByText('247 ms')).toBeInTheDocument();
    expect(screen.getByText('93.3%')).toBeInTheDocument();
    expect(screen.getAllByText('最近聚合窗口').length).toBeGreaterThan(0);
    expect(screen.getAllByText('1').length).toBeGreaterThan(0);
  });

  it('支持按健康状态筛选插件', async () => {
    const user = userEvent.setup();
    render(<PluginPerformanceDashboard />);

    await screen.findAllByText('sidhub');
    await user.click(screen.getByRole('combobox', { name: '插件观测状态筛选' }));
    const listbox = await screen.findByRole('listbox');
    await user.click(within(listbox).getByRole('option', { name: '健康' }));

    await waitFor(() => {
      expect(screen.queryAllByText('sidhub')).toHaveLength(0);
    });
    expect(screen.getAllByText('pansearch').length).toBeGreaterThan(0);
  });

  it('支持分页浏览插件性能表并切换每页条数', async () => {
    const user = userEvent.setup();
    mockSuccessfulFetch({ extraPluginCount: 5 });

    render(<PluginPerformanceDashboard />);

    await waitFor(() => {
      expect(within(screen.getByRole('region', { name: '数据表格' })).getAllByText('perf-plugin-03').length).toBeGreaterThan(0);
    });
    expect(within(screen.getByRole('region', { name: '数据表格' })).queryAllByText('perf-plugin-04')).toHaveLength(0);
    expect(screen.getByRole('combobox', { name: '每页条数' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /下一页/ }));

    await waitFor(() => {
      expect(within(screen.getByRole('region', { name: '数据表格' })).getAllByText('perf-plugin-04').length).toBeGreaterThan(0);
    });

    await user.click(screen.getByRole('combobox', { name: '每页条数' }));
    const pageSizeListbox = await screen.findByRole('listbox');
    await user.click(within(pageSizeListbox).getByRole('option', { name: '10 条' }));

    await waitFor(() => {
      expect(within(screen.getByRole('region', { name: '数据表格' })).getAllByText('perf-plugin-05').length).toBeGreaterThan(0);
    });
    expect(within(screen.getByRole('region', { name: '数据表格' })).getAllByText('sidhub').length).toBeGreaterThan(0);
  });

  it('接口失败时展示后台风格错误提示', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url === '/api/admin/plugin-metrics/realtime') {
        return createFetchResponse({ error: '指标服务暂不可用' }, false);
      }
      return createFetchResponse({
        items: [],
        range: {},
        granularity: '5m',
      });
    }));

    render(<PluginPerformanceDashboard />);

    expect(await screen.findByText('指标服务暂不可用')).toBeInTheDocument();
  });

  it('空数据时展示明确空态', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url === '/api/admin/plugin-metrics/realtime') {
        return createFetchResponse({
          active_plugin_count: 0,
          avg_response_ms: 0,
          success_rate: 0,
          timeout_rate: 0,
          error_count: 0,
          items: [],
        });
      }
      if (url === '/api/admin/plugin-center/catalog?refresh=false') {
        return createFetchResponse({ version: '2026.07', source: 'all', items: [] });
      }
      return createFetchResponse({ items: [], page: 1, page_size: 20, total: 0, range: {}, granularity: '5m' });
    }));

    render(<PluginPerformanceDashboard />);

    expect(await screen.findByText('暂无响应时间趋势')).toBeInTheDocument();
    expect(await screen.findByText('暂无插件性能数据')).toBeInTheDocument();
  });

  it('自动刷新默认三十秒并在卸载时停止', async () => {
    vi.useFakeTimers();
    const fetchMock = mockSuccessfulFetch();

    const { unmount } = render(<PluginPerformanceDashboard />);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(fetchMock).toHaveBeenCalledTimes(4);

    await act(async () => {
      vi.advanceTimersByTime(30_000);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(fetchMock).toHaveBeenCalledTimes(8);

    unmount();
    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });
    expect(fetchMock).toHaveBeenCalledTimes(8);
  });
});
