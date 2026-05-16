import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PluginManagementView } from '../PluginManagementView';

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({ token: 'test-token' }),
}));

const createCatalogItems = () => Array.from({ length: 12 }, (_, index) => {
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
  };
});

describe('PluginManagementView', () => {
  beforeEach(() => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
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
    expect(screen.getByText('目录版本 2026.05')).toBeInTheDocument();
    expect(screen.getByText('builtin-enabled-1')).toBeInTheDocument();
    expect(screen.queryByText('builtin-enabled-11')).not.toBeInTheDocument();

    const pageSizeSelect = screen.getByRole('combobox', { name: '每页条数' });
    expect(within(pageSizeSelect).getByRole('option', { name: '10 条' })).toBeInTheDocument();
    expect(within(pageSizeSelect).getByRole('option', { name: '20 条' })).toBeInTheDocument();
    expect(within(pageSizeSelect).getByRole('option', { name: '50 条' })).toBeInTheDocument();
    expect(within(pageSizeSelect).getByRole('option', { name: '100 条' })).toBeInTheDocument();

    await userEvent.selectOptions(pageSizeSelect, '20');
    expect(await screen.findByText('builtin-enabled-11')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('plugin-market-card-builtin-enabled-11'));

    const drawer = await screen.findByTestId('plugin-management-drawer');
    expect(within(drawer).getByText('builtin-enabled-11')).toBeInTheDocument();
    expect(within(drawer).getByText(/内置插件示例 11/)).toBeInTheDocument();
  });

  it('选择插件后显示批量操作栏', async () => {
    render(<PluginManagementView />);

    await screen.findByText('builtin-enabled-1');
    expect(screen.queryByTestId('plugin-selection-bar')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: '选择插件 builtin-enabled-1' }));

    const selectionBar = await screen.findByTestId('plugin-selection-bar');
    expect(selectionBar).toHaveTextContent('已选 1 项');
    expect(within(selectionBar).getByRole('button', { name: '批量启用' })).toBeInTheDocument();
    expect(within(selectionBar).getByRole('button', { name: '批量测试' })).toBeInTheDocument();
  });
});
