import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PluginManagementView } from '../PluginManagementView';

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({ token: 'test-token' }),
}));

const createSidHubItem = () => ({
  id: 'search.sidhub',
  name: 'sidhub',
  version: '1.0.0',
  category: 'search',
  description: '基于 SeedHub 的影视、动漫资源搜索插件。',
  plugin_type: 'builtin',
  source_type: 'builtin',
  is_local: true,
  is_remote: false,
  installed: true,
  is_enabled: true,
  status: 'active',
  priority: 3,
  available_actions: ['detail', 'test', 'toggle'],
  capabilities: ['resource.search'],
  tags: ['电影'],
  author: 'UniSearch',
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
  health: {
    is_healthy: true,
    check_source: 'manual_test',
  },
  resource: {
    source_label: 'SeedHub',
    source_group: 'search',
    supported_media_types: ['movie'],
    target_types: ['share'],
    priority: 5,
  },
});

const createDisabledBuiltinItem = () => ({
  id: 'search.builtin-disabled',
  name: 'builtin-disabled',
  version: '1.2.3',
  category: 'search',
  description: '已停用内置插件示例',
  plugin_type: 'builtin',
  source_type: 'builtin',
  is_local: true,
  is_remote: false,
  installed: true,
  is_enabled: false,
  status: 'inactive',
  priority: 0,
  available_actions: ['detail', 'test', 'toggle'],
  capabilities: ['resource.search'],
  tags: ['电影'],
  author: 'UniSearch',
  manifest_status: 'complete',
  health: {
    is_healthy: true,
    check_source: 'manual_test',
  },
  resource: {
    source_label: '内置资源',
    source_group: 'search',
    supported_media_types: ['movie'],
    target_types: ['share'],
    priority: 5,
  },
});

const createCatalogItems = () => [createSidHubItem(), createDisabledBuiltinItem(), ...Array.from({ length: 12 }, (_, index) => {
  const order = index + 1;
  return {
    id: `search.builtin-enabled-${order}`,
    name: `builtin-enabled-${order}`,
    version: '1.2.3',
    category: 'search',
    description: `内置插件示例 ${order}`,
    plugin_type: 'builtin',
    source_type: 'builtin',
    is_local: true,
    is_remote: false,
    installed: true,
    is_enabled: true,
    status: 'active',
    priority: order,
    available_actions: ['detail', 'test', 'toggle'],
    capabilities: ['resource.search'],
    tags: order === 2 ? ['剧集'] : ['电影'],
    author: 'UniSearch',
    manifest_status: 'complete',
    health: {
      is_healthy: true,
      check_source: 'manual_test',
    },
    resource: {
      source_label: '内置资源',
      source_group: 'search',
      supported_media_types: ['movie'],
      target_types: ['share'],
      priority: 5,
    },
  };
})];

