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
import { User, Lock, Sparkles, LogIn, Eye, EyeOff, ArrowRight, Key } from 'lucide-react';
import PageLoader from '@/components/PageLoader';
import AuthBackground from '@/components/auth/AuthBackground';
import AuthCardShell from '@/components/auth/AuthCardShell';
import { authVisualPresets } from '@/components/auth/authVisualPresets';
import { useAuthParticles } from '@/components/auth/useAuthParticles';

const LoginPage: React.FC = () => {
    const navigate = useNavigate();
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
        } catch (error: any) {
            console.error('Login failed:', error);
            if (error.response?.status === 401) {
                toast.error('用户名或密码错误');
            } else if (error.response?.status === 429) {
                toast.error('请求过于频繁，请稍后再试');
            } else {
                toast.error('登录失败：' + (error.message || '未知错误'));
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoadingSettings) return <PageLoader isLoading={true} />;

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 pt-20 overflow-y-auto relative">
            <AuthBackground preset={authVisualPresets.loginPage} particles={particles} />

            {/* Login Card */}
            <AuthCardShell glowClassName={authVisualPresets.loginPage.cardGlowGradientClass}>
                <Card className="relative glass-panel shadow-2xl animate-slide-up border-nebula-200 dark:border-nebula-800">
                    <CardHeader className="space-y-3 pb-6">
                        <div className="flex justify-center mb-2">
                            <div className="relative group">
                                <div className="w-16 h-16 bg-gradient-to-br from-nebula-500 to-cosmic-600 rounded-2xl flex items-center justify-center shadow-lg transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                                    <LogIn className="w-8 h-8 text-white animate-pulse" />
                                </div>
                                <Sparkles className="absolute -top-2 -right-2 w-5 h-5 text-yellow-400 animate-ping" />
                            </div>
                        </div>
                        <CardTitle className="text-3xl font-bold text-center bg-gradient-to-r from-nebula-600 via-cosmic-600 to-purple-600 bg-clip-text text-transparent animate-auth-gradient">
                            欢迎回来
                        </CardTitle>
                        <CardDescription className="text-center text-base">
                            登录您的 UniSearch 账户
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        <div className="space-y-4">
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
                                        className="pl-10 h-12 bg-white/50 dark:bg-gray-900/50"
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
                                        className="pl-10 pr-10 h-12 bg-white/50 dark:bg-gray-900/50"
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
                                    className="w-4 h-4 text-nebula-500 rounded border-gray-300 focus:ring-nebula-500"
                                />
                                <Label htmlFor="remember-me" className="text-sm font-medium cursor-pointer">
                                    记住我（30天内自动登录）
                                </Label>
                            </div>

                            <Button
                                onClick={handleLogin}
                                disabled={isLoading || !username.trim() || !password.trim()}
                                className="w-full h-12 bg-gradient-to-r from-nebula-500 via-cosmic-500 to-purple-500 hover:from-nebula-600 hover:via-cosmic-600 hover:to-purple-600 text-white font-medium shadow-lg hover:shadow-2xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                            >
                                {isLoading ? '登录中...' : '登录'}
                            </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-6">
                            {enableUserSignup && (
                                <Link
                                    to="/register"
                                    className="flex items-center justify-center gap-2 py-2.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors border border-gray-200 dark:border-gray-700/50"
                                >
                                    <span>注册账号</span>
                                    <ArrowRight className="w-4 h-4" />
                                </Link>
                            )}
                            <Link
                                to="/auth/apikey"
                                className="flex items-center justify-center gap-2 py-2.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors border border-gray-200 dark:border-gray-700/50"
                            >
                                <Key className="w-4 h-4" />
                                <span>API Key</span>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </AuthCardShell>
        </div>
    );
};

export default LoginPage;
