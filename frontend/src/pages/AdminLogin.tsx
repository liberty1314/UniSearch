import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { AuthService } from '@/services/authService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Lock, User, Loader2 } from 'lucide-react';
import AuthBackground from '@/components/auth/AuthBackground';
import AuthCardShell from '@/components/auth/AuthCardShell';
import AuthInput from '@/components/auth/AuthInput';
import AuthSwitchMotion from '@/components/auth/AuthSwitchMotion';
import { authVisualPresets } from '@/components/auth/authVisualPresets';
import { cn } from '@/lib/utils';
import { useAuthParticles } from '@/components/auth/useAuthParticles';
import { resolveAuthDirection, type AuthTransitionState } from '@/components/auth/authRouteMotion';
import {
    AUTH_ENTRY_CARD_BASE_CLASS,
    AUTH_ENTRY_CARD_SHELL_CLASS,
    AUTH_ENTRY_PAGE_CONTAINER_CLASS,
} from '@/components/auth/authEntryLayout';
import { getErrorMessage, getErrorStatus } from '@/lib/error';
import { DEFAULT_AUTH_POLICY, resolveAuthPolicy } from '@/lib/authPolicy';
import { SystemSettingsService } from '@/services/systemSettingsService';
import {
    getPasswordPolicyHelperText,
    hasPasswordWhitespace,
    removePasswordWhitespace,
} from '@/components/account/passwordValidation';

/**
 * 管理员登录页面组件
 * 
 * 提供管理员密码登录方式
 */
