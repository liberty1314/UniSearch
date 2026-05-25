import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { PluginManageDialog } from '../PluginManageDialog';
import type { PluginInfo } from '@/types/api';
import { toast } from 'sonner';

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

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock('@/components/ui/confirm-dialog', () => ({
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
    id: 'search.builtin-enabled',
    version: '1.2.3',
    category: 'search',
    capabilities: ['resource.search', 'resource.search.handoff'],
    permissions: ['network'],
    manifest_status: 'complete',
    author: 'UniSearch',
    homepage: 'https://example.com/builtin-enabled',
    source_type: 'builtin',
    is_local: true,
    is_remote: false,
    installed: true,
    available_actions: ['detail', 'test', 'toggle'],
    health: {
      is_healthy: true,
      check_source: 'catalog',
    },
    resource: {
      source_label: '内置资源',
      source_group: 'search',
      supported_media_types: ['movie', 'tv'],
      target_types: ['share'],
      priority: 10,
    },
    config_schema: [
      {
        key: 'api_url',
        label: '接口地址',
        type: 'string',
        required: true,
        description: '搜索接口地址',
      },
    ],
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
    id: 'search.custom-enabled',
    version: '0.0.0',
    category: 'search',
    capabilities: ['resource.search'],
    manifest_status: 'generated',
    source_type: 'custom_url',
    is_local: true,
    is_remote: false,
    installed: true,
    available_actions: ['detail', 'test', 'toggle', 'edit', 'delete'],
    install: {
      type: 'custom_url',
      url: 'https://example.com/plugin',
    },
  },
];

const createCatalogItems = (): PluginInfo[] => [
  {
    ...plugins[0],
    id: 'search.builtin-error',
    version: '1.0.0',
    category: 'search',
    capabilities: ['resource.search'],
    manifest_status: 'complete',
    source_type: 'builtin',
    is_local: true,
    is_remote: false,
    installed: true,
    available_actions: ['detail', 'test', 'toggle'],
  },
  plugins[1],
  {
    ...plugins[2],
    id: 'search.builtin-disabled',
    version: '1.0.0',
    category: 'search',
    capabilities: ['resource.search'],
    manifest_status: 'complete',
    source_type: 'builtin',
    is_local: true,
    is_remote: false,
    installed: true,
    available_actions: ['detail', 'test', 'toggle'],
  },
  {
    ...plugins[3],
    id: 'search.builtin-disabled-error',
    version: '1.0.0',
    category: 'search',
    capabilities: ['resource.search'],
    manifest_status: 'complete',
    source_type: 'builtin',
    is_local: true,
    is_remote: false,
    installed: true,
    available_actions: ['detail', 'test', 'toggle'],
  },
  plugins[4],
  {
    name: 'remote-market',
    priority: 6,
    status: 'custom',
    plugin_type: 'custom',
    is_enabled: false,
    description: 'remote market plugin',
    id: 'search.remote-market',
    version: '2.0.0',
    category: 'search',
    capabilities: ['resource.search', 'resource.search.handoff'],
    manifest_status: 'complete',
    author: 'Remote Team',
    homepage: 'https://example.com/remote-market',
    source_type: 'remote',
    is_local: false,
    is_remote: true,
    installed: false,
    available_actions: ['detail', 'install'],
    install: {
      type: 'custom_url',
      url: 'https://example.com/remote-market',
    },
    health: {
      is_healthy: false,
      last_error: '尚未导入',
      check_source: 'catalog',
    },
  },
];

let catalogItems: PluginInfo[] = [];

const clonePlugin = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const readJsonBody = (init?: RequestInit): Record<string, unknown> => {
  if (!init?.body || typeof init.body !== 'string') {
    return {};
  }
  return JSON.parse(init.body) as Record<string, unknown>;
};

const renderDialog = (props?: Partial<React.ComponentProps<typeof PluginManageDialog>>) =>
  render(
    <PluginManageDialog
      isOpen
      onClose={vi.fn()}
      onSuccess={vi.fn()}
      token="test-token"
      plugins={plugins}
      {...props}
    />
  );

const getPluginCard = (name: string) => screen.getByTestId(`plugin-card-${name}`);

const waitForCatalogReady = async () => {
  await screen.findByText('builtin-enabled');
};

describe('PluginManageDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    catalogItems = createCatalogItems();

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();

      if (url.startsWith('/api/admin/plugin-center/catalog')) {
        return {
          ok: true,
          json: async () => ({
            version: 'test-market',
            source: 'all',
            items: clonePlugin(catalogItems),
          }),
        };
      }

      if (url === '/api/admin/plugin-center/install') {
        const { id } = readJsonBody(init);
        const target = catalogItems.find((item) => item.id === id);
        const installedItem = {
          ...target,
          installed: true,
          is_local: true,
          is_enabled: true,
          url: target?.install?.url,
          available_actions: ['detail', 'test', 'toggle', 'edit', 'delete'],
        } as PluginInfo;
        catalogItems = catalogItems.map((item) => item.id === id ? installedItem : item);
        return {
          ok: true,
          json: async () => ({
            success: true,
            item: clonePlugin(installedItem),
          }),
        };
      }

      if (url === '/api/admin/test-url') {
        return {
          ok: true,
          json: async () => ({ success: true, message: 'URL连通性测试成功' }),
        };
      }

      if (url === '/api/admin/plugins') {
        const body = readJsonBody(init);
        const plugin: PluginInfo = {
          name: String(body.name),
          url: String(body.url),
          priority: Number(body.priority),
          description: String(body.description),
          plugin_type: 'custom',
          is_enabled: true,
          status: 'custom',
          id: `search.${String(body.name)}`,
          version: String(body.version || '0.0.0'),
          category: String(body.category || 'search'),
          capabilities: Array.isArray(body.capabilities) ? body.capabilities.map(String) : ['resource.search'],
          manifest_status: 'generated',
          source_type: 'custom_url',
          is_local: true,
          is_remote: false,
          installed: true,
          available_actions: ['detail', 'test', 'toggle', 'edit', 'delete'],
          install: {
            type: 'custom_url',
            url: String(body.url),
          },
        };
        catalogItems = [...catalogItems, plugin];
        return {
          ok: true,
          json: async () => ({
            success: true,
            plugin: clonePlugin(plugin),
          }),
        };
      }

      if (url.endsWith('/batch-status')) {
        const body = readJsonBody(init);
        const names = new Set((body.plugin_names as string[]) || []);
        const nextEnabled = Boolean(body.is_enabled);
        catalogItems = catalogItems.map((item) => (
          names.has(item.name)
            ? {
                ...item,
                is_enabled: nextEnabled,
                status: nextEnabled ? (item.plugin_type === 'custom' ? 'custom' : 'active') : item.status === 'error' ? 'error' : 'inactive',
              }
            : item
        ));
        return {
          ok: true,
          json: async () => ({ success_count: names.size, failed_count: 0, success: Array.from(names), failed: [] }),
        };
      }

      if (url.endsWith('/batch-delete')) {
        const body = readJsonBody(init);
        const names = new Set((body.plugin_names as string[]) || []);
        catalogItems = catalogItems.filter((item) => item.name !== 'custom-enabled');
        return {
          ok: true,
          json: async () => ({
            success_count: names.has('custom-enabled') ? 1 : 0,
            failed_count: names.has('builtin-enabled') ? 1 : 0,
            success: names.has('custom-enabled') ? ['custom-enabled'] : [],
            failed: names.has('builtin-enabled')
              ? [{ plugin_name: 'builtin-enabled', error: '内置插件不支持删除', code: 'PLUGIN_NOT_DELETABLE' }]
              : [],
          }),
        };
      }

      if (url.includes('/status')) {
        const pluginName = url.split('/').slice(-2)[0];
        const body = readJsonBody(init);
        const nextEnabled = Boolean(body.is_enabled);
        catalogItems = catalogItems.map((item) => (
          item.name === pluginName
            ? {
                ...item,
                is_enabled: nextEnabled,
                status: nextEnabled ? (item.plugin_type === 'custom' ? 'custom' : 'active') : item.status === 'error' ? 'error' : 'inactive',
              }
            : item
        ));
        return { ok: true, json: async () => ({ success: true }) };
      }

      if (url.includes('/test')) {
        return { ok: true, json: async () => ({ status: 'ok' }) };
      }

      if (url === '/api/admin/plugins/custom-enabled' && init?.method === 'PUT') {
        const body = readJsonBody(init);
        catalogItems = catalogItems.map((item) => (
          item.name === 'custom-enabled'
            ? {
                ...item,
                priority: Number(body.priority),
                description: String(body.description),
                url: String(body.url),
                version: String(body.version),
                category: String(body.category),
                capabilities: Array.isArray(body.capabilities) ? body.capabilities.map(String) : ['resource.search'],
              }
            : item
        ));
        const updated = catalogItems.find((item) => item.name === 'custom-enabled');
        return { ok: true, json: async () => ({ success: true, plugin: clonePlugin(updated) }) };
      }

      return { ok: true, json: async () => ({}) };
    });

    vi.stubGlobal('fetch', fetchMock);
  });

  it('sends plugin status toggle request', async () => {
    renderDialog();
    await waitForCatalogReady();

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
    renderDialog();
    await waitForCatalogReady();

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
    renderDialog();
    await waitForCatalogReady();

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

    await waitFor(() => {
      expect(screen.queryByTestId('plugin-card-custom-enabled')).not.toBeInTheDocument();
      expect(screen.getByTestId('plugin-card-builtin-enabled')).toBeInTheDocument();
    });
  });

  it('sorts plugins with disabled normals before disabled errors', async () => {
    renderDialog();
    await waitForCatalogReady();

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

  it('shows disabled error plugin as error status', async () => {
    renderDialog();
    await waitForCatalogReady();

    const disabledErrorCard = getPluginCard('builtin-disabled-error');
    expect(within(disabledErrorCard).getByText('异常')).toBeInTheDocument();
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

    catalogItems = localPlugins.map((plugin, index) => ({
      ...plugin,
      id: `search.${plugin.name}`,
      version: '1.0.0',
      category: 'search',
      capabilities: ['resource.search'],
      source_type: 'builtin',
      is_local: true,
      is_remote: false,
      installed: true,
      available_actions: ['detail', 'test', 'toggle'],
      manifest_status: 'complete',
      priority: index === 0 ? 10 : 0,
    }));

    renderDialog({ plugins: localPlugins });
    await screen.findByText('first-enabled');

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
    renderDialog();
    await waitForCatalogReady();

    fireEvent.click(screen.getByRole('button', { name: '快速测试' }));

    await waitFor(() => {
      const calls = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls
        .map((call) => String(call[0]))
        .filter((url) => url.includes('/test'));
      expect(calls).toContain('/api/admin/plugins/builtin-error/test');
      expect(calls).toContain('/api/admin/plugins/builtin-enabled/test');
      expect(calls).toContain('/api/admin/plugins/custom-enabled/test');
      expect(calls).not.toContain('/api/admin/plugins/builtin-disabled/test');
      expect(calls).not.toContain('/api/admin/plugins/builtin-disabled-error/test');
      expect(calls).not.toContain('/api/admin/plugins/remote-market/test');
    });
  });

  it('keeps disabled plugin as error when test fails', async () => {
    catalogItems = [
      {
        name: 'disabled-normal',
        priority: 10,
        status: 'inactive',
        plugin_type: 'builtin',
        is_enabled: false,
        description: 'disabled normal',
        id: 'search.disabled-normal',
        version: '1.0.0',
        category: 'search',
        capabilities: ['resource.search'],
        source_type: 'builtin',
        is_local: true,
        is_remote: false,
        installed: true,
        available_actions: ['detail', 'test', 'toggle'],
        manifest_status: 'complete',
      },
    ];

    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.startsWith('/api/admin/plugin-center/catalog')) {
        return {
          ok: true,
          json: async () => ({
            version: 'test-market',
            source: 'all',
            items: clonePlugin(catalogItems),
          }),
        };
      }
      if (url === '/api/admin/plugins/disabled-normal/test') {
        catalogItems = catalogItems.map((item) => (
          item.name === 'disabled-normal'
            ? { ...item, status: 'error' as const }
            : item
        ));
        return { ok: false, json: async () => ({ error: 'failed' }) };
      }
      return { ok: true, json: async () => ({}) };
    }));

    renderDialog({ plugins: catalogItems });
    await screen.findByText('disabled-normal');

    expect(screen.getByText('已停用')).toBeInTheDocument();
    fireEvent.click(within(getPluginCard('disabled-normal')).getByRole('button', { name: '测试' }));

    await waitFor(() => {
      const card = getPluginCard('disabled-normal');
      expect(within(card).getByText('异常')).toBeInTheDocument();
      expect(within(card).queryByText('已停用')).not.toBeInTheDocument();
    });
  });

  it('uses one toggle button to select all filtered plugins and clear selection', async () => {
    renderDialog();
    await waitForCatalogReady();

    expect(screen.queryByText('已选 0 项')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '全选当前筛选' }));

    expect(screen.getByText('已选 6 项')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '清空选择' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '清空选择' }));
    expect(screen.queryByText('已选 6 项')).not.toBeInTheDocument();
    expect(screen.queryByText('已选 0 项')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '全选当前筛选' })).toBeInTheDocument();
  });

  it('shows add button only in edit mode', async () => {
    const { rerender } = renderDialog();
    await waitForCatalogReady();

    expect(screen.getByRole('button', { name: '添加 URL 插件' })).toBeInTheDocument();

    rerender(
      <PluginManageDialog
        isOpen
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        token="test-token"
        plugins={plugins}
        mode="view"
      />
    );

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: '添加 URL 插件' })).not.toBeInTheDocument();
    });
  });

  it('opens add plugin dialog with required fields', async () => {
    renderDialog();
    await waitForCatalogReady();

    fireEvent.click(screen.getByRole('button', { name: '添加 URL 插件' }));
    expect(screen.getByRole('heading', { name: '添加插件' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('例如：my-custom-plugin')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('https://example.com/api/search?q=关键词')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('填写插件用途、资源类型等说明')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('例如：1.0.0')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('例如：search')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('例如：resource.search, resource.search.handoff')).toBeInTheDocument();
  });

  it('shows manifest metadata and plugin center details', async () => {
    renderDialog();
    await waitForCatalogReady();

    const builtinCard = getPluginCard('builtin-enabled');
    expect(within(builtinCard).getByText('v1.2.3')).toBeInTheDocument();
    expect(within(builtinCard).getByText('search')).toBeInTheDocument();
    expect(within(builtinCard).getByText('resource.search')).toBeInTheDocument();

    fireEvent.click(within(builtinCard).getByRole('button', { name: /详情/ }));

    expect(screen.getByText('插件清单')).toBeInTheDocument();
    expect(screen.getByText('search.builtin-enabled')).toBeInTheDocument();
    expect(screen.getByText('内置资源')).toBeInTheDocument();
    expect(screen.getByText('movie / tv')).toBeInTheDocument();
    expect(screen.getByText('配置项')).toBeInTheDocument();
    expect(screen.getByText('接口地址')).toBeInTheDocument();
    expect(screen.getByText('UniSearch')).toBeInTheDocument();
    expect(screen.getByText('https://example.com/builtin-enabled')).toBeInTheDocument();
    expect(screen.getByText('健康状态')).toBeInTheDocument();
    expect(screen.getAllByText('resource.search.handoff').length).toBeGreaterThan(0);
  });

  it('validates required fields before create request', async () => {
    renderDialog();
    await waitForCatalogReady();

    fireEvent.click(screen.getByRole('button', { name: '添加 URL 插件' }));
    fireEvent.change(screen.getByPlaceholderText('例如：my-custom-plugin'), {
      target: { value: 'only-name' },
    });

    const submitButtons = screen.getAllByRole('button', { name: '添加插件' });
    const submitButton = submitButtons[submitButtons.length - 1];
    expect(submitButton).toBeDisabled();

    await waitFor(() => {
      const calls = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls;
      const hasCreateCall = calls.some(([url]) => String(url) === '/api/admin/plugins');
      expect(hasCreateCall).toBe(false);
    });
  });

  it('tests plugin URL connectivity from add dialog', async () => {
    renderDialog();
    await waitForCatalogReady();

    fireEvent.click(screen.getByRole('button', { name: '添加 URL 插件' }));
    fireEvent.change(screen.getByPlaceholderText('https://example.com/api/search?q=关键词'), {
      target: { value: 'https://example.com/test' },
    });

    fireEvent.click(screen.getByRole('button', { name: '测试URL' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/test-url',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ url: 'https://example.com/test' }),
        })
      );
    });

    expect(screen.getByText('URL连通性测试成功')).toBeInTheDocument();
  });

  it('creates custom plugin and refreshes local list', async () => {
    const onSuccess = vi.fn();
    renderDialog({ onSuccess });
    await waitForCatalogReady();

    fireEvent.click(screen.getByRole('button', { name: '添加 URL 插件' }));
    fireEvent.change(screen.getByPlaceholderText('例如：my-custom-plugin'), {
      target: { value: 'new-custom-plugin' },
    });
    fireEvent.change(screen.getByPlaceholderText('https://example.com/api/search?q=关键词'), {
      target: { value: 'https://example.com/new' },
    });
    fireEvent.change(screen.getByPlaceholderText('填写插件用途、资源类型等说明'), {
      target: { value: 'new desc' },
    });

    const submitButtons = screen.getAllByRole('button', { name: '添加插件' });
    fireEvent.click(submitButtons[submitButtons.length - 1]);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/plugins',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            name: 'new-custom-plugin',
            url: 'https://example.com/new',
            priority: 3,
            description: 'new desc',
            version: '0.0.0',
            category: 'search',
            capabilities: ['resource.search'],
            tags: [],
          }),
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('plugin-card-new-custom-plugin')).toBeInTheDocument();
    });
    expect(onSuccess).toHaveBeenCalled();
    expect(screen.queryByPlaceholderText('例如：my-custom-plugin')).not.toBeInTheDocument();
  });

  it('imports remote catalog plugin into local workspace', async () => {
    renderDialog();
    await waitForCatalogReady();

    const remoteCard = getPluginCard('remote-market');
    expect(within(remoteCard).getByText('未安装')).toBeInTheDocument();

    fireEvent.click(within(remoteCard).getByRole('button', { name: '一键导入' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/plugin-center/install',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ id: 'search.remote-market' }),
        })
      );
    });

    await waitFor(() => {
      const installedCard = getPluginCard('remote-market');
      expect(within(installedCard).queryByText('未安装')).not.toBeInTheDocument();
      expect(within(installedCard).getByRole('button', { name: '测试' })).toBeInTheDocument();
    });
  });

  it('sends custom plugin manifest metadata when editing', async () => {
    renderDialog();
    await waitForCatalogReady();

    const customCard = getPluginCard('custom-enabled');
    fireEvent.click(within(customCard).getByRole('button', { name: /详情/ }));
    fireEvent.click(screen.getByRole('button', { name: '编辑该插件' }));

    fireEvent.change(screen.getByDisplayValue('0.0.0'), {
      target: { value: '1.4.0' },
    });
    fireEvent.change(screen.getByDisplayValue('search'), {
      target: { value: 'media' },
    });
    fireEvent.change(screen.getByDisplayValue('resource.search'), {
      target: { value: 'resource.search, resource.search.handoff' },
    });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/plugins/custom-enabled',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({
            priority: 4,
            description: 'custom enabled',
            url: 'https://example.com/plugin',
            version: '1.4.0',
            category: 'media',
            capabilities: ['resource.search', 'resource.search.handoff'],
            tags: [],
          }),
        })
      );
    });
  });

  it('blocks duplicate plugin names locally', async () => {
    renderDialog();
    await waitForCatalogReady();

    fireEvent.click(screen.getByRole('button', { name: '添加 URL 插件' }));
    fireEvent.change(screen.getByPlaceholderText('例如：my-custom-plugin'), {
      target: { value: 'CUSTOM-ENABLED' },
    });
    fireEvent.change(screen.getByPlaceholderText('https://example.com/api/search?q=关键词'), {
      target: { value: 'https://example.com/dup' },
    });

    const submitButtons = screen.getAllByRole('button', { name: '添加插件' });
    fireEvent.click(submitButtons[submitButtons.length - 1]);

    await waitFor(() => {
      const calls = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls;
      const hasCreateCall = calls.some(([url]) => String(url) === '/api/admin/plugins');
      expect(hasCreateCall).toBe(false);
    });

    expect(toast.error).toHaveBeenCalledWith('插件名称已存在，请更换名称');
  });
});
