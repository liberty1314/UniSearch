import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSystemSettingsController } from '../useSystemSettingsController';

const getSettingsAdminMock = vi.fn();
const getTMDBSettingsMock = vi.fn();
const getCacheSettingsMock = vi.fn();
const updateTMDBSettingsMock = vi.fn();
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
    updateTMDBSettings: (...args: unknown[]) => updateTMDBSettingsMock(...args),
    updateSettings: vi.fn(),
  },
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
      public_site_url: '',
      default_copy_format_template: '',
    });
    getTMDBSettingsMock.mockResolvedValue({
      configured: true,
      updated_at: '2026-05-25T10:00:00Z',
      source: 'secret_manager',
      read_access_token: 'existing-token',
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
  });

  it('加载时会同步 TMDB 配置状态', async () => {
    const { result } = renderHook(() => useSystemSettingsController());

    await waitFor(() => {
      expect(result.current.state.tmdbCurrentTokenPreview).toBe('existing-token');
    });
  });

  it('保存成功后会清空输入框并刷新状态', async () => {
    updateTMDBSettingsMock.mockResolvedValue({
      configured: true,
      updated_at: '2026-05-25T12:00:00Z',
      source: 'secret_manager',
      read_access_token: 'new-token',
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
    expect(result.current.state.tmdbCurrentTokenPreview).toBe('new-token');
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
