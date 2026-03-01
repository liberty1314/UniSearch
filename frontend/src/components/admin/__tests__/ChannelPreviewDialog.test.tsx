import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ChannelPreviewDialog } from '../ChannelPreviewDialog';

const buildChannels = () =>
  Array.from({ length: 12 }).map((_, index) => ({
    id: index + 1,
    name: `channel-${index + 1}`,
    is_enabled: index % 2 === 0,
    sort_order: index + 1,
    health_status: index % 3 === 0 ? 'error' : index % 3 === 1 ? 'healthy' : 'untested',
    last_error: index % 3 === 0 ? `error-${index + 1}` : '',
    created_at: '',
    updated_at: '',
  }));

describe('ChannelPreviewDialog', () => {
  beforeEach(() => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ channels: buildChannels() }),
    }));
    vi.stubGlobal('fetch', fetchMock);
  });

  it('supports search, filter, pagination and switch to manage mode', async () => {
    const onClose = vi.fn();
    const onOpenManage = vi.fn();

    render(
      <ChannelPreviewDialog
        isOpen
        onClose={onClose}
        onOpenManage={onOpenManage}
        token="test-token"
      />
    );

    expect(await screen.findByText('channel-1')).toBeInTheDocument();
    expect(screen.queryByText('channel-11')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /下一页/i }));
    expect(await screen.findByText('channel-11')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('按频道名称搜索'), {
      target: { value: 'channel-12' },
    });
    expect(await screen.findByText('channel-12')).toBeInTheDocument();
    expect(screen.queryByText('channel-11')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '启用' }));
    await waitFor(() => {
      expect(screen.getByText('无匹配数据')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('按频道名称搜索'), {
      target: { value: '' },
    });
    fireEvent.click(screen.getByRole('button', { name: '健康全部' }));
    fireEvent.click(screen.getByRole('button', { name: '异常' }));
    expect(await screen.findByText('channel-1')).toBeInTheDocument();
    expect(screen.queryByText('channel-2')).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('按频道名称搜索'), {
      target: { value: '' },
    });
    expect(await screen.findByText('channel-1')).toBeInTheDocument();
    expect(screen.queryByText('channel-2')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '进入编辑模式' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onOpenManage).toHaveBeenCalledTimes(1);
  });
});
