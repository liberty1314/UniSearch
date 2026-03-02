import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ChannelManageDialog } from '../ChannelManageDialog';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>) => {
      const { initial, animate, exit, transition, whileHover, whileTap, ...rest } = props;
      void initial; void animate; void exit; void transition; void whileHover; void whileTap;
      return <div {...rest}>{children}</div>;
    },
    button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & Record<string, unknown>) => {
      const { initial, animate, exit, transition, whileHover, whileTap, ...rest } = props;
      void initial; void animate; void exit; void transition; void whileHover; void whileTap;
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
  ConfirmDialog: () => null,
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
      return {
        ok: true,
        json: async () => ({}),
      };
    });

    vi.stubGlobal('fetch', fetchMock);
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
});
