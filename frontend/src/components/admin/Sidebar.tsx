import React from 'react';
import { Key, Activity, X, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

/**
 * 管理视图类型
 */
export type AdminView = 'api-keys' | 'system-info';

/**
 * 导航项配置
 */
interface NavItem {
    id: AdminView;
    label: string;
    icon: React.ReactNode;
}

/**
 * Sidebar 组件属性
 */
interface SidebarProps {
    /** 当前选中的视图 */
    currentView: AdminView;
    /** 视图切换回调 */
    onViewChange: (view: AdminView) => void;
    /** 移动端是否打开 */
    isMobileOpen?: boolean;
    /** 移动端切换回调 */
    onMobileToggle?: () => void;
}

/**
 * 侧边栏导航组件
 * 
 * 功能：
 * - 显示导航项列表
 * - 高亮当前选中项
 * - 移动端支持折叠/展开
 * - 响应式设计
 */
export const Sidebar: React.FC<SidebarProps> = ({
    currentView,
    onViewChange,
    isMobileOpen = false,
    onMobileToggle,
}) => {
    /**
     * 导航项配置
     */
    const navItems: NavItem[] = [
        {
            id: 'system-info',
            label: '系统监控',
            icon: <Activity className="w-5 h-5" />,
        },
        {
            id: 'api-keys',
            label: 'API Key 管理',
            icon: <Key className="w-5 h-5" />,
        },
    ];

    /**
     * 处理导航项点击
     */
    const handleNavClick = (view: AdminView) => {
        onViewChange(view);
        // 移动端点击后自动关闭侧边栏
        if (onMobileToggle && isMobileOpen) {
            onMobileToggle();
        }
    };

    return (
        <>
            {/* 移动端遮罩层 */}
            {isMobileOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
                    onClick={onMobileToggle}
                />
            )}

            {/* 侧边栏容器 - 桌面端固定，移动端弹出 */}
            <aside
                className={`
                    fixed top-0 left-0 h-full
                    w-64 lg:w-auto
                    transition-transform duration-300 ease-in-out z-50 lg:z-auto
                    flex flex-shrink-0
                    ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                `}
            >
                {/* 桌面端：悬浮卡片样式 */}
                <div className="hidden lg:flex lg:flex-col lg:ml-4 lg:mr-0 lg:mt-4 lg:mb-6">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3 }}
                        className="
                            w-64 h-[calc(100vh-6.5rem)]
                            bg-white/95 dark:bg-gray-800/95
                            backdrop-blur-xl
                            rounded-3xl
                            border border-gray-100 dark:border-gray-700/50
                            shadow-[0_8px_30px_rgb(0,0,0,0.04)]
                            dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)]
                            flex flex-col
                            overflow-hidden
                            sticky top-20
                        "
                    >
                        {/* 侧边栏头部 */}
                        <div className="flex-shrink-0 flex items-center gap-3 p-6 pb-4">
                            {/* Logo 图标 */}
                            <motion.div
                                whileHover={{ scale: 1.05, rotate: 12 }}
                                whileTap={{ scale: 0.95 }}
                                className="relative"
                            >
                                <img
                                    src="/Uni.png?v=20250908"
                                    alt="UniSearch Logo"
                                    className="w-11 h-11 transition-transform duration-300"
                                />
                                {/* Logo 悬停时的光晕效果 */}
                                <div className="absolute inset-0 bg-blue-500/20 rounded-full opacity-0 hover:opacity-100 transition-opacity duration-300 blur-sm scale-110" />
                            </motion.div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                    UniSearch
                                </h2>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    管理后台
                                </p>
                            </div>
                        </div>

                        {/* 分隔线 */}
                        <div className="mx-4 h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent" />

                        {/* 导航列表 */}
                        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
                            {navItems.map((item) => {
                                const isActive = currentView === item.id;

                                return (
                                    <motion.button
                                        key={item.id}
                                        onClick={() => handleNavClick(item.id)}
                                        whileHover={{ scale: isActive ? 1 : 1.02, x: isActive ? 0 : 4 }}
                                        whileTap={{ scale: 0.98 }}
                                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                                        className={`
                                            w-full flex items-center gap-3 px-4 py-3.5 rounded-xl
                                            transition-all duration-200
                                            ${isActive
                                                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30 font-medium'
                                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-gray-700/50'
                                            }
                                        `}
                                    >
                                        <motion.div
                                            animate={{ rotate: isActive ? 360 : 0 }}
                                            transition={{ duration: 0.5 }}
                                        >
                                            {item.icon}
                                        </motion.div>
                                        <span className="text-sm">{item.label}</span>
                                    </motion.button>
                                );
                            })}
                        </nav>

                        {/* 侧边栏底部信息 */}
                        <div className="flex-shrink-0 p-4 pt-2">
                            <div className="text-xs text-gray-500 dark:text-gray-400 text-center space-y-1">
                                <p className="font-medium">UniSearch v1.0.0</p>
                                <p className="text-[10px]">© 2026 All Rights Reserved</p>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* 移动端：全屏侧边栏 */}
                <motion.div
                    initial={{ x: -300 }}
                    animate={{ x: isMobileOpen ? 0 : -300 }}
                    transition={{ type: "spring", damping: 25 }}
                    className="
                        lg:hidden
                        w-64 h-full
                        bg-white dark:bg-gray-800
                        border-r border-gray-200 dark:border-gray-700
                        flex flex-col
                    "
                >
                    {/* 侧边栏头部 */}
                    <div className="flex-shrink-0 flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                            {/* Logo 图标 */}
                            <div className="relative">
                                <img
                                    src="/Uni.png?v=20250908"
                                    alt="UniSearch Logo"
                                    className="w-10 h-10 transition-transform duration-300"
                                />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                    UniSearch
                                </h2>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    管理后台
                                </p>
                            </div>
                        </div>
                        {/* 移动端关闭按钮 */}
                        {onMobileToggle && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onMobileToggle}
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        )}
                    </div>

                    {/* 导航列表 */}
                    <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                        {navItems.map((item) => {
                            const isActive = currentView === item.id;

                            return (
                                <button
                                    key={item.id}
                                    onClick={() => handleNavClick(item.id)}
                                    className={`
                                        w-full flex items-center gap-3 px-4 py-3 rounded-xl
                                        transition-all duration-200
                                        ${isActive
                                            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30 font-medium'
                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                                        }
                                    `}
                                >
                                    {item.icon}
                                    <span>{item.label}</span>
                                </button>
                            );
                        })}
                    </nav>

                    {/* 侧边栏底部信息 */}
                    <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                            <p>UniSearch v1.0.0</p>
                            <p className="mt-1">© 2026 All Rights Reserved</p>
                        </div>
                    </div>
                </motion.div>
            </aside>
        </>
    );
};
