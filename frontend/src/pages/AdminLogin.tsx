import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { AuthService } from '@/services/authService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Lock, Shield, User } from 'lucide-react';
import AuthBackground from '@/components/auth/AuthBackground';
import AuthCardShell from '@/components/auth/AuthCardShell';
import { authVisualPresets } from '@/components/auth/authVisualPresets';
import { useAuthParticles } from '@/components/auth/useAuthParticles';
import { toStyleVars } from '@/lib/styleVars';

/**
 * 管理员登录页面组件
 * 
 * 提供管理员密码登录方式
 */
const AdminLogin: React.FC = () => {
    // 路由导航
    const navigate = useNavigate();

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
    const [buttonRipples, setButtonRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);

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
        } catch (error: any) {
            console.error('管理员登录失败:', error);

            // 根据错误类型显示不同提示
            if (error.response?.status === 401) {
                toast.error('用户名或密码错误，请重试');
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
    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleAdminLogin();
        }
    };

    /**
     * 处理按钮点击涟漪效果
     */
    const handleButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        const button = e.currentTarget;
        const rect = button.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const newRipple = { id: Date.now(), x, y };
        setButtonRipples((prev) => [...prev, newRipple]);

        // 1秒后移除涟漪
        setTimeout(() => {
            setButtonRipples((prev) => prev.filter((ripple) => ripple.id !== newRipple.id));
        }, 1000);

        handleAdminLogin();
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 pt-16 overflow-hidden relative">
            <AuthBackground preset={authVisualPresets.adminLogin} particles={particles} />

            {/* 登录卡片 */}
            <AuthCardShell glowClassName={authVisualPresets.adminLogin.cardGlowGradientClass}>
                <Card className="relative glass-panel shadow-2xl animate-slide-up border-nebula-200 dark:border-nebula-800">
                    <CardHeader className="space-y-3 pb-6">
                        {/* Logo 或图标 */}
                        <div className="flex justify-center mb-2">
                            <div className="relative group">
                                <div className="w-16 h-16 bg-gradient-to-br from-nebula-500 to-cosmic-600 rounded-2xl flex items-center justify-center shadow-lg transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                                    <Lock className="w-8 h-8 text-white animate-pulse" />
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-br from-nebula-500 to-cosmic-600 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity duration-500"></div>
                                {/* 闪烁盾牌 */}
                                <Shield className="absolute -top-2 -right-2 w-5 h-5 text-yellow-400 animate-ping" />
                                <Shield className="absolute -bottom-2 -left-2 w-4 h-4 text-nebula-400 animate-ping auth-delay-500" />
                            </div>
                        </div>

                        <CardTitle className="text-3xl font-bold text-center bg-gradient-to-r from-nebula-600 via-cosmic-600 to-purple-600 bg-clip-text text-transparent animate-auth-gradient">
                            管理员登录
                        </CardTitle>
                        <CardDescription className="text-center text-base animate-fade-in auth-delay-200">
                            使用管理员密码访问后台系统
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        <form onSubmit={(e) => { e.preventDefault(); handleAdminLogin(); }} className="space-y-6">
                            <div className="space-y-3 animate-fade-in auth-delay-300">
                                <Label htmlFor="username" className="flex items-center gap-2 text-sm font-medium">
                                    <User className="w-4 h-4 text-nebula-500 animate-bounce auth-duration-2000" />
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
                                        className="h-12 bg-white/50 dark:bg-gray-900/50 border-gray-300 dark:border-gray-600 focus:border-nebula-500 dark:focus:border-nebula-400 focus:ring-2 focus:ring-nebula-500/20 focus:outline-none transition-all duration-200"
                                    />
                                    <div className="absolute inset-0 rounded-md bg-gradient-to-r from-nebula-500/0 via-nebula-500/10 to-cosmic-500/0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                                    {/* 输入框光标效果 */}
                                    {username && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-3 animate-fade-in auth-delay-350">
                                <Label htmlFor="password" className="flex items-center gap-2 text-sm font-medium">
                                    <Lock className="w-4 h-4 text-nebula-500 animate-bounce auth-duration-2000 auth-delay-100" />
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
                                        className="h-12 pr-12 bg-white/50 dark:bg-gray-900/50 border-gray-300 dark:border-gray-600 focus:border-nebula-500 dark:focus:border-nebula-400 focus:ring-2 focus:ring-nebula-500/20 focus:outline-none transition-all duration-200"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-nebula-500 dark:text-gray-400 dark:hover:text-nebula-400 transition-colors duration-200 z-10"
                                        tabIndex={-1}
                                    >
                                        {showPassword ? (
                                            <EyeOff className="w-5 h-5" />
                                        ) : (
                                            <Eye className="w-5 h-5" />
                                        )}
                                    </button>
                                    <div className="absolute inset-0 rounded-md bg-gradient-to-r from-nebula-500/0 via-nebula-500/10 to-cosmic-500/0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                                    {/* 输入框光标效果 */}
                                    {password && (
                                        <div className="absolute right-12 top-1/2 -translate-y-1/2">
                                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 记住我复选框 */}
                            <div className="flex items-center space-x-2 animate-fade-in auth-delay-380">
                                <input
                                    type="checkbox"
                                    id="rememberMe"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="w-4 h-4 text-nebula-500 bg-white/50 dark:bg-gray-900/50 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-nebula-500/20 transition-all duration-200"
                                />
                                <Label
                                    htmlFor="rememberMe"
                                    className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer select-none"
                                >
                                    记住我（30天内自动登录）
                                </Label>
                            </div>

                            <div className="animate-fade-in auth-delay-400">
                                <Button
                                    type="submit"
                                    onClick={handleButtonClick}
                                    disabled={isAdminLoading || !username.trim() || !password.trim()}
                                    className="w-full h-12 bg-gradient-to-r from-nebula-500 via-cosmic-500 to-purple-500 hover:from-nebula-600 hover:via-cosmic-600 hover:to-purple-600 text-white font-medium shadow-lg hover:shadow-2xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none relative overflow-hidden group"
                                >
                                    {/* 按钮光泽效果 */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>

                                    {/* 涟漪效果 */}
                                    {buttonRipples.map((ripple) => (
                                        <span
                                            key={ripple.id}
                                            className="absolute bg-white/30 rounded-full animate-auth-ripple auth-ripple pointer-events-none"
                                            style={toStyleVars({
                                                '--auth-ripple-left': `${ripple.x}px`,
                                                '--auth-ripple-top': `${ripple.y}px`,
                                                '--auth-ripple-size': '0px',
                                            })}
                                        />
                                    ))}

                                    {/* 脉冲波效果 */}
                                    <div className="absolute inset-0 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                        <div className="absolute inset-0 rounded-md bg-white/10 animate-ping auth-duration-1500"></div>
                                    </div>

                                    {/* 边框光效 */}
                                    <div className="absolute inset-0 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-white to-transparent animate-auth-border-flow"></div>
                                        <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-white to-transparent animate-auth-border-flow auth-delay-500"></div>
                                    </div>

                                    <span className="relative z-10">
                                        {isAdminLoading ? (
                                            <span className="flex items-center gap-2">
                                                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                登录中...
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-2">
                                                登录后台
                                                <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                                </svg>
                                            </span>
                                        )}
                                    </span>
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </AuthCardShell>
        </div>
    );
};

export default AdminLogin;
