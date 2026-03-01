import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SystemInfoView } from '../SystemInfoView';

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({ token: 'test-token' }),
}));

vi.mock('../PluginManageDialog', () => ({
  PluginManageDialog: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="plugin-manage-dialog">plugin-manage-dialog</div> : null,
}));

vi.mock('../ChannelManageDialog', () => ({
  ChannelManageDialog: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="channel-manage-dialog">channel-manage-dialog</div> : null,
}));

vi.mock('../PluginPreviewDialog', () => ({
  PluginPreviewDialog: ({ isOpen, onOpenManage }: { isOpen: boolean; onOpenManage: () => void }) =>
    isOpen ? (
      <div data-testid="plugin-preview-dialog">
        plugin-preview-dialog
        <button onClick={onOpenManage}>open-plugin-manage</button>
      </div>
    ) : null,
}));

vi.mock('../ChannelPreviewDialog', () => ({
  ChannelPreviewDialog: ({ isOpen, onOpenManage }: { isOpen: boolean; onOpenManage: () => void }) =>
    isOpen ? (
      <div data-testid="channel-preview-dialog">
        channel-preview-dialog
        <button onClick={onOpenManage}>open-channel-manage</button>
      </div>
    ) : null,
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
              { name: 'plugin-alpha', priority: 1, status: 'active', description: 'alpha desc' },
              { name: 'plugin-beta', priority: 2, status: 'error', description: 'beta desc' },
            ],
            stats: {
              plugin_count: 2,
              active_plugin_count: 1,
              channel_count: 2,
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
                name: 'chan-disabled',
                is_enabled: false,
                sort_order: 2,
                health_status: 'untested',
                created_at: '',
                updated_at: '',
              },
            ],
            health_summary: {
              total: 2,
              healthy: 0,
              error: 1,
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
    expect(screen.getByText(/异常仅统计已启用频道/)).toBeInTheDocument();
    expect(screen.queryByText('未测试')).not.toBeInTheDocument();
    expect(screen.queryByText('plugin-alpha')).not.toBeInTheDocument();
    expect(screen.queryByText('chan-alpha')).not.toBeInTheDocument();

    const viewAllButtons = screen.getAllByRole('button', { name: '查看全部' });
    fireEvent.click(viewAllButtons[0]);
    expect(await screen.findByTestId('channel-preview-dialog')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'open-channel-manage' }));
    await waitFor(() => {
      expect(screen.getByTestId('channel-manage-dialog')).toBeInTheDocument();
    });

    fireEvent.click(viewAllButtons[1]);
    expect(await screen.findByTestId('plugin-preview-dialog')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'open-plugin-manage' }));
    await waitFor(() => {
      expect(screen.getByTestId('plugin-manage-dialog')).toBeInTheDocument();
    });
  });
});
