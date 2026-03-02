import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { SystemInfoView } from '../SystemInfoView';

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({ token: 'test-token' }),
}));

vi.mock('../PluginManageDialog', () => ({
  PluginManageDialog: ({ isOpen, mode }: { isOpen: boolean; mode?: 'view' | 'edit' }) =>
    isOpen ? <div data-testid="plugin-manage-dialog">{`plugin-manage-dialog-${mode}`}</div> : null,
}));

vi.mock('../ChannelManageDialog', () => ({
  ChannelManageDialog: ({ isOpen, mode }: { isOpen: boolean; mode?: 'view' | 'edit' }) =>
    isOpen ? <div data-testid="channel-manage-dialog">{`channel-manage-dialog-${mode}`}</div> : null,
}));

describe('SystemInfoView', () => {
  beforeEach(() => {
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
              cache_max_size_mb: 100,
              cache_ttl_minutes: 30,
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

      return {
        ok: false,
        json: async () => ({}),
      };
    });

    vi.stubGlobal('fetch', fetchMock);
  });

  it('renders summary cards and opens preview/manage dialogs', async () => {
    render(<SystemInfoView />);

    await screen.findByText('Telegram 频道摘要');
    expect(screen.getByText('插件状态摘要')).toBeInTheDocument();
    expect(screen.getByText(/异常包含启用与禁用频道/)).toBeInTheDocument();

    const errorBlocks = screen.getAllByText('异常');
    const errorValues = errorBlocks
      .map((label) => label.parentElement?.querySelector('p:last-child')?.textContent?.trim())
      .filter((value): value is string => Boolean(value));
    expect(errorValues.filter((value) => value === '2').length).toBeGreaterThanOrEqual(2);

    expect(screen.queryByText('未测试')).not.toBeInTheDocument();
    expect(screen.queryByText('plugin-alpha')).not.toBeInTheDocument();
    expect(screen.queryByText('chan-alpha')).not.toBeInTheDocument();

    const viewAllButtons = screen.getAllByRole('button', { name: '查看全部' });
    fireEvent.click(viewAllButtons[0]);
    expect(await screen.findByText('channel-manage-dialog-view')).toBeInTheDocument();

    fireEvent.click(viewAllButtons[1]);
    expect(await screen.findByText('plugin-manage-dialog-view')).toBeInTheDocument();

    const editButtons = screen.getAllByRole('button', { name: '编辑' });
    fireEvent.click(editButtons[0]);
    expect(await screen.findByText('channel-manage-dialog-edit')).toBeInTheDocument();

    fireEvent.click(editButtons[1]);
    expect(await screen.findByText('plugin-manage-dialog-edit')).toBeInTheDocument();
  });
});
