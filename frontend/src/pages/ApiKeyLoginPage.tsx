import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { AuthService } from '@/services/authService';
import { SystemSettingsService } from '@/services/systemSettingsService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Key, Sparkles, LogIn, Loader2 } from 'lucide-react';
import AuthBackground from '@/components/auth/AuthBackground';
import AuthCardShell from '@/components/auth/AuthCardShell';
import { AuthEntryLink, AuthEntryLinksRow } from '@/components/auth/AuthEntryLink';
import { authVisualPresets } from '@/components/auth/authVisualPresets';
import { useAuthParticles } from '@/components/auth/useAuthParticles';
import AuthSwitchMotion from '@/components/auth/AuthSwitchMotion';
import { resolveAuthDirection, type AuthTransitionState } from '@/components/auth/authRouteMotion';
import { getErrorMessage, getErrorStatus } from '@/lib/error';
import { cn } from '@/lib/utils';

const ApiKeyLoginPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { setToken } = useAuthStore();

    // Form State
    const [apiKey, setApiKey] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showLoginLink, setShowLoginLink] = useState(true);

    // Animation State
    const particles = useAuthParticles();
    const routeState = location.state as AuthTransitionState | null;
    const authDirection = resolveAuthDirection(routeState?.from, location.pathname, routeState);

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
        } catch (error) {
            console.error('API Key Login failed:', error);
            if (getErrorStatus(error) === 401) {
                toast.error('API Key 无效或已过期');
            } else if (getErrorStatus(error) === 429) {
                toast.error('请求过于频繁，请稍后再试');
            } else {
                toast.error('登录失败：' + getErrorMessage(error));
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
                <AuthSwitchMotion routeKey={location.pathname} direction={authDirection}>
                    <Card className="relative glass-panel shadow-2xl border-blue-200 dark:border-blue-800">
                        <CardHeader className="space-y-3 pb-6">
                            <div className="flex justify-center mb-2">
                                <div className="relative group">
                                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                                        <Key className="w-8 h-8 text-white auth-icon-intro" />
                                    </div>
                                    <Sparkles className="absolute -top-2 -right-2 w-5 h-5 text-yellow-400 auth-sparkle-intro" />
                                </div>
                            </div>
                            <CardTitle className="text-3xl font-bold text-center bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-500 bg-clip-text text-transparent animate-auth-gradient">
                                API Key 访问
                            </CardTitle>
                            <CardDescription className="text-center text-base">
                                使用 API Key 登录 UniSearch
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-6 relative">
                            {/* 加载时的遮罩与模糊层 */}
                            {isLoading && (
                                <div className="absolute inset-x-0 -top-20 bottom-0 bg-white/5 dark:bg-gray-900/20 backdrop-blur-[2px] z-10 rounded-xl transition-all duration-300" />
                            )}

                            <div className={cn("space-y-4 transition-all duration-300", isLoading && "opacity-60 scale-[0.98]")}>
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
                                    <p className="text-xs text-gray-500 dark:text-slate-400">
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
                                    className="relative w-full h-12 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-700 hover:via-blue-600 hover:to-cyan-600 text-white font-medium shadow-lg hover:shadow-2xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 overflow-hidden"
                                >
                                    {/* 按钮内容，随 isLoading 变化透明度 */}
                                    <span className={cn(
                                        "flex items-center justify-center transition-all duration-300",
                                        isLoading ? "opacity-0 scale-90" : "opacity-100 scale-100"
                                    )}>
                                        登录
                                    </span>

                                    {/* 高级 Loading 动画：中心浮现 */}
                                    {isLoading && (
                                        <div className="absolute inset-0 flex items-center justify-center animate-in fade-in zoom-in duration-300">
                                            <Loader2 className="w-5 h-5 animate-spin drop-shadow-md" />
                                        </div>
                                    )}
                                </Button>
                            </div>

                            {showLoginLink && (
                                <AuthEntryLinksRow>
                                    <AuthEntryLink
                                        to="/login"
                                        state={{ authTransition: 'backward', from: '/apikey' }}
                                        label="返回账号登录"
                                        icon={LogIn}
                                    />
                                </AuthEntryLinksRow>
                            )}
                        </CardContent>
                    </Card>
                </AuthSwitchMotion>
            </AuthCardShell>
        </div>
    );
};

export default ApiKeyLoginPage;
