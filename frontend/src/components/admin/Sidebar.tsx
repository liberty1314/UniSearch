import React from 'react';
import { Activity, Layers, Megaphone, Radio, Settings, Users, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAdminStore } from '@/stores/adminStore';
import type { AdminView } from '@/lib/adminRoute';
import {
    ADMIN_GENTLE_SPRING,
    ADMIN_PANEL_SURFACE_CLASSES,
    ADMIN_PANEL_SURFACE_HOVER_CLASSES,
    ADMIN_SUBTLE_RAIL_CLASSES,
} from '@/components/admin/adminDesign';

interface NavItem {
    id: AdminView;
    label: string;
    icon: React.ReactNode;
}

interface SidebarProps {
    currentView: AdminView;
    onViewChange: (view: AdminView) => void;
    isMobileOpen?: boolean;
    onMobileToggle?: () => void;
}

const navItems: NavItem[] = [
    { id: 'system_info', label: '系统监控', icon: <Activity className="h-4 w-4" /> },
    { id: 'channel_management', label: 'Telegram 频道', icon: <Radio className="h-4 w-4" /> },
    { id: 'plugin_management', label: '插件中心', icon: <Layers className="h-4 w-4" /> },
    { id: 'user_management', label: '用户管理', icon: <Users className="h-4 w-4" /> },
    { id: 'system_settings', label: '系统设置', icon: <Settings className="h-4 w-4" /> },
    { id: 'announcement_management', label: '公告管理', icon: <Megaphone className="h-4 w-4" /> },
];

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange }) => {
    const { isMobileSidebarOpen, setMobileSidebarOpen } = useAdminStore();
    const isMobileOpen = isMobileSidebarOpen;
    const onMobileToggle = () => setMobileSidebarOpen(!isMobileSidebarOpen);

    const handleNavClick = (view: AdminView) => {
        onViewChange(view);
        if (isMobileOpen) {
            onMobileToggle();
        }
    };

    const renderNavList = (layoutPrefix: 'desktop' | 'mobile') => (
        <nav aria-label="后台模块导航" className="flex-1 overflow-y-auto px-3 pb-3 pt-2">
            <ul className="space-y-2">
                {navItems.map((item) => {
                    const isActive = currentView === item.id;

                    return (
                        <li key={item.id} className="relative">
                            {isActive && (
                                <motion.div
                                    layoutId={`${layoutPrefix}-admin-sidebar-active`}
                                    className="absolute inset-0 rounded-[1.4rem] border-[0.5px] border-slate-200/60 bg-white/70 shadow-[0_8px_24px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-slate-800/70 dark:shadow-[0_8px_24px_rgba(0,0,0,0.24)]"
                                    transition={ADMIN_GENTLE_SPRING}
                                />
                            )}

                            <motion.button
                                type="button"
                                onClick={() => handleNavClick(item.id)}
                                initial={false}
                                whileTap={{ scale: 0.98 }}
                                whileHover={isActive ? undefined : { x: 3 }}
                                transition={ADMIN_GENTLE_SPRING}
                                className={cn(
                                    'relative z-10 flex w-full items-center gap-3 rounded-[1.4rem] border border-transparent px-4 py-4 text-left shadow-none transition-colors duration-300',
                                    isActive
                                        ? 'text-blue-600 dark:text-cyan-300'
                                        : 'text-slate-600 hover:bg-slate-100/50 dark:text-slate-300 dark:hover:bg-slate-900/40'
                                )}
                            >
                                <span className="relative flex h-9 w-9 shrink-0 items-center justify-center">
                                    {isActive ? (
                                        <motion.div
                                            layoutId={`${layoutPrefix}-admin-sidebar-icon`}
                                            className="absolute inset-0 rounded-2xl border-[0.5px] border-slate-200/70 bg-white shadow-[0_4px_16px_rgba(37,99,235,0.14)] dark:border-white/10 dark:bg-slate-800 dark:shadow-[0_4px_16px_rgba(96,165,250,0.16)]"
                                            transition={ADMIN_GENTLE_SPRING}
                                        />
                                    ) : (
                                        <div className="absolute inset-0 rounded-2xl border-[0.5px] border-slate-200/50 bg-white/40 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-slate-800/40" />
                                    )}
                                    <span className="relative z-10">
                                        {item.icon}
                                    </span>
                                </span>

                                <span className="min-w-0">
                                    <span
                                        className={cn(
                                            'block text-[15px] font-semibold leading-tight tracking-tight transition-colors duration-300',
                                            isActive
                                                ? 'text-slate-800 dark:text-white'
                                                : 'text-slate-700 dark:text-slate-200'
                                        )}
                                    >
                                        {item.label}
                                    </span>
                                </span>
                            </motion.button>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );

    return (
        <>
            {isMobileOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
                    onClick={onMobileToggle}
                />
            )}

            <aside
                className={cn(
                    'fixed left-0 top-16 z-40 flex h-[calc(100vh-4rem)] w-64 flex-shrink-0 transition-transform duration-300 ease-in-out lg:w-[300px]',
                    isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                )}
            >
                <div className="hidden lg:flex lg:flex-1 lg:pl-4 lg:pr-0 lg:pt-4 lg:pb-6">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={ADMIN_GENTLE_SPRING}
                        className={cn(
                            'flex h-full w-full flex-col overflow-hidden rounded-[1.75rem]',
                            ADMIN_PANEL_SURFACE_CLASSES,
                            ADMIN_PANEL_SURFACE_HOVER_CLASSES
                        )}
                    >
                        <div className="flex items-center gap-3 px-5 pb-4 pt-5">
                            <div className="flex h-12 w-12 items-center justify-center rounded-[1.25rem] border-[0.5px] border-slate-200/50 bg-white/40 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-800/40">
                                <img
                                    src="/Uni.png?v=20250908"
                                    alt="UniSearch Logo"
                                    className="h-9 w-9 object-contain"
                                />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500/80 dark:text-slate-400/80">
                                    Admin Workspace
                                </p>
                                <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-800 dark:text-white">
                                    管理后台
                                </h2>
                            </div>
                        </div>

                        <div className="px-4">
                            <div className="h-px bg-gradient-to-r from-transparent via-white/70 to-transparent dark:via-white/15" />
                        </div>

                        {renderNavList('desktop')}

                        <div className="px-4 pb-4">
                            <div className={cn(
                                'rounded-[1.35rem] px-4 py-3 text-xs leading-5',
                                ADMIN_SUBTLE_RAIL_CLASSES,
                                'text-slate-500 dark:text-slate-400'
                            )}>
                                <p className="font-medium text-slate-700 dark:text-slate-200">
                                    UniSearch 管理工作区
                                </p>
                                <p className="mt-1">
                                    与个人中心共享同一套玻璃表面与交互节奏
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </div>

                <motion.div
                    initial={{ x: -300 }}
                    animate={{ x: isMobileOpen ? 0 : -300 }}
                    transition={{ type: 'spring', damping: 26, stiffness: 280 }}
                    className={cn(
                        'lg:hidden flex h-full w-full flex-col overflow-hidden rounded-r-3xl',
                        ADMIN_PANEL_SURFACE_CLASSES,
                        ADMIN_PANEL_SURFACE_HOVER_CLASSES
                    )}
                >
                    <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-5 dark:border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-[1.1rem] border-[0.5px] border-slate-200/50 bg-white/40 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-800/40">
                                <img
                                    src="/Uni.png?v=20250908"
                                    alt="UniSearch Logo"
                                    className="h-8 w-8 object-contain"
                                />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold tracking-tight text-slate-800 dark:text-white">
                                    管理后台
                                </h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    UniSearch Workspace
                                </p>
                            </div>
                        </div>

                        {onMobileToggle && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onMobileToggle}
                                className="rounded-full border border-slate-200/50 bg-white/40 text-slate-600 hover:bg-white/60 dark:border-white/10 dark:bg-slate-800/40 dark:text-slate-300 dark:hover:bg-slate-800/60"
                            >
                                <X className="h-5 w-5" />
                            </Button>
                        )}
                    </div>

                    {renderNavList('mobile')}

                    <div className="border-t border-white/10 p-4 dark:border-white/5">
                        <div className="rounded-[1.35rem] border-[0.5px] border-slate-200/50 bg-white/40 px-4 py-3 text-xs text-slate-500 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-slate-800/40 dark:text-slate-400">
                            <p className="font-medium text-slate-700 dark:text-slate-200">
                                管理工作区
                            </p>
                            <p className="mt-1">
                                当前视图与桌面端保持一致的设计语言
                            </p>
                        </div>
                    </div>
                </motion.div>
            </aside>
        </>
    );
};

export default Sidebar;
