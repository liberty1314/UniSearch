import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, RefreshCw, Shield, LogIn, UserPlus, Globe, Save, FileSearch, KeyRound, Eye, EyeOff, Database, Trash2, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppleSwitch } from '@/components/ui/apple-switch';
import { useSystemSettingsController } from '@/hooks/useSystemSettingsController';
import { resolvePublicSiteUrl } from '@/lib/publicSiteConfig';
import { cn } from '@/lib/utils';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { AdminSelectField } from '@/components/admin/AdminSelectField';
import {
    resolveCacheSettingOptions,
} from '@/lib/systemSettingsCacheOptions';

const CACHE_SELECT_TRIGGER_CLASSES = 'h-11 bg-white/80 dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700 rounded-xl text-[15px]';

export const SystemSettingsView: React.FC = () => {
    const { state, actions } = useSystemSettingsController();
    const [isTMDBTokenVisible, setIsTMDBTokenVisible] = React.useState(false);
    const [hasTMDBDraft, setHasTMDBDraft] = React.useState(false);
    const [isClearCacheDialogOpen, setIsClearCacheDialogOpen] = React.useState(false);

    const {
        enableUserAuth,
        enableUserLogin,
        enableUserSignup,
        enableResourceDetailPage,
        publicSiteUrl,
        tmdbReadAccessToken,
        tmdbCurrentTokenPreview,
        cacheSettings,
        isLoading,
        isSaving,
        isSavingTMDB,
        isSavingCache,
        isTriggeringHotPreload,
        isClearingHotCache,
    } = state;

    React.useEffect(() => {
        if (!tmdbReadAccessToken) {
            setHasTMDBDraft(false);
        }
    }, [tmdbReadAccessToken]);

    const cacheSettingOptions = React.useMemo(
        () => resolveCacheSettingOptions(cacheSettings),
        [cacheSettings],
    );

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
                <div className="bg-white/60 dark:bg-slate-950/[0.56] backdrop-blur-xl border border-slate-200/60 dark:border-cyan-300/[0.14] rounded-[1.5rem] overflow-hidden shadow-sm dark:shadow-[0_14px_34px_rgba(2,6,23,0.34)]">
                    {/* Item 1: Enable User Auth */}
                    <div className="flex items-center justify-between p-5 sm:px-6 transition-colors hover:bg-slate-50/50 dark:hover:bg-cyan-400/[0.06]">
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
                                className="overflow-hidden bg-slate-50/30 dark:bg-slate-950/[0.36]"
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
                <div className="bg-white/60 dark:bg-slate-950/[0.56] backdrop-blur-xl border border-slate-200/60 dark:border-cyan-300/[0.14] rounded-[1.5rem] overflow-hidden shadow-sm dark:shadow-[0_14px_34px_rgba(2,6,23,0.34)]">
                    <div className="flex items-center justify-between p-5 sm:px-6 transition-colors hover:bg-slate-50/50 dark:hover:bg-cyan-400/[0.06]">
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
                <div className="bg-white/60 dark:bg-slate-950/[0.56] backdrop-blur-xl border border-slate-200/60 dark:border-cyan-300/[0.14] rounded-[1.5rem] overflow-hidden shadow-sm p-5 sm:p-6 space-y-5 dark:shadow-[0_14px_34px_rgba(2,6,23,0.34)]">
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
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider px-4">缓存配置</h2>
                <div className="bg-white/60 dark:bg-slate-950/[0.56] backdrop-blur-xl border border-slate-200/60 dark:border-cyan-300/[0.14] rounded-[1.5rem] overflow-hidden shadow-sm p-5 sm:p-6 space-y-5 dark:shadow-[0_14px_34px_rgba(2,6,23,0.34)]">
                    <div className="flex items-start gap-4">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
                            <Database className="w-5 h-5" />
                        </div>
                        <div className="flex-1 space-y-5">
                            <div>
                                <Label className="text-base font-semibold text-slate-900 dark:text-white">Redis 缓存策略</Label>
                                <p className="text-sm text-slate-500 mt-1">
                                    搜索缓存默认 1 小时，热门榜单默认每天 00:00 预热 50 条并缓存 24 小时。当前 Redis 状态：
                                    <span className={cn('ml-1 font-medium', cacheSettings.redis_connected ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400')}>
                                        {cacheSettings.redis_connected ? '已连接' : '未连接'}
                                    </span>
                                </p>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                                    <div>
                                        <Label className="text-sm font-semibold text-slate-900 dark:text-white">启用搜索缓存</Label>
                                        <p className="mt-1 text-xs text-slate-500">控制搜索结果写入 Redis</p>
                                    </div>
                                    <AppleSwitch
                                        checked={cacheSettings.cache_enabled}
                                        onCheckedChange={(checked) => actions.updateCacheField('cache_enabled', checked)}
                                        disabled={isSavingCache}
                                    />
                                </div>
                                <div className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                                    <div>
                                        <Label className="text-sm font-semibold text-slate-900 dark:text-white">启用热门榜单缓存</Label>
                                        <p className="mt-1 text-xs text-slate-500">控制热门榜单读取和预热缓存</p>
                                    </div>
                                    <AppleSwitch
                                        checked={cacheSettings.hot_ranking_cache_enabled}
                                        onCheckedChange={(checked) => actions.updateCacheField('hot_ranking_cache_enabled', checked)}
                                        disabled={isSavingCache}
                                    />
                                </div>
                                <div className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                                    <div>
                                        <Label className="text-sm font-semibold text-slate-900 dark:text-white">启用热门榜单预热</Label>
                                        <p className="mt-1 text-xs text-slate-500">每天按配置时间自动刷新榜单缓存</p>
                                    </div>
                                    <AppleSwitch
                                        checked={cacheSettings.hot_ranking_preload_enabled}
                                        onCheckedChange={(checked) => actions.updateCacheField('hot_ranking_preload_enabled', checked)}
                                        disabled={isSavingCache}
                                    />
                                </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>搜索缓存 TTL（秒）</Label>
                                    <AdminSelectField
                                        value={String(cacheSettings.search_cache_ttl_seconds)}
                                        options={cacheSettingOptions.search_cache_ttl_seconds}
                                        onChange={(value) => actions.updateCacheField('search_cache_ttl_seconds', Number(value))}
                                        ariaLabel="搜索缓存 TTL（秒）"
                                        triggerClassName={CACHE_SELECT_TRIGGER_CLASSES}
                                        disabled={isSavingCache}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>写队列长度</Label>
                                    <AdminSelectField
                                        value={String(cacheSettings.cache_write_queue_size)}
                                        options={cacheSettingOptions.cache_write_queue_size}
                                        onChange={(value) => actions.updateCacheField('cache_write_queue_size', Number(value))}
                                        ariaLabel="写队列长度"
                                        triggerClassName={CACHE_SELECT_TRIGGER_CLASSES}
                                        disabled={isSavingCache}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>写入 Worker 数</Label>
                                    <AdminSelectField
                                        value={String(cacheSettings.cache_write_workers)}
                                        options={cacheSettingOptions.cache_write_workers}
                                        onChange={(value) => actions.updateCacheField('cache_write_workers', Number(value))}
                                        ariaLabel="写入 Worker 数"
                                        triggerClassName={CACHE_SELECT_TRIGGER_CLASSES}
                                        disabled={isSavingCache}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>预热时间（HH:mm）</Label>
                                    <AdminSelectField
                                        value={cacheSettings.hot_ranking_preload_time}
                                        options={cacheSettingOptions.hot_ranking_preload_time}
                                        onChange={(value) => actions.updateCacheField('hot_ranking_preload_time', value)}
                                        ariaLabel="预热时间（HH:mm）"
                                        triggerClassName={CACHE_SELECT_TRIGGER_CLASSES}
                                        disabled={isSavingCache}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>预热条数</Label>
                                    <AdminSelectField
                                        value={String(cacheSettings.hot_ranking_preload_limit)}
                                        options={cacheSettingOptions.hot_ranking_preload_limit}
                                        onChange={(value) => actions.updateCacheField('hot_ranking_preload_limit', Number(value))}
                                        ariaLabel="预热条数"
                                        triggerClassName={CACHE_SELECT_TRIGGER_CLASSES}
                                        disabled={isSavingCache}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>热门榜单 TTL（秒）</Label>
                                    <AdminSelectField
                                        value={String(cacheSettings.hot_ranking_cache_ttl_seconds)}
                                        options={cacheSettingOptions.hot_ranking_cache_ttl_seconds}
                                        onChange={(value) => actions.updateCacheField('hot_ranking_cache_ttl_seconds', Number(value))}
                                        ariaLabel="热门榜单 TTL（秒）"
                                        triggerClassName={CACHE_SELECT_TRIGGER_CLASSES}
                                        disabled={isSavingCache}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>预热并发</Label>
                                    <AdminSelectField
                                        value={String(cacheSettings.hot_ranking_preload_concurrency)}
                                        options={cacheSettingOptions.hot_ranking_preload_concurrency}
                                        onChange={(value) => actions.updateCacheField('hot_ranking_preload_concurrency', Number(value))}
                                        ariaLabel="预热并发"
                                        triggerClassName={CACHE_SELECT_TRIGGER_CLASSES}
                                        disabled={isSavingCache}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>预热超时（秒）</Label>
                                    <AdminSelectField
                                        value={String(cacheSettings.hot_ranking_preload_timeout_seconds)}
                                        options={cacheSettingOptions.hot_ranking_preload_timeout_seconds}
                                        onChange={(value) => actions.updateCacheField('hot_ranking_preload_timeout_seconds', Number(value))}
                                        ariaLabel="预热超时（秒）"
                                        triggerClassName={CACHE_SELECT_TRIGGER_CLASSES}
                                        disabled={isSavingCache}
                                    />
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-3">
                                <Button onClick={actions.handleSaveCacheSettings} disabled={isSavingCache}>
                                    {isSavingCache ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                    保存缓存配置
                                </Button>
                                <Button variant="secondary" onClick={actions.handleTriggerHotRankingPreload} disabled={isTriggeringHotPreload}>
                                    {isTriggeringHotPreload ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Flame className="mr-2 h-4 w-4" />}
                                    立即预热热门榜单
                                </Button>
                                <Button variant="destructive" onClick={() => setIsClearCacheDialogOpen(true)} disabled={isClearingHotCache}>
                                    {isClearingHotCache ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                    清理热门榜单缓存
                                </Button>
                            </div>

                            {(cacheSettings.last_preload_result || cacheSettings.last_preload_at || cacheSettings.last_preload_status) && (
                                <div className="rounded-2xl border border-dashed border-slate-300/80 bg-slate-50/80 p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
                                    {cacheSettings.last_preload_status === 'cleared' ? (
                                        <p>缓存已被清理，清理时间：{(() => {
                                            if (!cacheSettings.last_preload_at) return '暂无时间';
                                            const d = new Date(cacheSettings.last_preload_at);
                                            if (isNaN(d.getTime())) return cacheSettings.last_preload_at;
                                            const pad = (n: number) => n.toString().padStart(2, '0');
                                            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
                                        })()}</p>
                                    ) : (
                                        <>
                                            <p>最近预热：{(() => {
                                                if (!cacheSettings.last_preload_at) return '暂无时间';
                                                const d = new Date(cacheSettings.last_preload_at);
                                                if (isNaN(d.getTime())) return cacheSettings.last_preload_at;
                                                const pad = (n: number) => n.toString().padStart(2, '0');
                                                return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
                                            })()}</p>
                                            {cacheSettings.last_preload_result && (
                                                <p className="mt-1">
                                                    任务 {cacheSettings.last_preload_result.total}，成功 {cacheSettings.last_preload_result.success}，失败 {cacheSettings.last_preload_result.failed}
                                                </p>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider px-4">TMDB 配置</h2>
                <div className="bg-white/60 dark:bg-slate-950/[0.56] backdrop-blur-xl border border-slate-200/60 dark:border-cyan-300/[0.14] rounded-[1.5rem] overflow-hidden shadow-sm p-5 sm:p-6 space-y-5 dark:shadow-[0_14px_34px_rgba(2,6,23,0.34)]">
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
                                            className="text-slate-400 transition hover:text-slate-600 dark:text-slate-300 dark:hover:text-cyan-200"
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

            <ConfirmDialog
                open={isClearCacheDialogOpen}
                onOpenChange={setIsClearCacheDialogOpen}
                title="确认清理热门榜单缓存"
                description="该操作会立即删除 Redis 中的热门榜单缓存，下一次访问会重新回源并重建缓存。"
                confirmText="立即清理"
                variant="destructive"
                isLoading={isClearingHotCache}
                onConfirm={() => {
                    void actions.handleClearHotRankingCache();
                    setIsClearCacheDialogOpen(false);
                }}
            />
        </motion.div>
    );
};
