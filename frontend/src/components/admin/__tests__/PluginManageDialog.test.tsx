import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PluginManageDialog } from '../PluginManageDialog';
import type { PluginInfo } from "@/types/plugin";

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

const builtinPlugins: PluginInfo[] = [
  {
    name: 'builtin-error',
    priority: 0,
    status: 'error',
    plugin_type: 'builtin',
    is_enabled: true,
    description: 'builtin error',
    id: 'search.builtin-error',
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
    tags: ['电影'],
  },
  {
    name: 'sidhub',
    priority: 2,
    status: 'active',
    plugin_type: 'builtin',
    is_enabled: true,
    description: 'SeedHub',
    id: 'search.sidhub',
    version: '1.0.0',
    category: 'search',
    capabilities: ['resource.search'],
    source_type: 'builtin',
    is_local: true,
    is_remote: false,
    installed: true,
    available_actions: ['detail', 'test', 'toggle'],
    manifest_status: 'complete',
    config_schema: [
      {
        key: 'pre_resolved_link_start_per_type',
        label: '每类完整解析数量',
        type: 'number',
        required: false,
        default: 3,
        description: '每类完整解析数量',
      },
    ],
  },
  {
    name: 'media-enabled',
    priority: 2,
    status: 'active',
    plugin_type: 'builtin',
    is_enabled: true,
    description: 'media enabled',
    id: 'search.media-enabled',
    version: '1.0.0',
    category: 'media',
    capabilities: ['resource.search'],
    source_type: 'builtin',
    is_local: true,
    is_remote: false,
    installed: true,
    available_actions: ['detail', 'test', 'toggle'],
    manifest_status: 'complete',
    tags: ['剧集'],
  },
  {
    name: 'builtin-disabled',
    priority: 3,
    status: 'inactive',
    plugin_type: 'builtin',
    is_enabled: false,
    description: 'builtin disabled',
    id: 'search.builtin-disabled',
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
  {
    name: 'builtin-disabled-error',
    priority: 4,
    status: 'error',
    plugin_type: 'builtin',
    is_enabled: false,
    description: 'builtin disabled error',
    id: 'search.builtin-disabled-error',
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

let catalogItems: PluginInfo[] = [];
let runtimeConfigs: Record<string, Record<string, unknown>> = {};

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
      plugins={builtinPlugins}
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
    catalogItems = clonePlugin(builtinPlugins);
    runtimeConfigs = {
      sidhub: {
        pre_resolved_link_start_per_type: 3,
      },
    };

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();

      if (url.startsWith('/api/admin/plugin-center/catalog')) {
        return {
          ok: true,
          json: async () => ({
            version: 'local',
            source: 'builtin',
            items: clonePlugin(catalogItems),
          }),
        };
      }

      if (url === '/api/admin/tags?scope=plugin') {
        return {
          ok: true,
          json: async () => ({
            items: [
              { id: 1, name: '电影', scope: 'plugin' },
              { id: 2, name: '剧集', scope: 'plugin' },
            ],
          }),
        };
      }

      if (url.endsWith('/config')) {
        const pluginName = url.split('/').slice(-2)[0];
        if (init?.method === 'PUT') {
          const body = readJsonBody(init);
          runtimeConfigs[pluginName] = body.config as Record<string, unknown>;
          return {
            ok: true,
            json: async () => ({
              plugin_name: pluginName,
              config: clonePlugin(runtimeConfigs[pluginName]),
            }),
          };
        }
        return {
          ok: true,
          json: async () => ({
            plugin_name: pluginName,
            config: clonePlugin(runtimeConfigs[pluginName] || {}),
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
                status: nextEnabled ? 'active' : item.status === 'error' ? 'error' : 'inactive',
              }
            : item
        ));
        return {
          ok: true,
          json: async () => ({
            success_count: names.size,
            failed_count: 0,
            success: Array.from(names),
            failed: [],
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
                status: nextEnabled ? 'active' : item.status === 'error' ? 'error' : 'inactive',
              }
            : item
        ));
        return { ok: true, json: async () => ({ success: true }) };
      }

      if (url.includes('/test')) {
        return { ok: true, json: async () => ({ status: 'ok' }) };
      }

      return { ok: true, json: async () => ({}) };
    });

    vi.stubGlobal('fetch', fetchMock);
  });

  it('不展示插件导入、自定义新增和批量删除入口', async () => {
    renderDialog();
    await waitForCatalogReady();

    expect(screen.queryByRole('button', { name: '添加 URL 插件' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '添加插件' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '一键导入' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '批量删除' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '测试URL' })).not.toBeInTheDocument();
  });

  it('只读模式同样不展示插件新增入口', async () => {
    renderDialog({ mode: 'view' });
    await waitForCatalogReady();

    expect(screen.queryByRole('button', { name: '添加 URL 插件' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '添加插件' })).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: '选择插件 builtin-enabled' })).not.toBeInTheDocument();
  });

  it('发送单插件启停请求', async () => {
    renderDialog();
    await waitForCatalogReady();

    fireEvent.click(screen.getByRole('switch', {
      name: '插件 builtin-enabled 当前已启用',
    }));

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

  it('发送批量插件启停请求', async () => {
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

  it('排序时停用普通插件排在停用异常插件之前', async () => {
    renderDialog();
    await waitForCatalogReady();

    const errorNode = screen.getByText('builtin-error');
    const enabledNode = screen.getByText('builtin-enabled');
    const disabledNode = screen.getByText('builtin-disabled');
    const disabledErrorNode = screen.getByText('builtin-disabled-error');

    expect(errorNode.compareDocumentPosition(enabledNode) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(enabledNode.compareDocumentPosition(disabledNode) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(disabledNode.compareDocumentPosition(disabledErrorNode) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('批量测试只包含已启用插件', async () => {
    renderDialog();
    await waitForCatalogReady();

    fireEvent.click(screen.getByRole('button', { name: '快速测试' }));

    await waitFor(() => {
      const calls = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls
        .map((call) => String(call[0]))
        .filter((url) => url.includes('/test'));
      expect(calls).toContain('/api/admin/plugins/builtin-error/test');
      expect(calls).toContain('/api/admin/plugins/builtin-enabled/test');
      expect(calls).toContain('/api/admin/plugins/media-enabled/test');
      expect(calls).not.toContain('/api/admin/plugins/builtin-disabled/test');
      expect(calls).not.toContain('/api/admin/plugins/builtin-disabled-error/test');
    });
  });

  it('保留详情、清单、资源和配置项展示', async () => {
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
    expect(screen.queryByRole('button', { name: '编辑该插件' })).not.toBeInTheDocument();
  });

  it('支持编辑并保存 SeedHub 数字配置项', async () => {
    renderDialog();
    await waitForCatalogReady();

    const sidHubCard = getPluginCard('sidhub');
    fireEvent.click(within(sidHubCard).getByRole('button', { name: /详情/ }));

    const input = await screen.findByLabelText('每类完整解析数量');
    fireEvent.change(input, { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: '保存配置' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/plugins/sidhub/config',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({
            config: {
              pre_resolved_link_start_per_type: 5,
            },
          }),
        })
      );
    });
  });

  it('支持分类和能力筛选', async () => {
    renderDialog();
    await waitForCatalogReady();

    await userEvent.click(screen.getByRole('combobox', { name: '插件分类筛选' }));
    await userEvent.click(within(await screen.findByRole('listbox')).getByRole('option', { name: 'media' }));

    expect(screen.getByTestId('plugin-card-media-enabled')).toBeInTheDocument();
    expect(screen.queryByTestId('plugin-card-builtin-enabled')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('combobox', { name: '插件分类筛选' }));
    await userEvent.click(within(await screen.findByRole('listbox')).getByRole('option', { name: '全部分类' }));
    await userEvent.click(screen.getByRole('combobox', { name: '插件能力筛选' }));
    await userEvent.click(within(await screen.findByRole('listbox')).getByRole('option', { name: 'resource.search.handoff' }));

    expect(screen.getByTestId('plugin-card-builtin-enabled')).toBeInTheDocument();
    expect(screen.queryByTestId('plugin-card-media-enabled')).not.toBeInTheDocument();
  });
});
