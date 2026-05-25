import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, RefreshCw, Shield, LogIn, UserPlus, Globe, Save, FileSearch, KeyRound, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppleSwitch } from '@/components/ui/apple-switch';
import { useSystemSettingsController } from '@/hooks/useSystemSettingsController';
import { resolvePublicSiteUrl } from '@/lib/publicSiteConfig';
import { cn } from '@/lib/utils';

export const SystemSettingsView: React.FC = () => {
    const { state, actions } = useSystemSettingsController();
    const [isTMDBTokenVisible, setIsTMDBTokenVisible] = React.useState(false);
    const [hasTMDBDraft, setHasTMDBDraft] = React.useState(false);

    const {
        enableUserAuth,
        enableUserLogin,
        enableUserSignup,
        enableResourceDetailPage,
        publicSiteUrl,
        tmdbReadAccessToken,
        tmdbCurrentTokenPreview,
        isLoading,
        isSaving,
        isSavingTMDB,
    } = state;

    React.useEffect(() => {
        if (!tmdbReadAccessToken) {
            setHasTMDBDraft(false);
        }
    }, [tmdbReadAccessToken]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh]">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="inline-block">
                    <RefreshCw className="w-10 h-10 text-blue-500" />
                </motion.div>
                <p className="mt-4 text-slate-500 dark:text-slate-400 font-medium">加载设置中...</p>
            </div>
        );
    }

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-8 max-w-4xl mx-auto pb-12">
            <div className="flex items-center justify-between px-2">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                        <Settings className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                        系统设置
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">配置系统的核心认证策略与全局公开站点信息</p>
                </div>
            </div>

            {/* Apple iOS Style Settings Group - Authentication */}
            <div className="space-y-3">
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider px-4">登录认证与用户</h2>
                <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200/60 dark:border-white/10 rounded-[1.5rem] overflow-hidden shadow-sm">
                    {/* Item 1: Enable User Auth */}
                    <div className="flex items-center justify-between p-5 sm:px-6 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <div className="flex items-start gap-4">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
                                <Shield className="w-5 h-5" />
                            </div>
                            <div>
                                <Label className="text-base font-semibold text-slate-900 dark:text-white cursor-pointer" onClick={() => actions.handleToggleAuth(!enableUserAuth)}>启用用户功能</Label>
                                <p className="text-sm text-slate-500 mt-1">主开关：全局控制是否开启任何用户相关的认证体系</p>
                            </div>
                        </div>
                        <AppleSwitch
                            checked={enableUserAuth}
                            onCheckedChange={actions.handleToggleAuth}
                            disabled={isSaving === 'auth'}
                        />
                    </div>

                    {/* Sub-items for User Auth */}
                    <AnimatePresence>
                        {enableUserAuth && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden bg-slate-50/30 dark:bg-slate-950/20"
                            >
                                <div className="border-t border-slate-100 dark:border-white/5 ml-16">
                                    <div className="flex items-center justify-between py-4 pr-5 sm:pr-6">
                                        <div>
                                            <Label className="text-[15px] font-medium text-slate-800 dark:text-slate-200 cursor-pointer flex items-center gap-2" onClick={() => actions.handleToggleLogin(!enableUserLogin)}>
                                                <LogIn className="w-4 h-4 text-slate-400" />
                                                允许登录
                                            </Label>
                                            <p className="text-sm text-slate-500 mt-0.5">允许已存在的用户进行密码或授权登录</p>
                                        </div>
                                        <AppleSwitch
                                            checked={enableUserLogin}
                                            onCheckedChange={actions.handleToggleLogin}
                                            disabled={isSaving === 'login'}
                                        />
                                    </div>
                                </div>
                                <div className="border-t border-slate-100 dark:border-white/5 ml-16">
                                    <div className="flex items-center justify-between py-4 pr-5 sm:pr-6">
                                        <div>
                                            <Label className="text-[15px] font-medium text-slate-800 dark:text-slate-200 cursor-pointer flex items-center gap-2" onClick={() => actions.handleToggleSignup(!enableUserSignup)}>
                                                <UserPlus className="w-4 h-4 text-slate-400" />
                                                允许注册
                                            </Label>
                                            <p className="text-sm text-slate-500 mt-0.5">开放公共注册通道允许新用户注册账号</p>
                                        </div>
                                        <AppleSwitch
                                            checked={enableUserSignup}
                                            onCheckedChange={actions.handleToggleSignup}
                                            disabled={isSaving === 'signup'}
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            <div className="space-y-3">
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider px-4">搜索展示</h2>
                <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200/60 dark:border-white/10 rounded-[1.5rem] overflow-hidden shadow-sm">
                    <div className="flex items-center justify-between p-5 sm:px-6 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <div className="flex items-start gap-4">
                            <div className="p-2 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 rounded-xl">
                                <FileSearch className="w-5 h-5" />
                            </div>
                            <div>
                                <Label
                                    className="text-base font-semibold text-slate-900 dark:text-white cursor-pointer"
                                    onClick={() => actions.handleToggleResourceDetailPage(!enableResourceDetailPage)}
                                >
                                    显示资源详情页
                                </Label>
                                <p className="text-sm text-slate-500 mt-1">控制搜索结果中的“详情”入口以及独立资源详情页是否对前台展示</p>
                            </div>
                        </div>
                        <AppleSwitch
                            checked={enableResourceDetailPage}
                            onCheckedChange={actions.handleToggleResourceDetailPage}
                            disabled={isSaving === 'resource_detail'}
                        />
                    </div>
                </div>
            </div>

            {/* Apple iOS Style Settings Group - General Site Info */}
            <div className="space-y-3">
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider px-4">站点展示</h2>
                <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200/60 dark:border-white/10 rounded-[1.5rem] overflow-hidden shadow-sm p-5 sm:p-6 space-y-5">
                    <div className="flex items-start gap-4">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
                            <Globe className="w-5 h-5" />
                        </div>
                        <div className="flex-1 space-y-4">
                            <div>
                                <Label className="text-base font-semibold text-slate-900 dark:text-white">公开站点 URL</Label>
                                <p className="text-sm text-slate-500 mt-1">此地址将用于邮件通知、全局分享以及系统级的重定向链接</p>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3">
                                <Input
                                    id="public-site-url"
                                    value={publicSiteUrl}
                                    onChange={(e) => actions.setPublicSiteUrl(e.target.value)}
                                    placeholder={resolvePublicSiteUrl()}
                                    disabled={isSaving === 'display'}
                                    className="flex-1 bg-white/80 dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700 h-11 text-[15px] focus-visible:ring-blue-500 rounded-xl"
                                />
                                <Button
                                    onClick={actions.handleSaveDisplayConfig}
                                    aria-label={isSaving === 'display' ? '保存公开站点 URL 中' : '保存公开站点 URL'}
                                    disabled={isSaving === 'display' || publicSiteUrl === ''}
                                    className={cn(
                                        'h-11 w-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-[0_8px_16px_rgba(37,99,235,0.2)] transition-all'
                                    )}
                                >
                                    {isSaving === 'display' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider px-4">TMDB 配置</h2>
                <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200/60 dark:border-white/10 rounded-[1.5rem] overflow-hidden shadow-sm p-5 sm:p-6 space-y-5">
                    <div className="flex items-start gap-4">
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl">
                            <KeyRound className="w-5 h-5" />
                        </div>
                        <div className="flex-1 space-y-4">
                            <div>
                                <Label className="text-base font-semibold text-slate-900 dark:text-white">TMDB Read Access Token</Label>
                                <p className="text-sm text-slate-500 mt-1">用于访问 TMDB 数据接口，请填写 Read Access Token。</p>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3">
                                <Input
                                    containerClassName="flex-1"
                                    id="tmdb-read-access-token"
                                    type={isTMDBTokenVisible ? 'text' : 'password'}
                                    value={hasTMDBDraft ? tmdbReadAccessToken : tmdbCurrentTokenPreview}
                                    onChange={(e) => {
                                        setHasTMDBDraft(true);
                                        actions.setTMDBReadAccessToken(e.target.value);
                                    }}
                                    placeholder="请输入 TMDB Read Access Token"
                                    disabled={isSavingTMDB}
                                    className="h-11 bg-white/80 text-[15px] focus-visible:ring-amber-500 dark:bg-slate-800/80 dark:border-slate-700"
                                    endAdornment={
                                        <button
                                            type="button"
                                            onClick={() => setIsTMDBTokenVisible((value) => !value)}
                                            aria-label={isTMDBTokenVisible ? '隐藏 TMDB 令牌' : '查看 TMDB 令牌'}
                                            className="text-slate-400 transition hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                                            disabled={!tmdbReadAccessToken && !tmdbCurrentTokenPreview}
                                        >
                                            {isTMDBTokenVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    }
                                />
                                <Button
                                    onClick={actions.handleSaveTMDBConfig}
                                    aria-label={isSavingTMDB ? '保存 TMDB 令牌中' : '保存 TMDB 令牌'}
                                    disabled={isSavingTMDB || tmdbReadAccessToken.trim() === ''}
                                    className={cn(
                                        'h-11 w-11 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-[0_8px_16px_rgba(245,158,11,0.18)] transition-all'
                                    )}
                                >
                                    {isSavingTMDB ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
