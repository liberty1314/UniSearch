import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { SystemSettingsService } from '@/services/systemSettingsService';
import { useAuthStore } from '@/stores/authStore';
import { getErrorDataError, getErrorMessage } from '@/lib/error';
import { resolvePublicSiteUrl } from '@/lib/publicSiteConfig';

export type SavingState = 'auth' | 'login' | 'signup' | 'resource_detail' | 'display' | null;
export type TMDBConfigSource = 'secret_manager' | 'env_fallback' | 'unconfigured';

export const useSystemSettingsController = () => {
  const { token } = useAuthStore();
  
  // 状态管理
  const [enableUserAuth, setEnableUserAuth] = useState<boolean>(true);
  const [enableUserLogin, setEnableUserLogin] = useState<boolean>(true);
  const [enableUserSignup, setEnableUserSignup] = useState<boolean>(true);
  const [enableResourceDetailPage, setEnableResourceDetailPage] = useState<boolean>(false);
  const [publicSiteUrl, setPublicSiteUrl] = useState<string>(resolvePublicSiteUrl());
  const [tmdbReadAccessToken, setTMDBReadAccessToken] = useState<string>('');
  const [tmdbConfigured, setTMDBConfigured] = useState<boolean>(false);
  const [tmdbUpdatedAt, setTMDBUpdatedAt] = useState<string | undefined>(undefined);
  const [tmdbSource, setTMDBSource] = useState<TMDBConfigSource>('unconfigured');
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<SavingState>(null);
  const [isSavingTMDB, setIsSavingTMDB] = useState<boolean>(false);
  
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
      setTMDBConfigured(tmdbSettings.configured);
      setTMDBUpdatedAt(tmdbSettings.updated_at);
      setTMDBSource(tmdbSettings.source);
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
      setTMDBConfigured(result.configured);
      setTMDBUpdatedAt(result.updated_at);
      setTMDBSource(result.source);
      setTMDBReadAccessToken('');
      toast.success('TMDB 访问令牌已更新');
    } catch (error) {
      console.error('保存 TMDB 配置失败:', error);
      toast.error('保存失败：' + (getErrorDataError(error) || getErrorMessage(error)));
    } finally {
      setIsSavingTMDB(false);
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
      tmdbConfigured,
      tmdbUpdatedAt,
      tmdbSource,
      isLoading,
      isSaving,
      isSavingTMDB,
    },
    actions: {
      setPublicSiteUrl,
      setTMDBReadAccessToken,
      handleToggleAuth,
      handleToggleLogin,
      handleToggleSignup,
      handleToggleResourceDetailPage,
      handleSaveDisplayConfig,
      handleSaveTMDBConfig,
    }
  };
};
