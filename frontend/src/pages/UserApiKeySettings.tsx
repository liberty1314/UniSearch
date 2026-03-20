import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useSearchAccessStatus } from '@/stores/searchAccessStore';
import { apiClient } from '@/lib/api';
import { Eye, EyeOff, Copy, ArrowLeft, Lightbulb, CheckCircle2, XCircle, RefreshCw, CalendarDays, Gauge, Activity, ShieldCheck } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import PublicPageShell from '@/components/PublicPageShell';
import { getErrorCode, getErrorMessage } from '@/lib/error';

interface APIKeyInfo {
    api_key: string;
    expires_at: string | null;
    daily_search_limit: number;
    today_search_count: number;
    remaining_searches: number;
    is_valid: boolean;
}

const API_KEY_INFO_CACHE_TTL_MS = 30000;

let apiKeyInfoRequestInFlight: Promise<APIKeyInfo | null> | null = null;
let apiKeyInfoCache: { value: APIKeyInfo | null; expiresAt: number } | null = null;

const invalidateApiKeyInfoCache = () => {
    apiKeyInfoCache = null;
};

const getApiKeyInfoCacheSnapshot = (): { hit: boolean; value: APIKeyInfo | null } => {
    const now = Date.now();
    if (!apiKeyInfoCache || apiKeyInfoCache.expiresAt <= now) {
        return { hit: false, value: null };
    }
    return { hit: true, value: apiKeyInfoCache.value };
};

const fetchApiKeyInfoSingleFlight = async (force = false): Promise<APIKeyInfo | null> => {
    const cached = getApiKeyInfoCacheSnapshot();
    if (!force && cached.hit) {
        return cached.value;
    }

    if (!force && apiKeyInfoRequestInFlight) {
        return apiKeyInfoRequestInFlight;
    }

    apiKeyInfoRequestInFlight = (async () => {
        try {
            const data = await apiClient.get<APIKeyInfo>('/user/apikey');
            return data;
        } catch (error) {
            if (getErrorCode(error) === 404) {
                return null;
            }
            throw error;
        }
    })();

    try {
        const result = await apiKeyInfoRequestInFlight;
        apiKeyInfoCache = {
            value: result,
            expiresAt: Date.now() + API_KEY_INFO_CACHE_TTL_MS,
        };
        return result;
    } finally {
        apiKeyInfoRequestInFlight = null;
    }
};

interface LoadAPIKeyOptions {
    force?: boolean;
    background?: boolean;
    holdOnError?: boolean;
    showErrorToast?: boolean;
    isCancelled?: () => boolean;
}

interface ApiKeySettingsSkeletonProps {
    holdOnError: boolean;
    isRetrying: boolean;
    onRetry: () => void;
}

const apiKeyHeroCardClass = 'overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-[0_18px_38px_rgba(15,23,42,0.05)] dark:border-white/8 dark:bg-slate-900 dark:shadow-[0_22px_44px_rgba(2,6,23,0.38)]';
const apiKeyStatCardClass = 'rounded-[22px] border border-slate-200/80 bg-white shadow-[0_14px_30px_rgba(15,23,42,0.045)] dark:border-white/8 dark:bg-slate-900 dark:shadow-[0_18px_34px_rgba(2,6,23,0.34)]';
const apiKeyDangerPanelClass = 'rounded-[20px] border border-red-200/80 bg-white shadow-[0_14px_28px_rgba(239,68,68,0.06)] dark:border-red-500/20 dark:bg-slate-900';
const apiKeyNotePanelClass = 'rounded-[18px] border border-slate-200/80 bg-white px-5 py-4 shadow-[0_12px_24px_rgba(15,23,42,0.04)] dark:border-white/8 dark:bg-slate-900';

const ApiKeySettingsSkeleton: React.FC<ApiKeySettingsSkeletonProps> = ({ holdOnError, isRetrying, onRetry }) => {
    return (
        <div className="space-y-6">
            <div className={`${apiKeyHeroCardClass} animate-pulse`}>
                <div className="px-5 py-4 border-b border-slate-200/70 dark:border-white/10">
                    <div className="h-5 w-36 bg-gray-200 dark:bg-[#2C2C2E] rounded" />
                </div>
                <div className="p-5">
                    <div className="h-12 w-full bg-slate-50 dark:bg-[#2C2C2E] rounded-xl border border-slate-200/70 dark:border-white/5" />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, idx) => (
                    <div
                        key={idx}
                        className={`${apiKeyStatCardClass} p-5 h-32 animate-pulse`}
                    >
                        <div className="h-3 w-20 bg-gray-200 dark:bg-[#2C2C2E] rounded mb-5" />
                        <div className="h-8 w-16 bg-gray-200 dark:bg-[#2C2C2E] rounded mb-3" />
                        <div className="h-3 w-12 bg-gray-200 dark:bg-[#2C2C2E] rounded" />
                    </div>
                ))}
            </div>

            {holdOnError && (
                <div className={`${apiKeyHeroCardClass} p-6 text-center`}>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">加载失败，请重试</p>
                    <button
                        onClick={onRetry}
                        disabled={isRetrying}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
                        重试加载
                    </button>
                </div>
            )}
        </div>
    );
};

