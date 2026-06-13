import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SystemSettingsView } from '../SystemSettingsView';

const controllerState = {
  enableUserAuth: true,
  enableUserLogin: true,
  enableUserSignup: true,
  enableResourceDetailPage: false,
  publicSiteUrl: '',
  tmdbReadAccessToken: '',
  tmdbCurrentTokenPreview: 'tmdb-token-preview',
  cacheSettings: {
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
    config_source: 'database' as const,
    redis_connected: true,
    cache_setting_options: undefined,
  },
  isLoading: false,
  isSaving: null,
  isSavingTMDB: false,
  isSavingCache: false,
  isTriggeringHotPreload: false,
  isClearingHotCache: false,
};

const actions = {
  setPublicSiteUrl: vi.fn(),
  setTMDBReadAccessToken: vi.fn(),
  updateCacheField: vi.fn(),
  handleToggleAuth: vi.fn(),
  handleToggleLogin: vi.fn(),
  handleToggleSignup: vi.fn(),
  handleToggleResourceDetailPage: vi.fn(),
  handleSaveDisplayConfig: vi.fn(),
  handleSaveTMDBConfig: vi.fn(),
  handleSaveCacheSettings: vi.fn(),
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
    controllerState.tmdbReadAccessToken = '';
    controllerState.tmdbCurrentTokenPreview = 'tmdb-token-preview';
    controllerState.isSavingTMDB = false;
    actions.setTMDBReadAccessToken.mockImplementation((value: string) => {
      controllerState.tmdbReadAccessToken = value;
    });
    controllerState.cacheSettings = {
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
    };
  });

  it('展示单输入框令牌配置并允许查看当前令牌', () => {
    render(<SystemSettingsView />);

    expect(screen.getByText('Redis 缓存策略')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '保存缓存配置' })).toBeInTheDocument();
    expect(screen.getByText('TMDB Read Access Token')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '查看 TMDB 令牌' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '保存 TMDB 令牌' })).toBeDisabled();
  });

  it('支持在单输入框中查看并编辑令牌', async () => {
    const user = userEvent.setup();
    render(<SystemSettingsView />);

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

  it('会以默认值下拉框展示缓存配置', () => {
    render(<SystemSettingsView />);

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

    await user.click(screen.getByRole('combobox', { name: '搜索缓存 TTL（秒）' }));
    const ttlListbox = await screen.findByRole('listbox');
    await user.click(within(ttlListbox).getByRole('option', { name: '2 小时' }));

    await user.click(screen.getByRole('combobox', { name: '预热时间（HH:mm）' }));
    const timeListbox = await screen.findByRole('listbox');
    await user.click(within(timeListbox).getByRole('option', { name: '06:00' }));

    expect(actions.updateCacheField).toHaveBeenCalledWith('search_cache_ttl_seconds', 7200);
    expect(actions.updateCacheField).toHaveBeenCalledWith('hot_ranking_preload_time', '06:00');
  });

  it('优先展示后端返回的缓存下拉项', () => {
    controllerState.cacheSettings = {
      ...controllerState.cacheSettings,
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
    };

    render(<SystemSettingsView />);

    expect(screen.getByRole('combobox', { name: '搜索缓存 TTL（秒）' })).toHaveTextContent('90 分钟（默认）');
  });
});
