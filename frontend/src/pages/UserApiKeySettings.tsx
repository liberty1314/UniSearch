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

    // 检查认证状态（支持 token 或 apiKey 登录）
    useEffect(() => {
        console.log('🔍 UserApiKeySettings - Auth Check:', {
            isAuthenticated,
            hasToken: !!token,
            hasApiKey: !!apiKey,
            token: token ? `${token.substring(0, 20)}...` : 'null',
            apiKey: apiKey ? `${apiKey.substring(0, 20)}...` : 'null',
        });

        if (!isAuthenticated || (!token && !apiKey)) {
            console.error('❌ Auth check failed, redirecting to login');
            toast.error('请先登录');
            navigate('/login');
        } else {
            console.log('✅ Auth check passed');
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
        if (!confirm('确定要解绑当前 API Key 吗？')) {
            return;
        }

        try {
            setIsSubmitting(true);
            const response = await apiClient.delete('/user/apikey');

            if (response.code === 200) {
                toast.success('解绑成功');
                setApiKeyInfo(null);
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
        return date.toLocaleString('zh-CN');
    };

    const maskAPIKey = (key: string) => {
        if (key.length <= 10) return key;
        return `${key.substring(0, 10)}...${key.substring(key.length - 4)}`;
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                {/* 页面标题 */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8"
                >
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        API Key 设置
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        绑定 API Key 后，搜索时无需重复输入
                    </p>
                </motion.div>

                {/* 当前绑定状态 */}
                {apiKeyInfo ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8"
                    >
                        <Card className="p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                                    当前绑定的 API Key
                                </h2>
                                <span
                                    className={`px-3 py-1 rounded-full text-sm font-medium ${apiKeyInfo.is_valid
                                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                        }`}
                                >
                                    {apiKeyInfo.is_valid ? '有效' : '已失效'}
                                </span>
                            </div>

                            <div className="space-y-4">
                                {/* API Key 显示 */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        API Key
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type={showKey ? 'text' : 'password'}
                                            value={apiKeyInfo.api_key}
                                            readOnly
                                            className="flex-1 font-mono text-sm"
                                        />
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setShowKey(!showKey)}
                                        >
                                            {showKey ? '隐藏' : '显示'}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                navigator.clipboard.writeText(apiKeyInfo.api_key);
                                                toast.success('已复制到剪贴板');
                                            }}
                                        >
                                            复制
                                        </Button>
                                    </div>
                                </div>

                                {/* 使用统计 */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            过期时间
                                        </label>
                                        <p className="text-gray-900 dark:text-white">
                                            {formatDate(apiKeyInfo.expires_at)}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            每日限额
                                        </label>
                                        <p className="text-gray-900 dark:text-white">
                                            {apiKeyInfo.daily_search_limit === 0
                                                ? '无限制'
                                                : `${apiKeyInfo.daily_search_limit} 次`}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            今日已用
                                        </label>
                                        <p className="text-gray-900 dark:text-white">
                                            {apiKeyInfo.today_search_count} 次
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            今日剩余
                                        </label>
                                        <p className="text-gray-900 dark:text-white">
                                            {apiKeyInfo.remaining_searches === -1
                                                ? '无限制'
                                                : `${apiKeyInfo.remaining_searches} 次`}
                                        </p>
                                    </div>
                                </div>

                                {/* 操作按钮 */}
                                <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                                    <Button
                                        variant="destructive"
                                        onClick={handleUnbindAPIKey}
                                        disabled={isSubmitting}
                                    >
                                        解绑 API Key
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => navigate('/')}
                                    >
                                        返回首页
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    </motion.div>
                ) : (
                    /* 绑定表单 */
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8"
                    >
                        <Card className="p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                                绑定 API Key
                            </h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        请输入 API Key
                                    </label>
                                    <Input
                                        type="text"
                                        placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                        value={newApiKey}
                                        onChange={(e) => setNewApiKey(e.target.value)}
                                        className="font-mono"
                                        disabled={isSubmitting}
                                    />
                                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                        API Key 格式：sk- 开头的43位字符
                                    </p>
                                </div>

                                <div className="flex gap-3">
                                    <Button
                                        onClick={handleBindAPIKey}
                                        disabled={isSubmitting || !newApiKey.trim()}
                                        className="flex-1"
                                    >
                                        {isSubmitting ? '绑定中...' : '绑定 API Key'}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => navigate('/')}
                                        disabled={isSubmitting}
                                    >
                                        返回首页
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    </motion.div>
                )}

                {/* 帮助信息 */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4"
                >
                    <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
                        💡 使用提示
                    </h3>
                    <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                        <li>• 绑定 API Key 后，搜索时无需重复输入</li>
                        <li>• 每个用户只能绑定一个 API Key</li>
                        <li>• 更换 API Key 会自动解绑旧的 Key</li>
                        <li>• 如需获取 API Key，请联系管理员</li>
                    </ul>
                </motion.div>
            </div>
        </div>
    );
};

export default UserApiKeySettings;
