import React from 'react';
import { Activity, Gauge, Layers, Megaphone, Radio, Settings, Users, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAdminStore } from '@/stores/adminStore';
import type { AdminView } from '@/lib/adminRoute';
import {
    ADMIN_GENTLE_SPRING,
    ADMIN_PANEL_SURFACE_CLASSES,
    ADMIN_PANEL_SURFACE_HOVER_CLASSES,
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
    { id: 'plugin_observability', label: '性能监控', icon: <Gauge className="h-4 w-4" /> },
    { id: 'user_management', label: '用户管理', icon: <Users className="h-4 w-4" /> },
    { id: 'announcement_management', label: '公告管理', icon: <Megaphone className="h-4 w-4" /> },
    { id: 'system_settings', label: '系统设置', icon: <Settings className="h-4 w-4" /> },
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
            <ul className="space-y-1.5">
                {navItems.map((item) => {
                    const isActive = currentView === item.id;

                    return (
                        <li key={item.id} className="relative">
                            {isActive && (
                                <motion.div
                                    layoutId={`${layoutPrefix}-admin-sidebar-active`}
                                    className="absolute inset-0 rounded-[1.25rem] border-[0.5px] border-cyan-200/80 bg-[linear-gradient(135deg,rgba(236,254,255,0.92),rgba(255,255,255,0.76))] shadow-[0_14px_34px_rgba(14,165,233,0.12)] dark:border-cyan-300/[0.18] dark:bg-[linear-gradient(135deg,rgba(8,47,73,0.66),rgba(2,6,23,0.82))] dark:shadow-[0_14px_30px_rgba(2,6,23,0.34)]"
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
                                    'relative z-10 flex w-full items-center gap-3 rounded-[1.25rem] border border-transparent px-3.5 py-3.5 text-left shadow-none transition-colors duration-300',
                                    isActive
                                        ? 'text-blue-600 dark:text-cyan-300'
                                        : 'text-slate-600 hover:bg-white/48 hover:text-cyan-700 dark:text-slate-300 dark:hover:bg-cyan-400/[0.08] dark:hover:text-cyan-200'
                                )}
                            >
                                <span className="relative flex h-9 w-9 shrink-0 items-center justify-center">
                                    {isActive ? (
                                        <motion.div
                                            layoutId={`${layoutPrefix}-admin-sidebar-icon`}
                                            className="absolute inset-0 rounded-2xl border-[0.5px] border-cyan-200/80 bg-white shadow-[0_10px_24px_rgba(14,165,233,0.14)] dark:border-cyan-300/[0.18] dark:bg-slate-950/[0.86] dark:shadow-[0_8px_18px_rgba(34,211,238,0.10)]"
                                            transition={ADMIN_GENTLE_SPRING}
                                        />
                                    ) : (
                                        <div className="absolute inset-0 rounded-2xl border-[0.5px] border-slate-200/50 bg-white/40 shadow-sm backdrop-blur-md dark:border-cyan-300/[0.12] dark:bg-slate-950/[0.48]" />
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
                    'fixed left-0 top-20 z-40 flex h-[calc(100vh-5rem)] w-64 flex-shrink-0 transition-transform duration-300 ease-in-out lg:w-[300px]',
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
                        <div className="relative flex items-center gap-3 px-5 pb-4 pt-5">
                            <div className="pointer-events-none absolute right-6 top-4 h-20 w-20 rounded-full bg-cyan-300/15 blur-2xl" />
                            <div className="relative flex h-12 w-12 items-center justify-center rounded-[1.25rem] border-[0.5px] border-cyan-100/80 bg-white/60 shadow-[0_14px_30px_rgba(14,165,233,0.10)] backdrop-blur-xl dark:border-cyan-300/[0.14] dark:bg-slate-950/[0.48]">
                                <img
                                    src="/Uni.png?v=20250908"
                                    alt="UniSearch Logo"
                                    className="h-9 w-9 object-contain"
                                />
                            </div>
                            <div className="relative min-w-0">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-cyan-700/70 dark:text-cyan-200/80">
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
                            <div className="flex h-11 w-11 items-center justify-center rounded-[1.1rem] border-[0.5px] border-slate-200/50 bg-white/40 shadow-sm backdrop-blur-xl dark:border-cyan-300/[0.14] dark:bg-slate-950/[0.48]">
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
                                <p className="text-xs text-slate-500 dark:text-slate-300">
                                    UniSearch Workspace
                                </p>
                            </div>
                        </div>

                        {onMobileToggle && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onMobileToggle}
                                className="rounded-full border border-slate-200/50 bg-white/40 text-slate-600 hover:bg-white/60 dark:border-cyan-300/[0.14] dark:bg-slate-950/[0.48] dark:text-slate-300 dark:hover:border-cyan-300/[0.24] dark:hover:bg-cyan-400/[0.08]"
                            >
                                <X className="h-5 w-5" />
                            </Button>
                        )}
                    </div>

                    {renderNavList('mobile')}

                    <div className="border-t border-white/10 p-4 dark:border-white/5">
                        <div className="rounded-[1.35rem] border-[0.5px] border-slate-200/50 bg-white/40 px-4 py-3 text-xs text-slate-500 shadow-sm backdrop-blur-md dark:border-cyan-300/[0.14] dark:bg-slate-950/[0.48] dark:text-slate-300">
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
