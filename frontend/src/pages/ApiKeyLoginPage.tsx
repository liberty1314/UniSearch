import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { AuthService } from '@/services/authService';
import { SystemSettingsService } from '@/services/systemSettingsService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Key, Sparkles, LogIn } from 'lucide-react';
import AuthBackground from '@/components/auth/AuthBackground';
import AuthCardShell from '@/components/auth/AuthCardShell';
import { authVisualPresets } from '@/components/auth/authVisualPresets';
import { useAuthParticles } from '@/components/auth/useAuthParticles';

const ApiKeyLoginPage: React.FC = () => {
    const navigate = useNavigate();
    const { setToken } = useAuthStore();

    // Form State
    const [apiKey, setApiKey] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showLoginLink, setShowLoginLink] = useState(true);

    // Animation State
    const particles = useAuthParticles();

    useEffect(() => {
        const checkSettings = async () => {
            try {
                const settings = await SystemSettingsService.getSettings();
                // 只有当“用户认证总开关”和“用户登录开关”同时开启时，才显示返回登录链接
                setShowLoginLink(settings.enable_user_auth && settings.enable_user_login);
            } catch (error) {
                console.error('Failed to load settings:', error);
            }
        };
        checkSettings();
    }, []);

    const validateApiKeyFormat = (key: string): boolean => {
        const apiKeyRegex = /^sk-[0-9a-f]{40}$/i;
        return apiKeyRegex.test(key);
    };

    const handleLogin = async () => {
        if (!apiKey.trim()) {
            toast.error('请输入 API Key');
            return;
        }

        if (!validateApiKeyFormat(apiKey.trim())) {
            toast.error('API Key 格式不正确，应为 sk- 开头的 40 位十六进制字符');
            return;
        }

        setIsLoading(true);
        try {
            const response = await AuthService.loginWithApiKeyAndRemember(apiKey.trim(), rememberMe);
            if (response && response.access_token) {
                setToken(
                    response.access_token,
                    response.username || 'user',
                    false,
                    apiKey.trim(),
                    response.refresh_token || null
                );
                toast.success('登录成功，欢迎访问 UniSearch！');
                navigate('/');
            } else {
                toast.error('登录失败：服务器未返回有效令牌');
            }
        } catch (error: any) {
            console.error('API Key Login failed:', error);
            if (error.response?.status === 401) {
                toast.error('API Key 无效或已过期');
            } else if (error.response?.status === 429) {
                toast.error('请求过于频繁，请稍后再试');
            } else {
                toast.error('登录失败：' + (error.message || '未知错误'));
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 pt-20 overflow-y-auto relative">
            <AuthBackground preset={authVisualPresets.apiKeyPage} particles={particles} />

            {/* API Key Login Card */}
            <AuthCardShell glowClassName={authVisualPresets.apiKeyPage.cardGlowGradientClass}>
                <Card className="relative glass-panel shadow-2xl animate-slide-up border-nebula-200 dark:border-nebula-800">
                    <CardHeader className="space-y-3 pb-6">
                        <div className="flex justify-center mb-2">
                            <div className="relative group">
                                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                                    <Key className="w-8 h-8 text-white animate-pulse" />
                                </div>
                                <Sparkles className="absolute -top-2 -right-2 w-5 h-5 text-yellow-400 animate-ping" />
                            </div>
                        </div>
                        <CardTitle className="text-3xl font-bold text-center bg-gradient-to-r from-blue-600 via-cyan-600 to-purple-600 bg-clip-text text-transparent animate-auth-gradient">
                            API Key 访问
                        </CardTitle>
                        <CardDescription className="text-center text-base">
                            使用 API Key 登录 UniSearch
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="apiKey">API Key</Label>
                                <div className="relative">
                                    <Input
                                        id="apiKey"
                                        type="text"
                                        placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                                        className="pl-10 h-12 bg-white/50 dark:bg-gray-900/50 font-mono text-sm"
                                    />
                                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    格式：sk- 开头的 40 位十六进制字符
                                </p>
                            </div>

                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="remember-me"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="w-4 h-4 text-blue-500 rounded border-gray-300 focus:ring-blue-500"
                                />
                                <Label htmlFor="remember-me" className="text-sm font-medium cursor-pointer">
                                    记住我（30天内自动登录）
                                </Label>
                            </div>

                            <Button
                                onClick={handleLogin}
                                disabled={isLoading || !apiKey.trim()}
                                className="w-full h-12 bg-gradient-to-r from-blue-500 via-cyan-500 to-purple-500 hover:from-blue-600 hover:via-cyan-600 hover:to-purple-600 text-white font-medium shadow-lg hover:shadow-2xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                            >
                                {isLoading ? '验证中...' : '登录'}
                            </Button>
                        </div>

                        {showLoginLink && (
                            <div className="flex items-center justify-center mt-6">
                                <Link
                                    to="/login"
                                    className="flex items-center gap-1 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:underline transition-colors"
                                >
                                    <LogIn className="w-4 h-4" />
                                    返回账号登录
                                </Link>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </AuthCardShell>
        </div>
    );
};

export default ApiKeyLoginPage;
