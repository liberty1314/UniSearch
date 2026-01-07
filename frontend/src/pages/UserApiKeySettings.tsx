import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { AuthService } from '@/services/authService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Key, Copy, Clock, Calendar, CheckCircle2, XCircle, Sparkles } from 'lucide-react';

/**
 * 用户 API Key 设置页面
 * 
 * 展示当前用户的 API Key 详细信息
 */
const UserApiKeySettings: React.FC = () => {
    const { apiKey, token } = useAuthStore();
    const [keyInfo, setKeyInfo] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    /**
     * 加载 API Key 信息
     */
    useEffect(() => {
        const loadKeyInfo = async () => {
            if (!apiKey || !token) {
                toast.error('未找到 API Key 信息');
                setIsLoading(false);
                return;
            }

            try {
                const info = await AuthService.getUserApiKeyInfo();
                setKeyInfo(info);
            } catch (error: any) {
                console.error('获取 API Key 信息失败:', error);
                toast.error('获取 API Key 信息失败：' + (error.message || '未知错误'));
            } finally {
                setIsLoading(false);
            }
        };

        loadKeyInfo();
    }, [apiKey, token]);

    /**
     * 复制 API Key 到剪贴板
     */
    const handleCopyKey = async () => {
        if (!keyInfo?.key) return;

        try {
            await navigator.clipboard.writeText(keyInfo.key);
            setCopied(true);
            toast.success('API Key 已复制到剪贴板');

            setTimeout(() => {
                setCopied(false);
            }, 2000);
        } catch (error) {
            toast.error('复制失败，请手动复制');
        }
    };

    /**
     * 格式化 API Key（部分掩码显示）
     */
    const formatApiKey = (key: string) => {
        if (!key) return '';
        const prefix = key.substring(0, 10);
        const suffix = key.substring(key.length - 8);
        return `${prefix}${'*'.repeat(24)}${suffix}`;
    };

    /**
     * 计算进度百分比
     */
    const calculateProgress = () => {
        if (!keyInfo) return 0;

        const validityDays = parseInt(keyInfo.validity_period);
        const remainingDays = keyInfo.remaining_days;

        if (isNaN(validityDays) || validityDays === 0) return 0;

        return Math.max(0, Math.min(100, (remainingDays / validityDays) * 100));
    };

    if (isLoading) {
        return (
            <div className="min-h-screen pt-20 px-4 bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-400">加载中...</p>
                </div>
            </div>
        );
    }

    if (!keyInfo) {
        return (
            <div className="min-h-screen pt-20 px-4 bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <Card className="max-w-md">
                    <CardContent className="pt-6 text-center">
                        <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <p className="text-gray-600 dark:text-gray-400">无法加载 API Key 信息</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const progress = calculateProgress();
    const isExpired = keyInfo.status === 'expired';

    return (
        <div className="min-h-screen pt-20 px-4 bg-gray-50 dark:bg-gray-900">
            {/* 背景装饰 */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-green-400/20 to-blue-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>

            <div className="relative z-10 max-w-4xl mx-auto py-8">
                {/* 页面标题 */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="mb-8"
                >
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
                        API Key 设置
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        查看和管理您的 API Key 信息
                    </p>
                </motion.div>

                {/* API Key 卡片 */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                >
                    <Card className="backdrop-blur-xl bg-white/90 dark:bg-gray-800/90 border-gray-200/50 dark:border-gray-700/50 shadow-2xl mb-6">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                                        <Key className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-2xl">您的 API Key</CardTitle>
                                        <CardDescription>
                                            {keyInfo.description || '无描述'}
                                        </CardDescription>
                                    </div>
                                </div>
                                <div className={`px-4 py-2 rounded-full ${isExpired ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'}`}>
                                    {isExpired ? (
                                        <span className="flex items-center gap-2">
                                            <XCircle className="w-4 h-4" />
                                            已过期
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4" />
                                            活跃
                                        </span>
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* API Key 显示 */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    密钥
                                </label>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-900 rounded-lg font-mono text-sm break-all">
                                        {formatApiKey(keyInfo.key)}
                                    </div>
                                    <Button
                                        onClick={handleCopyKey}
                                        variant="outline"
                                        size="icon"
                                        className="shrink-0"
                                    >
                                        {copied ? (
                                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                                        ) : (
                                            <Copy className="w-4 h-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>

                            {/* 有效期进度条 */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="font-medium text-gray-700 dark:text-gray-300">
                                        有效期进度
                                    </span>
                                    <span className="text-gray-600 dark:text-gray-400">
                                        剩余 {keyInfo.remaining_days} 天 / 总计 {keyInfo.validity_period}
                                    </span>
                                </div>
                                <div className="relative h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progress}%` }}
                                        transition={{ duration: 1, delay: 0.3 }}
                                        className={`h-full rounded-full ${progress > 50
                                            ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                                            : progress > 20
                                                ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                                                : 'bg-gradient-to-r from-red-500 to-pink-500'
                                            }`}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* 详细信息卡片 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* 开始计算时间 */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                    >
                        <Card className="backdrop-blur-xl bg-white/90 dark:bg-gray-800/90 border-gray-200/50 dark:border-gray-700/50">
                            <CardContent className="pt-6">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center shrink-0">
                                        <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                                            开始计算时间
                                        </h3>
                                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                            {keyInfo.first_used_at || '尚未使用'}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                            北京时间 (UTC+8)
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* 到期时间 */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                    >
                        <Card className="backdrop-blur-xl bg-white/90 dark:bg-gray-800/90 border-gray-200/50 dark:border-gray-700/50">
                            <CardContent className="pt-6">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center shrink-0">
                                        <Clock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                                            到期时间
                                        </h3>
                                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                            {keyInfo.expires_at}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                            北京时间 (UTC+8)
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>

                {/* 提示信息 */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    className="mt-6"
                >
                    <Card className="backdrop-blur-xl bg-blue-50/90 dark:bg-blue-900/20 border-blue-200/50 dark:border-blue-800/50">
                        <CardContent className="pt-6">
                            <div className="flex items-start gap-3">
                                <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                                <div className="text-sm text-blue-900 dark:text-blue-100">
                                    <p className="font-medium mb-1">温馨提示</p>
                                    <ul className="space-y-1 text-blue-800 dark:text-blue-200">
                                        <li>• API Key 的有效期从首次使用时开始计算</li>
                                        <li>• 请妥善保管您的 API Key，不要泄露给他人</li>
                                        <li>• 如需延长有效期，请联系管理员</li>
                                    </ul>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </div>
    );
};

export default UserApiKeySettings;
