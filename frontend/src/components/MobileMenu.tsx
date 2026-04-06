import React from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
    IoCloseOutline,
    IoSettingsOutline,
    IoLogOutOutline,
    IoPersonCircleOutline,
    IoLogInOutline
} from 'react-icons/io5';
import { useAuthStore } from '@/stores/authStore';
import { AuthService } from '@/services/authService';
import { toast } from 'sonner';
import { AnimatedThemeToggler } from '@/components/magicui/animated-theme-toggler';
import {
    BLUE_CYAN_GRADIENT,
    BLUE_CYAN_HOVER_TEXT,
    BLUE_CYAN_TEXT_GRADIENT,
} from '@/lib/brandTheme';
import { buildAdminUrl } from '@/lib/adminRoute';

interface MobileMenuProps {
    isOpen: boolean;
    onClose: () => void;
    navItems: Array<{ path: string; label: string; icon: React.ComponentType<{ className?: string }> }>;
}

export const MobileMenu: React.FC<MobileMenuProps> = ({ isOpen, onClose, navItems }) => {
    const navigate = useNavigate();
    const { isAuthenticated, isAdmin, username, logout } = useAuthStore();

    const handleLogout = async () => {
        const { refreshToken } = useAuthStore.getState();
        if (refreshToken) {
            try {
                await AuthService.revokeRefreshToken(refreshToken);
            } catch (error) {
                console.error('撤销刷新令牌失败:', error);
            }
        }
        logout();
        toast.success('已退出登录');
        onClose();
        navigate('/');
    };

    const menuVariants: Variants = {
        closed: {
            opacity: 0,
            x: '100%',
            transition: {
                type: 'spring',
                stiffness: 400,
                damping: 40
            }
        },
        open: {
            opacity: 1,
            x: 0,
            transition: {
                type: 'spring',
                stiffness: 400,
                damping: 40
            }
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 md:hidden"
                    />

                    {/* Menu Panel */}
                    <motion.div
                        variants={menuVariants}
                        initial="closed"
                        animate="open"
                        exit="closed"
                        className="fixed top-0 right-0 bottom-0 w-[280px] glass-panel border-l border-white/20 dark:border-white/10 shadow-2xl z-50 md:hidden flex flex-col safe-area-inset"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-white/10 dark:border-white/5">
                            <span className={`${BLUE_CYAN_TEXT_GRADIENT} font-bold text-lg`}>菜单</span>
                            <button
                                onClick={onClose}
                                className="p-2 -mr-2 text-gray-500 hover:text-gray-900 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                <IoCloseOutline className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-6">
                            {/* User Info Section */}
                            {isAuthenticated ? (
                                <div className="flex items-center gap-3 p-3 bg-white/50 dark:bg-slate-800/50 rounded-xl border border-white/20 dark:border-white/10">
                                    <div className="p-2 bg-white dark:bg-slate-700 rounded-full shadow-sm">
                                        <IoPersonCircleOutline className="w-8 h-8 text-gray-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 dark:text-white truncate">
                                            {username}
                                        </p>
                                        <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                                            {isAdmin ? '管理员' : '普通用户'}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <Link
                                    to="/login"
                                    onClick={onClose}
                                    className={`flex items-center justify-center gap-2 w-full p-3 ${BLUE_CYAN_GRADIENT} text-white rounded-xl font-medium shadow-[0_12px_30px_rgba(59,130,246,0.22)] hover:shadow-[0_18px_36px_rgba(6,182,212,0.24)] transition-all active:scale-95`}
                                >
                                    <IoLogInOutline className="w-5 h-5" />
                                    登录 / 注册
                                </Link>
                            )}

                            {/* Navigation Links */}
                            <div className="space-y-1">
                                {navItems.map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <Link
                                            key={item.path}
                                            to={item.path}
                                            onClick={onClose}
                                            className={`flex items-center gap-3 p-3 text-gray-600 dark:text-slate-400 ${BLUE_CYAN_HOVER_TEXT} hover:bg-gray-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors`}
                                        >
                                            <Icon className="w-5 h-5" />
                                            <span className="font-medium">{item.label}</span>
                                        </Link>
                                    );
                                })}
                            </div>

                            {/* Settings Links */}
                            {isAuthenticated && (
                                <div className="space-y-1 pt-4 border-t border-gray-100 dark:border-white/5">
                                    <div className="px-3 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                        设置
                                    </div>

                                    {isAdmin ? (
                                        <Link
                                            to={buildAdminUrl()}
                                            onClick={onClose}
                                            className={`flex items-center gap-3 p-3 text-gray-600 dark:text-slate-400 ${BLUE_CYAN_HOVER_TEXT} hover:bg-gray-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors`}
                                        >
                                            <IoSettingsOutline className="w-5 h-5" />
                                            <span className="font-medium">后台管理</span>
                                        </Link>
                                    ) : (
                                        <Link
                                            to="/account"
                                            onClick={onClose}
                                            className={`flex items-center gap-3 p-3 text-gray-600 dark:text-slate-400 ${BLUE_CYAN_HOVER_TEXT} hover:bg-gray-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors`}
                                        >
                                            <IoPersonCircleOutline className="w-5 h-5" />
                                            <span className="font-medium">个人中心</span>
                                        </Link>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer Actions */}
                        <div className="p-4 border-t border-white/10 dark:border-white/5 space-y-4">
                            {/* Theme Toggler */}
                            <div className="flex items-center justify-between px-3">
                                <span className="text-sm font-medium text-gray-600 dark:text-slate-400">深色模式</span>
                                <AnimatedThemeToggler />
                            </div>

                            {isAuthenticated && (
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center justify-center gap-2 w-full p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-colors font-medium border border-transparent hover:border-red-100 dark:hover:border-red-900/30"
                                >
                                    <IoLogOutOutline className="w-5 h-5" />
                                    退出登录
                                </button>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