describe('PluginManagementView', () => {
  beforeEach(() => {
    const runtimeConfigs: Record<string, Record<string, unknown>> = {
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
            version: '2026.05',
            source: 'all',
            items: createCatalogItems(),
          }),
        };
      }

      if (url === '/api/admin/tags?scope=plugin') {
        return {
          ok: true,
          json: async () => ({
            items: [
              { id: 1, name: '电影', scope: 'plugin' },
              { id: 2, name: '夸克', scope: 'plugin' },
              { id: 3, name: '剧集', scope: 'plugin' },
            ],
          }),
        };
      }

      if (url === '/api/admin/tags' && init?.method === 'POST') {
        return {
          ok: true,
          json: async () => ({
            success: true,
            item: {
              id: 99,
              name: '新标签',
              scope: 'plugin',
            },
          }),
        };
      }

      if (url === '/api/admin/tags/1' && init?.method === 'PUT') {
        return {
          ok: true,
          json: async () => ({
            success: true,
            item: {
              id: 1,
              name: '影片',
              scope: 'plugin',
            },
          }),
        };
      }

      if (url === '/api/admin/tags/2' && init?.method === 'DELETE') {
        return {
          ok: true,
          json: async () => ({
            success: true,
          }),
        };
      }

      if (url.endsWith('/config')) {
        const pluginName = url.split('/').slice(-2)[0];
        if (init?.method === 'PUT') {
          runtimeConfigs[pluginName] = JSON.parse(String(init.body)).config;
        }
        return {
          ok: true,
          json: async () => ({
            plugin_name: pluginName,
            config: runtimeConfigs[pluginName] || {},
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

  it('渲染页面级插件中心并支持分页与页大小选择', async () => {
    render(<PluginManagementView />);

    expect(await screen.findByRole('heading', { name: '插件中心' })).toBeInTheDocument();
    expect(await screen.findByText(/目录版本 2026\.05/)).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: '插件状态筛选' })).toBeInTheDocument();
    expect(screen.getByTestId('plugin-market-card-builtin-enabled-1')).toBeInTheDocument();
    expect(screen.queryByTestId('plugin-market-card-builtin-enabled-11')).not.toBeInTheDocument();
    expect(screen.getByTestId('plugin-market-card-builtin-enabled-1')).toHaveClass('dark:bg-slate-950/[0.52]');
    expect(within(screen.getByTestId('plugin-market-card-builtin-enabled-1')).getByText('启用')).toBeInTheDocument();
    expect(screen.queryByText('内置插件')).not.toBeInTheDocument();

    const initialDrawer = await screen.findByTestId('plugin-management-drawer');
    expect(within(initialDrawer).getByText('builtin-enabled-1')).toBeInTheDocument();
    expect(within(initialDrawer).getByText(/内置插件示例 1/).closest('div')).toHaveClass('dark:bg-slate-950/[0.40]');

    const pageSizeSelect = screen.getByRole('combobox', { name: '每页条数' });
    await userEvent.click(pageSizeSelect);
    const pageSizeListbox = await screen.findByRole('listbox');
    expect(within(pageSizeListbox).getByRole('option', { name: '10 条' })).toBeInTheDocument();
    expect(within(pageSizeListbox).getByRole('option', { name: '20 条' })).toBeInTheDocument();
    expect(within(pageSizeListbox).getByRole('option', { name: '50 条' })).toBeInTheDocument();
    expect(within(pageSizeListbox).getByRole('option', { name: '100 条' })).toBeInTheDocument();

    await userEvent.click(within(pageSizeListbox).getByRole('option', { name: '20 条' }));
    expect(await screen.findByTestId('plugin-market-card-builtin-enabled-11')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('plugin-market-card-builtin-enabled-11'));

    const drawer = await screen.findByTestId('plugin-management-drawer');
    expect(within(drawer).getByText('builtin-enabled-11')).toBeInTheDocument();
    expect(within(drawer).getByText(/内置插件示例 11/)).toBeInTheDocument();
  });

  it('插件卡片使用启用状态替代内置徽标', async () => {
    render(<PluginManagementView />);

    await screen.findByRole('heading', { name: '插件中心' });
    expect(within(screen.getByTestId('plugin-market-card-builtin-enabled-1')).getByText('启用')).toBeInTheDocument();
    expect(screen.queryByText('内置插件')).not.toBeInTheDocument();

    const statusSelect = screen.getByRole('combobox', { name: '插件状态筛选' });
    await userEvent.click(statusSelect);
    const listbox = await screen.findByRole('listbox');
    await userEvent.click(within(listbox).getByRole('option', { name: '禁用' }));

    const disabledCard = await screen.findByTestId('plugin-market-card-builtin-disabled');
    expect(within(disabledCard).getByText('已停用')).toBeInTheDocument();
    expect(within(disabledCard).queryByText('内置插件')).not.toBeInTheDocument();
  });

  it('支持标签筛选并仅匹配任一已选标签', async () => {
    render(<PluginManagementView />);

    await screen.findByText('builtin-enabled-1');
    await userEvent.click(screen.getByTestId('plugin-tag-filter-trigger'));
    const panel = await screen.findByTestId('plugin-tag-filter-panel');
    await userEvent.click(within(panel).getByText('剧集'));

    expect(await screen.findByTestId('plugin-market-card-builtin-enabled-2')).toBeInTheDocument();
    expect(screen.queryByTestId('plugin-market-card-builtin-enabled-1')).not.toBeInTheDocument();
  });

  it('支持在筛选框内直接新增插件标签', async () => {
    render(<PluginManagementView />);

    await screen.findByRole('heading', { name: '插件中心' });
    await userEvent.click(screen.getByRole('button', { name: '插件标签筛选' }));

    const panel = await screen.findByTestId('plugin-tag-filter-panel');
    const searchInput = within(panel).getByPlaceholderText('搜索插件标签筛选');
    await userEvent.type(searchInput, '筛选新增');
    await userEvent.click(within(panel).getByRole('button', { name: '新增标签 筛选新增' }));
    expect(await within(panel).findByText(/已创建标签/)).toBeInTheDocument();
    expect(within(panel).getByText('新标签')).toBeInTheDocument();

    const fetchMock = vi.mocked(fetch);
    const tagCreateCall = fetchMock.mock.calls.find(
      ([url, init]) => url === '/api/admin/tags' && init?.method === 'POST'
    );

    expect(tagCreateCall).toBeTruthy();
    expect(JSON.parse(String(tagCreateCall?.[1]?.body))).toEqual({
      scope: 'plugin',
      name: '筛选新增',
    });
  });

  it('选择插件后显示批量操作栏', async () => {
    render(<PluginManagementView />);

    await screen.findByText('builtin-enabled-1');
    expect(screen.queryByTestId('plugin-selection-bar')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '全选当前筛选' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: '选择插件 builtin-enabled-1' }));

    const selectionBar = await screen.findByTestId('plugin-selection-bar');
    expect(selectionBar).toHaveTextContent('已选 1 项');
    expect(within(selectionBar).getByRole('button', { name: '全选当前筛选' })).toBeInTheDocument();
    expect(within(selectionBar).getByRole('button', { name: '批量启用' })).toBeInTheDocument();
    expect(within(selectionBar).getByRole('button', { name: '批量测试' })).toBeInTheDocument();
    expect(within(selectionBar).queryByRole('button', { name: '批量删除' })).not.toBeInTheDocument();
  });

  it('插件中心不暴露导入和自定义创建入口', async () => {
    render(<PluginManagementView />);

    await screen.findByRole('heading', { name: '插件中心' });

    expect(screen.queryByRole('button', { name: '导入 URL 插件' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '添加 URL 插件' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '一键导入' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '测试URL' })).not.toBeInTheDocument();

    const fetchMock = vi.mocked(fetch);
    expect(
      fetchMock.mock.calls.some(
        ([url, init]) => url === '/api/admin/plugins' && init?.method === 'POST'
      )
    ).toBe(false);
  });

  it('支持在筛选框内编辑和删除插件标签词库项', async () => {
    render(<PluginManagementView />);

    await screen.findByRole('heading', { name: '插件中心' });
    expect(screen.queryByRole('button', { name: '标签管理' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId('plugin-tag-filter-trigger'));
    const panel = await screen.findByTestId('plugin-tag-filter-panel');
    expect(within(panel).queryByText(/#\d+/)).not.toBeInTheDocument();
    expect(within(panel).queryByRole('button', { name: '编辑标签 电影' })).not.toBeInTheDocument();

    const searchInput = within(panel).getByPlaceholderText('搜索插件标签筛选');
    await userEvent.type(searchInput, '新标签');
    expect(within(panel).getByRole('button', { name: '新增标签 新标签' })).toBeInTheDocument();
    await userEvent.clear(searchInput);

    await userEvent.click(within(panel).getByRole('button', { name: '开启标签管理' }));
    await userEvent.click(within(panel).getByRole('button', { name: '编辑标签 电影' }));
    const renameInput = await within(panel).findByDisplayValue('电影');
    await userEvent.clear(renameInput);
    await userEvent.type(renameInput, '影片');
    await userEvent.click(within(panel).getByRole('button', { name: '保存标签 电影' }));

    expect(within(panel).getByText('影片')).toBeInTheDocument();

    await userEvent.click(within(panel).getByRole('button', { name: '删除标签 夸克' }));
    const confirmDialog = await screen.findByRole('alertdialog', { name: '删除标签' });
    fireEvent.click(within(confirmDialog).getByRole('button', { name: '删除' }));
    const fetchMock = vi.mocked(fetch);

    const updateCall = fetchMock.mock.calls.find(
      ([url, init]) => url === '/api/admin/tags/1' && init?.method === 'PUT'
    );
    expect(updateCall).toBeTruthy();
    expect(JSON.parse(String(updateCall?.[1]?.body))).toEqual({ name: '影片' });

    await waitFor(() => {
      const deleteCall = fetchMock.mock.calls.find(
        ([url, init]) => url === '/api/admin/tags/2' && init?.method === 'DELETE'
      );
      expect(deleteCall).toBeTruthy();
    });
  });

  it('页面级详情支持编辑并保存 SeedHub 解析条数', async () => {
    render(<PluginManagementView />);

    await screen.findByRole('heading', { name: '插件中心' });
    fireEvent.change(screen.getByPlaceholderText('搜索名称、描述、能力或标签'), {
      target: { value: 'sidhub' },
    });
    fireEvent.click(await screen.findByTestId('plugin-market-card-sidhub'));

    const drawer = await screen.findByTestId('plugin-management-drawer');
    expect(within(drawer).getByText('插件配置')).toBeInTheDocument();
    const input = await within(drawer).findByLabelText('每类完整解析数量');
    fireEvent.change(input, { target: { value: '5' } });
    fireEvent.click(within(drawer).getByRole('button', { name: '保存配置' }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
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
});
