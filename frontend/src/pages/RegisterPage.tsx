import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { AuthService } from '@/services/authService';
import { SystemSettingsService } from '@/services/systemSettingsService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Lock, UserPlus, Eye, EyeOff, LogIn } from 'lucide-react';
import PageLoader from '@/components/PageLoader';
import AuthBackground from '@/components/auth/AuthBackground';
import AuthCardShell from '@/components/auth/AuthCardShell';
import AuthInput from '@/components/auth/AuthInput';
import { AuthEntryLink, AuthEntryLinksRow } from '@/components/auth/AuthEntryLink';
import { authVisualPresets } from '@/components/auth/authVisualPresets';
import { useAuthParticles } from '@/components/auth/useAuthParticles';
import AuthSwitchMotion from '@/components/auth/AuthSwitchMotion';
import { resolveAuthDirection, type AuthTransitionState } from '@/components/auth/authRouteMotion';
import { getErrorDataError, getErrorMessage } from '@/lib/error';

const RegisterPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // System Settings
    const [isLoadingSettings, setIsLoadingSettings] = useState<boolean>(true);

    // Form State
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [submitAttempted, setSubmitAttempted] = useState(false);

    // Animation State
    const particles = useAuthParticles();
    const routeState = location.state as AuthTransitionState | null;
    const authDirection = resolveAuthDirection(routeState?.from, location.pathname, routeState);

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
        setSubmitAttempted(true);

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
            toast.success('注册成功，请先登录；登录后绑定 API Key 即可搜索');
            navigate('/login');
        } catch (error) {
            console.error('Register failed:', error);
            const dataError = getErrorDataError(error);
            if (dataError) {
                toast.error(dataError);
            } else {
                toast.error('注册失败：' + getErrorMessage(error));
            }
        } finally {
            setIsLoading(false);
        }
    };

    const usernameError = !submitAttempted
        ? undefined
        : !username.trim()
            ? '请输入用户名'
            : username.length < 3 || username.length > 32
                ? '用户名长度必须在3-32字符之间'
                : undefined;

    const passwordError = !submitAttempted
        ? undefined
        : !password.trim()
            ? '请输入密码'
            : password.length < 6 || password.length > 64
                ? '密码长度必须在6-64字符之间'
                : undefined;

    const confirmPasswordError = !submitAttempted
        ? undefined
        : !confirmPassword.trim()
            ? '请再次输入密码'
            : password !== confirmPassword
                ? '两次输入的密码不一致'
                : undefined;

    if (isLoadingSettings) return <PageLoader isLoading={true} />;

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 pt-20 overflow-y-auto relative">
            <AuthBackground preset={authVisualPresets.registerPage} particles={particles} />

            {/* Register Card */}
            <AuthCardShell glowClassName={authVisualPresets.registerPage.cardGlowGradientClass}>
                <AuthSwitchMotion routeKey={location.pathname} direction={authDirection}>
                    <Card className="relative glass-panel shadow-2xl border-emerald-200 dark:border-emerald-800">
                        <CardHeader className="space-y-3 pb-6">
                            <div className="flex justify-center mb-2">
                                <div className="relative group">
                                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                                        <UserPlus className="w-8 h-8 text-white auth-icon-intro" />
                                    </div>
                                </div>
                            </div>
                            <CardTitle className="text-3xl font-bold text-center bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 bg-clip-text text-transparent animate-auth-gradient">
                                创建账户
                            </CardTitle>
                        </CardHeader>

                        <CardContent className="space-y-6">
                            <div className="space-y-4">
                                <AuthInput
                                    id="username"
                                    label="用户名"
                                    tone="emerald"
                                    icon={<User className="w-4 h-4" />}
                                    type="text"
                                    placeholder="3-32个字符"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
                                    error={usernameError}
                                />

                                <AuthInput
                                    id="password"
                                    label="密码"
                                    tone="emerald"
                                    icon={<Lock className="w-4 h-4" />}
                                    type={showPassword ? "text" : "password"}
                                    placeholder="6-64个字符"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
                                    error={passwordError}
                                    endAdornment={(
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-slate-200"
                                            aria-label={showPassword ? '隐藏密码' : '显示密码'}
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    )}
                                />

                                <AuthInput
                                    id="confirmPassword"
                                    label="确认密码"
                                    tone="emerald"
                                    icon={<Lock className="w-4 h-4" />}
                                    type={showConfirmPassword ? "text" : "password"}
                                    placeholder="请再次输入密码"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
                                    error={confirmPasswordError}
                                    endAdornment={(
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-slate-200"
                                            aria-label={showConfirmPassword ? '隐藏确认密码' : '显示确认密码'}
                                        >
                                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    )}
                                />

                                <Button
                                    onClick={handleRegister}
                                    disabled={isLoading || !username.trim() || !password.trim() || !confirmPassword.trim()}
                                    className="w-full h-12 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-700 hover:via-emerald-600 hover:to-teal-600 text-white font-medium shadow-lg hover:shadow-2xl transform active:scale-[0.98] transition-all duration-200"
                                >
                                    {isLoading ? '注册中...' : '立即注册'}
                                </Button>
                            </div>

                            <AuthEntryLinksRow prefixText="已有账号？">
                                <AuthEntryLink
                                    to="/login"
                                    state={{ authTransition: 'backward', from: '/register' }}
                                    label="立即登录"
                                    icon={LogIn}
                                />
                            </AuthEntryLinksRow>
                        </CardContent>
                    </Card>
                </AuthSwitchMotion>
            </AuthCardShell>
        </div>
    );
};

export default RegisterPage;
