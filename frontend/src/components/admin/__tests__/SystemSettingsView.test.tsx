import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SystemSettingsView } from '../SystemSettingsView';
import type { CacheSettingsResponse, RuntimeSettingsResponse } from '@/services/systemSettingsService';

const createCacheSettings = (
  overrides: Partial<CacheSettingsResponse> = {},
): CacheSettingsResponse => ({
  cache_enabled: true,
  search_cache_ttl_seconds: 3600,
  cache_write_queue_size: 256,
  cache_write_workers: 4,
  hot_ranking_cache_enabled: true,
  hot_ranking_preload_enabled: true,
  hot_ranking_preload_time: '00:00',
  hot_ranking_preload_limit: 50,
  hot_ranking_cache_ttl_seconds: 86400,
  hot_ranking_preload_concurrency: 2,
  hot_ranking_preload_timeout_seconds: 30,
  config_source: 'database',
  redis_connected: true,
  ...overrides,
});

const createRuntimeSettings = (
  overrides: Partial<RuntimeSettingsResponse> = {},
): RuntimeSettingsResponse => ({
  default_concurrency: 50,
  http_max_conns: 1000,
  async_plugin_enabled: true,
  async_response_timeout: 4,
  async_max_background_workers: 20,
  async_max_background_tasks: 100,
  progressive_search_enabled: true,
  proxy_enabled: false,
  proxy_url: '',
  config_source: 'database',
  restart_required_fields: ['http_max_conns'],
  ...overrides,
});

const controllerState = {
  enableUserAuth: true,
  enableUserLogin: true,
  enableUserSignup: true,
  enableResourceDetailPage: false,
  enableResourceSourceBadges: false,
  enableSearchSourceDiversity: false,
  searchFirstPageMaxPerSource: 16,
  publicSiteUrl: '',
  tmdbReadAccessToken: '',
  tmdbCurrentTokenPreview: 'tmdb-token-preview',
  cacheSettings: createCacheSettings(),
  runtimeSettings: createRuntimeSettings(),
  isLoading: false,
  isSaving: null,
  isSavingTMDB: false,
  isSavingCache: false,
  isSavingRuntime: false,
  isTriggeringHotPreload: false,
  isClearingHotCache: false,
};

const actions = {
  setPublicSiteUrl: vi.fn(),
  setTMDBReadAccessToken: vi.fn(),
  updateCacheField: vi.fn(),
  updateRuntimeField: vi.fn(),
  handleToggleAuth: vi.fn(),
  handleToggleLogin: vi.fn(),
  handleToggleSignup: vi.fn(),
  handleToggleResourceDetailPage: vi.fn(),
  handleToggleResourceSourceBadges: vi.fn(),
  setEnableSearchSourceDiversity: vi.fn(),
  setSearchFirstPageMaxPerSource: vi.fn(),
  handleSaveSearchSourceDiversitySettings: vi.fn(),
  handleSaveDisplayConfig: vi.fn(),
  handleSaveTMDBConfig: vi.fn(),
  handleSaveCacheSettings: vi.fn(),
  handleSaveRuntimeSettings: vi.fn(),
  handleTriggerHotRankingPreload: vi.fn(),
  handleClearHotRankingCache: vi.fn(),
};

vi.mock('@/hooks/useSystemSettingsController', () => ({
  useSystemSettingsController: () => ({
    state: controllerState,
    actions,
  }),
}));

actions.setTMDBReadAccessToken.mockImplementation((value: string) => {
  controllerState.tmdbReadAccessToken = value;
});

