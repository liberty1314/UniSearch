import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SystemSettingsService } from '@/services/systemSettingsService';

const { axiosGetMock, axiosPutMock, getMock, putMock, postMock, deleteMock } = vi.hoisted(() => ({
  axiosGetMock: vi.fn(),
  axiosPutMock: vi.fn(),
  getMock: vi.fn(),
  putMock: vi.fn(),
  postMock: vi.fn(),
  deleteMock: vi.fn(),
}));

vi.mock('axios', () => ({
  default: {
    get: axiosGetMock,
    put: axiosPutMock,
  },
}));

vi.mock('@/lib/api', () => ({
  apiClient: {
    get: getMock,
    put: putMock,
    post: postMock,
    delete: deleteMock,
  },
}));

describe('SystemSettingsService search source diversity settings', () => {
  beforeEach(() => {
    axiosGetMock.mockReset();
    axiosPutMock.mockReset();
  });

  it('旧后端缺少来源配额字段时使用关闭和 16 的安全默认值', async () => {
    axiosGetMock.mockResolvedValue({
      data: {
        enable_user_auth: true,
        enable_user_login: true,
        enable_user_signup: true,
        enable_resource_detail_page: false,
        enable_resource_source_badges: false,
        public_site_url: '',
        default_copy_format_template: '',
        progressive_search_enabled: true,
      },
    });

    const settings = await SystemSettingsService.getSettings();

    expect(settings.enable_search_source_diversity).toBe(false);
    expect(settings.search_first_page_max_per_source).toBe(16);
  });

  it('保留后端返回的来源配额设置', async () => {
    axiosGetMock.mockResolvedValue({
      data: {
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
      },
    });

    const settings = await SystemSettingsService.getSettingsAdmin('token');

    expect(settings.enable_search_source_diversity).toBe(true);
    expect(settings.search_first_page_max_per_source).toBe(12);
  });

  it('通过系统设置更新入口保存来源配额', async () => {
    axiosPutMock.mockResolvedValue({
      data: {
        enable_user_auth: true,
        enable_user_login: true,
        enable_user_signup: true,
        enable_resource_detail_page: false,
        enable_resource_source_badges: false,
        enable_search_source_diversity: true,
        search_first_page_max_per_source: 10,
        public_site_url: '',
        default_copy_format_template: '',
        progressive_search_enabled: true,
      },
    });

    const settings = await SystemSettingsService.updateSettings('token', {
      enable_search_source_diversity: true,
      search_first_page_max_per_source: 10,
    });

    expect(axiosPutMock).toHaveBeenCalledWith(
      expect.stringContaining('/admin/system-settings'),
      {
        enable_search_source_diversity: true,
        search_first_page_max_per_source: 10,
      },
      expect.any(Object),
    );
    expect(settings.search_first_page_max_per_source).toBe(10);
  });
});

