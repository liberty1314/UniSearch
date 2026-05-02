import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ChannelPreviewDialog } from '../ChannelPreviewDialog';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>) => {
      const { initial, animate, exit, transition, whileHover, whileTap, layout, layoutId, ...rest } = props;
      void initial; void animate; void exit; void transition; void whileHover; void whileTap; void layout; void layoutId;
      return <div {...rest}>{children}</div>;
    },
    button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & Record<string, unknown>) => {
      const { initial, animate, exit, transition, whileHover, whileTap, layout, layoutId, ...rest } = props;
      void initial; void animate; void exit; void transition; void whileHover; void whileTap; void layout; void layoutId;
      return <button {...rest}>{children}</button>;
    },
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotion: () => false,
}));

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

    expect(screen.getByRole('dialog', { name: 'TG 频道全量查看' })).toBeInTheDocument();

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
    expect(screen.getByText('channel-4')).toBeInTheDocument();
    expect(screen.queryByText('channel-3')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '禁用' }));
    const disabledHealthyNode = await screen.findByText('channel-2');
    const disabledUntestedNode = screen.getByText('channel-6');
    const disabledErrorNode = screen.getByText('channel-4');
    expect(disabledHealthyNode.compareDocumentPosition(disabledUntestedNode) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(disabledUntestedNode.compareDocumentPosition(disabledErrorNode) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByText('channel-1')).not.toBeInTheDocument();
  });
});
