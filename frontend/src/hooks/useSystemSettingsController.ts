import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { SystemSettingsService, type CacheSettingsResponse, type RuntimeSettingsResponse } from '@/services/systemSettingsService';
import { useAuthStore } from '@/stores/authStore';
import { getErrorDataError, getErrorMessage } from '@/lib/error';
import { resolvePublicSiteUrl } from '@/lib/publicSiteConfig';
import { DEFAULT_CACHE_SETTINGS, normalizeCacheSettings } from '@/lib/systemSettingsCacheOptions';

export type SavingState = 'auth' | 'login' | 'signup' | 'resource_detail' | 'display' | null;
export type TMDBConfigSource = 'secret_manager' | 'env_fallback' | 'unconfigured';

export const DEFAULT_RUNTIME_SETTINGS: RuntimeSettingsResponse = {
  default_concurrency: 50,
  http_max_conns: 1000,
  async_plugin_enabled: true,
  async_response_timeout: 4,
  async_max_background_workers: 20,
  async_max_background_tasks: 100,
  proxy_enabled: false,
  proxy_url: '',
  config_source: 'database',
  restart_required_fields: ['http_max_conns'],
};

export const useSystemSettingsController = () => {
  const { token } = useAuthStore();
  
  // 状态管理
  const [enableUserAuth, setEnableUserAuth] = useState<boolean>(true);
  const [enableUserLogin, setEnableUserLogin] = useState<boolean>(true);
  const [enableUserSignup, setEnableUserSignup] = useState<boolean>(true);
  const [enableResourceDetailPage, setEnableResourceDetailPage] = useState<boolean>(false);
  const [publicSiteUrl, setPublicSiteUrl] = useState<string>(resolvePublicSiteUrl());
  const [tmdbReadAccessToken, setTMDBReadAccessToken] = useState<string>('');
  const [tmdbCurrentTokenPreview, setTMDBCurrentTokenPreview] = useState<string>('');
  const [cacheSettings, setCacheSettings] = useState<CacheSettingsResponse>(DEFAULT_CACHE_SETTINGS);
  const [runtimeSettings, setRuntimeSettings] = useState<RuntimeSettingsResponse>(DEFAULT_RUNTIME_SETTINGS);
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<SavingState>(null);
  const [isSavingTMDB, setIsSavingTMDB] = useState<boolean>(false);
  const [isSavingCache, setIsSavingCache] = useState<boolean>(false);
  const [isSavingRuntime, setIsSavingRuntime] = useState<boolean>(false);
  const [isTriggeringHotPreload, setIsTriggeringHotPreload] = useState<boolean>(false);
  const [isClearingHotCache, setIsClearingHotCache] = useState<boolean>(false);
  
  // 原始值（用于错误恢复）
  const [originalValues, setOriginalValues] = useState({
    enableUserAuth: true,
    enableUserLogin: true,
    enableUserSignup: true,
    enableResourceDetailPage: false,
    publicSiteUrl: resolvePublicSiteUrl(),
  });

  const loadSettings = useCallback(async () => {
    if (!token) return;

    setIsLoading(true);
    try {
      const settings = await SystemSettingsService.getSettingsAdmin(token);
      setEnableUserAuth(settings.enable_user_auth);
      setEnableUserLogin(settings.enable_user_login);
      setEnableUserSignup(settings.enable_user_signup);
      setEnableResourceDetailPage(settings.enable_resource_detail_page);
      setPublicSiteUrl(resolvePublicSiteUrl(settings));
      
      setOriginalValues({
        enableUserAuth: settings.enable_user_auth,
        enableUserLogin: settings.enable_user_login,
        enableUserSignup: settings.enable_user_signup,
        enableResourceDetailPage: settings.enable_resource_detail_page,
        publicSiteUrl: resolvePublicSiteUrl(settings),
      });

      const tmdbSettings = await SystemSettingsService.getTMDBSettings(token);
      setTMDBCurrentTokenPreview(tmdbSettings.read_access_token ?? '');

      const latestCacheSettings = await SystemSettingsService.getCacheSettings(token);
      setCacheSettings(normalizeCacheSettings(latestCacheSettings));

      const latestRuntimeSettings = await SystemSettingsService.getRuntimeSettings(token);
      setRuntimeSettings({
        ...DEFAULT_RUNTIME_SETTINGS,
        ...latestRuntimeSettings,
      });
    } catch (error) {
      console.error('加载系统设置失败:', error);
      toast.error('加载系统设置失败：' + (getErrorDataError(error) || getErrorMessage(error)));
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleToggleAuth = async (checked: boolean) => {
    if (!token) return;

    setEnableUserAuth(checked);
    setIsSaving('auth');

    try {
      const result = await SystemSettingsService.updateSettings(token, {
        enable_user_auth: checked,
      });
      setOriginalValues(prev => ({ ...prev, enableUserAuth: checked }));
      
      if (!checked) {
        setEnableUserLogin(result.enable_user_login);
        setEnableUserSignup(result.enable_user_signup);
      }
      
      toast.success(checked ? '已启用用户登录注册功能' : '已禁用用户登录注册功能');
    } catch (error) {
      console.error('保存系统设置失败:', error);
      setEnableUserAuth(originalValues.enableUserAuth);
      toast.error('保存失败：' + (getErrorDataError(error) || getErrorMessage(error)));
    } finally {
      setIsSaving(null);
    }
  };

  const handleToggleLogin = async (checked: boolean) => {
    if (!token) return;

    setEnableUserLogin(checked);
    setIsSaving('login');

    try {
      await SystemSettingsService.updateSettings(token, {
        enable_user_login: checked,
      });
      setOriginalValues(prev => ({ ...prev, enableUserLogin: checked }));
      toast.success(checked ? '已启用用户登录功能' : '已禁用用户登录功能');
    } catch (error) {
      console.error('保存系统设置失败:', error);
      setEnableUserLogin(originalValues.enableUserLogin);
      toast.error('保存失败：' + (getErrorDataError(error) || getErrorMessage(error)));
    } finally {
      setIsSaving(null);
    }
  };

  const handleToggleSignup = async (checked: boolean) => {
    if (!token) return;

    setEnableUserSignup(checked);
    setIsSaving('signup');

    try {
      await SystemSettingsService.updateSettings(token, {
        enable_user_signup: checked,
      });
      setOriginalValues(prev => ({ ...prev, enableUserSignup: checked }));
      toast.success(checked ? '已启用用户注册功能' : '已禁用用户注册功能');
    } catch (error) {
      console.error('保存系统设置失败:', error);
      setEnableUserSignup(originalValues.enableUserSignup);
      toast.error('保存失败：' + (getErrorDataError(error) || getErrorMessage(error)));
    } finally {
      setIsSaving(null);
    }
  };

  const handleToggleResourceDetailPage = async (checked: boolean) => {
    if (!token) return;

    setEnableResourceDetailPage(checked);
    setIsSaving('resource_detail');

    try {
      await SystemSettingsService.updateSettings(token, {
        enable_resource_detail_page: checked,
      });
      setOriginalValues(prev => ({ ...prev, enableResourceDetailPage: checked }));
      toast.success(checked ? '已启用资源详情页展示' : '已禁用资源详情页展示');
    } catch (error) {
      console.error('保存系统设置失败:', error);
      setEnableResourceDetailPage(originalValues.enableResourceDetailPage);
      toast.error('保存失败：' + (getErrorDataError(error) || getErrorMessage(error)));
    } finally {
      setIsSaving(null);
    }
  };

  const handleSaveDisplayConfig = async () => {
    if (!token) return;

    setIsSaving('display');
    try {
      const result = await SystemSettingsService.updateSettings(token, {
        public_site_url: publicSiteUrl.trim(),
      });
      const resolvedSiteUrl = resolvePublicSiteUrl(result);
      setPublicSiteUrl(resolvedSiteUrl);
      setOriginalValues(prev => ({
        ...prev,
        publicSiteUrl: resolvedSiteUrl,
      }));
      toast.success('公开展示配置已更新');
    } catch (error) {
      console.error('保存系统设置失败:', error);
      setPublicSiteUrl(originalValues.publicSiteUrl);
      toast.error('保存失败：' + (getErrorDataError(error) || getErrorMessage(error)));
    } finally {
      setIsSaving(null);
    }
  };

  const handleSaveTMDBConfig = async () => {
    if (!token) return;

    setIsSavingTMDB(true);
    try {
      const result = await SystemSettingsService.updateTMDBSettings(token, {
        tmdb_read_access_token: tmdbReadAccessToken.trim(),
      });
      setTMDBCurrentTokenPreview(result.read_access_token ?? '');
      setTMDBReadAccessToken('');
      toast.success('TMDB 访问令牌已更新');
    } catch (error) {
      console.error('保存 TMDB 配置失败:', error);
      toast.error('保存失败：' + (getErrorDataError(error) || getErrorMessage(error)));
    } finally {
      setIsSavingTMDB(false);
    }
  };

  const updateCacheField = useCallback(<K extends keyof CacheSettingsResponse>(field: K, value: CacheSettingsResponse[K]) => {
    setCacheSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const updateRuntimeField = useCallback(<K extends keyof RuntimeSettingsResponse>(field: K, value: RuntimeSettingsResponse[K]) => {
    setRuntimeSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const reloadCacheSettings = useCallback(async () => {
    if (!token) return;

    const latest = await SystemSettingsService.getCacheSettings(token);
    setCacheSettings(normalizeCacheSettings(latest));
  }, [token]);

  const handleSaveCacheSettings = async () => {
    if (!token) return;

    setIsSavingCache(true);
    try {
      const nextSettings = await SystemSettingsService.updateCacheSettings(token, {
        cache_enabled: cacheSettings.cache_enabled,
        search_cache_ttl_seconds: cacheSettings.search_cache_ttl_seconds,
        cache_write_queue_size: cacheSettings.cache_write_queue_size,
        cache_write_workers: cacheSettings.cache_write_workers,
        hot_ranking_cache_enabled: cacheSettings.hot_ranking_cache_enabled,
        hot_ranking_preload_enabled: cacheSettings.hot_ranking_preload_enabled,
        hot_ranking_preload_time: cacheSettings.hot_ranking_preload_time,
        hot_ranking_preload_limit: cacheSettings.hot_ranking_preload_limit,
        hot_ranking_cache_ttl_seconds: cacheSettings.hot_ranking_cache_ttl_seconds,
        hot_ranking_preload_concurrency: cacheSettings.hot_ranking_preload_concurrency,
        hot_ranking_preload_timeout_seconds: cacheSettings.hot_ranking_preload_timeout_seconds,
      });
      setCacheSettings(normalizeCacheSettings(nextSettings));
      toast.success('缓存配置已更新');
    } catch (error) {
      console.error('保存缓存配置失败:', error);
      toast.error('保存失败：' + (getErrorDataError(error) || getErrorMessage(error)));
      void reloadCacheSettings();
    } finally {
      setIsSavingCache(false);
    }
  };

  const reloadRuntimeSettings = useCallback(async () => {
    if (!token) return;

    const latest = await SystemSettingsService.getRuntimeSettings(token);
    setRuntimeSettings({
      ...DEFAULT_RUNTIME_SETTINGS,
      ...latest,
    });
  }, [token]);

  const handleSaveRuntimeSettings = async () => {
    if (!token) return;

    setIsSavingRuntime(true);
    try {
      const nextSettings = await SystemSettingsService.updateRuntimeSettings(token, {
        default_concurrency: runtimeSettings.default_concurrency,
        http_max_conns: runtimeSettings.http_max_conns,
        async_plugin_enabled: runtimeSettings.async_plugin_enabled,
        async_response_timeout: runtimeSettings.async_response_timeout,
        async_max_background_workers: runtimeSettings.async_max_background_workers,
        async_max_background_tasks: runtimeSettings.async_max_background_tasks,
        proxy_enabled: runtimeSettings.proxy_enabled,
        proxy_url: runtimeSettings.proxy_url,
      });
      setRuntimeSettings({
        ...DEFAULT_RUNTIME_SETTINGS,
        ...nextSettings,
      });
      toast.success('运行配置已更新');
    } catch (error) {
      console.error('保存运行配置失败:', error);
      toast.error('保存失败：' + (getErrorDataError(error) || getErrorMessage(error)));
      void reloadRuntimeSettings();
    } finally {
      setIsSavingRuntime(false);
    }
  };

  const handleTriggerHotRankingPreload = async () => {
    if (!token) return;

    setIsTriggeringHotPreload(true);
    try {
      const result = await SystemSettingsService.triggerHotRankingPreload(token);
      await reloadCacheSettings();
      toast.success(`热门榜单预热完成：成功 ${result.result.success}/${result.result.total}`);
    } catch (error) {
      console.error('立即预热热门榜单失败:', error);
      toast.error('预热失败：' + (getErrorDataError(error) || getErrorMessage(error)));
    } finally {
      setIsTriggeringHotPreload(false);
    }
  };

  const handleClearHotRankingCache = async () => {
    if (!token) return;

    setIsClearingHotCache(true);
    try {
      await SystemSettingsService.clearHotRankingCache(token);
      await reloadCacheSettings();
      toast.success('热门榜单缓存已清理');
    } catch (error) {
      console.error('清理热门榜单缓存失败:', error);
      toast.error('清理失败：' + (getErrorDataError(error) || getErrorMessage(error)));
    } finally {
      setIsClearingHotCache(false);
    }
  };

  return {
    state: {
      enableUserAuth,
      enableUserLogin,
      enableUserSignup,
      enableResourceDetailPage,
      publicSiteUrl,
      tmdbReadAccessToken,
      tmdbCurrentTokenPreview,
      cacheSettings,
      runtimeSettings,
      isLoading,
      isSaving,
      isSavingTMDB,
      isSavingCache,
      isSavingRuntime,
      isTriggeringHotPreload,
      isClearingHotCache,
    },
    actions: {
      setPublicSiteUrl,
      setTMDBReadAccessToken,
      updateCacheField,
      updateRuntimeField,
      handleToggleAuth,
      handleToggleLogin,
      handleToggleSignup,
      handleToggleResourceDetailPage,
      handleSaveDisplayConfig,
      handleSaveTMDBConfig,
      handleSaveCacheSettings,
      handleSaveRuntimeSettings,
      handleTriggerHotRankingPreload,
      handleClearHotRankingCache,
    }
  };
};