describe('SystemSettingsService TMDB admin api', () => {
  beforeEach(() => {
    getMock.mockReset();
    putMock.mockReset();
    postMock.mockReset();
    deleteMock.mockReset();
  });

  it('获取 TMDB 管理配置状态', async () => {
    getMock.mockResolvedValue({
      configured: true,
      updated_at: '2026-05-25T10:00:00Z',
      source: 'secret_manager',
      token_preview: 'exis********oken',
    });

    const result = await SystemSettingsService.getTMDBSettings('token');

    expect(getMock).toHaveBeenCalledWith('/admin/system-settings/tmdb');
    expect(result.configured).toBe(true);
    expect(result.token_preview).toBe('exis********oken');
  });

  it('更新 TMDB 读取令牌', async () => {
    putMock.mockResolvedValue({
      configured: true,
      updated_at: '2026-05-25T10:00:00Z',
      source: 'secret_manager',
      token_preview: 'new-********oken',
    });

    const result = await SystemSettingsService.updateTMDBSettings('token', {
      tmdb_read_access_token: 'new-token',
    });

    expect(putMock).toHaveBeenCalledWith('/admin/system-settings/tmdb', {
      tmdb_read_access_token: 'new-token',
    });
    expect(result.source).toBe('secret_manager');
    expect(result.token_preview).toBe('new-********oken');
  });

  it('获取缓存配置', async () => {
    getMock.mockResolvedValue({
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
      cache_setting_options: {
        search_cache_ttl_seconds: [{ value: '3600', label: '1 小时（默认）' }],
        cache_write_queue_size: [{ value: '256', label: '256（默认）' }],
        cache_write_workers: [{ value: '4', label: '4（默认）' }],
        hot_ranking_preload_time: [{ value: '00:00', label: '00:00（默认）' }],
        hot_ranking_preload_limit: [{ value: '50', label: '50 条（默认）' }],
        hot_ranking_cache_ttl_seconds: [{ value: '86400', label: '24 小时（默认）' }],
        hot_ranking_preload_concurrency: [{ value: '2', label: '2（默认）' }],
        hot_ranking_preload_timeout_seconds: [{ value: '30', label: '30 秒（默认）' }],
      },
      redis_connected: true,
    });

    const result = await SystemSettingsService.getCacheSettings('token');

    expect(getMock).toHaveBeenCalledWith('/admin/system-settings/cache');
    expect(result.hot_ranking_preload_limit).toBe(50);
    expect(result.cache_setting_options?.search_cache_ttl_seconds[0]?.label).toBe('1 小时（默认）');
  });

  it('更新缓存配置', async () => {
    putMock.mockResolvedValue({
      cache_enabled: true,
      search_cache_ttl_seconds: 5400,
      cache_write_queue_size: 512,
      cache_write_workers: 4,
      hot_ranking_cache_enabled: true,
      hot_ranking_preload_enabled: true,
      hot_ranking_preload_time: '01:00',
      hot_ranking_preload_limit: 60,
      hot_ranking_cache_ttl_seconds: 86400,
      hot_ranking_preload_concurrency: 2,
      hot_ranking_preload_timeout_seconds: 30,
      config_source: 'database',
      redis_connected: true,
    });

    const result = await SystemSettingsService.updateCacheSettings('token', {
      search_cache_ttl_seconds: 5400,
      hot_ranking_preload_time: '01:00',
    });

    expect(putMock).toHaveBeenCalledWith('/admin/system-settings/cache', {
      search_cache_ttl_seconds: 5400,
      hot_ranking_preload_time: '01:00',
    });
    expect(result.search_cache_ttl_seconds).toBe(5400);
  });

  it('触发热门榜单立即预热', async () => {
    postMock.mockResolvedValue({
      message: '热门榜单预热已完成',
      result: {
        total: 56,
        success: 56,
        failed: 0,
      },
    });

    const result = await SystemSettingsService.triggerHotRankingPreload('token');

    expect(postMock).toHaveBeenCalledWith('/admin/system-settings/cache/hot-ranking/preload', undefined, { timeout: 0 });
    expect(result.result.total).toBe(56);
  });

  it('清理热门榜单缓存', async () => {
    deleteMock.mockResolvedValue({
      message: '热门榜单缓存已清理',
    });

    const result = await SystemSettingsService.clearHotRankingCache('token');

    expect(deleteMock).toHaveBeenCalledWith('/admin/system-settings/cache/hot-ranking');
    expect(result.message).toBe('热门榜单缓存已清理');
  });

  it('获取运行配置', async () => {
    getMock.mockResolvedValue({
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

    const result = await SystemSettingsService.getRuntimeSettings('token');

    expect(getMock).toHaveBeenCalledWith('/admin/system-settings/runtime');
    expect(result.default_concurrency).toBe(50);
    expect(result.progressive_search_enabled).toBe(true);
    expect(result.restart_required_fields).toEqual(['http_max_conns']);
  });

  it('更新运行配置', async () => {
    putMock.mockResolvedValue({
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

    const result = await SystemSettingsService.updateRuntimeSettings('token', {
      default_concurrency: 60,
      async_response_timeout: 5,
      progressive_search_enabled: false,
    });

    expect(putMock).toHaveBeenCalledWith('/admin/system-settings/runtime', {
      default_concurrency: 60,
      async_response_timeout: 5,
      progressive_search_enabled: false,
    });
    expect(result.default_concurrency).toBe(60);
    expect(result.progressive_search_enabled).toBe(false);
  });
});
