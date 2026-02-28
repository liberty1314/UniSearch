import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { AuthService } from '@/services/authService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Lock, Shield, User, Loader2 } from 'lucide-react';
import AuthBackground from '@/components/auth/AuthBackground';
import AuthCardShell from '@/components/auth/AuthCardShell';
import AuthSwitchMotion from '@/components/auth/AuthSwitchMotion';
import { authVisualPresets } from '@/components/auth/authVisualPresets';
import { cn } from '@/lib/utils';
import { useAuthParticles } from '@/components/auth/useAuthParticles';
import { resolveAuthDirection, type AuthTransitionState } from '@/components/auth/authRouteMotion';
import { getErrorMessage, getErrorStatus } from '@/lib/error';

/**
 * 管理员登录页面组件
 * 
 * 提供管理员密码登录方式
 */
const AdminLogin: React.FC = () => {
    // 路由导航
    const navigate = useNavigate();
    const location = useLocation();

    // 认证状态管理
    const { setToken } = useAuthStore();

    // 管理员登录表单状态
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false); // 新增：记住我
    const [isAdminLoading, setIsAdminLoading] = useState(false);

    // 动态效果状态
    const particles = useAuthParticles();
    const routeState = location.state as AuthTransitionState | null;
    const authDirection = resolveAuthDirection(routeState?.from, location.pathname, routeState);

    /**
     * 处理管理员登录（用户名+密码）
     */
    const handleAdminLogin = async () => {
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
                'admin',
                true, // 管理员登录，明确设置为 true
                null,
                response.refresh_token || null
            );

            toast.success('登录成功，欢迎访问 UniSearch！');

            // 跳转到后台管理页面的系统监控视图
            navigate('/admin?view=system-info');
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

    /**
     * 处理 Enter 键提交
     */
    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleAdminLogin();
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-slate-950 px-4 pt-16 overflow-hidden relative">
            <AuthBackground preset={authVisualPresets.adminLogin} particles={particles} />

            {/* 登录卡片 */}
            <AuthCardShell glowClassName={authVisualPresets.adminLogin.cardGlowGradientClass}>
                <AuthSwitchMotion routeKey={location.pathname} direction={authDirection}>
                    <Card className="relative glass-panel shadow-2xl border-rose-200 dark:border-rose-900/50">
                        <CardHeader className="space-y-3 pb-6">
                            {/* Logo 或图标 */}
                            <div className="flex justify-center mb-2">
                                <div className="relative group">
                                    <div className="w-16 h-16 bg-gradient-to-br from-rose-500 to-rose-700 rounded-2xl flex items-center justify-center shadow-lg transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                                        <Lock className="w-8 h-8 text-white auth-icon-intro" />
                                    </div>
                                    <div className="absolute inset-0 bg-gradient-to-br from-rose-500 to-rose-700 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity duration-500"></div>
                                    <Shield className="absolute -top-2 -right-2 w-5 h-5 text-yellow-400 auth-sparkle-intro" />
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
                                <div className="absolute inset-x-0 -top-20 bottom-0 bg-white/5 dark:bg-slate-950/20 backdrop-blur-[2px] z-10 rounded-xl transition-all duration-300" />
                            )}
                            <form onSubmit={(e) => { e.preventDefault(); handleAdminLogin(); }} className={cn("space-y-6 transition-all duration-300", isAdminLoading && "opacity-60 scale-[0.98]")}>
                                <div className="space-y-3 animate-fade-in auth-delay-300">
                                    <Label htmlFor="username" className="flex items-center gap-2 text-sm font-medium">
                                        <User className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                                        用户名
                                    </Label>
                                    <div className="relative group">
                                        <Input
                                            id="username"
                                            name="username"
                                            type="text"
                                            autoComplete="username"
                                            placeholder="请输入用户名"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            onKeyDown={handleKeyPress}
                                            disabled={isAdminLoading}
                                            className="h-12 bg-white/50 dark:bg-white/5 border-gray-300 dark:border-slate-700 focus:border-rose-500 dark:focus:border-rose-400 focus:ring-2 focus:ring-rose-500/20 focus:outline-none transition-all duration-200"
                                        />
                                        <div className="absolute inset-0 rounded-md bg-gradient-to-r from-rose-500/0 via-rose-500/10 to-rose-600/0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                                    </div>
                                </div>

                                <div className="space-y-3 animate-fade-in auth-delay-350">
                                    <Label htmlFor="password" className="flex items-center gap-2 text-sm font-medium">
                                        <Lock className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                                        管理员密码
                                    </Label>
                                    <div className="relative group">
                                        <Input
                                            id="password"
                                            name="password"
                                            type={showPassword ? 'text' : 'password'}
                                            autoComplete="current-password"
                                            placeholder="请输入管理员密码"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            onKeyDown={handleKeyPress}
                                            disabled={isAdminLoading}
                                            className="h-12 pr-12 bg-white/50 dark:bg-white/5 border-gray-300 dark:border-slate-700 focus:border-rose-500 dark:focus:border-rose-400 focus:ring-2 focus:ring-rose-500/20 focus:outline-none transition-all duration-200"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 transition-colors duration-200 z-10"
                                            tabIndex={-1}
                                        >
                                            {showPassword ? (
                                                <EyeOff className="w-5 h-5" />
                                            ) : (
                                                <Eye className="w-5 h-5" />
                                            )}
                                        </button>
                                        <div className="absolute inset-0 rounded-md bg-gradient-to-r from-rose-500/0 via-rose-500/10 to-rose-600/0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                                    </div>
                                </div>

                                {/* 记住我复选框 */}
                                <div className="flex items-center space-x-2 animate-fade-in auth-delay-380">
                                    <input
                                        type="checkbox"
                                        id="rememberMe"
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                        className="w-4 h-4 text-rose-600 bg-white/50 dark:bg-white/5 border-gray-300 dark:border-slate-700 rounded focus:ring-2 focus:ring-rose-500/20 transition-all duration-200"
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
                                        disabled={isAdminLoading || !username.trim() || !password.trim()}
                                        className="w-full h-12 bg-gradient-to-r from-rose-600 via-rose-500 to-rose-700 hover:from-rose-700 hover:via-rose-600 hover:to-rose-800 text-white font-medium shadow-lg hover:shadow-2xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none relative overflow-hidden group"
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
