import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { PluginManageDialog } from '../PluginManageDialog';
import type { PluginInfo } from '@/types/api';

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

const plugins: PluginInfo[] = [
  {
    name: 'builtin-error',
    priority: 0,
    status: 'error',
    plugin_type: 'builtin',
    is_enabled: true,
    description: 'builtin error',
  },
  {
    name: 'builtin-enabled',
    priority: 1,
    status: 'active',
    plugin_type: 'builtin',
    is_enabled: true,
    description: 'builtin enabled',
  },
  {
    name: 'builtin-disabled',
    priority: 2,
    status: 'inactive',
    plugin_type: 'builtin',
    is_enabled: false,
    description: 'builtin disabled',
  },
  {
    name: 'builtin-disabled-error',
    priority: 3,
    status: 'error',
    plugin_type: 'builtin',
    is_enabled: false,
    description: 'builtin disabled error',
  },
  {
    name: 'custom-enabled',
    priority: 4,
    status: 'custom',
    plugin_type: 'custom',
    is_enabled: true,
    description: 'custom enabled',
    url: 'https://example.com/plugin',
  },
];

describe('PluginManageDialog', () => {
  beforeEach(() => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.endsWith('/batch-status')) {
        return {
          ok: true,
          json: async () => ({ success_count: 1, failed_count: 0, success: ['builtin-disabled'], failed: [] }),
        };
      }
      if (url.endsWith('/batch-delete')) {
        return {
          ok: true,
          json: async () => ({ success_count: 1, failed_count: 1, success: ['custom-enabled'], failed: [{ plugin_name: 'builtin-enabled', error: '内置插件不支持删除', code: 'PLUGIN_NOT_DELETABLE' }] }),
        };
      }
      if (url.includes('/status')) {
        return { ok: true, json: async () => ({ success: true }) };
      }
      if (url.includes('/test')) {
        return { ok: true, json: async () => ({ status: 'ok' }) };
      }
      return { ok: true, json: async () => ({}) };
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  it('sends plugin status toggle request', async () => {
    render(
      <PluginManageDialog
        isOpen
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        token="test-token"
        plugins={plugins}
      />
    );

    fireEvent.click(screen.getByLabelText('切换插件 builtin-enabled 状态'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/plugins/builtin-enabled/status',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({ is_enabled: false }),
        })
      );
    });
  });

  it('sends batch plugin status request for selected plugins', async () => {
    render(
      <PluginManageDialog
        isOpen
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        token="test-token"
        plugins={plugins}
      />
    );

    fireEvent.click(screen.getByLabelText('选择插件 builtin-disabled'));
    fireEvent.click(screen.getByLabelText('选择插件 builtin-disabled-error'));
    fireEvent.click(screen.getByRole('button', { name: '批量启用' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/plugins/batch-status',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            plugin_names: ['builtin-disabled', 'builtin-disabled-error'],
            is_enabled: true,
          }),
        })
      );
    });
  });

  it('supports batch delete with confirmation and keeps failed selections', async () => {
    render(
      <PluginManageDialog
        isOpen
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        token="test-token"
        plugins={plugins}
      />
    );

    fireEvent.click(screen.getByLabelText('选择插件 custom-enabled'));
    fireEvent.click(screen.getByLabelText('选择插件 builtin-enabled'));
    fireEvent.click(screen.getByRole('button', { name: '批量删除' }));
    fireEvent.click(screen.getByRole('button', { name: '确认操作' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/plugins/batch-delete',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            plugin_names: ['custom-enabled', 'builtin-enabled'],
          }),
        })
      );
    });

    expect(screen.queryByText('custom-enabled')).not.toBeInTheDocument();
    expect(screen.getByText('builtin-enabled')).toBeInTheDocument();
  });

  it('sorts plugins with disabled normals before disabled errors', () => {
    render(
      <PluginManageDialog
        isOpen
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        token="test-token"
        plugins={plugins}
      />
    );

    const errorNode = screen.getByText('builtin-error');
    const customNode = screen.getByText('custom-enabled');
    const enabledNode = screen.getByText('builtin-enabled');
    const disabledNode = screen.getByText('builtin-disabled');
    const disabledErrorNode = screen.getByText('builtin-disabled-error');

    expect(errorNode.compareDocumentPosition(customNode) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(customNode.compareDocumentPosition(enabledNode) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(enabledNode.compareDocumentPosition(disabledNode) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(disabledNode.compareDocumentPosition(disabledErrorNode) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('shows disabled error plugin as error status', () => {
    render(
      <PluginManageDialog
        isOpen
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        token="test-token"
        plugins={plugins}
      />
    );

    const disabledErrorNode = screen.getByText('builtin-disabled-error');
    const disabledErrorRow = disabledErrorNode.closest('.bg-slate-50');
    expect(disabledErrorRow).not.toBeNull();
    expect(within(disabledErrorRow as HTMLElement).getByText('异常')).toBeInTheDocument();
  });

  it('keeps list order within the same session when toggling status', async () => {
    const localPlugins: PluginInfo[] = [
      {
        name: 'first-enabled',
        priority: 10,
        status: 'active',
        plugin_type: 'builtin',
        is_enabled: true,
        description: 'first',
      },
      {
        name: 'second-disabled',
        priority: 0,
        status: 'inactive',
        plugin_type: 'builtin',
        is_enabled: false,
        description: 'second',
      },
    ];

    render(
      <PluginManageDialog
        isOpen
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        token="test-token"
        plugins={localPlugins}
      />
    );

    const firstNode = screen.getByText('first-enabled');
    const secondNode = screen.getByText('second-disabled');
    expect(firstNode.compareDocumentPosition(secondNode) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    fireEvent.click(screen.getByLabelText('切换插件 second-disabled 状态'));

    await waitFor(() => {
      const nextFirstNode = screen.getByText('first-enabled');
      const nextSecondNode = screen.getByText('second-disabled');
      expect(nextFirstNode.compareDocumentPosition(nextSecondNode) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
  });

  it('batch test only includes enabled plugins', async () => {
    render(
      <PluginManageDialog
        isOpen
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        token="test-token"
        plugins={plugins}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '批量测试' }));

    await waitFor(() => {
      const calls = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls
        .map((call) => String(call[0]))
        .filter((url) => url.includes('/test'));
      expect(calls).toContain('/api/admin/plugins/builtin-enabled/test');
      expect(calls).toContain('/api/admin/plugins/custom-enabled/test');
      expect(calls).not.toContain('/api/admin/plugins/builtin-disabled/test');
      expect(calls).not.toContain('/api/admin/plugins/builtin-disabled-error/test');
    });
  });

  it('keeps disabled plugin as error when test fails', async () => {
    const localPlugins: PluginInfo[] = [
      {
        name: 'disabled-normal',
        priority: 10,
        status: 'inactive',
        plugin_type: 'builtin',
        is_enabled: false,
        description: 'disabled normal',
      },
    ];

    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url === '/api/admin/plugins/disabled-normal/test') {
        return { ok: false, json: async () => ({ error: 'failed' }) };
      }
      return { ok: true, json: async () => ({}) };
    }));

    render(
      <PluginManageDialog
        isOpen
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        token="test-token"
        plugins={localPlugins}
      />
    );

    expect(screen.getByText('已停用')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '测试' }));

    await waitFor(() => {
      expect(screen.getByText('异常')).toBeInTheDocument();
      expect(screen.queryByText('已停用')).not.toBeInTheDocument();
    });
  });
});
