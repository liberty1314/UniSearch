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
import { User, Lock, Sparkles, LogIn, Eye, EyeOff, ArrowRight, Key, Loader2 } from 'lucide-react';
import PageLoader from '@/components/PageLoader';
import AuthBackground from '@/components/auth/AuthBackground';
import AuthCardShell from '@/components/auth/AuthCardShell';
import { AuthEntryLink, AuthEntryLinksRow } from '@/components/auth/AuthEntryLink';
import { authVisualPresets } from '@/components/auth/authVisualPresets';
import { useAuthParticles } from '@/components/auth/useAuthParticles';
import AuthSwitchMotion from '@/components/auth/AuthSwitchMotion';
import { resolveAuthDirection, type AuthTransitionState } from '@/components/auth/authRouteMotion';
import { getErrorMessage, getErrorStatus } from '@/lib/error';
import { cn } from '@/lib/utils';

const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { setToken } = useAuthStore();

    // System Settings
    const [enableUserSignup, setEnableUserSignup] = useState<boolean>(true);
    const [isLoadingSettings, setIsLoadingSettings] = useState<boolean>(true);

    // Form State
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Animation State
    const particles = useAuthParticles();
    const routeState = location.state as AuthTransitionState | null;
    const authDirection = resolveAuthDirection(routeState?.from, location.pathname, routeState);

    // Load Settings
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const settings = await SystemSettingsService.getSettings();
                setEnableUserSignup(settings.enable_user_signup);

                if (!settings.enable_user_auth) {
                    navigate('/auth/apikey');
                    return;
                }

                if (!settings.enable_user_login) {
                    if (settings.enable_user_signup) {
                        navigate('/register');
                    } else {
                        navigate('/auth/apikey');
                    }
                }
            } catch (error) {
                console.error('Failed to load settings:', error);
            } finally {
                setIsLoadingSettings(false);
            }
        };
        loadSettings();
    }, [navigate]);

    const handleLogin = async () => {
        if (!username.trim() || !password.trim()) {
            toast.error('请输入用户名和密码');
            return;
        }

        setIsLoading(true);
        try {
            const response = await AuthService.userLogin(username.trim(), password, rememberMe);
            if (response && response.access_token) {
                setToken(
                    response.access_token,
                    response.username,
                    false,
                    undefined,
                    response.refresh_token || null
                );
                toast.success('登录成功，欢迎访问 UniSearch！');
                navigate('/');
            } else {
                toast.error('登录失败：服务器未返回有效令牌');
            }
        } catch (error) {
            console.error('Login failed:', error);
            if (getErrorStatus(error) === 401) {
                toast.error('用户名或密码错误');
            } else if (getErrorStatus(error) === 429) {
                toast.error('请求过于频繁，请稍后再试');
            } else {
                toast.error('登录失败：' + getErrorMessage(error));
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoadingSettings) return <PageLoader isLoading={true} />;

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-slate-950 px-4 pt-20 overflow-y-auto relative">
            <AuthBackground preset={authVisualPresets.loginPage} particles={particles} />

            {/* Login Card */}
            <AuthCardShell glowClassName={authVisualPresets.loginPage.cardGlowGradientClass}>
                <AuthSwitchMotion routeKey={location.pathname} direction={authDirection}>
                    <Card className="relative glass-panel shadow-2xl border-blue-200 dark:border-blue-800">
                        <CardHeader className="space-y-3 pb-6">
                            <div className="flex justify-center mb-2">
                                <div className="relative group">
                                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                                        <LogIn className="w-8 h-8 text-white auth-icon-intro" />
                                    </div>
                                    <Sparkles className="absolute -top-2 -right-2 w-5 h-5 text-yellow-400 auth-sparkle-intro" />
                                </div>
                            </div>
                            <CardTitle className="text-3xl font-bold text-center bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-500 bg-clip-text text-transparent animate-auth-gradient">
                                欢迎回来
                            </CardTitle>
                            <CardDescription className="text-center text-base">
                                登录您的 UniSearch 账户
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-6 relative">
                            {/* 加载遮罩与模糊层 */}
                            {isLoading && (
                                <div className="absolute inset-x-0 -top-20 bottom-0 bg-white/5 dark:bg-slate-950/20 backdrop-blur-[2px] z-10 rounded-xl transition-all duration-300" />
                            )}

                            <div className={cn("space-y-4 transition-all duration-300", isLoading && "opacity-60 scale-[0.98]")}>
                                <div className="space-y-2">
                                    <Label htmlFor="username">用户名</Label>
                                    <div className="relative">
                                        <Input
                                            id="username"
                                            type="text"
                                            placeholder="请输入用户名"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                                            className="pl-10 h-12 bg-white/50 dark:bg-white/5"
                                        />
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="password">密码</Label>
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="请输入密码"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                                            className="pl-10 pr-10 h-12 bg-white/50 dark:bg-white/5"
                                        />
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
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
                                    disabled={isLoading || !username.trim() || !password.trim()}
                                    className="relative w-full h-12 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-700 hover:via-blue-600 hover:to-cyan-600 text-white font-medium shadow-lg hover:shadow-2xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 overflow-hidden"
                                >
                                    {/* 文字淡入淡出 */}
                                    <span className={cn(
                                        "flex items-center justify-center transition-all duration-300",
                                        isLoading ? "opacity-0 scale-90" : "opacity-100 scale-100"
                                    )}>
                                        登录
                                    </span>

                                    {/* 光圈 Loader 浮现 */}
                                    {isLoading && (
                                        <div className="absolute inset-0 flex items-center justify-center animate-in fade-in zoom-in duration-300">
                                            <Loader2 className="w-5 h-5 animate-spin drop-shadow-md" />
                                        </div>
                                    )}
                                </Button>
                            </div>

                            <AuthEntryLinksRow>
                                {enableUserSignup && (
                                    <AuthEntryLink
                                        to="/register"
                                        state={{ authTransition: 'forward', from: '/login' }}
                                        label="注册账号"
                                        icon={ArrowRight}
                                    />
                                )}
                                <AuthEntryLink
                                    to="/auth/apikey"
                                    state={{ authTransition: 'forward', from: '/login' }}
                                    label="API Key"
                                    icon={Key}
                                />
                            </AuthEntryLinksRow>
                        </CardContent>
                    </Card>
                </AuthSwitchMotion>
            </AuthCardShell>
        </div>
    );
};

export default LoginPage;
