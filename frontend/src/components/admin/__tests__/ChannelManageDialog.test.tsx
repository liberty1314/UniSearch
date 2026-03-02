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
    name: 'channel-disabled-a',
    is_enabled: false,
    sort_order: 4,
    health_status: 'error',
    last_error: 'disabled',
    created_at: '',
    updated_at: '',
  },
  {
    id: 5,
    name: 'channel-disabled-b',
    is_enabled: false,
    sort_order: 5,
    health_status: 'healthy',
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
      return {
        ok: true,
        json: async () => ({}),
      };
    });

    vi.stubGlobal('fetch', fetchMock);
  });

  it('sorts channels with enabled errors first and disabled last', async () => {
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
    const disabledNode = screen.getByText('channel-disabled-a');

    expect(errorNode.compareDocumentPosition(healthyNode) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(healthyNode.compareDocumentPosition(disabledNode) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('only allows move within same rank group and sends swap requests', async () => {
    render(
      <ChannelManageDialog
        isOpen
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        token="test-token"
      />
    );

    await screen.findByText('channel-enabled-error');

    const errorUp = screen.getByLabelText('频道 channel-enabled-error 上移');
    const errorDown = screen.getByLabelText('频道 channel-enabled-error 下移');
    expect(errorUp).toBeDisabled();
    expect(errorDown).toBeDisabled();

    const firstHealthyUp = screen.getByLabelText('频道 channel-enabled-healthy-a 上移');
    const firstHealthyDown = screen.getByLabelText('频道 channel-enabled-healthy-a 下移');
    expect(firstHealthyUp).toBeDisabled();
    expect(firstHealthyDown).toBeEnabled();

    fireEvent.click(firstHealthyDown);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/channels/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ sort_order: 3 }),
        })
      );
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/channels/3',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ sort_order: 1 }),
        })
      );
    });
  });
});
