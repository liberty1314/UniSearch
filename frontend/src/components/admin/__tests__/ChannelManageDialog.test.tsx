import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ChannelManageDialog } from '../ChannelManageDialog';

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
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock('../ConfirmDialog', () => ({
  ConfirmDialog: ({
    open,
    title,
    description,
    onConfirm,
  }: {
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }) => (open ? (
    <div>
      <div>{title}</div>
      <div>{description}</div>
      <button onClick={onConfirm}>确认操作</button>
    </div>
  ) : null),
}));

const channels = [
  {
    id: 1,
    name: 'channel-enabled-healthy-a',
    is_enabled: true,
    sort_order: 1,
    health_status: 'healthy',
    last_error: '',
    created_at: '',
    updated_at: '',
  },
  {
    id: 2,
    name: 'channel-enabled-error',
    is_enabled: true,
    sort_order: 2,
    health_status: 'error',
    last_error: 'boom',
    created_at: '',
    updated_at: '',
  },
  {
    id: 3,
    name: 'channel-enabled-healthy-b',
    is_enabled: true,
    sort_order: 3,
    health_status: 'healthy',
    last_error: '',
    created_at: '',
    updated_at: '',
  },
  {
    id: 4,
    name: 'channel-disabled-error',
    is_enabled: false,
    sort_order: 4,
    health_status: 'error',
    last_error: 'disabled',
    created_at: '',
    updated_at: '',
  },
  {
    id: 5,
    name: 'channel-disabled-healthy',
    is_enabled: false,
    sort_order: 5,
    health_status: 'healthy',
    last_error: '',
    created_at: '',
    updated_at: '',
  },
  {
    id: 6,
    name: 'channel-disabled-untested',
    is_enabled: false,
    sort_order: 6,
    health_status: 'untested',
    last_error: '',
    created_at: '',
    updated_at: '',
  },
];

