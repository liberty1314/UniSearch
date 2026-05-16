import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChannelManagementView } from '../ChannelManagementView';

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({ token: 'test-token' }),
}));

describe('ChannelManagementView', () => {
  beforeEach(() => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();

      if (url === '/api/admin/channels') {
        return {
          ok: true,
          json: async () => ({
            total: 12,
            channels: Array.from({ length: 12 }, (_, index) => {
              const id = index + 1;
              return {
                id,
                name: `chan-${String(id).padStart(2, '0')}`,
                is_enabled: true,
                sort_order: id,
                health_status: id === 12 ? 'error' : 'healthy',
                last_error: id === 12 ? 'timeout' : undefined,
                check_source: id === 12 ? 'manual_test' : 'system',
                last_checked_at: id === 12 ? '2026-05-17 00:20:00' : '2026-05-17 00:10:00',
                created_at: '',
                updated_at: '',
              };
            }),
            health_summary: {
              total: 12,
              healthy: 11,
              error: 1,
              untested: 0,
              enabled_error: 0,
            },
          }),
        };
      }

      return {
        ok: true,
        json: async () => ({}),
      };
    });

    vi.stubGlobal('fetch', fetchMock);
  });

  it('渲染页面级频道运营台并支持分页与页大小选择', async () => {
    render(<ChannelManagementView />);

    expect(await screen.findByRole('heading', { name: 'Telegram 频道' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('搜索频道名称或错误信息')).toBeInTheDocument();
    expect(screen.getByText('chan-01')).toBeInTheDocument();
    expect(screen.queryByText('chan-11')).not.toBeInTheDocument();

    const pageSizeSelect = screen.getByRole('combobox', { name: '每页条数' });
    await userEvent.selectOptions(pageSizeSelect, '20');
    expect(await screen.findByText('chan-11')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('channel-row-12'));

    const drawer = await screen.findByTestId('channel-management-drawer');
    expect(within(drawer).getByText('chan-12')).toBeInTheDocument();
    expect(within(drawer).getByText('timeout')).toBeInTheDocument();
    expect(within(drawer).getByRole('button', { name: '测试频道' })).toBeInTheDocument();
  });

  it('选择频道后显示批量操作栏', async () => {
    render(<ChannelManagementView />);

    await screen.findByText('chan-01');
    expect(screen.queryByTestId('channel-selection-bar')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: '选择频道 chan-01' }));

    const selectionBar = await screen.findByTestId('channel-selection-bar');
    expect(selectionBar).toHaveTextContent('已选 1 项');
    expect(within(selectionBar).getByRole('button', { name: '批量启用' })).toBeInTheDocument();
    expect(within(selectionBar).getByRole('button', { name: '批量删除' })).toBeInTheDocument();
  });
});
