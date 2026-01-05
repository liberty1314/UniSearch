import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { AuthService } from '@/services/authService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Key, Sparkles } from 'lucide-react';

/**
 * 用户登录页面组件
 * 
 * 提供 API Key 登录方式
 */
const Login: React.FC = () => {
    // 路由导航
    const navigate = useNavigate();

    // 认证状态管理
    const { setApiKey } = useAuthStore();

    // 用户登录表单状态
    const [apiKey, setApiKeyInput] = useState('');
    const [isUserLoading, setIsUserLoading] = useState(false);

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
     * 验证 API Key 格式
     * @param key - API Key 字符串
     * @returns 是否符合格式要求
     */
    const validateApiKeyFormat = (key: string): boolean => {
        // API Key 格式：sk- + 40位十六进制字符
        const apiKeyRegex = /^sk-[0-9a-f]{40}$/i;
        return apiKeyRegex.test(key);
    };

    /**
     * 处理用户登录（API Key）
     */
    const handleUserLogin = async () => {
        // 验证输入
        if (!apiKey.trim()) {
            toast.error('请输入 API Key');
            return;
        }

        // 验证格式
        if (!validateApiKeyFormat(apiKey.trim())) {
            toast.error('API Key 格式不正确，应为 sk- 开头的 40 位十六进制字符');
            return;
        }

        setIsUserLoading(true);

        try {
            // 验证 API Key 是否有效
            const isValid = await AuthService.validateApiKey(apiKey.trim());

            if (isValid) {
                // 保存到状态管理
                setApiKey(apiKey.trim());
                toast.success('登录成功！');

                // 跳转到首页
                navigate('/');
            } else {
                toast.error('API Key 无效或已过期');
            }
        } catch (error: any) {
            console.error('用户登录失败:', error);

            // 根据错误类型显示不同提示
            if (error.response?.status === 401) {
                toast.error('API Key 无效或已过期');
            } else if (error.response?.status === 429) {
                toast.error('请求过于频繁，请稍后再试');
            } else {
                toast.error('登录失败：' + (error.message || '未知错误'));
            }
        } finally {
            setIsUserLoading(false);
        }
    };

    /**
     * 处理 Enter 键提交
     */
    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleUserLogin();
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

        handleUserLogin();
    };

    return (
        <div className="fixed inset-0 top-16 flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 overflow-hidden">
            {/* 背景装饰 - 动态渐变球 */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/30 to-purple-400/30 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-green-400/30 to-blue-400/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>

                {/* 浮动粒子 */}
                {particles.map((particle) => (
                    <div
                        key={particle.id}
                        className="absolute w-2 h-2 bg-blue-400/30 rounded-full"
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
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-2xl blur-2xl opacity-20 animate-pulse"></div>

                <Card className="relative backdrop-blur-xl bg-white/90 dark:bg-gray-800/90 border-gray-200/50 dark:border-gray-700/50 shadow-2xl animate-slide-up">
                    <CardHeader className="space-y-3 pb-6">
                        {/* Logo 或图标 */}
                        <div className="flex justify-center mb-2">
                            <div className="relative group">
                                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                                    <Key className="w-8 h-8 text-white animate-pulse" />
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity duration-500"></div>
                                {/* 闪烁星星 */}
                                <Sparkles className="absolute -top-2 -right-2 w-5 h-5 text-yellow-400 animate-ping" />
                                <Sparkles className="absolute -bottom-2 -left-2 w-4 h-4 text-blue-400 animate-ping" style={{ animationDelay: '0.5s' }} />
                            </div>
                        </div>

                        <CardTitle className="text-3xl font-bold text-center bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent animate-gradient">
                            欢迎回来
                        </CardTitle>
                        <CardDescription className="text-center text-base animate-fade-in" style={{ animationDelay: '0.2s' }}>
                            使用 API Key 登录 UniSearch
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        <div className="space-y-3 animate-fade-in" style={{ animationDelay: '0.3s' }}>
                            <Label htmlFor="apiKey" className="flex items-center gap-2 text-sm font-medium">
                                <Key className="w-4 h-4 text-blue-500 animate-bounce" style={{ animationDuration: '2s' }} />
                                API Key
                            </Label>
                            <div className="relative group">
                                <Input
                                    id="apiKey"
                                    type="text"
                                    placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                    value={apiKey}
                                    onChange={(e) => setApiKeyInput(e.target.value)}
                                    onKeyDown={handleKeyPress}
                                    disabled={isUserLoading}
                                    className="font-mono text-sm h-12 bg-white/50 dark:bg-gray-900/50 border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all duration-200"
                                />
                                <div className="absolute inset-0 rounded-md bg-gradient-to-r from-blue-500/0 via-blue-500/10 to-purple-500/0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                                {/* 输入框光标效果 */}
                                {apiKey && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="animate-fade-in" style={{ animationDelay: '0.4s' }}>
                            <Button
                                onClick={handleButtonClick}
                                disabled={isUserLoading || !apiKey.trim()}
                                className="w-full h-12 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-white font-medium shadow-lg hover:shadow-2xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none relative overflow-hidden group"
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
                                    {isUserLoading ? (
                                        <span className="flex items-center gap-2">
                                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            验证中...
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            登录
                                            <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                            </svg>
                                        </span>
                                    )}
                                </span>
                            </Button>
                        </div>
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

export default Login;
