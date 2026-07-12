import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChannelManagementView } from '../ChannelManagementView';

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({ token: 'test-token' }),
}));

describe('ChannelManagementView', () => {
  beforeEach(() => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();

      if (url === '/api/admin/channels') {
        return {
          ok: true,
          json: async () => ({
            total: 12,
            channels: Array.from({ length: 12 }, (_, index) => {
              const id = index + 1;
              return {
                id,
                name: `chan-${String(id).padStart(2, '0')}`,
                is_enabled: id !== 11,
                sort_order: id,
                tags: id === 12 ? ['影视', '热门'] : ['常规'],
                health_status: id >= 11 ? 'error' : 'healthy',
                last_error: id >= 11 ? 'timeout' : undefined,
                check_source: id >= 11 ? 'manual_test' : 'system',
                last_checked_at: id === 12 ? '2026-05-17T00:20:00' : '2026-05-17 00:10:00',
                created_at: '',
                updated_at: '',
              };
            }),
            health_summary: {
              total: 12,
              healthy: 11,
              error: 1,
              untested: 0,
              enabled_error: 0,
            },
          }),
        };
      }

      if (url === '/api/admin/tags?scope=channel') {
        return {
          ok: true,
          json: async () => ({
            items: [
              { id: 1, name: '影视', scope: 'channel' },
              { id: 2, name: '推荐', scope: 'channel' },
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
              id: 88,
              name: '备用',
              scope: 'channel',
            },
          }),
        };
      }

      if (typeof url === 'string' && url.startsWith('/api/admin/tags/') && init?.method === 'PUT') {
        const body = init.body && typeof init.body === 'string' ? JSON.parse(init.body) as { name?: string } : {};
        const tagId = Number(url.split('/').pop() || 0);
        return {
          ok: true,
          json: async () => ({
            success: true,
            item: {
              id: tagId,
              name: body.name || '电影',
              scope: 'channel',
            },
          }),
        };
      }

      if (typeof url === 'string' && url.startsWith('/api/admin/tags/') && init?.method === 'DELETE') {
        return {
          ok: true,
          json: async () => ({
            success: true,
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

  it('渲染页面级频道运营台并支持分页与页大小选择', async () => {
    render(<ChannelManagementView />);

    expect(await screen.findByRole('heading', { name: 'Telegram 频道' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: '频道状态筛选' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('搜索频道名称或错误信息')).toBeInTheDocument();
    expect(screen.getByText('chan-01')).toBeInTheDocument();
    expect(screen.queryByText('chan-11')).not.toBeInTheDocument();
    expect(screen.queryByTestId('channel-management-drawer')).not.toBeInTheDocument();
    const listHeader = screen.getByTestId('channel-list-header');
    expect(within(listHeader).getByText('频道')).toBeInTheDocument();
    expect(within(listHeader).getByText('最近检查')).toBeInTheDocument();
    expect(within(listHeader).getByText('操作')).toBeInTheDocument();
    expect(screen.getByTestId('channel-row-12')).toHaveClass('dark:bg-slate-950/[0.52]');

    const pageSizeSelect = screen.getByRole('combobox', { name: '每页条数' });
    await userEvent.click(pageSizeSelect);
    const pageSizeListbox = await screen.findByRole('listbox');
    await userEvent.click(within(pageSizeListbox).getByRole('option', { name: '20 条' }));
    expect(await screen.findByText('chan-11')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('channel-row-12'));
    expect(screen.queryByTestId('channel-management-drawer')).not.toBeInTheDocument();

    fireEvent.click(within(screen.getByTestId('channel-row-12')).getByRole('button', { name: '查看频道 chan-12 详情' }));

    const drawer = await screen.findByTestId('channel-management-drawer');
    expect(within(drawer).getByText('chan-12')).toBeInTheDocument();
    expect(within(drawer).getByText('timeout')).toBeInTheDocument();
    expect(within(drawer).getByText('timeout').closest('div')).toHaveClass('dark:bg-slate-950/[0.40]');
    expect(within(drawer).getByRole('button', { name: '测试' })).toHaveClass('admin-test-action');
    expect(within(screen.getByTestId('channel-row-12')).getByRole('button', { name: '查看频道 chan-12 详情' })).toBeInTheDocument();
    expect(within(screen.getByTestId('channel-row-12')).queryByText('健康状态')).not.toBeInTheDocument();
    expect(within(screen.getByTestId('channel-row-12')).queryByText('异常')).not.toBeInTheDocument();
    expect(within(screen.getByTestId('channel-row-12')).getByText('2026-05-17 00:20')).toHaveClass('tabular-nums');
    expect(within(screen.getByTestId('channel-row-12')).queryByText('2026-05-17T00:20:00')).not.toBeInTheDocument();
    expect(
      within(screen.getByTestId('channel-row-12')).getByRole('switch', {
        name: '频道 chan-12 当前已启用',
      }),
    ).toHaveClass('admin-status-toggle-action');
    expect(
      within(screen.getByTestId('channel-row-12')).getByRole('button', {
        name: '删除频道 chan-12',
      }),
    ).toHaveClass('admin-delete-action');
  });

  it('统计卡片仅展示总数、启用、停用和启用项异常数', async () => {
    render(<ChannelManagementView />);

    await screen.findByRole('heading', { name: 'Telegram 频道' });

    const metricRegion = screen.getByText('已接入后台监控的频道').parentElement?.parentElement as HTMLElement;
    const metricLabels = ['总数', '启用', '停用', '异常'];
    expect(within(metricRegion).getAllByText(/^(总数|启用|停用|异常)$/).map((node) => node.textContent)).toEqual(metricLabels);
    expect(within(within(metricRegion).getByText('总数').parentElement as HTMLElement).getByText('12')).toBeInTheDocument();
    expect(within(within(metricRegion).getByText('启用').parentElement as HTMLElement).getByText('11')).toBeInTheDocument();
    expect(within(within(metricRegion).getByText('停用').parentElement as HTMLElement).getByText('1')).toBeInTheDocument();
    expect(within(within(metricRegion).getByText('异常').parentElement as HTMLElement).getByText('1')).toBeInTheDocument();
    expect(screen.queryByText('未测试/停用')).not.toBeInTheDocument();
  });

  it('支持状态下拉与标签筛选联动', async () => {
    render(<ChannelManagementView />);

    await screen.findByText('chan-01');

    const statusSelect = screen.getByRole('combobox', { name: '频道状态筛选' });
    await userEvent.click(statusSelect);
    let listbox = await screen.findByRole('listbox');
    await userEvent.click(within(listbox).getByRole('option', { name: '异常' }));
    expect(await screen.findByTestId('channel-row-12')).toBeInTheDocument();
    expect(screen.queryByTestId('channel-row-1')).not.toBeInTheDocument();

    await userEvent.click(statusSelect);
    listbox = await screen.findByRole('listbox');
    await userEvent.click(within(listbox).getByRole('option', { name: '全部' }));
    await userEvent.click(screen.getByTestId('channel-tag-filter-trigger'));
    const panel = await screen.findByTestId('channel-tag-filter-panel');
    await userEvent.click(within(panel).getAllByRole('button', { name: /影视/ })[0]);

    expect(await screen.findByTestId('channel-row-12')).toBeInTheDocument();
    expect(screen.queryByTestId('channel-row-1')).not.toBeInTheDocument();
  });

  it('当前详情项被筛选移除时关闭详情抽屉', async () => {
    render(<ChannelManagementView />);

    await screen.findByText('chan-01');
    fireEvent.click(within(screen.getByTestId('channel-row-12')).getByRole('button', { name: '查看频道 chan-12 详情' }));
    expect(await screen.findByTestId('channel-management-drawer')).toBeInTheDocument();

    const statusSelect = screen.getByRole('combobox', { name: '频道状态筛选' });
    await userEvent.click(statusSelect);
    const listbox = await screen.findByRole('listbox');
    await userEvent.click(within(listbox).getByRole('option', { name: '禁用' }));

    await waitFor(() => {
      expect(screen.queryByTestId('channel-management-drawer')).not.toBeInTheDocument();
    });
  });

  it('支持在筛选框内直接新增频道标签', async () => {
    render(<ChannelManagementView />);

    await screen.findByRole('heading', { name: 'Telegram 频道' });
    await userEvent.click(screen.getByRole('button', { name: '频道标签筛选' }));

    const panel = await screen.findByTestId('channel-tag-filter-panel');
    const searchInput = within(panel).getByPlaceholderText('搜索频道标签筛选');
    await userEvent.type(searchInput, '筛选新增');

    await userEvent.click(within(panel).getByRole('button', { name: '新增标签 筛选新增' }));
    expect(await within(panel).findByText(/已创建标签/)).toBeInTheDocument();
    expect(within(panel).getByText('备用')).toBeInTheDocument();

    const fetchMock = vi.mocked(fetch);
    const tagCreateCall = fetchMock.mock.calls.find(
      ([url, init]) => url === '/api/admin/tags' && init?.method === 'POST'
    );

    expect(tagCreateCall).toBeTruthy();
    expect(JSON.parse(String(tagCreateCall?.[1]?.body))).toEqual({
      scope: 'channel',
      name: '筛选新增',
    });
  });

  it('选择频道后显示批量操作栏', async () => {
    render(<ChannelManagementView />);

    await screen.findByText('chan-01');
    expect(screen.queryByTestId('channel-selection-bar')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '全选当前筛选' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: '选择频道 chan-01' }));

    const selectionBar = await screen.findByTestId('channel-selection-bar');
    expect(selectionBar).toHaveTextContent('已选 1 项');
    expect(within(selectionBar).getByRole('button', { name: '全选当前筛选' })).toBeInTheDocument();
    expect(within(selectionBar).getByRole('button', { name: '批量启用' })).toBeInTheDocument();
    expect(within(selectionBar).getByRole('button', { name: '批量测试' })).toBeInTheDocument();
    expect(within(selectionBar).getByRole('button', { name: '批量删除' })).toBeInTheDocument();
  });

  it('顶部快速测试会测试全部已启用频道，批量测试只测试选中频道', async () => {
    render(<ChannelManagementView />);

    await screen.findByText('chan-01');

    await userEvent.click(screen.getByRole('button', { name: '快速测试' }));

    await waitFor(() => {
      const fetchCalls = vi.mocked(fetch).mock.calls
        .map(([url, init]) => ({ url: String(url), method: init?.method }));
      const testUrls = fetchCalls
        .filter((item) => item.url.includes('/test') && item.method === 'POST')
        .map((item) => item.url);
      expect(testUrls).toContain('/api/admin/channels/chan-01/test');
      expect(testUrls).toContain('/api/admin/channels/chan-12/test');
    });

    vi.mocked(fetch).mockClear();

    fireEvent.click(screen.getByRole('checkbox', { name: '选择频道 chan-01' }));
    fireEvent.click(screen.getByRole('checkbox', { name: '选择频道 chan-02' }));
    await userEvent.click(screen.getByRole('button', { name: '批量测试' }));

    await waitFor(() => {
      const fetchCalls = vi.mocked(fetch).mock.calls
        .map(([url, init]) => ({ url: String(url), method: init?.method }));
      const testUrls = fetchCalls
        .filter((item) => item.url.includes('/test') && item.method === 'POST')
        .map((item) => item.url);
      expect(testUrls).toEqual([
        '/api/admin/channels/chan-01/test',
        '/api/admin/channels/chan-02/test',
      ]);
    });
  });

  it('支持在详情抽屉中保存频道标签', async () => {
    render(<ChannelManagementView />);

    await screen.findByRole('heading', { name: 'Telegram 频道' });
    fireEvent.click(within(screen.getByTestId('channel-row-12')).getByRole('button', { name: '查看频道 chan-12 详情' }));
    const drawer = await screen.findByTestId('channel-management-drawer');

    await userEvent.click(within(drawer).getByRole('button', { name: '频道标签选择器' }));
    const panel = await screen.findByTestId('channel-tag-selector-panel');
    expect(within(panel).getByText('推荐')).toBeInTheDocument();
    expect(within(panel).queryByText('电影')).not.toBeInTheDocument();
    expect(within(panel).queryByRole('button', { name: '编辑标签 影视' })).not.toBeInTheDocument();
    await userEvent.click(within(panel).getByRole('button', { name: /推荐/ }));
    await userEvent.type(screen.getByPlaceholderText('搜索或新增频道标签'), '备用');
    await userEvent.click(screen.getByRole('button', { name: '新增标签 备用' }));
    await userEvent.click(within(drawer).getByRole('button', { name: '保存标签' }));

    const fetchMock = vi.mocked(fetch);
    const tagCreateCall = fetchMock.mock.calls.find(
      ([url, init]) => url === '/api/admin/tags' && init?.method === 'POST'
    );
    expect(tagCreateCall).toBeTruthy();
    expect(JSON.parse(String(tagCreateCall?.[1]?.body))).toEqual({
      scope: 'channel',
      name: '备用',
    });

    const updateCall = fetchMock.mock.calls.find(
      ([url, init]) => url === '/api/admin/channels/12' && init?.method === 'PUT'
    );

    expect(updateCall).toBeTruthy();
    const requestBody = JSON.parse(String(updateCall?.[1]?.body));
    expect(requestBody.tags).toEqual(['备用']);
  });

  it('支持在筛选框内编辑和删除频道标签词库项', async () => {
    render(<ChannelManagementView />);

    await screen.findByRole('heading', { name: 'Telegram 频道' });
    expect(screen.queryByRole('button', { name: '标签管理' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId('channel-tag-filter-trigger'));
    const panel = await screen.findByTestId('channel-tag-filter-panel');
    expect(within(panel).queryByText(/#\d+/)).not.toBeInTheDocument();
    expect(within(panel).queryByRole('button', { name: '编辑标签 影视' })).not.toBeInTheDocument();

    const searchInput = within(panel).getByPlaceholderText('搜索频道标签筛选');
    await userEvent.type(searchInput, '新标签');
    expect(within(panel).getByRole('button', { name: '新增标签 新标签' })).toBeInTheDocument();
    await userEvent.clear(searchInput);

    await userEvent.click(within(panel).getByRole('button', { name: '开启标签管理' }));
    await userEvent.click(within(panel).getByRole('button', { name: '编辑标签 影视' }));
    const renameInput = await within(panel).findByDisplayValue('影视');
    await userEvent.clear(renameInput);
    await userEvent.type(renameInput, '影片');
    await userEvent.click(within(panel).getByRole('button', { name: '保存标签 影视' }));

    expect(await within(panel).findByText('影片')).toBeInTheDocument();

    await userEvent.click(within(panel).getByRole('button', { name: '删除标签 推荐' }));
    const confirmDialog = await screen.findByRole('alertdialog', { name: '删除标签' });
    fireEvent.click(within(confirmDialog).getByRole('button', { name: '删除' }));

    const fetchMock = vi.mocked(fetch);
    const updateCall = fetchMock.mock.calls.find(
      ([url, init]) => typeof url === 'string' && url.startsWith('/api/admin/tags/') && init?.method === 'PUT'
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
});