const UserApiKeySettings: React.FC = () => {
    const navigate = useNavigate();
    const { token, apiKey, isAuthenticated } = useAuthStore();
    const { refresh: refreshSearchAccess, overrideStatus } = useSearchAccessStatus();

    const [apiKeyInfo, setApiKeyInfo] = useState<APIKeyInfo | null>(null);
    const [newApiKey, setNewApiKey] = useState('');
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isHoldLoadingOnError, setIsHoldLoadingOnError] = useState(false);
    const [hasResolvedData, setHasResolvedData] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showKey, setShowKey] = useState(false);
    const [showUnbindDialog, setShowUnbindDialog] = useState(false);
    const [hasJustBound, setHasJustBound] = useState(false);

    const syncSearchAccessFromAPIKeyInfo = useCallback((data: APIKeyInfo | null) => {
        if (token && !apiKey) {
            overrideStatus(data ? 'search_ready' : 'session_only');
        }
    }, [apiKey, overrideStatus, token]);

    const loadAPIKeyInfo = useCallback(async ({
        force = false,
        background = false,
        holdOnError = false,
        showErrorToast = true,
        isCancelled,
    }: LoadAPIKeyOptions = {}): Promise<APIKeyInfo | null> => {
        const cancelled = () => isCancelled?.() ?? false;

        if (!background && !cancelled()) {
            setIsInitialLoading(true);
            if (!holdOnError) {
                setIsHoldLoadingOnError(false);
            }
        }

        if (background && !cancelled()) {
            setIsRefreshing(true);
        }

        try {
            const data = await fetchApiKeyInfoSingleFlight(force);
            if (cancelled()) {
                return null;
            }

            setApiKeyInfo(data);
            setHasResolvedData(true);
            setIsHoldLoadingOnError(false);
            syncSearchAccessFromAPIKeyInfo(data);
            return data;
        } catch (error) {
            if (cancelled()) {
                return null;
            }

            if (showErrorToast) {
                toast.error(getErrorMessage(error, '加载 API Key 信息失败'));
            }

            if (holdOnError) {
                setIsHoldLoadingOnError(true);
            }

            return null;
        } finally {
            if (!cancelled()) {
                if (background) {
                    setIsRefreshing(false);
                } else {
                    setIsInitialLoading(false);
                }
            }
        }
    }, [syncSearchAccessFromAPIKeyInfo]);

    useEffect(() => {
        if (!isAuthenticated || (!token && !apiKey)) {
            toast.error('请先登录');
            navigate('/login');
        }
    }, [isAuthenticated, token, apiKey, navigate]);

    useEffect(() => {
        if (!isAuthenticated || (!token && !apiKey)) {
            return;
        }

        let cancelled = false;

        const bootstrap = async () => {
            const cacheSnapshot = getApiKeyInfoCacheSnapshot();

            if (cacheSnapshot.hit) {
                if (cancelled) {
                    return;
                }

                setApiKeyInfo(cacheSnapshot.value);
                setHasResolvedData(true);
                setIsInitialLoading(false);
                setIsHoldLoadingOnError(false);
                syncSearchAccessFromAPIKeyInfo(cacheSnapshot.value);

                await loadAPIKeyInfo({
                    force: false,
                    background: true,
                    holdOnError: false,
                    isCancelled: () => cancelled,
                });
                return;
            }

            await loadAPIKeyInfo({
                force: false,
                background: false,
                holdOnError: true,
                isCancelled: () => cancelled,
            });
        };

        bootstrap();

        return () => {
            cancelled = true;
        };
    }, [isAuthenticated, token, apiKey, loadAPIKeyInfo, syncSearchAccessFromAPIKeyInfo]);

    const handleBindAPIKey = async () => {
        if (!newApiKey.trim()) {
            toast.error('请输入 API Key');
            return;
        }

        if (newApiKey.length !== 43 || !newApiKey.startsWith('sk-')) {
            toast.error('API Key 格式错误（应为 sk- 开头的43位字符）');
            return;
        }

        try {
            setIsSubmitting(true);
            await apiClient.post('/user/apikey', {
                key: newApiKey.trim(),
            });

            toast.success('绑定成功，已开通搜索权限');
            setNewApiKey('');
            setHasJustBound(true);
            invalidateApiKeyInfoCache();
            overrideStatus('search_ready');
            await loadAPIKeyInfo({
                force: true,
                background: false,
                holdOnError: true,
            });
            await refreshSearchAccess({ force: true, silent: true });
        } catch (error) {
            console.error('绑定 API Key 失败:', error);
            toast.error(getErrorMessage(error, '绑定失败'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUnbindAPIKey = async () => {
        try {
            setIsSubmitting(true);
            await apiClient.delete('/user/apikey');

            toast.success('解绑成功');
            invalidateApiKeyInfoCache();
            setApiKeyInfo(null);
            setHasResolvedData(true);
            setShowUnbindDialog(false);
            setHasJustBound(false);
            overrideStatus('session_only');

            await loadAPIKeyInfo({
                force: true,
                background: true,
                holdOnError: false,
                showErrorToast: false,
            });
            await refreshSearchAccess({ force: true, silent: true });
        } catch (error) {
            console.error('解绑 API Key 失败:', error);
            toast.error(getErrorMessage(error, '解绑失败'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '永不过期';
        const date = new Date(dateStr);
        return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
    };

    const showContentSkeleton = isInitialLoading || isHoldLoadingOnError;
    const summaryDailyLimit = apiKeyInfo ? (apiKeyInfo.daily_search_limit === 0 ? '不限额' : `${apiKeyInfo.daily_search_limit} 次/天`) : '读取中';
    const summaryRemaining = apiKeyInfo ? (apiKeyInfo.remaining_searches === -1 ? '无限制' : `${apiKeyInfo.remaining_searches} 次`) : '读取中';
    const statCards = apiKeyInfo ? [
        {
            label: '过期时间',
            value: formatDate(apiKeyInfo.expires_at),
            sub: '有效期至',
            highlight: false,
            Icon: CalendarDays,
            iconClassName: 'bg-blue-50 text-blue-600 dark:bg-blue-500/12 dark:text-blue-300',
        },
        {
            label: '每日限额',
            value: apiKeyInfo.daily_search_limit === 0 ? '∞' : apiKeyInfo.daily_search_limit,
            sub: '次/天',
            highlight: false,
            Icon: Gauge,
            iconClassName: 'bg-violet-50 text-violet-600 dark:bg-violet-500/12 dark:text-violet-300',
        },
        {
            label: '今日已用',
            value: apiKeyInfo.today_search_count,
            sub: '次调用',
            highlight: true,
            Icon: Activity,
            iconClassName: 'bg-amber-50 text-amber-600 dark:bg-amber-500/12 dark:text-amber-300',
        },
        {
            label: '今日剩余',
            value: apiKeyInfo.remaining_searches === -1 ? '∞' : apiKeyInfo.remaining_searches,
            sub: '次可用',
            highlight: true,
            Icon: ShieldCheck,
            iconClassName: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/12 dark:text-emerald-300',
        },
    ] : [];

    return (
        <PublicPageShell className="font-sans selection:bg-blue-500/30">
            {/* 顶部导航 */}
            <div className="max-w-3xl mx-auto px-6 pt-24 pb-6">
                <button
                    onClick={() => navigate('/')}
                    className="group flex items-center gap-1 text-[17px] text-blue-500 hover:opacity-70 transition-opacity font-medium"
                >
                    <ArrowLeft className="w-5 h-5 -ml-1" strokeWidth={2.5} />
                    <span>返回首页</span>
                </button>
            </div>

            <div className="max-w-3xl mx-auto px-6 pb-20 relative">
                {/* 页面标题 */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative z-10 mb-8 flex items-start justify-between gap-4"
                >
                    <div>
                        <span className="inline-flex items-center rounded-full border border-blue-200/80 bg-blue-50/80 px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.18em] text-blue-600 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
                            Access Control
                        </span>
                        <h1 className="mt-4 text-[34px] font-bold text-black dark:text-white tracking-tight leading-tight">
                            API Key
                        </h1>
                        <p className="mt-1 text-[17px] text-gray-500 dark:text-slate-400 font-normal">
                            绑定后即可使用搜索，解绑后将恢复为仅登录状态
                        </p>

                        <div
                            data-testid="apikey-page-summary"
                            className="mt-5 flex flex-wrap gap-3"
                        >
                            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/85 px-3 py-1.5 text-[13px] font-medium text-slate-600 shadow-[0_8px_18px_rgba(15,23,42,0.04)] dark:border-white/8 dark:bg-white/[0.04] dark:text-slate-300">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                {apiKeyInfo?.is_valid ? '已开通搜索权限' : '状态待确认'}
                            </span>
                            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/85 px-3 py-1.5 text-[13px] font-medium text-slate-600 shadow-[0_8px_18px_rgba(15,23,42,0.04)] dark:border-white/8 dark:bg-white/[0.04] dark:text-slate-300">
                                <Gauge className="h-3.5 w-3.5 text-blue-500" />
                                每日额度 {summaryDailyLimit}
                            </span>
                            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/85 px-3 py-1.5 text-[13px] font-medium text-slate-600 shadow-[0_8px_18px_rgba(15,23,42,0.04)] dark:border-white/8 dark:bg-white/[0.04] dark:text-slate-300">
                                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                                今日剩余 {summaryRemaining}
                            </span>
                        </div>
                    </div>

                    {isRefreshing && (
                        <span className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-medium whitespace-nowrap">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            同步中
                        </span>
                    )}
                </motion.div>

                {/* 当前绑定状态 */}
                {showContentSkeleton ? (
                    <ApiKeySettingsSkeleton
                        holdOnError={isHoldLoadingOnError}
                        isRetrying={isInitialLoading}
                        onRetry={() => {
                            void loadAPIKeyInfo({
                                force: true,
                                background: false,
                                holdOnError: true,
                            });
                        }}
                    />
                ) : apiKeyInfo ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                        className="relative z-10 space-y-6"
                    >
                        {/* 状态概览卡片 */}
                        <div data-testid="apikey-hero-card" className={apiKeyHeroCardClass}>
                            <div className="px-5 py-4 border-b border-slate-200/70 dark:border-white/10 flex items-center justify-between bg-white/35 dark:bg-white/[0.02]">
                                <span className="text-[17px] font-semibold text-black dark:text-white">
                                    当前密钥状态
                                </span>
                                <div className="flex items-center gap-2">
                                    {apiKeyInfo.is_valid ? (
                                        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 text-[13px] font-medium">
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            有效
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 text-[13px] font-medium">
                                            <XCircle className="w-3.5 h-3.5" />
                                            已失效
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* 密钥显示 */}
                            <div className="p-5">
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span className="text-gray-400 font-mono text-sm">KEY</span>
                                    </div>
                                    <input
                                        type={showKey ? 'text' : 'password'}
                                        value={apiKeyInfo.api_key}
                                        readOnly
                                        className="w-full pl-12 pr-24 py-3 bg-white/80 dark:bg-[#0f172a]/70 rounded-xl text-[15px] font-mono text-gray-900 dark:text-gray-100 border border-slate-200/70 dark:border-white/5 focus:ring-0 cursor-default shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]"
                                    />
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                        <button
                                            onClick={() => setShowKey(!showKey)}
                                            className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                                        >
                                            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(apiKeyInfo.api_key);
                                                toast.success('已复制');
                                            }}
                                            className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                                        >
                                            <Copy className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 统计 Widget Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            {statCards.map((stat, idx) => {
                                const { Icon } = stat;

                                return (
                                <motion.div
                                    key={idx}
                                    data-testid="apikey-stat-card"
                                    whileHover={{ scale: 1.02 }}
                                    className={`${apiKeyStatCardClass} p-5 flex flex-col justify-between h-32`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <span className="text-[13px] font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                                            {stat.label}
                                        </span>
                                        <span
                                            data-testid="apikey-stat-icon"
                                            className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${stat.iconClassName}`}
                                        >
                                            <Icon className="h-4 w-4" />
                                        </span>
                                    </div>
                                    <div>
                                        <div className={`text-2xl font-bold ${stat.highlight ? 'text-blue-600 dark:text-blue-400' : 'text-black dark:text-white'}`}>
                                            {stat.value}
                                        </div>
                                        <div className="text-[13px] text-gray-400 dark:text-slate-500 mt-0.5">
                                            {stat.sub}
                                        </div>
                                    </div>
                                </motion.div>
                                );
                            })}
                        </div>

                        {/* 操作区 */}
                        {apiKeyInfo.api_key !== apiKey && (
                            <div className={`${apiKeyDangerPanelClass} p-3`}>
                                <motion.button
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setShowUnbindDialog(true)}
                                    disabled={isSubmitting}
                                    className="w-full py-3.5 rounded-[14px] border border-red-200/80 bg-white/85 text-red-500 text-[17px] font-medium shadow-[0_10px_24px_rgba(239,68,68,0.08)] hover:bg-red-50 transition-colors dark:border-red-500/10 dark:bg-slate-950/35 dark:hover:bg-red-950/30 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    解除绑定
                                </motion.button>
                            </div>
                        )}
                    </motion.div>
                ) : (
                    hasResolvedData && (
                        /* 绑定表单 */
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="relative z-10 space-y-4"
                        >
                            <div className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-[0_18px_38px_rgba(15,23,42,0.05)] dark:border-white/8 dark:bg-slate-900">
                            <div className="border-b border-slate-200/80 px-6 py-5 dark:border-white/5">
                                <h2 className="text-[22px] font-semibold text-black dark:text-white">绑定后即可使用搜索</h2>
                                <p className="mt-2 text-[14px] leading-6 text-gray-500 dark:text-slate-400">
                                    当前账号已经登录，但搜索资格尚未开通。完成绑定后，首页和搜索入口会立即恢复可用。
                                </p>
                            </div>
                            <div className="p-6">
                                    <label className="mb-2 ml-1 block text-[13px] font-medium uppercase tracking-wide text-gray-500 dark:text-slate-400">
                                        输入密钥
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="sk-..."
                                        value={newApiKey}
                                        onChange={(e) => setNewApiKey(e.target.value)}
                                        className="w-full rounded-xl border-none bg-gray-100 px-4 py-3 text-[17px] font-mono text-black placeholder-gray-400 transition-all focus:ring-2 focus:ring-blue-500/50 dark:bg-[#2C2C2E] dark:text-white"
                                        autoFocus
                                    />
                                    <p className="mt-3 ml-1 text-[13px] text-gray-400">
                                        请输入以 <code className="rounded bg-gray-100 px-1 text-gray-600 dark:bg-[#2C2C2E] dark:text-slate-300">sk-</code> 开头的 43 位密钥
                                    </p>

                                    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                                        <button
                                            onClick={handleBindAPIKey}
                                            disabled={isSubmitting || !newApiKey.trim()}
                                            className="flex-1 rounded-xl bg-blue-500 py-3.5 text-[17px] font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {isSubmitting ? '验证并绑定...' : '绑定 API Key'}
                                        </button>
                                        <button
                                            onClick={() => navigate('/')}
                                            className="rounded-xl border border-gray-200 bg-white px-5 py-3.5 text-[15px] font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/10 dark:bg-[#1C1C1E] dark:text-slate-200 dark:hover:bg-[#2C2C2E]"
                                        >
                                            返回首页
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {hasJustBound && (
                                <motion.div
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="rounded-[20px] border border-emerald-200 bg-emerald-50/80 p-5 dark:border-emerald-500/20 dark:bg-emerald-500/10"
                                >
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <h3 className="text-[17px] font-semibold text-emerald-800 dark:text-emerald-200">
                                                搜索权限已开通
                                            </h3>
                                            <p className="mt-1 text-sm text-emerald-700/90 dark:text-emerald-100/80">
                                                现在返回首页即可直接开始搜索，无需再次登录。
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => navigate('/')}
                                            className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
                                        >
                                            返回首页开始搜索
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </motion.div>
                    )
                )}

                {/* 说明文本 */}
                <div className={`${apiKeyNotePanelClass} relative z-10 mt-8 flex gap-4`}>
                    <Lightbulb className="w-5 h-5 text-blue-500 flex-shrink-0" />
                    <div className="space-y-1 text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        <p>API Key 用于验证您的身份并开通搜索能力，同时统计您的搜索用量。</p>
                        <p>如果您的 Key 泄露，请立即联系管理员重置。</p>
                    </div>
                </div>
            </div>

            <ConfirmDialog
                open={showUnbindDialog}
                onOpenChange={setShowUnbindDialog}
                title="解除绑定？"
                description="解绑后您将暂时无法继续搜索，确定要继续吗？"
                confirmText="解除绑定"
                cancelText="取消"
                variant="destructive"
                onConfirm={handleUnbindAPIKey}
                isLoading={isSubmitting}
            />
        </PublicPageShell>
    );
};

export default UserApiKeySettings;
