import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { AuthService } from '@/services/authService';
import { SystemSettingsService } from '@/services/systemSettingsService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { User, Lock, Sparkles, UserPlus, Eye, EyeOff, LogIn } from 'lucide-react';
import PageLoader from '@/components/PageLoader';
import AuthBackground from '@/components/auth/AuthBackground';
import AuthCardShell from '@/components/auth/AuthCardShell';
import { authVisualPresets } from '@/components/auth/authVisualPresets';
import { useAuthParticles } from '@/components/auth/useAuthParticles';

const RegisterPage: React.FC = () => {
    const navigate = useNavigate();

    // System Settings
    const [isLoadingSettings, setIsLoadingSettings] = useState<boolean>(true);

    // Form State
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Animation State
    const particles = useAuthParticles();

    // Load Settings
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const settings = await SystemSettingsService.getSettings();

                if (!settings.enable_user_auth || !settings.enable_user_signup) {
                    toast.error('用户注册功能已关闭');
                    navigate('/login');
                }
            } catch (error) {
                console.error('Failed to load settings:', error);
            } finally {
                setIsLoadingSettings(false);
            }
        };
        loadSettings();
    }, [navigate]);

    const handleRegister = async () => {
        if (!username.trim() || !password.trim() || !confirmPassword.trim()) {
            toast.error('请填写完整的注册信息');
            return;
        }

        if (password !== confirmPassword) {
            toast.error('两次输入的密码不一致');
            return;
        }

        if (username.length < 3 || username.length > 32) {
            toast.error('用户名长度必须在3-32字符之间');
            return;
        }

        if (password.length < 6 || password.length > 64) {
            toast.error('密码长度必须在6-64字符之间');
            return;
        }

        setIsLoading(true);
        try {
            await AuthService.register(username.trim(), password);
            toast.success('注册成功！请登录');
            navigate('/login');
        } catch (error: any) {
            console.error('Register failed:', error);
            if (error.response?.data?.error) {
                toast.error(error.response.data.error);
            } else {
                toast.error('注册失败：' + (error.message || '未知错误'));
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoadingSettings) return <PageLoader isLoading={true} />;

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 pt-20 overflow-y-auto relative">
            <AuthBackground preset={authVisualPresets.registerPage} particles={particles} />

            {/* Register Card */}
            <AuthCardShell glowClassName={authVisualPresets.registerPage.cardGlowGradientClass}>
                <Card className="relative glass-panel shadow-2xl animate-slide-up border-nebula-200 dark:border-nebula-800">
                    <CardHeader className="space-y-3 pb-6">
                        <div className="flex justify-center mb-2">
                            <div className="relative group">
                                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-nebula-600 rounded-2xl flex items-center justify-center shadow-lg transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                                    <UserPlus className="w-8 h-8 text-white animate-pulse" />
                                </div>
                                <Sparkles className="absolute -top-2 -right-2 w-5 h-5 text-yellow-400 animate-ping" />
                            </div>
                        </div>
                        <CardTitle className="text-3xl font-bold text-center bg-gradient-to-r from-emerald-600 via-nebula-600 to-cosmic-600 bg-clip-text text-transparent animate-auth-gradient">
                            创建账户
                        </CardTitle>
                        <CardDescription className="text-center text-base">
                            注册新的 UniSearch 账户
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
                                        placeholder="3-32个字符"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
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
                                        placeholder="6-64个字符"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
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

                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">确认密码</Label>
                                <div className="relative">
                                    <Input
                                        id="confirmPassword"
                                        type={showConfirmPassword ? "text" : "password"}
                                        placeholder="请再次输入密码"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
                                        className="pl-10 pr-10 h-12 bg-white/50 dark:bg-gray-900/50"
                                    />
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <Button
                                onClick={handleRegister}
                                disabled={isLoading || !username.trim() || !password.trim() || !confirmPassword.trim()}
                                className="w-full h-12 bg-gradient-to-r from-emerald-500 via-nebula-500 to-cosmic-500 hover:from-emerald-600 hover:via-nebula-600 hover:to-cosmic-600 text-white font-medium shadow-lg hover:shadow-2xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                            >
                                {isLoading ? '注册中...' : '立即注册'}
                            </Button>
                        </div>

                        <div className="flex items-center justify-center mt-6">
                            <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">
                                已有账号？
                            </span>
                            <Link
                                to="/login"
                                className="flex items-center gap-1 text-sm font-medium text-nebula-600 dark:text-nebula-400 hover:underline"
                            >
                                <LogIn className="w-4 h-4" />
                                立即登录
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </AuthCardShell>
        </div>
    );
};

export default RegisterPage;
