import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, RefreshCw, Shield, Key, LogIn, UserPlus, Globe, Copy as CopyIcon, Save } from 'lucide-react';
import { SystemSettingsService } from '@/services/systemSettingsService';
import { useAuthStore } from '@/stores/authStore';
import { getErrorDataError, getErrorMessage } from '@/lib/error';
import { BLUE_CYAN_ICON } from '@/lib/brandTheme';
import { buildCopyFormatPreview, getCopyFormatTemplate, resolvePublicSiteUrl } from '@/lib/publicSiteConfig';
import { Button } from '@/components/ui/button';

/**
 * 系统设置视图组件
 */
export const SystemSettingsView: React.FC = () => {
    const { token } = useAuthStore();
    
    // 状态管理
    const [enableUserAuth, setEnableUserAuth] = useState<boolean>(true);
    const [enableUserLogin, setEnableUserLogin] = useState<boolean>(true);
    const [enableUserSignup, setEnableUserSignup] = useState<boolean>(true);
    const [publicSiteUrl, setPublicSiteUrl] = useState<string>(resolvePublicSiteUrl());
    const [defaultCopyFormatTemplate, setDefaultCopyFormatTemplate] = useState<string>(getCopyFormatTemplate());
    
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isSaving, setIsSaving] = useState<string | null>(null);
    
    // 原始值（用于错误恢复）
    const [originalValues, setOriginalValues] = useState({
        enableUserAuth: true,
        enableUserLogin: true,
        enableUserSignup: true,
        publicSiteUrl: resolvePublicSiteUrl(),
        defaultCopyFormatTemplate: getCopyFormatTemplate(),
    });

    /**
     * 加载系统设置
     */
    const loadSettings = useCallback(async () => {
        if (!token) return;

        setIsLoading(true);
        try {
            const settings = await SystemSettingsService.getSettingsAdmin(token);
            setEnableUserAuth(settings.enable_user_auth);
            setEnableUserLogin(settings.enable_user_login);
            setEnableUserSignup(settings.enable_user_signup);
            setPublicSiteUrl(resolvePublicSiteUrl(settings));
            setDefaultCopyFormatTemplate(getCopyFormatTemplate(settings));
            setOriginalValues({
                enableUserAuth: settings.enable_user_auth,
                enableUserLogin: settings.enable_user_login,
                enableUserSignup: settings.enable_user_signup,
                publicSiteUrl: resolvePublicSiteUrl(settings),
                defaultCopyFormatTemplate: getCopyFormatTemplate(settings),
            });
        } catch (error) {
            console.error('加载系统设置失败:', error);
            toast.error('加载系统设置失败：' + (getErrorDataError(error) || getErrorMessage(error)));
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    /**
     * 处理主开关变化
     */
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
            
            toast.success(checked ? '已启用用户登录注册功能' : '已禁用用户登录注册功能，仅保留 API Key 登录');
        } catch (error) {
            console.error('保存系统设置失败:', error);
            setEnableUserAuth(originalValues.enableUserAuth);
            toast.error('保存失败：' + (getErrorDataError(error) || getErrorMessage(error)));
        } finally {
            setIsSaving(null);
        }
    };

    /**
     * 处理登录开关变化
     */
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

    /**
     * 处理注册开关变化
     */
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

    const handleSaveDisplayConfig = async () => {
        if (!token) return;

        setIsSaving('display');
        try {
            const result = await SystemSettingsService.updateSettings(token, {
                public_site_url: publicSiteUrl.trim(),
                default_copy_format_template: defaultCopyFormatTemplate.trim(),
            });
            const resolvedSiteUrl = resolvePublicSiteUrl(result);
            const resolvedTemplate = getCopyFormatTemplate(result);
            setPublicSiteUrl(resolvedSiteUrl);
            setDefaultCopyFormatTemplate(resolvedTemplate);
            setOriginalValues(prev => ({
                ...prev,
                publicSiteUrl: resolvedSiteUrl,
                defaultCopyFormatTemplate: resolvedTemplate,
            }));
            toast.success('公开展示配置已更新');
        } catch (error) {
            console.error('保存系统设置失败:', error);
            setPublicSiteUrl(originalValues.publicSiteUrl);
            setDefaultCopyFormatTemplate(originalValues.defaultCopyFormatTemplate);
            toast.error('保存失败：' + (getErrorDataError(error) || getErrorMessage(error)));
        } finally {
            setIsSaving(null);
        }
    };

    useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    const renderToggle = (checked: boolean, onChange: (checked: boolean) => void, disabled: boolean) => (
        <button
            onClick={() => onChange(!checked)}
            disabled={disabled}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 ${
                checked ? 'bg-gradient-to-r from-blue-600 to-cyan-500' : 'bg-gray-300 dark:bg-gray-600'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
    );

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Settings className={`w-6 h-6 ${BLUE_CYAN_ICON}`} />
                        系统设置
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">配置系统全局设置和功能开关</p>
                </div>
            </div>

            <Card className="border-gray-100 dark:border-white/10 shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
                <CardHeader className="border-b border-gray-100 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/50">
                    <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-white">
                        <Shield className={`w-5 h-5 ${BLUE_CYAN_ICON}`} />
                        登录认证设置
                    </CardTitle>
                    <CardDescription className="text-slate-500 dark:text-slate-400">控制用户登录和注册功能的可用性</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                    {isLoading ? (
                        <div className="text-center py-12">
                            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="inline-block">
                                <RefreshCw className={`w-8 h-8 ${BLUE_CYAN_ICON}`} />
                            </motion.div>
                            <p className="mt-4 text-slate-500 dark:text-slate-400">加载中...</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-start justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
                                <div className="flex-1">
                                    <Label className="text-base font-medium text-slate-800 dark:text-white flex items-center gap-2">
                                        <Shield className={`w-4 h-4 ${BLUE_CYAN_ICON}`} />
                                        启用用户登录注册功能
                                    </Label>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">主开关：控制是否启用用户认证功能</p>
                                    <div className="mt-3 space-y-2">
                                        <div className="flex items-center gap-2 text-sm">
                                            <div className={`w-2 h-2 rounded-full ${enableUserAuth ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                                            <span className="text-slate-600 dark:text-slate-300">{enableUserAuth ? '已启用' : '已禁用'}</span>
                                        </div>
                                        {!enableUserAuth && (
                                            <div className="text-xs text-slate-500 dark:text-slate-400 pl-4 flex items-center gap-2">
                                                <Key className="w-3 h-3" />
                                                仅支持 API Key 登录
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex-shrink-0 ml-4">{renderToggle(enableUserAuth, handleToggleAuth, isSaving === 'auth')}</div>
                            </div>

                            {enableUserAuth && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="ml-6 space-y-4 border-l-2 border-blue-200 dark:border-cyan-800/70 pl-4">
                                    <div className="flex items-start justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30">
                                        <div className="flex-1">
                                            <Label className="text-base font-medium text-slate-800 dark:text-white flex items-center gap-2">
                                                <LogIn className="w-4 h-4 text-green-600 dark:text-green-400" />
                                                启用用户登录功能
                                            </Label>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">允许用户使用用户名密码登录</p>
                                            <div className="mt-2 flex items-center gap-2 text-xs">
                                                <div className={`w-2 h-2 rounded-full ${enableUserLogin ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                                                <span className="text-slate-600 dark:text-slate-300">{enableUserLogin ? '已启用' : '已禁用'}</span>
                                            </div>
                                        </div>
                                        <div className="flex-shrink-0 ml-4">{renderToggle(enableUserLogin, handleToggleLogin, isSaving === 'login')}</div>
                                    </div>

                                    <div className="flex items-start justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30">
                                        <div className="flex-1">
                                            <Label className="text-base font-medium text-slate-800 dark:text-white flex items-center gap-2">
                                                <UserPlus className="w-4 h-4 text-cyan-700 dark:text-cyan-300" />
                                                启用用户注册功能
                                            </Label>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">允许新用户注册账号</p>
                                            <div className="mt-2 flex items-center gap-2 text-xs">
                                                <div className={`w-2 h-2 rounded-full ${enableUserSignup ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                                                <span className="text-slate-600 dark:text-slate-300">{enableUserSignup ? '已启用' : '已禁用'}</span>
                                            </div>
                                        </div>
                                        <div className="flex-shrink-0 ml-4">{renderToggle(enableUserSignup, handleToggleSignup, isSaving === 'signup')}</div>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="border-gray-100 dark:border-white/10 shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
                <CardHeader className="border-b border-gray-100 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/50">
                    <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-white">
                        <Globe className={`w-5 h-5 ${BLUE_CYAN_ICON}`} />
                        公开展示配置
                    </CardTitle>
                    <CardDescription className="text-slate-500 dark:text-slate-400">配置站点 URL 和 API Key 复制默认模板</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-6">
                    <div className="space-y-2">
                        <Label htmlFor="public-site-url">公开站点 URL</Label>
                        <Input
                            id="public-site-url"
                            value={publicSiteUrl}
                            onChange={(e) => setPublicSiteUrl(e.target.value)}
                            placeholder={resolvePublicSiteUrl()}
                            disabled={isLoading || isSaving === 'display'}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="default-copy-format-template">默认复制模板</Label>
                        <textarea
                            id="default-copy-format-template"
                            value={defaultCopyFormatTemplate}
                            onChange={(e) => setDefaultCopyFormatTemplate(e.target.value)}
                            placeholder={getCopyFormatTemplate()}
                            disabled={isLoading || isSaving === 'display'}
                            rows={3}
                            className="flex min-h-[96px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus-visible:border-cyan-500 focus-visible:ring-2 focus-visible:ring-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
                        />
                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                            <CopyIcon className="h-3.5 w-3.5" />
                            示例：{buildCopyFormatPreview({ public_site_url: publicSiteUrl, default_copy_format_template: defaultCopyFormatTemplate }, 'sk-xxx')}
                        </p>
                    </div>

                    <div className="flex justify-end">
                        <Button onClick={handleSaveDisplayConfig} disabled={isLoading || isSaving === 'display'} className="gap-2">
                            <Save className="h-4 w-4" />
                            {isSaving === 'display' ? '保存中...' : '保存展示配置'}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
};
