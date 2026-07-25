import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSystemSettingsController } from '../useSystemSettingsController';

const getSettingsAdminMock = vi.fn();
const getTMDBSettingsMock = vi.fn();
const getCacheSettingsMock = vi.fn();
const getRuntimeSettingsMock = vi.fn();
const getSettingsCachedMock = vi.fn();
const updateSettingsMock = vi.fn();
const updateTMDBSettingsMock = vi.fn();
const updateRuntimeSettingsMock = vi.fn();
const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({ token: 'test-token' }),
}));

vi.mock('@/services/systemSettingsService', () => ({
  SystemSettingsService: {
    getSettingsAdmin: (...args: unknown[]) => getSettingsAdminMock(...args),
    getTMDBSettings: (...args: unknown[]) => getTMDBSettingsMock(...args),
    getCacheSettings: (...args: unknown[]) => getCacheSettingsMock(...args),
    getRuntimeSettings: (...args: unknown[]) => getRuntimeSettingsMock(...args),
    getSettingsCached: (...args: unknown[]) => getSettingsCachedMock(...args),
    updateSettings: (...args: unknown[]) => updateSettingsMock(...args),
    updateTMDBSettings: (...args: unknown[]) => updateTMDBSettingsMock(...args),
    updateRuntimeSettings: (...args: unknown[]) => updateRuntimeSettingsMock(...args),
  },
  DEFAULT_SIGNUP_AUTOBAN_ENABLED: true,
  DEFAULT_SIGNUP_AUTOBAN_THRESHOLD: 30,
  DEFAULT_SIGNUP_AUTOBAN_WINDOW_MIN: 10,
  DEFAULT_SIGNUP_AUTOBAN_DURATION_MIN: 1440,
  DEFAULT_ENABLE_SIGNUP_CAPTCHA: false,
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}));

