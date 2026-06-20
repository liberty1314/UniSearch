import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { SystemInfoView } from '../SystemInfoView';

const { navigateMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({ token: 'test-token' }),
}));

describe('SystemInfoView', () => {
  beforeEach(() => {
    navigateMock.mockReset();

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();

      if (url === '/api/admin/system-info') {
        return {
          ok: true,
          json: async () => ({
            plugins: [
              { name: 'plugin-alpha', priority: 1, status: 'active', plugin_type: 'builtin', is_enabled: true, description: 'alpha desc' },
              { name: 'plugin-beta', priority: 2, status: 'error', plugin_type: 'builtin', is_enabled: true, description: 'beta desc' },
              { name: 'plugin-gamma', priority: 3, status: 'error', plugin_type: 'builtin', is_enabled: false, description: 'gamma desc' },
              { name: 'plugin-delta', priority: 4, status: 'inactive', plugin_type: 'builtin', is_enabled: false, description: 'delta desc' },
            ],
            stats: {
              plugin_count: 4,
              active_plugin_count: 1,
              channel_count: 3,
              cache_enabled: true,
              proxy_enabled: false,
              dau: 3,
              mau: 11,
            },
            config: {
              cache_path: '/tmp/cache',
              default_concurrency: 3,
              proxy_url: '',
              async_plugin_enabled: false,
              async_response_timeout: 10,
              async_max_background_workers: 2,
              async_max_background_tasks: 20,
              http_max_conns: 100,
              channels: ['chan-alpha', 'chan-beta'],
            },
          }),
        };
      }

      if (url === '/api/admin/channels') {
        return {
          ok: true,
          json: async () => ({
            channels: [
              {
                id: 1,
                name: 'chan-alpha',
                is_enabled: true,
                sort_order: 1,
                health_status: 'error',
                last_error: 'timeout',
                created_at: '',
                updated_at: '',
              },
              {
                id: 2,
                name: 'chan-disabled-error',
                is_enabled: false,
                sort_order: 2,
                health_status: 'error',
                created_at: '',
                updated_at: '',
              },
              {
                id: 3,
                name: 'chan-disabled',
                is_enabled: false,
                sort_order: 3,
                health_status: 'untested',
                created_at: '',
                updated_at: '',
              },
            ],
            health_summary: {
              total: 3,
              healthy: 0,
              error: 2,
              untested: 1,
              enabled_error: 1,
            },
          }),
        };
      }

      if (url === '/api/admin/system-settings/cache') {
        return {
          ok: true,
          json: async () => ({
            cache_enabled: true,
            search_cache_ttl_seconds: 3600,
            hot_ranking_cache_enabled: true,
            hot_ranking_preload_enabled: true,
            hot_ranking_preload_time: '00:00',
            hot_ranking_preload_limit: 50,
            hot_ranking_cache_ttl_seconds: 86400,
            redis_connected: true,
            last_preload_result: {
              total: 56,
              success: 56,
              failed: 0,
            },
          }),
        };
      }

      if (url === '/api/admin/search-observability') {
        return {
          ok: true,
          json: async () => ({
            search_count: {
              all: 3,
              progressive: 2,
            },
            search_error_count: {},
            cache_hit_count: {
              plugin: 2,
            },
            cache_miss_count: {
              plugin: 2,
            },
            cache_hit_rate: {
              plugin: 0.5,
            },
            average_duration_ms: {
              all: 1200,
              progressive: 800,
            },
            result_buckets: {
              '1-10': 5,
            },
            timeout_count: 1,
            warning_count: 2,
            recent_errors: [
              { scope: 'plugin', keyword: '测试', message: '插件搜索超时' },
            ],
            top_keywords: [
              { keyword: '流浪地球', count: 3 },
            ],
          }),
        };
      }

      return {
        ok: false,
        json: async () => ({}),
      };
    });

    vi.stubGlobal('fetch', fetchMock);
  });

  it('仅展示摘要卡片并支持跳转到独立管理页', async () => {
    const { container } = render(<SystemInfoView />);

    await screen.findByText('Telegram 频道摘要');
    expect(screen.getByText('可用插件')).toBeInTheDocument();
    expect(screen.getByText('今日活跃用户')).toBeInTheDocument();
    expect(screen.getByText('本月活跃用户')).toBeInTheDocument();
    expect(screen.queryByText('活跃插件')).not.toBeInTheDocument();
    expect(screen.queryByText('今日活跃')).not.toBeInTheDocument();
    expect(screen.queryByText('月活跃')).not.toBeInTheDocument();
    expect(screen.getByText('插件状态摘要')).toBeInTheDocument();
    expect(screen.getByText('搜索健康摘要')).toBeInTheDocument();
    expect(screen.getByText('流浪地球 · 3')).toBeInTheDocument();
    expect(screen.getByText(/插件搜索超时/)).toBeInTheDocument();
    expect(screen.getByText(/异常包含启用与禁用频道/)).toBeInTheDocument();
    expect(screen.getAllByText('点击进入管理页')).toHaveLength(2);

    const errorBlocks = screen.getAllByText('异常');
    const errorValues = errorBlocks
      .map((label) => label.parentElement?.querySelector('p:last-child')?.textContent?.trim())
      .filter((value): value is string => Boolean(value));
    expect(errorValues.filter((value) => value === '2').length).toBeGreaterThanOrEqual(2);

    expect(screen.queryByText('plugin-alpha')).not.toBeInTheDocument();
    expect(screen.queryByText('chan-alpha')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '查看全部' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '编辑' })).not.toBeInTheDocument();
    expect(screen.getByText('搜索缓存 TTL:')).toBeInTheDocument();
    expect(screen.getByText('3600 秒')).toBeInTheDocument();
    expect(screen.getByText('任务 56 / 成功 56 / 失败 0')).toBeInTheDocument();
    expect(screen.getByText('并发配置')).toBeInTheDocument();
    expect(screen.getByText('代理配置')).toBeInTheDocument();
    expect(screen.getByText('异步插件配置')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '前往运行配置设置' })).toBeInTheDocument();
    expect(container.innerHTML).toContain('dark:border-cyan-300/[0.14]');
    expect(container.innerHTML).toContain('dark:bg-slate-950/[0.48]');

    fireEvent.click(screen.getByRole('button', { name: '进入 Telegram 频道管理页' }));
    expect(navigateMock).toHaveBeenNthCalledWith(1, '/admin?view=channel_management');

    fireEvent.click(screen.getByRole('button', { name: '进入插件中心管理页' }));
    expect(navigateMock).toHaveBeenNthCalledWith(2, '/admin?view=plugin_management');

    fireEvent.click(screen.getByRole('button', { name: '前往运行配置设置' }));
    expect(navigateMock).toHaveBeenNthCalledWith(3, '/admin?view=system_settings&section=runtime');
  });
});
