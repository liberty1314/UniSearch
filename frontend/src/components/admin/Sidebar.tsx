import React from 'react';
import { Activity, X, Users, Settings, Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { useAdminStore } from '@/stores/adminStore';
import {
    BLUE_CYAN_ACTIVE_SHADOW,
    BLUE_CYAN_GRADIENT,
    BLUE_CYAN_HOVER_TEXT,
} from '@/lib/brandTheme';
import type { AdminView } from '@/lib/adminRoute';

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
    /** 移动端是否打开 (已弃用，改用 store) */
    isMobileOpen?: boolean;
    /** 移动端切换回调 (已弃用，改用 store) */
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
}) => {
    const { isMobileSidebarOpen, setMobileSidebarOpen } = useAdminStore();
    const isMobileOpen = isMobileSidebarOpen;
    const onMobileToggle = () => setMobileSidebarOpen(!isMobileSidebarOpen);
    /**
     * 导航项配置
     */
    const navItems: NavItem[] = [
        {
            id: 'system_info',
            label: '系统监控',
            icon: <Activity className="w-5 h-5" />,
        },
        {
            id: 'user_management',
            label: '用户管理',
            icon: <Users className="w-5 h-5" />,
        },
        {
            id: 'announcement_management',
            label: '公告管理',
            icon: <Megaphone className="w-5 h-5" />,
        },
        {
            id: 'system_settings',
            label: '系统设置',
            icon: <Settings className="w-5 h-5" />,
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
                    fixed top-20 lg:top-0 left-0
                    h-[calc(100vh-6rem)] lg:h-full
                    w-64 lg:w-auto
                    transition-transform duration-300 ease-in-out z-40 lg:z-auto
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
                            glass-panel
                            rounded-3xl
                            border border-white/20 dark:border-white/10
                            shadow-2xl
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
                                <div className="absolute inset-0 bg-cyan-500/20 rounded-full opacity-0 hover:opacity-100 transition-opacity duration-300 blur-sm scale-110" />
                            </motion.div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                    UniSearch
                                </h2>
                                <p className="text-xs text-gray-500 dark:text-slate-400">
                                    管理后台
                                </p>
                            </div>
                        </div>

                        {/* 分隔线 */}
                        <div className="mx-4 h-px bg-gradient-to-r from-transparent via-white/10 dark:via-white/5 to-transparent" />

                        {/* 导航列表 */}
                        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto relative">
                            {navItems.map((item) => {
                                const isActive = currentView === item.id;

                                return (
                                    <motion.button
                                        key={item.id}
                                        onClick={() => handleNavClick(item.id)}
                                        className={`
                                            relative w-full flex items-center gap-3 px-4 py-3.5 rounded-xl
                                            transition-colors duration-300
                                            ${isActive
                                                ? 'text-white font-medium'
                                                : `text-gray-600 dark:text-slate-400 ${BLUE_CYAN_HOVER_TEXT}`
                                            }
                                        `}
                                        initial={false}
                                        whileHover={!isActive ? { x: 6 } : {}}
                                        whileTap={{ scale: 0.97 }}
                                        transition={{
                                            type: "spring",
                                            stiffness: 300,
                                            damping: 20
                                        }}
                                    >
                                        {/* 激活状态背景 - 使用 layoutId 实现流畅过渡 */}
                                        {isActive && (
                                            <motion.div
                                                layoutId="activeTab"
                                                className={`absolute inset-0 ${BLUE_CYAN_GRADIENT} rounded-xl ${BLUE_CYAN_ACTIVE_SHADOW}`}
                                                transition={{
                                                    type: "spring",
                                                    stiffness: 350,
                                                    damping: 30
                                                }}
                                            />
                                        )}

                                        {/* 非激活状态悬停背景 */}
                                        {!isActive && (
                                            <motion.div
                                                className="absolute inset-0 bg-white/50 dark:bg-white/5 rounded-xl border border-white/20 dark:border-white/10"
                                                initial={{ opacity: 0 }}
                                                whileHover={{ opacity: 1 }}
                                                transition={{ duration: 0.2 }}
                                            />
                                        )}

                                        {/* 图标 */}
                                        <motion.div
                                            className="relative z-10"
                                            animate={{
                                                scale: isActive ? 1.1 : 1,
                                            }}
                                            transition={{
                                                type: "spring",
                                                stiffness: 400,
                                                damping: 25
                                            }}
                                        >
                                            {item.icon}
                                        </motion.div>

                                        {/* 文字 */}
                                        <motion.span
                                            className="relative z-10 text-sm"
                                            animate={{
                                                x: isActive ? 2 : 0,
                                            }}
                                            transition={{
                                                type: "spring",
                                                stiffness: 400,
                                                damping: 25
                                            }}
                                        >
                                            {item.label}
                                        </motion.span>
                                    </motion.button>
                                );
                            })}
                        </nav>

                        {/* 侧边栏底部信息 */}
                        <div className="flex-shrink-0 p-4 pt-2">
                            <div className="text-xs text-gray-500 dark:text-slate-400 text-center space-y-1">
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
                        bg-white dark:bg-slate-950
                        glass-panel
                        border-r border-white/20 dark:border-white/10
                        flex flex-col
                        rounded-r-3xl shadow-2xl
                    "
                >
                    {/* 侧边栏头部 */}
                    <div className="flex-shrink-0 flex items-center justify-between p-6 border-b border-white/10 dark:border-white/5">
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
                                <p className="text-xs text-gray-500 dark:text-slate-400">
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
                    <nav className="flex-1 p-4 space-y-2 overflow-y-auto relative">
                        {navItems.map((item) => {
                            const isActive = currentView === item.id;

                            return (
                                <motion.button
                                    key={item.id}
                                    onClick={() => handleNavClick(item.id)}
                                    className={`
                                        relative w-full flex items-center gap-3 px-4 py-3 rounded-xl
                                        transition-colors duration-300
                                        ${isActive
                                            ? 'text-white font-medium'
                                            : `text-gray-600 dark:text-slate-400 ${BLUE_CYAN_HOVER_TEXT}`
                                        }
                                    `}
                                    initial={false}
                                    whileTap={{ scale: 0.97 }}
                                    transition={{
                                        type: "spring",
                                        stiffness: 300,
                                        damping: 20
                                    }}
                                >
                                    {/* 激活状态背景 */}
                                    {isActive && (
                                        <motion.div
                                            layoutId="mobileActiveTab"
                                            className={`absolute inset-0 ${BLUE_CYAN_GRADIENT} rounded-xl ${BLUE_CYAN_ACTIVE_SHADOW}`}
                                            transition={{
                                                type: "spring",
                                                stiffness: 350,
                                                damping: 30
                                            }}
                                        />
                                    )}

                                    {/* 非激活状态悬停背景 */}
                                    {!isActive && (
                                        <div className="absolute inset-0 bg-white/50 dark:bg-white/5 rounded-xl opacity-0 hover:opacity-100 transition-opacity duration-200 border border-white/20 dark:border-white/10" />
                                    )}

                                    {/* 图标 */}
                                    <motion.div
                                        className="relative z-10"
                                        animate={{
                                            scale: isActive ? 1.1 : 1,
                                        }}
                                        transition={{
                                            type: "spring",
                                            stiffness: 400,
                                            damping: 25
                                        }}
                                    >
                                        {item.icon}
                                    </motion.div>

                                    {/* 文字 */}
                                    <motion.span
                                        className="relative z-10"
                                        animate={{
                                            x: isActive ? 2 : 0,
                                        }}
                                        transition={{
                                            type: "spring",
                                            stiffness: 400,
                                            damping: 25
                                        }}
                                    >
                                        {item.label}
                                    </motion.span>
                                </motion.button>
                            );
                        })}
                    </nav>

                    {/* 侧边栏底部信息 */}
                    <div className="flex-shrink-0 p-4 border-t border-white/10 dark:border-white/5">
                        <div className="text-xs text-gray-500 dark:text-slate-400 text-center">
                            <p>UniSearch v1.0.0</p>
                            <p className="mt-1">© 2026 All Rights Reserved</p>
                        </div>
                    </div>
                </motion.div>
            </aside>
        </>
    );
};