describe('useSystemSettingsController TMDB config', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSettingsAdminMock.mockResolvedValue({
      enable_user_auth: true,
      enable_user_login: true,
      enable_user_signup: true,
      enable_resource_detail_page: false,
      enable_resource_source_badges: false,
      public_site_url: '',
      default_copy_format_template: '',
      progressive_search_enabled: true,
    });
    getSettingsCachedMock.mockResolvedValue({
      enable_user_auth: true,
      enable_user_login: true,
      enable_user_signup: true,
      enable_resource_detail_page: false,
      enable_resource_source_badges: false,
      public_site_url: '',
      default_copy_format_template: '',
      progressive_search_enabled: false,
    });
    getTMDBSettingsMock.mockResolvedValue({
      configured: true,
      updated_at: '2026-05-25T10:00:00Z',
      source: 'secret_manager',
      token_preview: 'exis********oken',
    });
    getCacheSettingsMock.mockResolvedValue({
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
    });
    getRuntimeSettingsMock.mockResolvedValue({
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
    });
  });

  it('加载时会同步 TMDB 配置状态', async () => {
    const { result } = renderHook(() => useSystemSettingsController());

    await waitFor(() => {
      expect(result.current.state.tmdbCurrentTokenPreview).toBe('exis********oken');
    });
  });

  it('加载时会同步运行配置状态', async () => {
    const { result } = renderHook(() => useSystemSettingsController());

    await waitFor(() => {
      expect(result.current.state.isLoading).toBe(false);
    });

    expect(getRuntimeSettingsMock).toHaveBeenCalledWith('test-token');
    expect(result.current.state.runtimeSettings.default_concurrency).toBe(50);
    expect(result.current.state.runtimeSettings.progressive_search_enabled).toBe(true);
    expect(result.current.state.runtimeSettings.restart_required_fields).toEqual(['http_max_conns']);
  });

  it('加载时会同步资源来源标签开关', async () => {
    getSettingsAdminMock.mockResolvedValueOnce({
      enable_user_auth: true,
      enable_user_login: true,
      enable_user_signup: true,
      enable_resource_detail_page: false,
      enable_resource_source_badges: true,
      public_site_url: '',
      default_copy_format_template: '',
      progressive_search_enabled: true,
    });

    const { result } = renderHook(() => useSystemSettingsController());

    await waitFor(() => {
      expect(result.current.state.isLoading).toBe(false);
    });

    expect(result.current.state.enableResourceSourceBadges).toBe(true);
  });

  it('旧后端缺少来源配额字段时使用安全默认值', async () => {
    const { result } = renderHook(() => useSystemSettingsController());

    await waitFor(() => {
      expect(result.current.state.isLoading).toBe(false);
    });

    expect(result.current.state.enableSearchSourceDiversity).toBe(false);
    expect(result.current.state.searchFirstPageMaxPerSource).toBe(16);
  });

  it('加载并保存来源配额设置', async () => {
    getSettingsAdminMock.mockResolvedValueOnce({
      enable_user_auth: true,
      enable_user_login: true,
      enable_user_signup: true,
      enable_resource_detail_page: false,
      enable_resource_source_badges: false,
      enable_search_source_diversity: true,
      search_first_page_max_per_source: 12,
      public_site_url: '',
      default_copy_format_template: '',
      progressive_search_enabled: true,
    });
    updateSettingsMock.mockResolvedValueOnce({
      enable_user_auth: true,
      enable_user_login: true,
      enable_user_signup: true,
      enable_resource_detail_page: false,
      enable_resource_source_badges: false,
      enable_search_source_diversity: false,
      search_first_page_max_per_source: 10,
      public_site_url: '',
      default_copy_format_template: '',
      progressive_search_enabled: true,
    });

    const { result } = renderHook(() => useSystemSettingsController());

    await waitFor(() => {
      expect(result.current.state.isLoading).toBe(false);
    });

    expect(result.current.state.enableSearchSourceDiversity).toBe(true);
    expect(result.current.state.searchFirstPageMaxPerSource).toBe(12);

    act(() => {
      result.current.actions.setEnableSearchSourceDiversity(false);
      result.current.actions.setSearchFirstPageMaxPerSource(10);
    });
    await act(async () => {
      await result.current.actions.handleSaveSearchSourceDiversitySettings();
    });

    expect(updateSettingsMock).toHaveBeenCalledWith('test-token', {
      enable_search_source_diversity: false,
      search_first_page_max_per_source: 10,
    });
    expect(result.current.state.enableSearchSourceDiversity).toBe(false);
    expect(result.current.state.searchFirstPageMaxPerSource).toBe(10);
    expect(toastSuccessMock).toHaveBeenCalledWith('来源配额设置已更新');
  });

  it('会更新资源来源标签开关', async () => {
    updateSettingsMock.mockResolvedValue({
      enable_user_auth: true,
      enable_user_login: true,
      enable_user_signup: true,
      enable_resource_detail_page: false,
      enable_resource_source_badges: true,
      public_site_url: '',
      default_copy_format_template: '',
      progressive_search_enabled: true,
    });

    const { result } = renderHook(() => useSystemSettingsController());

    await waitFor(() => {
      expect(result.current.state.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.actions.handleToggleResourceSourceBadges(true);
    });

    expect(updateSettingsMock).toHaveBeenCalledWith('test-token', {
      enable_resource_source_badges: true,
    });
    expect(result.current.state.enableResourceSourceBadges).toBe(true);
    expect(toastSuccessMock).toHaveBeenCalledWith('已显示搜索结果来源标签');
  });

  it('资源来源标签开关保存失败时会回滚', async () => {
    updateSettingsMock.mockRejectedValueOnce(new Error('保存失败'));

    const { result } = renderHook(() => useSystemSettingsController());

    await waitFor(() => {
      expect(result.current.state.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.actions.handleToggleResourceSourceBadges(true);
    });

    expect(result.current.state.enableResourceSourceBadges).toBe(false);
    expect(toastErrorMock).toHaveBeenCalled();
  });

  it('会更新并保存运行配置', async () => {
    updateRuntimeSettingsMock.mockResolvedValue({
      default_concurrency: 60,
      http_max_conns: 1000,
      async_plugin_enabled: true,
      async_response_timeout: 5,
      async_max_background_workers: 30,
      async_max_background_tasks: 150,
      progressive_search_enabled: false,
      proxy_enabled: true,
      proxy_url: 'http://127.0.0.1:8080',
      config_source: 'database',
      restart_required_fields: ['http_max_conns'],
    });

    const { result } = renderHook(() => useSystemSettingsController());

    await waitFor(() => {
      expect(result.current.state.isLoading).toBe(false);
    });

    act(() => {
      result.current.actions.updateRuntimeField('default_concurrency', 60);
      result.current.actions.updateRuntimeField('async_response_timeout', 5);
      result.current.actions.updateRuntimeField('progressive_search_enabled', false);
    });

    await act(async () => {
      await result.current.actions.handleSaveRuntimeSettings();
    });

    expect(updateRuntimeSettingsMock).toHaveBeenCalledWith('test-token', expect.objectContaining({
      default_concurrency: 60,
      async_response_timeout: 5,
      progressive_search_enabled: false,
    }));
    expect(result.current.state.runtimeSettings.default_concurrency).toBe(60);
    expect(result.current.state.runtimeSettings.progressive_search_enabled).toBe(false);
    expect(result.current.state.runtimeSettings.proxy_url).toBe('http://127.0.0.1:8080');
    expect(toastSuccessMock).toHaveBeenCalledWith('运行配置已更新');
  });

  it('保存成功后会清空输入框并刷新状态', async () => {
    updateTMDBSettingsMock.mockResolvedValue({
      configured: true,
      updated_at: '2026-05-25T12:00:00Z',
      source: 'secret_manager',
      token_preview: 'new-********oken',
    });

    const { result } = renderHook(() => useSystemSettingsController());

    await waitFor(() => {
      expect(result.current.state.isLoading).toBe(false);
    });

    act(() => {
      result.current.actions.setTMDBReadAccessToken('new-token');
    });

    await act(async () => {
      await result.current.actions.handleSaveTMDBConfig();
    });

    expect(updateTMDBSettingsMock).toHaveBeenCalledWith('test-token', {
      tmdb_read_access_token: 'new-token',
    });
    expect(result.current.state.tmdbReadAccessToken).toBe('');
    expect(result.current.state.tmdbCurrentTokenPreview).toBe('new-********oken');
    expect(toastSuccessMock).toHaveBeenCalled();
  });

  it('加载时会将非法缓存配置归一化为默认可选值', async () => {
    getCacheSettingsMock.mockResolvedValue({
      cache_enabled: true,
      search_cache_ttl_seconds: 0,
      cache_write_queue_size: 999,
      cache_write_workers: 0,
      hot_ranking_cache_enabled: true,
      hot_ranking_preload_enabled: true,
      hot_ranking_preload_time: '',
      hot_ranking_preload_limit: 0,
      hot_ranking_cache_ttl_seconds: 123,
      hot_ranking_preload_concurrency: 0,
      hot_ranking_preload_timeout_seconds: 999,
      config_source: 'database',
      redis_connected: false,
    });

    const { result } = renderHook(() => useSystemSettingsController());

    await waitFor(() => {
      expect(result.current.state.isLoading).toBe(false);
    });

    expect(result.current.state.cacheSettings.search_cache_ttl_seconds).toBe(3600);
    expect(result.current.state.cacheSettings.cache_write_queue_size).toBe(256);
    expect(result.current.state.cacheSettings.cache_write_workers).toBe(4);
    expect(result.current.state.cacheSettings.hot_ranking_preload_time).toBe('00:00');
    expect(result.current.state.cacheSettings.hot_ranking_preload_limit).toBe(50);
    expect(result.current.state.cacheSettings.hot_ranking_cache_ttl_seconds).toBe(86400);
    expect(result.current.state.cacheSettings.hot_ranking_preload_concurrency).toBe(2);
    expect(result.current.state.cacheSettings.hot_ranking_preload_timeout_seconds).toBe(30);
  });

  it('加载时会保留后端下发的缓存选项和值', async () => {
    getCacheSettingsMock.mockResolvedValue({
      cache_enabled: true,
      search_cache_ttl_seconds: 5400,
      cache_write_queue_size: 768,
      cache_write_workers: 6,
      hot_ranking_cache_enabled: true,
      hot_ranking_preload_enabled: true,
      hot_ranking_preload_time: '03:15',
      hot_ranking_preload_limit: 50,
      hot_ranking_cache_ttl_seconds: 129600,
      hot_ranking_preload_concurrency: 5,
      hot_ranking_preload_timeout_seconds: 75,
      config_source: 'database',
      redis_connected: true,
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

    const { result } = renderHook(() => useSystemSettingsController());

    await waitFor(() => {
      expect(result.current.state.isLoading).toBe(false);
    });

    expect(result.current.state.cacheSettings.search_cache_ttl_seconds).toBe(5400);
    expect(result.current.state.cacheSettings.cache_write_queue_size).toBe(768);
    expect(result.current.state.cacheSettings.hot_ranking_preload_time).toBe('03:15');
    expect(result.current.state.cacheSettings.cache_setting_options?.search_cache_ttl_seconds[0]?.label).toBe('90 分钟（默认）');
  });
});
