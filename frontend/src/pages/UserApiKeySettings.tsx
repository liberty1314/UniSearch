import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Eye, EyeOff, Copy, ArrowLeft, Lightbulb, CheckCircle2, XCircle } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface APIKeyInfo {
    api_key: string;
    expires_at: string | null;
    daily_search_limit: number;
    today_search_count: number;
    remaining_searches: number;
    is_valid: boolean;
}

const UserApiKeySettings: React.FC = () => {
    const navigate = useNavigate();
    const { token, apiKey, isAuthenticated, logout } = useAuthStore();

    const [apiKeyInfo, setApiKeyInfo] = useState<APIKeyInfo | null>(null);
    const [newApiKey, setNewApiKey] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showKey, setShowKey] = useState(false);
    const [showUnbindDialog, setShowUnbindDialog] = useState(false);

    // 检查认证状态（支持 token 或 apiKey 登录）
    useEffect(() => {
        if (!isAuthenticated || (!token && !apiKey)) {
            toast.error('请先登录');
            navigate('/login');
        }
    }, [isAuthenticated, token, apiKey, navigate]);

    // 加载 API Key 信息（只要已认证即可）
    useEffect(() => {
        if (isAuthenticated) {
            loadAPIKeyInfo();
        }
    }, [isAuthenticated]);

    const loadAPIKeyInfo = async () => {
        try {
            setIsLoading(true);
            const response = await apiClient.get('/user/apikey');

            if (response.code === 200 && response.data) {
                setApiKeyInfo(response.data as APIKeyInfo);
            }
        } catch (error: any) {
            // 404 表示未绑定，这是正常情况
            if (error.code !== 404) {
                console.error('加载 API Key 信息失败:', error);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleBindAPIKey = async () => {
        if (!newApiKey.trim()) {
            toast.error('请输入 API Key');
            return;
        }

        // 验证格式
        if (newApiKey.length !== 43 || !newApiKey.startsWith('sk-')) {
            toast.error('API Key 格式错误（应为 sk- 开头的43位字符）');
            return;
        }

        try {
            setIsSubmitting(true);
            const response = await apiClient.post('/user/apikey', {
                key: newApiKey.trim(),
            });

            if (response.code === 200) {
                toast.success('绑定成功');
                setNewApiKey('');
                await loadAPIKeyInfo();
            } else {
                toast.error(response.message || '绑定失败');
            }
        } catch (error: any) {
            console.error('绑定 API Key 失败:', error);
            toast.error(error.message || '绑定失败');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUnbindAPIKey = async () => {
        try {
            setIsSubmitting(true);
            const response = await apiClient.delete('/user/apikey');

            if (response.code === 200) {
                toast.success('解绑成功');
                setApiKeyInfo(null);
                setShowUnbindDialog(false);
            } else {
                toast.error(response.message || '解绑失败');
            }
        } catch (error: any) {
            console.error('解绑 API Key 失败:', error);
            toast.error(error.message || '解绑失败');
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '永不过期';
        const date = new Date(dateStr);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}/${month}/${day}`;
    };

    const maskAPIKey = (key: string) => {
        if (key.length <= 10) return key;
        return `${key.substring(0, 10)}...${key.substring(key.length - 4)}`;
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 dark:from-gray-950 dark:via-blue-950/20 dark:to-gray-950 flex items-center justify-center">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 dark:from-gray-950 dark:via-blue-950/20 dark:to-gray-950">
            {/* 顶部导航 */}
            <div className="max-w-2xl mx-auto px-4 pt-8 pb-4">
                <button
                    onClick={() => navigate('/')}
                    className="group flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                    <span>返回首页</span>
                </button>
            </div>

            <div className="max-w-2xl mx-auto px-4 pb-16">
                {/* 页面标题 */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                        API Key 设置
                    </h1>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                        绑定后搜索时无需重复输入
                    </p>
                </motion.div>

                {/* 当前绑定状态 - Apple 风格 */}
                {apiKeyInfo ? (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="space-y-4"
                    >
                        {/* API Key 卡片 */}
                        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-200/50 dark:border-slate-800/50 overflow-hidden">
                            {/* 状态头部 */}
                            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800/50 flex items-center justify-between">
                                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                                    当前 API Key
                                </h2>
                                <div className="flex items-center gap-2">
                                    {apiKeyInfo.is_valid ? (
                                        <>
                                            <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-500" />
                                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400">
                                                有效
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <XCircle className="w-4 h-4 text-red-600 dark:text-red-500" />
                                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400">
                                                已失效
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* API Key 输入区 */}
                            <div className="px-6 py-5">
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">
                                    密钥
                                </label>
                                <div className="relative group">
                                    <input
                                        type={showKey ? 'text' : 'password'}
                                        value={apiKeyInfo.api_key}
                                        readOnly
                                        className="w-full px-4 py-3 pr-24 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl font-mono text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:focus:ring-blue-500/30 transition-all"
                                    />
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                        <button
                                            onClick={() => setShowKey(!showKey)}
                                            className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                            title={showKey ? '隐藏' : '显示'}
                                        >
                                            {showKey ? (
                                                <EyeOff className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                                            ) : (
                                                <Eye className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(apiKeyInfo.api_key);
                                                toast.success('已复制到剪贴板');
                                            }}
                                            className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                            title="复制"
                                        >
                                            <Copy className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* 使用统计 - Grid 布局 */}
                            <div className="px-6 pb-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-4">
                                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                                            过期时间
                                        </div>
                                        <div className="text-lg font-semibold text-slate-900 dark:text-white">
                                            {formatDate(apiKeyInfo.expires_at)}
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-4">
                                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                                            每日限额
                                        </div>
                                        <div className="text-lg font-semibold text-slate-900 dark:text-white">
                                            {apiKeyInfo.daily_search_limit === 0
                                                ? '无限制'
                                                : `${apiKeyInfo.daily_search_limit} 次`}
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-4">
                                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                                            今日已用
                                        </div>
                                        <div className="text-lg font-semibold text-slate-900 dark:text-white">
                                            {apiKeyInfo.today_search_count} 次
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-4">
                                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                                            今日剩余
                                        </div>
                                        <div className="text-lg font-semibold text-slate-900 dark:text-white">
                                            {apiKeyInfo.remaining_searches === -1
                                                ? '无限制'
                                                : `${apiKeyInfo.remaining_searches} 次`}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 操作按钮 - 仅当绑定的 API Key 与登录使用的 API Key 不同时显示 */}
                            {apiKeyInfo.api_key !== apiKey && (
                                <div className="px-6 pb-6">
                                    <button
                                        onClick={() => setShowUnbindDialog(true)}
                                        disabled={isSubmitting}
                                        className="w-full py-3 px-4 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50 text-red-600 dark:text-red-400 font-medium rounded-2xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        解绑 API Key
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                ) : (
                    /* 绑定表单 - Apple 风格 */
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-200/50 dark:border-slate-800/50 overflow-hidden">
                            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800/50">
                                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                                    绑定 API Key
                                </h2>
                            </div>

                            <div className="px-6 py-6 space-y-5">
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">
                                        请输入密钥
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                        value={newApiKey}
                                        onChange={(e) => setNewApiKey(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl font-mono text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:focus:ring-blue-500/30 transition-all"
                                        disabled={isSubmitting}
                                    />
                                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                                        格式：sk- 开头的 43 位字符
                                    </p>
                                </div>

                                <button
                                    onClick={handleBindAPIKey}
                                    disabled={isSubmitting || !newApiKey.trim()}
                                    className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-semibold rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                                >
                                    {isSubmitting ? '绑定中...' : '绑定 API Key'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* 帮助信息 - 极简风格 */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="mt-6 space-y-3"
                >
                    <div className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-400">
                        <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-500" />
                        <div className="space-y-2">
                            <p>绑定后搜索时无需重复输入</p>
                            <p>每个用户只能绑定一个 API Key</p>
                            <p>更换 API Key 会自动解绑旧的密钥</p>
                            <p>如需获取 API Key，请联系管理员</p>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* 解绑确认对话框 */}
            <AlertDialog open={showUnbindDialog} onOpenChange={setShowUnbindDialog}>
                <AlertDialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-slate-900 dark:text-white">
                            确认解绑 API Key
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-600 dark:text-slate-400">
                            确定要解绑当前 API Key 吗？解绑后，您需要在搜索时重新输入 API Key。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel 
                            disabled={isSubmitting}
                            className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700"
                        >
                            取消
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleUnbindAPIKey}
                            disabled={isSubmitting}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            {isSubmitting ? '解绑中...' : '确认解绑'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default UserApiKeySettings;
