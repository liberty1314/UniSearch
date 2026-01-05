import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { AuthService } from '@/services/authService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Key, Lock } from 'lucide-react';

/**
 * 登录页面组件
 * 
 * 提供两种登录方式：
 * 1. 用户登录：使用 API Key
 * 2. 管理员登录：使用密码
 */
const Login: React.FC = () => {
    // 路由导航
    const navigate = useNavigate();

    // 认证状态管理
    const { setToken, setApiKey } = useAuthStore();

    // 当前激活的 Tab
    const [activeTab, setActiveTab] = useState<'user' | 'admin'>('user');

    // 用户登录表单状态
    const [apiKey, setApiKeyInput] = useState('');
    const [isUserLoading, setIsUserLoading] = useState(false);

    // 管理员登录表单状态
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isAdminLoading, setIsAdminLoading] = useState(false);

    /**
     * 验证 API Key 格式
     * @param key - API Key 字符串
     * @returns 是否符合格式要求
     */
    const validateApiKeyFormat = (key: string): boolean => {
        // API Key 格式：sk- + 40位十六进制字符
        const apiKeyRegex = /^sk-[0-9a-f]{40}$/i;
        return apiKeyRegex.test(key);
    };

    /**
     * 处理用户登录（API Key）
     */
    const handleUserLogin = async () => {
        // 验证输入
        if (!apiKey.trim()) {
            toast.error('请输入 API Key');
            return;
        }

        // 验证格式
        if (!validateApiKeyFormat(apiKey.trim())) {
            toast.error('API Key 格式不正确，应为 sk- 开头的 40 位十六进制字符');
            return;
        }

        setIsUserLoading(true);

        try {
            // 验证 API Key 是否有效
            const isValid = await AuthService.validateApiKey(apiKey.trim());

            if (isValid) {
                // 保存到状态管理
                setApiKey(apiKey.trim());
                toast.success('登录成功！');

                // 跳转到首页
                navigate('/');
            } else {
                toast.error('API Key 无效或已过期');
            }
        } catch (error: any) {
            console.error('用户登录失败:', error);

            // 根据错误类型显示不同提示
            if (error.response?.status === 401) {
                toast.error('API Key 无效或已过期');
            } else if (error.response?.status === 429) {
                toast.error('请求过于频繁，请稍后再试');
            } else {
                toast.error('登录失败：' + (error.message || '未知错误'));
            }
        } finally {
            setIsUserLoading(false);
        }
    };

    /**
     * 处理管理员登录（密码）
     */
    const handleAdminLogin = async () => {
        // 验证输入
        if (!password.trim()) {
            toast.error('请输入管理员密码');
            return;
        }

        setIsAdminLoading(true);

        try {
            // 调用管理员登录接口
            const response = await AuthService.adminLogin(password);

            // 保存 Token 到状态管理
            setToken(response.token, 'admin');
            toast.success('管理员登录成功！');

            // 跳转到后台管理页面
            navigate('/admin');
        } catch (error: any) {
            console.error('管理员登录失败:', error);

            // 根据错误类型显示不同提示
            if (error.response?.status === 401) {
                toast.error('密码错误，请重试');
            } else if (error.response?.status === 429) {
                toast.error('请求过于频繁，请稍后再试');
            } else {
                toast.error('登录失败：' + (error.message || '未知错误'));
            }
        } finally {
            setIsAdminLoading(false);
        }
    };

    /**
     * 处理 Enter 键提交
     */
    const handleKeyPress = (e: React.KeyboardEvent, loginType: 'user' | 'admin') => {
        if (e.key === 'Enter') {
            if (loginType === 'user') {
                handleUserLogin();
            } else {
                handleAdminLogin();
            }
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 px-4">
            <Card className="w-full max-w-md shadow-xl">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center">
                        登录 UniSearch
                    </CardTitle>
                    <CardDescription className="text-center">
                        选择您的登录方式
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'user' | 'admin')}>
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="user" className="flex items-center gap-2">
                                <Key className="w-4 h-4" />
                                用户登录
                            </TabsTrigger>
                            <TabsTrigger value="admin" className="flex items-center gap-2">
                                <Lock className="w-4 h-4" />
                                管理员登录
                            </TabsTrigger>
                        </TabsList>

                        {/* 用户登录 Tab */}
                        <TabsContent value="user" className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label htmlFor="apiKey">API Key</Label>
                                <Input
                                    id="apiKey"
                                    type="text"
                                    placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                    value={apiKey}
                                    onChange={(e) => setApiKeyInput(e.target.value)}
                                    onKeyPress={(e) => handleKeyPress(e, 'user')}
                                    disabled={isUserLoading}
                                    className="font-mono text-sm"
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    请输入您的 API Key（格式：sk- 开头的 40 位十六进制字符）
                                </p>
                            </div>

                            <Button
                                onClick={handleUserLogin}
                                disabled={isUserLoading || !apiKey.trim()}
                                className="w-full"
                            >
                                {isUserLoading ? '验证中...' : '登录'}
                            </Button>
                        </TabsContent>

                        {/* 管理员登录 Tab */}
                        <TabsContent value="admin" className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label htmlFor="password">管理员密码</Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="请输入管理员密码"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        onKeyPress={(e) => handleKeyPress(e, 'admin')}
                                        disabled={isAdminLoading}
                                        className="pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                        tabIndex={-1}
                                    >
                                        {showPassword ? (
                                            <EyeOff className="w-4 h-4" />
                                        ) : (
                                            <Eye className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    管理员可以访问后台管理功能
                                </p>
                            </div>

                            <Button
                                onClick={handleAdminLogin}
                                disabled={isAdminLoading || !password.trim()}
                                className="w-full"
                            >
                                {isAdminLoading ? '登录中...' : '登录'}
                            </Button>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
};

export default Login;