describe('ChannelManageDialog', () => {
  beforeEach(() => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url === '/api/admin/channels') {
        return {
          ok: true,
          json: async () => ({ channels, total: channels.length }),
        };
      }
      if (url.includes('/api/admin/channels/') && url.endsWith('/test')) {
        return {
          ok: true,
          json: async () => ({ accessible: true }),
        };
      }
      if (url === '/api/admin/channels/batch-status') {
        return {
          ok: true,
          json: async () => ({ success_count: 2, failed_count: 0, success: [5, 6], failed: [] }),
        };
      }
      if (url === '/api/admin/channels/batch-delete') {
        return {
          ok: true,
          json: async () => ({ success_count: 1, failed_count: 1, success: [6], failed: [{ channel_id: 4, error: 'failed', code: 'CHANNEL_DELETE_FAILED' }] }),
        };
      }
      return {
        ok: true,
        json: async () => ({}),
      };
    });

    vi.stubGlobal('fetch', fetchMock);
  });

  it('sends batch channel status request for selected channels', async () => {
    render(
      <ChannelManageDialog
        isOpen
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        token="test-token"
      />
    );

    await screen.findByText('channel-disabled-healthy');
    fireEvent.click(screen.getByLabelText('选择频道 channel-disabled-healthy'));
    fireEvent.click(screen.getByLabelText('选择频道 channel-disabled-untested'));
    fireEvent.click(screen.getByRole('button', { name: '批量启用' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/channels/batch-status',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            channel_ids: [5, 6],
            is_enabled: true,
          }),
        })
      );
    });
  });

  it('supports batch delete with confirmation and keeps failed rows', async () => {
    render(
      <ChannelManageDialog
        isOpen
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        token="test-token"
      />
    );

    await screen.findByText('channel-disabled-error');
    fireEvent.click(screen.getByLabelText('选择频道 channel-disabled-error'));
    fireEvent.click(screen.getByLabelText('选择频道 channel-disabled-untested'));
    fireEvent.click(screen.getByRole('button', { name: '批量删除' }));
    fireEvent.click(screen.getByRole('button', { name: '确认操作' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/channels/batch-delete',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            channel_ids: [4, 6],
          }),
        })
      );
    });

    expect(screen.queryByText('channel-disabled-untested')).not.toBeInTheDocument();
    expect(screen.getByText('channel-disabled-error')).toBeInTheDocument();
  });

  it('sorts channels with disabled healthy then untested then error', async () => {
    render(
      <ChannelManageDialog
        isOpen
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        token="test-token"
      />
    );

    const errorNode = await screen.findByText('channel-enabled-error');
    const healthyNode = screen.getByText('channel-enabled-healthy-a');
    const disabledHealthyNode = screen.getByText('channel-disabled-healthy');
    const disabledUntestedNode = screen.getByText('channel-disabled-untested');
    const disabledErrorNode = screen.getByText('channel-disabled-error');

    expect(errorNode.compareDocumentPosition(healthyNode) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(healthyNode.compareDocumentPosition(disabledHealthyNode) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(disabledHealthyNode.compareDocumentPosition(disabledUntestedNode) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(disabledUntestedNode.compareDocumentPosition(disabledErrorNode) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('removes manual move controls and keeps test action working', async () => {
    const onSuccess = vi.fn();
    render(
      <ChannelManageDialog
        isOpen
        onClose={vi.fn()}
        onSuccess={onSuccess}
        token="test-token"
      />
    );

    await screen.findByText('channel-enabled-error');

    expect(screen.queryByLabelText('频道 channel-enabled-error 上移')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('频道 channel-enabled-error 下移')).not.toBeInTheDocument();

    const testButtons = screen.getAllByRole('button', { name: '测试' });
    fireEvent.click(testButtons[0]);
    await waitFor(() => {
      const fetchCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
      const hasChannelTestRequest = fetchCalls.some(([url, init]) => {
        return typeof url === 'string'
          && /\/api\/admin\/channels\/.+\/test$/.test(url)
          && (init as RequestInit | undefined)?.method === 'POST';
      });
      expect(hasChannelTestRequest).toBe(true);
    });
    expect(onSuccess).toHaveBeenCalled();
  });

  it('keeps list order within the same session when toggling channel status', async () => {
    const localChannels = [
      {
        id: 11,
        name: 'first-enabled',
        is_enabled: true,
        sort_order: 10,
        health_status: 'healthy',
        last_error: '',
        created_at: '',
        updated_at: '',
      },
      {
        id: 12,
        name: 'second-disabled',
        is_enabled: false,
        sort_order: 1,
        health_status: 'healthy',
        last_error: '',
        created_at: '',
        updated_at: '',
      },
    ];

    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url === '/api/admin/channels') {
        return { ok: true, json: async () => ({ channels: localChannels, total: localChannels.length }) };
      }
      if (url === '/api/admin/channels/12') {
        return { ok: true, json: async () => ({}) };
      }
      return { ok: true, json: async () => ({}) };
    }));

    render(
      <ChannelManageDialog
        isOpen
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        token="test-token"
      />
    );

    const firstNode = await screen.findByText('first-enabled');
    const secondNode = screen.getByText('second-disabled');
    expect(firstNode.compareDocumentPosition(secondNode) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    fireEvent.click(screen.getByLabelText('切换频道 second-disabled 状态'));

    await waitFor(() => {
      const nextFirstNode = screen.getByText('first-enabled');
      const nextSecondNode = screen.getByText('second-disabled');
      expect(nextFirstNode.compareDocumentPosition(nextSecondNode) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
  });

  it('uses one toggle button to select all filtered channels and clear selection', async () => {
    render(
      <ChannelManageDialog
        isOpen
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        token="test-token"
      />
    );

    await screen.findByText('channel-disabled-healthy');

    expect(screen.queryByRole('button', { name: '清空' })).not.toBeInTheDocument();
    expect(screen.queryByText('已选 0 项')).not.toBeInTheDocument();
    const toggleButton = screen.getByRole('button', { name: '全选' });
    fireEvent.click(toggleButton);

    expect(screen.getByText('已选 6 项')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '清空' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '清空' }));
    expect(screen.queryByText('已选 6 项')).not.toBeInTheDocument();
    expect(screen.queryByText('已选 0 项')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '全选' })).toBeInTheDocument();
  });
});
