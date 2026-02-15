import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { AuthService } from '@/services/authService';
import { SystemSettingsService } from '@/services/systemSettingsService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Lock, Sparkles, UserPlus, LogIn, Key, Eye, EyeOff } from 'lucide-react';

/**
 * 用户认证页面组件（登录/注册/API Key）
 */
const UserAuth: React.FC = () => {
    const navigate = useNavigate();
    const { setToken } = useAuthStore();

    // 系统设置状态
    const [enableUserAuth, setEnableUserAuth] = useState<boolean>(true);
    const [enableUserLogin, setEnableUserLogin] = useState<boolean>(true);
    const [enableUserSignup, setEnableUserSignup] = useState<boolean>(true);
    const [isLoadingSettings, setIsLoadingSettings] = useState<boolean>(true);

    // 从 URL 查询参数获取默认 tab（支持 ?mode=apikey）
    const [searchParams] = useState(() => new URLSearchParams(window.location.search));
    const defaultTab = searchParams.get('mode') === 'apikey' ? 'apikey' : 'login';

    // 表单状态 - 新增 'apikey' 模式
    const [activeTab, setActiveTab] = useState<'login' | 'register' | 'apikey'>(defaultTab as 'login' | 'register' | 'apikey');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // 密码可见性状态
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // 动画效果状态
    const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; delay: number; duration: number }>>([]);

    /**
     * 加载系统设置
     */
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const settings = await SystemSettingsService.getSettings();
                setEnableUserAuth(settings.enable_user_auth);
                setEnableUserLogin(settings.enable_user_login);
                setEnableUserSignup(settings.enable_user_signup);

                // 如果禁用了用户认证，强制切换到 API Key 模式
                if (!settings.enable_user_auth && activeTab !== 'apikey') {
                    setActiveTab('apikey');
                }
                // 如果启用了用户认证，但当前 tab 不可用，切换到可用的 tab
                else if (settings.enable_user_auth) {
                    if (activeTab === 'login' && !settings.enable_user_login) {
                        // 登录不可用，切换到注册或 API Key
                        setActiveTab(settings.enable_user_signup ? 'register' : 'apikey');
                    } else if (activeTab === 'register' && !settings.enable_user_signup) {
                        // 注册不可用，切换到登录或 API Key
                        setActiveTab(settings.enable_user_login ? 'login' : 'apikey');
                    }
                }
            } catch (error) {
                console.error('加载系统设置失败:', error);
                // 默认启用所有功能
                setEnableUserAuth(true);
                setEnableUserLogin(true);
                setEnableUserSignup(true);
            } finally {
                setIsLoadingSettings(false);
            }
        };

        loadSettings();
    }, []);

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
     * 验证用户名格式
     */
    const validateUsername = (username: string): boolean => {
        if (username.length < 3 || username.length > 32) {
            toast.error('用户名长度必须在3-32字符之间');
            return false;
        }
        return true;
    };

    /**
     * 验证密码格式
     */
    const validatePassword = (password: string): boolean => {
        if (password.length < 6 || password.length > 64) {
            toast.error('密码长度必须在6-64字符之间');
            return false;
        }
        return true;
    };

    /**
     * 验证 API Key 格式
     */
    const validateApiKeyFormat = (key: string): boolean => {
        // API Key 格式：sk- + 40位十六进制字符
        const apiKeyRegex = /^sk-[0-9a-f]{40}$/i;
        return apiKeyRegex.test(key);
    };

    /**
     * 处理用户注册
     */
    const handleRegister = async () => {
        // 验证输入
        if (!username.trim() || !password.trim()) {
            toast.error('请填写完整的注册信息');
            return;
        }

        if (!validateUsername(username.trim())) {
            return;
        }

        if (!validatePassword(password)) {
            return;
        }

        if (password !== confirmPassword) {
            toast.error('两次输入的密码不一致');
            return;
        }

        setIsLoading(true);

        try {
            const response = await AuthService.register(username.trim(), password);
            toast.success('注册成功！请登录');

            // 切换到登录标签
            setActiveTab('login');
            setPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            console.error('注册失败:', error);

            if (error.response?.status === 400) {
                toast.error(error.response?.data?.error || '注册失败：参数错误');
            } else if (error.response?.data?.error) {
                toast.error(error.response.data.error);
            } else {
                toast.error('注册失败：' + (error.message || '未知错误'));
            }
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * 处理用户登录
     */
    const handleLogin = async () => {
        // 验证输入
        if (!username.trim() || !password.trim()) {
            toast.error('请输入用户名和密码');
            return;
        }

        setIsLoading(true);

        try {
            const response = await AuthService.userLogin(username.trim(), password, rememberMe);

            if (response && response.access_token) {
                // 保存 Token 和可选的 Refresh Token 到状态管理（普通用户登录，isAdmin = false）
                setToken(
                    response.access_token,
                    response.username,
                    false, // 普通用户登录，明确设置为 false
                    undefined,
                    response.refresh_token || null
                );

                toast.success('登录成功，欢迎访问 UniSearch！');

                // 跳转到首页
                navigate('/');
            } else {
                toast.error('登录失败：服务器未返回有效令牌');
            }
        } catch (error: any) {
            console.error('登录失败:', error);

            if (error.response?.status === 401) {
                toast.error('用户名或密码错误');
            } else if (error.response?.status === 429) {
                toast.error('请求过于频繁，请稍后再试');
            } else if (error.response?.data?.error) {
                toast.error(error.response.data.error);
            } else {
                toast.error('登录失败：' + (error.message || '未知错误'));
            }
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * 处理 API Key 登录
     */
    const handleApiKeyLogin = async () => {
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

        setIsLoading(true);

        try {
            const response = await AuthService.loginWithApiKeyAndRemember(apiKey.trim(), rememberMe);

            if (response && response.access_token) {
                // 保存 Token、API Key 和可选的 Refresh Token 到状态管理（API Key 登录，isAdmin = false）
                setToken(
                    response.access_token,
                    response.username || 'user',
                    false, // API Key 登录，明确设置为 false
                    apiKey.trim(),
                    response.refresh_token || null
                );

                toast.success('登录成功，欢迎访问 UniSearch！');

                // 跳转到首页
                navigate('/');
            } else {
                toast.error('登录失败：服务器未返回有效令牌');
            }
        } catch (error: any) {
            console.error('API Key 登录失败:', error);

            if (error.response?.status === 401) {
                toast.error('API Key 无效或已过期');
            } else if (error.response?.status === 429) {
                toast.error('请求过于频繁，请稍后再试');
            } else if (error.response?.data?.error) {
                toast.error(error.response.data.error);
            } else {
                toast.error('登录失败：' + (error.message || '未知错误'));
            }
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * 处理 Enter 键提交
     */
    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            if (activeTab === 'login') {
                handleLogin();
            } else if (activeTab === 'register') {
                handleRegister();
            } else if (activeTab === 'apikey') {
                handleApiKeyLogin();
            }
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-8 pt-20 overflow-y-auto relative">
            {/* 背景装饰 */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-nebula-400/30 to-cosmic-400/30 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-green-400/30 to-blue-400/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-nebula-400/20 to-cosmic-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>

                {/* 浮动粒子 */}
                {particles.map((particle) => (
                    <div
                        key={particle.id}
                        className="absolute w-2 h-2 bg-nebula-400/30 rounded-full"
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
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

            {/* 认证卡片 */}
            <div className="relative z-10 w-full max-w-md my-auto">
                <div className="absolute -inset-1 bg-gradient-to-r from-nebula-500 via-cosmic-500 to-purple-500 rounded-2xl blur-2xl opacity-20 animate-pulse"></div>

                <Card className="relative glass-panel shadow-2xl animate-slide-up border-nebula-200 dark:border-nebula-800">
                    <CardHeader className="space-y-3 pb-6">
                        <div className="flex justify-center mb-2">
                            <div className="relative group">
                                <div className="w-16 h-16 bg-gradient-to-br from-nebula-500 to-cosmic-600 rounded-2xl flex items-center justify-center shadow-lg transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                                    {activeTab === 'apikey' ? (
                                        <Key className="w-8 h-8 text-white animate-pulse" />
                                    ) : (
                                        <User className="w-8 h-8 text-white animate-pulse" />
                                    )}
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-br from-nebula-500 to-cosmic-600 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity duration-500"></div>
                                <Sparkles className="absolute -top-2 -right-2 w-5 h-5 text-yellow-400 animate-ping" />
                                <Sparkles className="absolute -bottom-2 -left-2 w-4 h-4 text-nebula-400 animate-ping" style={{ animationDelay: '0.5s' }} />
                            </div>
                        </div>

                        <CardTitle className="text-3xl font-bold text-center bg-gradient-to-r from-nebula-600 via-cosmic-600 to-purple-600 bg-clip-text text-transparent animate-gradient">
                            欢迎回来
                        </CardTitle>
                        <CardDescription className="text-center text-base animate-fade-in" style={{ animationDelay: '0.2s' }}>
                            {activeTab === 'login' && '登录您的 UniSearch 账户'}
                            {activeTab === 'register' && '注册新的 UniSearch 账户'}
                            {activeTab === 'apikey' && '使用 API Key 登录 UniSearch'}
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        {isLoadingSettings ? (
                            <div className="text-center py-12">
                                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                <p className="mt-4 text-slate-500 dark:text-slate-400">加载中...</p>
                            </div>
                        ) : enableUserAuth ? (
                            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'login' | 'register' | 'apikey')} className="w-full">
                                {/* 根据系统设置动态显示 Tab */}
                                <TabsList className={`grid w-full ${enableUserLogin && enableUserSignup ? 'grid-cols-3' : 'grid-cols-2'
                                    } mb-6 h-auto p-1 bg-white/50 dark:bg-gray-800/50 border border-white/20 dark:border-white/10`}>
                                    {enableUserLogin && (
                                        <TabsTrigger
                                            value="login"
                                            className="flex items-center gap-1.5 text-xs sm:text-sm py-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm transition-all duration-300"
                                        >
                                            <LogIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                            <span className="hidden sm:inline">登录</span>
                                        </TabsTrigger>
                                    )}
                                    {enableUserSignup && (
                                        <TabsTrigger
                                            value="register"
                                            className="flex items-center gap-1.5 text-xs sm:text-sm py-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm transition-all duration-300"
                                        >
                                            <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                            <span className="hidden sm:inline">注册</span>
                                        </TabsTrigger>
                                    )}
                                    <TabsTrigger
                                        value="apikey"
                                        className="flex items-center gap-1.5 text-xs sm:text-sm py-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm transition-all duration-300"
                                    >
                                        <Key className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                        API Key
                                    </TabsTrigger>
                                </TabsList>

                                {enableUserLogin && (
                                    <TabsContent value="login" className="space-y-4 animate-fade-in-up">
                                        <div className="space-y-3">
                                            <Label htmlFor="login-username" className="flex items-center gap-2 text-sm font-medium">
                                                <User className="w-4 h-4 text-blue-500" />
                                                用户名
                                            </Label>
                                            <Input
                                                id="login-username"
                                                type="text"
                                                placeholder="请输入用户名"
                                                value={username}
                                                onChange={(e) => setUsername(e.target.value)}
                                                onKeyDown={handleKeyPress}
                                                disabled={isLoading}
                                                className="h-12 bg-white/50 dark:bg-gray-900/50 transition-all duration-200"
                                            />
                                        </div>

                                        <div className="space-y-3">
                                            <Label htmlFor="login-password" className="flex items-center gap-2 text-sm font-medium">
                                                <Lock className="w-4 h-4 text-blue-500" />
                                                密码
                                            </Label>
                                            <div className="relative">
                                                <Input
                                                    id="login-password"
                                                    type={showPassword ? "text" : "password"}
                                                    placeholder="请输入密码"
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    onKeyDown={handleKeyPress}
                                                    disabled={isLoading}
                                                    className="h-12 bg-white/50 dark:bg-gray-900/50 transition-all duration-200 pr-10"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                                    tabIndex={-1}
                                                >
                                                    {showPassword ? (
                                                        <EyeOff className="w-4 h-4" />
                                                    ) : (
                                                        <Eye className="w-4 h-4" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                id="remember-me"
                                                checked={rememberMe}
                                                onChange={(e) => setRememberMe(e.target.checked)}
                                                className="w-4 h-4 text-nebula-500 bg-white/50 dark:bg-gray-900/50 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-nebula-500/20 transition-all duration-200"
                                            />
                                            <Label htmlFor="remember-me" className="text-sm font-medium cursor-pointer select-none">
                                                记住我（30天内自动登录）
                                            </Label>
                                        </div>

                                        <Button
                                            onClick={handleLogin}
                                            disabled={isLoading || !username.trim() || !password.trim()}
                                            className="w-full h-12 bg-gradient-to-r from-nebula-500 via-cosmic-500 to-purple-500 hover:from-nebula-600 hover:via-cosmic-600 hover:to-purple-600 text-white font-medium shadow-lg hover:shadow-2xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                                        >
                                            {isLoading ? (
                                                <span className="flex items-center gap-2">
                                                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    登录中...
                                                </span>
                                            ) : (
                                                '登录'
                                            )}
                                        </Button>
                                    </TabsContent>
                                )}

                                {enableUserSignup && (
                                    <TabsContent value="register" className="space-y-4 animate-fade-in-up">
                                        <div className="space-y-3">
                                            <Label htmlFor="register-username" className="flex items-center gap-2 text-sm font-medium">
                                                <User className="w-4 h-4 text-blue-500" />
                                                用户名
                                            </Label>
                                            <Input
                                                id="register-username"
                                                type="text"
                                                placeholder="3-32个字符"
                                                value={username}
                                                onChange={(e) => setUsername(e.target.value)}
                                                onKeyDown={handleKeyPress}
                                                disabled={isLoading}
                                                className="h-12 bg-white/50 dark:bg-gray-900/50 transition-all duration-200"
                                            />
                                        </div>

                                        <div className="space-y-3">
                                            <Label htmlFor="register-password" className="flex items-center gap-2 text-sm font-medium">
                                                <Lock className="w-4 h-4 text-blue-500" />
                                                密码
                                            </Label>
                                            <div className="relative">
                                                <Input
                                                    id="register-password"
                                                    type={showPassword ? "text" : "password"}
                                                    placeholder="6-64个字符"
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    onKeyDown={handleKeyPress}
                                                    disabled={isLoading}
                                                    className="h-12 bg-white/50 dark:bg-gray-900/50 transition-all duration-200 pr-10"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                                    tabIndex={-1}
                                                >
                                                    {showPassword ? (
                                                        <EyeOff className="w-4 h-4" />
                                                    ) : (
                                                        <Eye className="w-4 h-4" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <Label htmlFor="confirm-password" className="flex items-center gap-2 text-sm font-medium">
                                                <Lock className="w-4 h-4 text-blue-500" />
                                                确认密码
                                            </Label>
                                            <div className="relative">
                                                <Input
                                                    id="confirm-password"
                                                    type={showConfirmPassword ? "text" : "password"}
                                                    placeholder="再次输入密码"
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    onKeyDown={handleKeyPress}
                                                    disabled={isLoading}
                                                    className="h-12 bg-white/50 dark:bg-gray-900/50 transition-all duration-200 pr-10"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                                    tabIndex={-1}
                                                >
                                                    {showConfirmPassword ? (
                                                        <EyeOff className="w-4 h-4" />
                                                    ) : (
                                                        <Eye className="w-4 h-4" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        <Button
                                            onClick={handleRegister}
                                            disabled={isLoading || !username.trim() || !password.trim() || !confirmPassword.trim()}
                                            className="w-full h-12 bg-gradient-to-r from-emerald-500 via-nebula-500 to-cosmic-500 hover:from-emerald-600 hover:via-nebula-600 hover:to-cosmic-600 text-white font-medium shadow-lg hover:shadow-2xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                                        >
                                            {isLoading ? (
                                                <span className="flex items-center gap-2">
                                                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    注册中...
                                                </span>
                                            ) : (
                                                '注册'
                                            )}
                                        </Button>
                                    </TabsContent>
                                )}

                                {/* API Key 登录 Tab */}
                                <TabsContent value="apikey" className="space-y-4 animate-fade-in-up">
                                    <div className="space-y-3">
                                        <Label htmlFor="apikey-input" className="flex items-center gap-2 text-sm font-medium">
                                            <Key className="w-4 h-4 text-blue-500 animate-bounce" style={{ animationDuration: '2s' }} />
                                            API Key
                                        </Label>
                                        <div className="relative group">
                                            <Input
                                                id="apikey-input"
                                                type="text"
                                                placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                                value={apiKey}
                                                onChange={(e) => setApiKey(e.target.value)}
                                                onKeyDown={handleKeyPress}
                                                disabled={isLoading}
                                                className="font-mono text-sm h-12 bg-white/50 dark:bg-gray-900/50 border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all duration-200"
                                            />
                                            <div className="absolute inset-0 rounded-md bg-gradient-to-r from-blue-500/0 via-blue-500/10 to-purple-500/0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                                            {apiKey && (
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            id="apikey-remember-me"
                                            checked={rememberMe}
                                            onChange={(e) => setRememberMe(e.target.checked)}
                                            className="w-4 h-4 text-blue-500 bg-white/50 dark:bg-gray-900/50 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                                        />
                                        <Label htmlFor="apikey-remember-me" className="text-sm font-medium cursor-pointer select-none">
                                            记住我（30天内自动登录）
                                        </Label>
                                    </div>

                                    <Button
                                        onClick={handleApiKeyLogin}
                                        disabled={isLoading || !apiKey.trim()}
                                        className="w-full h-12 bg-gradient-to-r from-nebula-500 via-cosmic-500 to-purple-500 hover:from-nebula-600 hover:via-cosmic-600 hover:to-purple-600 text-white font-medium shadow-lg hover:shadow-2xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 relative overflow-hidden group"
                                    >
                                        {/* 按钮光泽效果 */}
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>

                                        <span className="relative z-10">
                                            {isLoading ? (
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
                                </TabsContent>
                            </Tabs>
                        ) : (
                            // 仅显示 API Key 登录
                            <div className="space-y-6 animate-fade-in-up">
                                <div className="space-y-3">
                                    <Label htmlFor="apikey-only" className="flex items-center gap-2 text-sm font-medium">
                                        <Key className="w-4 h-4 text-blue-500 animate-bounce" style={{ animationDuration: '2s' }} />
                                        API Key
                                    </Label>
                                    <div className="relative group">
                                        <Input
                                            id="apikey-only"
                                            type="text"
                                            placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                            value={apiKey}
                                            onChange={(e) => setApiKey(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleApiKeyLogin()}
                                            disabled={isLoading}
                                            className="font-mono text-sm h-12 bg-white/50 dark:bg-gray-900/50 border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all duration-200"
                                        />
                                        <div className="absolute inset-0 rounded-md bg-gradient-to-r from-blue-500/0 via-blue-500/10 to-purple-500/0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                                        {apiKey && (
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        提示：API Key 格式为 sk- 开头的 40 位十六进制字符
                                    </p>
                                </div>

                                {/* 记住我复选框 */}
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        id="remember-apikey"
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                        className="w-4 h-4 text-blue-500 bg-white/50 dark:bg-gray-900/50 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                                    />
                                    <Label
                                        htmlFor="remember-apikey"
                                        className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer select-none"
                                    >
                                        记住我（30天内自动登录）
                                    </Label>
                                </div>

                                <Button
                                    onClick={handleApiKeyLogin}
                                    disabled={isLoading || !apiKey.trim()}
                                    className="w-full h-12 bg-gradient-to-r from-nebula-500 via-cosmic-500 to-purple-500 hover:from-nebula-600 hover:via-cosmic-600 hover:to-purple-600 text-white font-medium shadow-lg hover:shadow-2xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none relative overflow-hidden group"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
                                    <span className="relative z-10">
                                        {isLoading ? (
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
                        )}
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
                
                @keyframes fade-in-up {
                    0% {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    100% {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                .animate-gradient {
                    background-size: 200% auto;
                    animation: gradient 3s ease infinite;
                }

                .animate-fade-in-up {
                    animation: fade-in-up 0.4s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

export default UserAuth;
