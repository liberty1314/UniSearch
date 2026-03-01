import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { apiClient } from '@/lib/api';
import { Eye, EyeOff, Copy, ArrowLeft, Lightbulb, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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

const ApiKeySettingsSkeleton: React.FC<ApiKeySettingsSkeletonProps> = ({ holdOnError, isRetrying, onRetry }) => {
    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-[#1C1C1E] rounded-[20px] shadow-sm overflow-hidden border border-transparent dark:border-white/5 animate-pulse">
                <div className="px-5 py-4 border-b border-gray-100 dark:border-white/10">
                    <div className="h-5 w-36 bg-gray-200 dark:bg-[#2C2C2E] rounded" />
                </div>
                <div className="p-5">
                    <div className="h-12 w-full bg-gray-200 dark:bg-[#2C2C2E] rounded-xl" />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, idx) => (
                    <div
                        key={idx}
                        className="bg-white dark:bg-[#1C1C1E] p-5 rounded-[20px] shadow-sm h-32 border border-transparent dark:border-white/5 animate-pulse"
                    >
                        <div className="h-3 w-20 bg-gray-200 dark:bg-[#2C2C2E] rounded mb-5" />
                        <div className="h-8 w-16 bg-gray-200 dark:bg-[#2C2C2E] rounded mb-3" />
                        <div className="h-3 w-12 bg-gray-200 dark:bg-[#2C2C2E] rounded" />
                    </div>
                ))}
            </div>

            {holdOnError && (
                <div className="bg-white dark:bg-[#1C1C1E] rounded-[20px] shadow-sm border border-transparent dark:border-white/5 p-6 text-center">
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

    const [apiKeyInfo, setApiKeyInfo] = useState<APIKeyInfo | null>(null);
    const [newApiKey, setNewApiKey] = useState('');
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isHoldLoadingOnError, setIsHoldLoadingOnError] = useState(false);
    const [hasResolvedData, setHasResolvedData] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showKey, setShowKey] = useState(false);
    const [showUnbindDialog, setShowUnbindDialog] = useState(false);

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
            if (cancelled()) {
                return null;
            }

            if (background) {
                setIsRefreshing(false);
            } else {
                setIsInitialLoading(false);
            }
        }
    }, []);

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
    }, [isAuthenticated, token, apiKey, loadAPIKeyInfo]);

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

            toast.success('绑定成功');
            setNewApiKey('');
            invalidateApiKeyInfoCache();
            await loadAPIKeyInfo({
                force: true,
                background: false,
                holdOnError: true,
            });
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

            await loadAPIKeyInfo({
                force: true,
                background: true,
                holdOnError: false,
                showErrorToast: false,
            });
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

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-black font-sans selection:bg-blue-500/30">
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

            <div className="max-w-3xl mx-auto px-6 pb-20">
                {/* 页面标题 */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8 flex items-start justify-between gap-4"
                >
                    <div>
                        <h1 className="text-[34px] font-bold text-black dark:text-white tracking-tight leading-tight">
                            API Key
                        </h1>
                        <p className="mt-1 text-[17px] text-gray-500 dark:text-slate-400 font-normal">
                            管理您的个人的搜索访问密钥
                        </p>
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
                        className="space-y-6"
                    >
                        {/* 状态概览卡片 */}
                        <div className="bg-white dark:bg-[#1C1C1E] rounded-[20px] shadow-sm overflow-hidden border border-transparent dark:border-white/5">
                            <div className="px-5 py-4 border-b border-gray-100 dark:border-white/10 flex items-center justify-between">
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
                                        className="w-full pl-12 pr-24 py-3 bg-gray-50 dark:bg-[#2C2C2E] rounded-xl text-[15px] font-mono text-gray-900 dark:text-gray-100 border-none focus:ring-0 cursor-default"
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
                            {[
                                { label: '过期时间', value: formatDate(apiKeyInfo.expires_at), sub: '有效期至' },
                                { label: '每日限额', value: apiKeyInfo.daily_search_limit === 0 ? '∞' : apiKeyInfo.daily_search_limit, sub: '次/天', highlight: false },
                                { label: '今日已用', value: apiKeyInfo.today_search_count, sub: '次调用', highlight: true },
                                { label: '今日剩余', value: apiKeyInfo.remaining_searches === -1 ? '∞' : apiKeyInfo.remaining_searches, sub: '次可用', highlight: true },
                            ].map((stat, idx) => (
                                <motion.div
                                    key={idx}
                                    whileHover={{ scale: 1.02 }}
                                    className="bg-white dark:bg-[#1C1C1E] p-5 rounded-[20px] shadow-sm flex flex-col justify-between h-32 border border-transparent dark:border-white/5"
                                >
                                    <span className="text-[13px] font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                                        {stat.label}
                                    </span>
                                    <div>
                                        <div className={`text-2xl font-bold ${stat.highlight ? 'text-blue-500' : 'text-black dark:text-white'}`}>
                                            {stat.value}
                                        </div>
                                        <div className="text-[13px] text-gray-400 dark:text-slate-500 mt-0.5">
                                            {stat.sub}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* 操作区 */}
                        {apiKeyInfo.api_key !== apiKey && (
                            <motion.button
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setShowUnbindDialog(true)}
                                disabled={isSubmitting}
                                className="w-full py-3.5 bg-white dark:bg-[#1C1C1E] text-red-500 text-[17px] font-medium rounded-[14px] shadow-sm hover:bg-gray-50 dark:hover:bg-[#2C2C2E] transition-colors border border-transparent dark:border-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                解除绑定
                            </motion.button>
                        )}
                    </motion.div>
                ) : (
                    hasResolvedData && (
                        /* 绑定表单 */
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white dark:bg-[#1C1C1E] rounded-[20px] shadow-sm overflow-hidden border border-transparent dark:border-white/5"
                        >
                            <div className="p-6">
                                <label className="block text-[13px] font-medium text-gray-500 dark:text-slate-400 mb-2 uppercase tracking-wide ml-1">
                                    输入密钥
                                </label>
                                <input
                                    type="text"
                                    placeholder="sk-..."
                                    value={newApiKey}
                                    onChange={(e) => setNewApiKey(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-100 dark:bg-[#2C2C2E] rounded-xl text-[17px] text-black dark:text-white placeholder-gray-400 border-none focus:ring-2 focus:ring-blue-500/50 transition-all font-mono"
                                    autoFocus
                                />
                                <p className="mt-3 ml-1 text-[13px] text-gray-400">
                                    请输入以 <code className="bg-gray-100 dark:bg-[#2C2C2E] px-1 rounded text-gray-600 dark:text-slate-300">sk-</code> 开头的 43 位密钥
                                </p>

                                <div className="mt-8">
                                    <button
                                        onClick={handleBindAPIKey}
                                        disabled={isSubmitting || !newApiKey.trim()}
                                        className="w-full py-3.5 bg-blue-500 hover:bg-blue-600 text-white text-[17px] font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20 active:scale-[0.98]"
                                    >
                                        {isSubmitting ? '验证并绑定...' : '绑定 API Key'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )
                )}

                {/* 说明文本 */}
                <div className="mt-8 px-4 flex gap-4">
                    <Lightbulb className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    <div className="space-y-1 text-[13px] text-gray-400 leading-relaxed">
                        <p>API Key 用于验证您的身份并统计您的搜索用量。</p>
                        <p>如果您的 Key 泄露，请立即联系管理员重置。</p>
                    </div>
                </div>
            </div>

            {/* 解绑确认对话框 - iOS Style */}
            <AlertDialog open={showUnbindDialog} onOpenChange={setShowUnbindDialog}>
                <AlertDialogContent className="w-[320px] p-0 gap-0 bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-xl border border-transparent dark:border-white/10 rounded-[14px] overflow-hidden shadow-2xl">
                    <div className="p-6 text-center">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-[17px] font-semibold text-black dark:text-white text-center">
                                解除绑定?
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-[13px] text-gray-500 dark:text-slate-400 text-center mt-1">
                                解绑后您将无法使用高级搜索功能，确定要继续吗？
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                    </div>
                    <div className="flex border-t border-gray-200/50 dark:border-white/10 divide-x divide-gray-200/50 dark:divide-white/10">
                        <AlertDialogCancel
                            className="flex-1 h-12 bg-transparent hover:bg-gray-100 dark:hover:bg-white/5 border-none rounded-none text-[17px] text-blue-500 font-normal m-0"
                            disabled={isSubmitting}
                        >
                            取消
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleUnbindAPIKey}
                            className="flex-1 h-12 bg-transparent hover:bg-gray-100 dark:hover:bg-white/5 border-none rounded-none text-[17px] text-red-500 font-semibold m-0 shadow-none hover:shadow-none"
                            disabled={isSubmitting}
                        >
                            解除绑定
                        </AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default UserApiKeySettings;
