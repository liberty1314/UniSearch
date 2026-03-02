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

  it('supports sorted list, search, filter and pagination', async () => {
    render(
      <ChannelPreviewDialog
        isOpen
        onClose={vi.fn()}
        token="test-token"
      />
    );

    const errorNode = await screen.findByText('channel-1');
    const enabledHealthyNode = screen.getByText('channel-3');
    const disabledNode = screen.getByText('channel-2');
    expect(errorNode.compareDocumentPosition(enabledHealthyNode) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(enabledHealthyNode.compareDocumentPosition(disabledNode) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    expect(screen.getByRole('button', { name: '全部' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '启用' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '禁用' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '异常' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '正常' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '未测试' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /下一页/i }));
    expect(await screen.findByText('channel-10')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('按频道名称搜索'), {
      target: { value: 'channel-12' },
    });
    expect(await screen.findByText('channel-12')).toBeInTheDocument();
    expect(screen.queryByText('channel-10')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '启用' }));
    await waitFor(() => {
      expect(screen.getByText('无匹配数据')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('按频道名称搜索'), {
      target: { value: '' },
    });
    fireEvent.click(screen.getByRole('button', { name: '异常' }));
    expect(await screen.findByText('channel-1')).toBeInTheDocument();
    expect(screen.queryByText('channel-3')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '禁用' }));
    expect(await screen.findByText('channel-2')).toBeInTheDocument();
    expect(screen.queryByText('channel-1')).not.toBeInTheDocument();
  });
});