describe('SystemSettingsView TMDB section', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/admin?view=system_settings');
    controllerState.tmdbReadAccessToken = '';
    controllerState.tmdbCurrentTokenPreview = 'tmdb-token-preview';
    controllerState.isSavingTMDB = false;
    actions.setTMDBReadAccessToken.mockImplementation((value: string) => {
      controllerState.tmdbReadAccessToken = value;
    });
    controllerState.cacheSettings = createCacheSettings();
    controllerState.runtimeSettings = createRuntimeSettings();
  });

  it('展示分组导航并默认显示账号与访问', () => {
    render(<SystemSettingsView />);

    expect(screen.getByRole('tablist', { name: '系统设置分组' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '账号与访问' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '搜索体验' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '运行配置' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '缓存与预热' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '外部服务' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '站点展示' })).toBeInTheDocument();
    expect(screen.getByText('启用用户功能')).toBeInTheDocument();
    expect(screen.queryByText('Redis 缓存策略')).not.toBeInTheDocument();
  });

  it('点击运行配置后展示并发、异步插件和代理配置', async () => {
    const user = userEvent.setup();
    render(<SystemSettingsView />);

    await user.click(screen.getByRole('tab', { name: '运行配置' }));

    expect(screen.getByText('并发配置')).toBeInTheDocument();
    expect(screen.getByText('异步插件配置')).toBeInTheDocument();
    expect(screen.getByText('代理配置')).toBeInTheDocument();
    expect(screen.getByLabelText('默认并发数')).toHaveValue(50);
    expect(screen.getByLabelText('最大连接数')).toHaveValue(1000);
    expect(screen.getByLabelText('响应超时')).toHaveValue(4);
    expect(screen.getByLabelText('最大工作者')).toHaveValue(20);
    expect(screen.getByLabelText('最大任务')).toHaveValue(100);
    expect(screen.queryByText('启用渐进式搜索')).not.toBeInTheDocument();
    expect(screen.getByLabelText('代理地址')).toBeDisabled();
    expect(screen.getByRole('button', { name: '保存运行配置' })).toBeInTheDocument();
  });

  it('在搜索体验中支持切换渐进式搜索开关', async () => {
    const user = userEvent.setup();
    render(<SystemSettingsView />);

    await user.click(screen.getByRole('tab', { name: '搜索体验' }));
    await user.click(screen.getByRole('switch', { name: '启用渐进式搜索' }));

    expect(actions.updateRuntimeField).toHaveBeenCalledWith('progressive_search_enabled', false);
  });

  it('在搜索体验中保存渐进式搜索设置', async () => {
    const user = userEvent.setup();
    render(<SystemSettingsView />);

    await user.click(screen.getByRole('tab', { name: '搜索体验' }));
    await user.click(screen.getByRole('button', { name: '保存搜索体验配置' }));

    expect(actions.handleSaveRuntimeSettings).toHaveBeenCalled();
  });

  it('在搜索体验中配置首屏来源配额', async () => {
    const user = userEvent.setup();
    render(<SystemSettingsView />);

    await user.click(screen.getByRole('tab', { name: '搜索体验' }));

    const diversitySwitch = screen.getByRole('switch', { name: '启用首屏来源配额' });
    const maxPerSourceInput = screen.getByRole('spinbutton', { name: '首屏单来源上限' });

    expect(diversitySwitch).not.toBeChecked();
    expect(maxPerSourceInput).toHaveValue(16);
    expect(maxPerSourceInput).toHaveAttribute('min', '1');
    expect(maxPerSourceInput).toHaveAttribute('max', '48');
    expect(maxPerSourceInput).toHaveAttribute('step', '1');

    await user.click(diversitySwitch);
    fireEvent.change(maxPerSourceInput, { target: { value: '12' } });
    await user.click(screen.getByRole('button', { name: '保存来源配额' }));

    expect(actions.setEnableSearchSourceDiversity).toHaveBeenCalledWith(true);
    expect(actions.setSearchFirstPageMaxPerSource).toHaveBeenCalledWith(12);
    expect(actions.handleSaveSearchSourceDiversitySettings).toHaveBeenCalled();
  });

  it('展示单输入框令牌配置并允许查看当前令牌', async () => {
    const user = userEvent.setup();
    render(<SystemSettingsView />);

    await user.click(screen.getByRole('tab', { name: '外部服务' }));

    expect(screen.queryByText('Redis 缓存策略')).not.toBeInTheDocument();
    expect(screen.getByText('TMDB Read Access Token')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '查看 TMDB 令牌' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '保存 TMDB 令牌' })).toBeDisabled();
  });

  it('点击缓存与预热后仍能显示并保存缓存配置', async () => {
    const user = userEvent.setup();
    render(<SystemSettingsView />);

    await user.click(screen.getByRole('tab', { name: '缓存与预热' }));

    expect(screen.getByText('Redis 缓存策略')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '保存缓存配置' })).toBeInTheDocument();
    expect(screen.queryByText('TMDB Read Access Token')).not.toBeInTheDocument();
  });

  it('支持在单输入框中查看并编辑令牌', async () => {
    const user = userEvent.setup();
    render(<SystemSettingsView />);

    await user.click(screen.getByRole('tab', { name: '外部服务' }));

    const input = screen.getByPlaceholderText('请输入 TMDB Read Access Token');
    expect(input).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: '查看 TMDB 令牌' }));
    expect(input).toHaveAttribute('type', 'text');
    expect(screen.getByDisplayValue('tmdb-token-preview')).toBeInTheDocument();

    await user.clear(input);
    await user.type(input, 'new-token');

    expect(actions.setTMDBReadAccessToken).toHaveBeenCalled();
    expect(actions.setTMDBReadAccessToken).toHaveBeenNthCalledWith(1, '');
    expect(actions.setTMDBReadAccessToken).toHaveBeenLastCalledWith('n');
  });

  it('会以默认值下拉框展示缓存配置', async () => {
    const user = userEvent.setup();
    render(<SystemSettingsView />);

    await user.click(screen.getByRole('tab', { name: '缓存与预热' }));

    expect(screen.getByRole('combobox', { name: '搜索缓存 TTL（秒）' })).toHaveTextContent('1 小时（默认）');
    expect(screen.getByRole('combobox', { name: '写队列长度' })).toHaveTextContent('256（默认）');
    expect(screen.getByRole('combobox', { name: '写入 Worker 数' })).toHaveTextContent('4（默认）');
    expect(screen.getByRole('combobox', { name: '预热时间（HH:mm）' })).toHaveTextContent('00:00（默认）');
    expect(screen.getByRole('combobox', { name: '预热条数' })).toHaveTextContent('50 条（默认）');
    expect(screen.getByRole('combobox', { name: '热门榜单 TTL（秒）' })).toHaveTextContent('24 小时（默认）');
    expect(screen.getByRole('combobox', { name: '预热并发' })).toHaveTextContent('2（默认）');
    expect(screen.getByRole('combobox', { name: '预热超时（秒）' })).toHaveTextContent('30 秒（默认）');
  });

  it('支持通过下拉框更新缓存配置字段', async () => {
    const user = userEvent.setup();
    render(<SystemSettingsView />);

    await user.click(screen.getByRole('tab', { name: '缓存与预热' }));

    await user.click(screen.getByRole('combobox', { name: '搜索缓存 TTL（秒）' }));
    const ttlListbox = await screen.findByRole('listbox');
    await user.click(within(ttlListbox).getByRole('option', { name: '2 小时' }));

    await user.click(screen.getByRole('combobox', { name: '预热时间（HH:mm）' }));
    const timeListbox = await screen.findByRole('listbox');
    await user.click(within(timeListbox).getByRole('option', { name: '06:00' }));

    expect(actions.updateCacheField).toHaveBeenCalledWith('search_cache_ttl_seconds', 7200);
    expect(actions.updateCacheField).toHaveBeenCalledWith('hot_ranking_preload_time', '06:00');
  });

  it('优先展示后端返回的缓存下拉项', async () => {
    const user = userEvent.setup();
    controllerState.cacheSettings = createCacheSettings({
      search_cache_ttl_seconds: 5400,
      cache_setting_options: {
        search_cache_ttl_seconds: [{ value: '5400', label: '90 分钟（默认）' }],
        cache_write_queue_size: [{ value: '768', label: '768（默认）' }],
        cache_write_workers: [{ value: '6', label: '6（默认）' }],
        hot_ranking_preload_time: [{ value: '03:15', label: '03:15（默认）' }],
        hot_ranking_preload_limit: [{ value: '50', label: '50 条（默认）' }],
        hot_ranking_cache_ttl_seconds: [{ value: '129600', label: '36 小时（默认）' }],
        hot_ranking_preload_concurrency: [{ value: '5', label: '5（默认）' }],
        hot_ranking_preload_timeout_seconds: [{ value: '75', label: '75 秒（默认）' }],
      },
    });

    render(<SystemSettingsView />);

    await user.click(screen.getByRole('tab', { name: '缓存与预热' }));

    expect(screen.getByRole('combobox', { name: '搜索缓存 TTL（秒）' })).toHaveTextContent('90 分钟（默认）');
  });
});
