import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Moon, Sun, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';
import { Sidebar, type AdminView } from './Sidebar';

/**
 * AdminLayout 组件属性
 */
interface AdminLayoutProps {
    /** 当前视图 */
    currentView: AdminView;
    /** 视图切换回调 */
    onViewChange: (view: AdminView) => void;
    /** 子内容 */
    children: React.ReactNode;
}

/**
 * 后台管理布局组件
 * 
 * 架构说明：
 * - 使用 Flexbox 实现固定侧边栏 + 可滚动内容区域
 * - 避免全局滚动，只在内容区域滚动
 * - 解决侧边栏与导航栏的遮挡问题
 * - 响应式设计，移动端侧边栏自动隐藏
 */
export const AdminLayout: React.FC<AdminLayoutProps> = ({
    currentView,
    onViewChange,
    children,
}) => {
    const navigate = useNavigate();
    const { logout } = useAuthStore();
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = React.useState(false);
    const [isDarkMode, setIsDarkMode] = React.useState(() => {
        return document.documentElement.classList.contains('dark');
    });

    /**
     * 处理退出登录
     */
    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    /**
     * 切换主题
     */
    const toggleTheme = () => {
        const root = document.documentElement;
        const newMode = !isDarkMode;

        if (newMode) {
            root.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            root.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }

        setIsDarkMode(newMode);
    };

    return (
        <div className="flex h-screen w-full overflow-hidden bg-gray-50 dark:bg-gray-900">
            {/* 左侧边栏 */}
            <Sidebar
                currentView={currentView}
                onViewChange={onViewChange}
                isMobileOpen={isMobileSidebarOpen}
                onMobileToggle={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            />

            {/* 右侧主内容区域 */}
            <div className="flex flex-1 flex-col overflow-hidden">
                {/* 顶部导航栏 */}
                <header className="flex-shrink-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-700 px-6 py-4">
                    <div className="flex items-center justify-between">
                        {/* 左侧：移动端菜单按钮 + 标题 */}
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
                                className="lg:hidden"
                            >
                                <Menu className="w-5 h-5" />
                            </Button>
                            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                                后台管理
                            </h1>
                        </div>

                        {/* 右侧：操作按钮 */}
                        <div className="flex items-center gap-3">
                            {/* 主题切换 */}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={toggleTheme}
                                className="rounded-full"
                                title={isDarkMode ? '切换到浅色模式' : '切换到深色模式'}
                            >
                                {isDarkMode ? (
                                    <Sun className="w-5 h-5" />
                                ) : (
                                    <Moon className="w-5 h-5" />
                                )}
                            </Button>

                            {/* 退出登录 */}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleLogout}
                                className="flex items-center gap-2"
                            >
                                <LogOut className="w-4 h-4" />
                                <span className="hidden sm:inline">退出登录</span>
                            </Button>
                        </div>
                    </div>
                </header>

                {/* 可滚动内容区域 */}
                <main className="flex-1 overflow-y-auto">
                    <div className="max-w-7xl mx-auto px-6 py-6">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};