const AdminLogin: React.FC = () => {
    const location = useLocation();

    // 认证状态管理
    const { setToken } = useAuthStore();

    // 管理员登录表单状态
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false); // 新增：记住我
    const [isAdminLoading, setIsAdminLoading] = useState(false);
    const [authPolicy, setAuthPolicy] = useState(DEFAULT_AUTH_POLICY);

    // 动态效果状态
    const particles = useAuthParticles();
    const routeState = location.state as AuthTransitionState | null;
    const authDirection = resolveAuthDirection(routeState?.from, location.pathname, routeState);

    useEffect(() => {
        const loadAuthPolicy = async () => {
            try {
                const settings = await SystemSettingsService.getSettings();
                setAuthPolicy(resolveAuthPolicy(settings));
            } catch {
                setAuthPolicy(DEFAULT_AUTH_POLICY);
            }
        };

        void loadAuthPolicy();
    }, []);

    const normalizePasswordInput = (value: string) => {
        if (!hasPasswordWhitespace(value)) {
            return value;
        }

        toast.error('密码不能包含空格');
        return removePasswordWhitespace(value);
    };

    /**
     * 处理管理员登录（用户名+密码）
     */
    const handleAdminLogin = async () => {
        if (isAdminLoading) {
            return;
        }

        // 验证输入
        if (!username.trim()) {
            toast.error('请输入用户名');
            return;
        }

        if (!password.trim()) {
            toast.error('请输入管理员密码');
            return;
        }

        setIsAdminLoading(true);

        try {
            // 调用管理员登录接口（支持"记住我"）
            const response = await AuthService.adminLoginWithRemember(username, password, rememberMe);

            // 保存 Token 和可选的 Refresh Token 到状态管理（明确设置 isAdmin = true）
            setToken(
                response.access_token,
                response.username || username.trim(),
                true,
                response.refresh_token || null
            );

            toast.success('登录成功，欢迎访问 UniSearch！');
        } catch (error) {
            console.error('管理员登录失败:', error);

            // 根据错误类型显示不同提示
            if (getErrorStatus(error) === 401) {
                toast.error('用户名或密码错误，请重试');
            } else if (getErrorStatus(error) === 429) {
                toast.error('请求过于频繁，请稍后再试');
            } else {
                toast.error('登录失败：' + getErrorMessage(error));
            }
        } finally {
            setIsAdminLoading(false);
        }
    };

    return (
        <div className={AUTH_ENTRY_PAGE_CONTAINER_CLASS}>
            <AuthBackground preset={authVisualPresets.adminLogin} particles={particles} />

            {/* 登录卡片 */}
            <AuthCardShell
                glowClassName={authVisualPresets.adminLogin.cardGlowGradientClass}
                className={AUTH_ENTRY_CARD_SHELL_CLASS}
            >
                <AuthSwitchMotion routeKey={location.pathname} direction={authDirection}>
                    <Card className={cn(AUTH_ENTRY_CARD_BASE_CLASS, "border-rose-200/65 dark:border-rose-900/50")}>
                        <CardHeader className="space-y-3 pb-6">
                            {/* Logo 或图标 */}
                            <div className="flex justify-center mb-2">
                                <div className="relative group">
                                    <div className="w-16 h-16 bg-gradient-to-br from-rose-500 to-rose-700 rounded-2xl flex items-center justify-center shadow-lg transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                                        <Lock className="w-8 h-8 text-white auth-icon-intro" />
                                    </div>
                                    <div className="absolute inset-0 bg-gradient-to-br from-rose-500 to-rose-700 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity duration-500"></div>
                                </div>
                            </div>

                            <CardTitle className="text-3xl font-bold text-center bg-gradient-to-r from-rose-600 via-rose-500 to-rose-700 dark:from-rose-400 dark:via-rose-300 dark:to-rose-500 bg-clip-text text-transparent animate-auth-gradient">
                                管理员登录
                            </CardTitle>
                            <CardDescription className="text-center text-base animate-fade-in auth-delay-200">
                                使用管理员密码访问后台系统
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-6 relative">
                            {/* 后台登录加载遮罩与模糊层 */}
                            {isAdminLoading && (
                                <div className="absolute inset-x-0 -top-20 bottom-0 bg-white/5 dark:bg-gray-900/20 backdrop-blur-[2px] z-10 rounded-xl transition-all duration-300" />
                            )}
                            <form onSubmit={(e) => { e.preventDefault(); handleAdminLogin(); }} className={cn("space-y-6 transition-all duration-300", isAdminLoading && "opacity-60 scale-[0.98]")}>
                                <div className="space-y-3 animate-fade-in auth-delay-300">
                                    <AuthInput
                                        id="username"
                                        name="username"
                                        label="用户名"
                                        tone="rose"
                                        icon={<User className="w-4 h-4" />}
                                        type="text"
                                        autoComplete="username"
                                        placeholder="请输入用户名"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        disabled={isAdminLoading}
                                    />
                                </div>

                                <div className="space-y-3 animate-fade-in auth-delay-350">
                                    <AuthInput
                                        id="password"
                                        name="password"
                                        label="管理员密码"
                                        tone="rose"
                                        icon={<Lock className="w-4 h-4" />}
                                        type={showPassword ? 'text' : 'password'}
                                        autoComplete="current-password"
                                        placeholder="请输入管理员密码"
                                        value={password}
                                        onChange={(e) => setPassword(normalizePasswordInput(e.target.value))}
                                        disabled={isAdminLoading}
                                        helperText={getPasswordPolicyHelperText(authPolicy)}
                                        endAdornment={(
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="text-gray-500 transition-colors duration-200 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400"
                                                aria-label={showPassword ? '隐藏管理员密码' : '显示管理员密码'}
                                                tabIndex={-1}
                                            >
                                                {showPassword ? (
                                                    <EyeOff className="w-5 h-5" />
                                                ) : (
                                                    <Eye className="w-5 h-5" />
                                                )}
                                            </button>
                                        )}
                                    />
                                </div>

                                {/* 记住我复选框 */}
                                <div className="flex items-center space-x-2 animate-fade-in auth-delay-380">
                                    <input
                                        type="checkbox"
                                        id="rememberMe"
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                        className="w-4 h-4 text-rose-600 bg-white/50 dark:bg-gray-900/50 border-gray-300 dark:border-slate-700 rounded focus:ring-2 focus:ring-rose-500/20 transition-all duration-200"
                                    />
                                    <Label
                                        htmlFor="rememberMe"
                                        className="text-sm font-medium text-gray-700 dark:text-slate-300 cursor-pointer select-none"
                                    >
                                        记住我（30天内自动登录）
                                    </Label>
                                </div>

                                <div className="animate-fade-in auth-delay-400">
                                    <Button
                                        type="submit"
                                        variant="primary"
                                        disabled={isAdminLoading}
                                        className="group relative h-12 w-full overflow-hidden border-rose-200/60 bg-gradient-to-r from-rose-600/95 via-rose-500/95 to-rose-700/95 text-white shadow-glass-strong transition-all duration-200 disabled:transform-none dark:border-rose-200/20"
                                    >
                                        {/* 按钮光泽效果 */}
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>

                                        {/* 脉冲波效果 */}
                                        <div className="absolute inset-0 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                            <div className="absolute inset-0 rounded-md bg-white/10 animate-ping auth-duration-1500"></div>
                                        </div>

                                        {/* 边框光效 */}
                                        <div className="absolute inset-0 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-white to-transparent animate-auth-border-flow"></div>
                                            <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-white to-transparent animate-auth-border-flow auth-delay-500"></div>
                                        </div>

                                        <span className={cn(
                                            "relative z-10 flex items-center gap-2 transition-all duration-300",
                                            isAdminLoading ? "opacity-0 scale-90" : "opacity-100 scale-100"
                                        )}>
                                            登录后台
                                            <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                            </svg>
                                        </span>

                                        {/* 光圈 Loader 浮现 */}
                                        {isAdminLoading && (
                                            <div className="absolute inset-0 flex items-center justify-center animate-in fade-in zoom-in duration-300">
                                                <Loader2 className="w-5 h-5 animate-spin drop-shadow-md" />
                                            </div>
                                        )}
                                    </Button>
                                </div>
                            </form>

                            <div className="flex items-center justify-center mt-4">
                                <Link
                                    to="/login"
                                    state={{ authTransition: 'backward', from: '/admin/login' }}
                                    className="text-sm font-medium text-rose-600 dark:text-rose-400 hover:underline"
                                >
                                    返回用户登录
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                </AuthSwitchMotion>
            </AuthCardShell>
        </div>
    );
};

export default AdminLogin;
