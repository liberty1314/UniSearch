import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { AuthService } from '@/services/authService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Lock, Shield, User } from 'lucide-react';

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
    const [isAdminLoading, setIsAdminLoading] = useState(false);

    // 动态效果状态
    const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; delay: number; duration: number }>>([]);
    const [buttonRipples, setButtonRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);

    /**
     * 生成随机粒子
     */
    useEffect(() => {
        const newParticles = Array.from({ length: 20 }, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            delay: Math.random() * 5,
            duration: 10 + Math.random() * 10,
        }));
        setParticles(newParticles);
    }, []);

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
            // 调用管理员登录接口
            const response = await AuthService.adminLogin(username, password);

            // 保存 Token 到状态管理
            setToken(response.token, 'admin');
            toast.success('管理员登录成功！');

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
        <div className="fixed inset-0 top-16 flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 overflow-hidden">
            {/* 背景装饰 - 动态渐变球（管理员主题：橙色/红色） */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-orange-400/30 to-red-400/30 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-red-400/30 to-pink-400/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-orange-400/20 to-red-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>

                {/* 浮动粒子 */}
                {particles.map((particle) => (
                    <div
                        key={particle.id}
                        className="absolute w-2 h-2 bg-orange-400/30 rounded-full"
                        style={{
                            left: `${particle.x}%`,
                            top: `${particle.y}%`,
                            animation: `float ${particle.duration}s ease-in-out infinite`,
                            animationDelay: `${particle.delay}s`,
                        }}
                    />
                ))}
            </div>

            {/* 网格背景 */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

            {/* 登录卡片 */}
            <div className="relative z-10 w-full max-w-md">
                {/* 卡片光晕效果 */}
                <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 rounded-2xl blur-2xl opacity-20 animate-pulse"></div>

                <Card className="relative backdrop-blur-xl bg-white/90 dark:bg-gray-800/90 border-gray-200/50 dark:border-gray-700/50 shadow-2xl animate-slide-up">
                    <CardHeader className="space-y-3 pb-6">
                        {/* Logo 或图标 */}
                        <div className="flex justify-center mb-2">
                            <div className="relative group">
                                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                                    <Lock className="w-8 h-8 text-white animate-pulse" />
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity duration-500"></div>
                                {/* 闪烁盾牌 */}
                                <Shield className="absolute -top-2 -right-2 w-5 h-5 text-yellow-400 animate-ping" />
                                <Shield className="absolute -bottom-2 -left-2 w-4 h-4 text-orange-400 animate-ping" style={{ animationDelay: '0.5s' }} />
                            </div>
                        </div>

                        <CardTitle className="text-3xl font-bold text-center bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 bg-clip-text text-transparent animate-gradient">
                            管理员登录
                        </CardTitle>
                        <CardDescription className="text-center text-base animate-fade-in" style={{ animationDelay: '0.2s' }}>
                            使用管理员密码访问后台系统
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        <form onSubmit={(e) => { e.preventDefault(); handleAdminLogin(); }} className="space-y-6">
                            <div className="space-y-3 animate-fade-in" style={{ animationDelay: '0.3s' }}>
                                <Label htmlFor="username" className="flex items-center gap-2 text-sm font-medium">
                                    <User className="w-4 h-4 text-orange-500 animate-bounce" style={{ animationDuration: '2s' }} />
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
                                        className="h-12 bg-white/50 dark:bg-gray-900/50 border-gray-300 dark:border-gray-600 focus:border-orange-500 dark:focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition-all duration-200"
                                    />
                                    <div className="absolute inset-0 rounded-md bg-gradient-to-r from-orange-500/0 via-orange-500/10 to-red-500/0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                                    {/* 输入框光标效果 */}
                                    {username && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-3 animate-fade-in" style={{ animationDelay: '0.35s' }}>
                                <Label htmlFor="password" className="flex items-center gap-2 text-sm font-medium">
                                    <Lock className="w-4 h-4 text-orange-500 animate-bounce" style={{ animationDuration: '2s', animationDelay: '0.1s' }} />
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
                                        className="h-12 pr-12 bg-white/50 dark:bg-gray-900/50 border-gray-300 dark:border-gray-600 focus:border-orange-500 dark:focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition-all duration-200"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-orange-500 dark:text-gray-400 dark:hover:text-orange-400 transition-colors duration-200 z-10"
                                        tabIndex={-1}
                                    >
                                        {showPassword ? (
                                            <EyeOff className="w-5 h-5" />
                                        ) : (
                                            <Eye className="w-5 h-5" />
                                        )}
                                    </button>
                                    <div className="absolute inset-0 rounded-md bg-gradient-to-r from-orange-500/0 via-orange-500/10 to-red-500/0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                                    {/* 输入框光标效果 */}
                                    {password && (
                                        <div className="absolute right-12 top-1/2 -translate-y-1/2">
                                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="animate-fade-in" style={{ animationDelay: '0.4s' }}>
                                <Button
                                    type="submit"
                                    onClick={handleButtonClick}
                                    disabled={isAdminLoading || !username.trim() || !password.trim()}
                                    className="w-full h-12 bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 hover:from-orange-600 hover:via-red-600 hover:to-pink-600 text-white font-medium shadow-lg hover:shadow-2xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none relative overflow-hidden group"
                                >
                                    {/* 按钮光泽效果 */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>

                                    {/* 涟漪效果 */}
                                    {buttonRipples.map((ripple) => (
                                        <span
                                            key={ripple.id}
                                            className="absolute bg-white/30 rounded-full animate-ripple pointer-events-none"
                                            style={{
                                                left: ripple.x,
                                                top: ripple.y,
                                                width: 0,
                                                height: 0,
                                            }}
                                        />
                                    ))}

                                    {/* 脉冲波效果 */}
                                    <div className="absolute inset-0 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                        <div className="absolute inset-0 rounded-md bg-white/10 animate-ping" style={{ animationDuration: '1.5s' }}></div>
                                    </div>

                                    {/* 边框光效 */}
                                    <div className="absolute inset-0 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-white to-transparent animate-border-flow"></div>
                                        <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-white to-transparent animate-border-flow" style={{ animationDelay: '0.5s' }}></div>
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
            </div>

            {/* CSS 动画定义 */}
            <style>{`
                @keyframes float {
                    0%, 100% {
                        transform: translateY(0) translateX(0);
                    }
                    25% {
                        transform: translateY(-20px) translateX(10px);
                    }
                    50% {
                        transform: translateY(-10px) translateX(-10px);
                    }
                    75% {
                        transform: translateY(-30px) translateX(5px);
                    }
                }
                
                @keyframes gradient {
                    0%, 100% {
                        background-position: 0% 50%;
                    }
                    50% {
                        background-position: 100% 50%;
                    }
                }

                @keyframes ripple {
                    0% {
                        width: 0;
                        height: 0;
                        opacity: 0.5;
                    }
                    100% {
                        width: 500px;
                        height: 500px;
                        margin-left: -250px;
                        margin-top: -250px;
                        opacity: 0;
                    }
                }

                @keyframes border-flow {
                    0% {
                        transform: translateX(-100%);
                    }
                    100% {
                        transform: translateX(100%);
                    }
                }
                
                .animate-gradient {
                    background-size: 200% auto;
                    animation: gradient 3s ease infinite;
                }

                .animate-ripple {
                    animation: ripple 1s ease-out;
                }

                .animate-border-flow {
                    animation: border-flow 2s linear infinite;
                }
            `}</style>
        </div>
    );
};

export default AdminLogin;
