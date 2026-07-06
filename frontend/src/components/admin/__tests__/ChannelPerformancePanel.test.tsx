import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChannelPerformancePanel } from '../ChannelPerformancePanel';

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

const mockFetch = (options: { channelCount?: number } = {}) => {
  const channelNames = options.channelCount && options.channelCount > 1
    ? Array.from({ length: options.channelCount }, (_, index) => `tg-page-${String(index + 1).padStart(2, '0')}`)
    : ['tg-beta'];
  const realtimeItems = channelNames.map((channelName, index) => ({
    channel_name: channelName,
    request_count: 4 + index,
    success_count: 4 + index,
    timeout_count: 0,
    error_count: 0,
    cache_hit_count: 1,
    result_count: 9 + index,
    max_concurrent_requests: 1,
    avg_response_ms: 180,
    p50_response_ms: 160,
    p95_response_ms: 260,
    p99_response_ms: 260,
    success_rate: 1,
    timeout_rate: 0,
  }));
  const metricItems = channelNames.map((channelName, index) => ({
    id: index + 1,
    channel_name: channelName,
    bucket_started_at: '2026-07-05T09:00:00Z',
    bucket_ended_at: '2026-07-05T09:05:00Z',
    request_count: 4 + index,
    success_count: 4 + index,
    timeout_count: 0,
    error_count: 0,
    cache_hit_count: 1,
    result_count: 9 + index,
    max_concurrent_requests: 1,
    avg_response_ms: 180,
    p50_response_ms: 160,
    p95_response_ms: 260,
    p99_response_ms: 260,
  }));
  const channels = channelNames.map((channelName, index) => ({
    id: index + 2,
    name: channelName,
    is_enabled: true,
    sort_order: index + 1,
    tags: ['学习'],
    created_at: '2026-07-05T08:00:00Z',
    updated_at: '2026-07-05T08:00:00Z',
    health_status: 'healthy',
    last_checked_at: '2026-07-05T09:01:00Z',
    last_error: '',
    check_source: 'search_success',
  }));

  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();

    if (url === '/api/admin/channel-metrics/realtime') {
      return createFetchResponse({
        active_channel_count: channelNames.length,
        avg_response_ms: 180,
        success_rate: 1,
        timeout_rate: 0,
        error_count: 0,
        items: realtimeItems,
      });
    }

    if (url === '/api/admin/channel-metrics?limit=200') {
      return createFetchResponse({
        items: metricItems,
        range: {},
        granularity: '5m',
      });
    }

    if (url === '/api/admin/channel-metrics/errors?page=1&page_size=20') {
      return createFetchResponse({
        items: [],
        page: 1,
        page_size: 20,
        total: 0,
      });
    }

    if (url === '/api/admin/channels') {
      return createFetchResponse({
        channels,
        total: channels.length,
      });
    }

    return createFetchResponse({}, false);
  }));
};

describe('ChannelPerformancePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.token = 'test-token';
    authState.refreshToken = null;
    mockFetch();
  });

  it('展示频道指标并可打开详情抽屉', async () => {
    render(<ChannelPerformancePanel />);

    expect(await screen.findByRole('heading', { name: '频道性能监控' })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByText('tg-beta').length).toBeGreaterThan(0);
    });

    await userEvent.click(screen.getAllByText('tg-beta')[0]);

    expect(await screen.findByTestId('channel-performance-drawer')).toBeInTheDocument();
    expect(screen.getByText('性能摘要')).toBeInTheDocument();
  });

  it('支持分页浏览频道性能表并切换每页条数', async () => {
    const user = userEvent.setup();
    mockFetch({ channelCount: 7 });

    render(<ChannelPerformancePanel />);

    await waitFor(() => {
      expect(within(screen.getByRole('region', { name: '数据表格' })).getAllByText('tg-page-05').length).toBeGreaterThan(0);
    });
    expect(within(screen.getByRole('region', { name: '数据表格' })).queryAllByText('tg-page-06')).toHaveLength(0);
    expect(screen.getByRole('combobox', { name: '每页条数' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /下一页/ }));

    await waitFor(() => {
      expect(within(screen.getByRole('region', { name: '数据表格' })).getAllByText('tg-page-06').length).toBeGreaterThan(0);
    });

    await user.click(screen.getByRole('combobox', { name: '每页条数' }));
    const pageSizeListbox = await screen.findByRole('listbox');
    await user.click(within(pageSizeListbox).getByRole('option', { name: '10 条' }));

    await waitFor(() => {
      expect(within(screen.getByRole('region', { name: '数据表格' })).getAllByText('tg-page-07').length).toBeGreaterThan(0);
    });
    expect(within(screen.getByRole('region', { name: '数据表格' })).getAllByText('tg-page-01').length).toBeGreaterThan(0);
  });
});
