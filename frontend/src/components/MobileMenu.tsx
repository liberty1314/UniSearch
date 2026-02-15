import React from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
    IoCloseOutline,
    IoSettingsOutline,
    IoLogOutOutline,
    IoKeyOutline,
    IoPersonCircleOutline,
    IoLogInOutline
} from 'react-icons/io5';
import { useAuthStore } from '@/stores/authStore';
import { AuthService } from '@/services/authService';
import { toast } from 'sonner';
import { AnimatedThemeToggler } from '@/components/magicui/animated-theme-toggler';

interface MobileMenuProps {
    isOpen: boolean;
    onClose: () => void;
    navItems: Array<{ path: string; label: string; icon: any }>;
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
                            <span className="font-bold text-lg text-gray-900 dark:text-white bg-gradient-to-r from-nebula-600 to-cosmic-500 bg-clip-text text-transparent">菜单</span>
                            <button
                                onClick={onClose}
                                className="p-2 -mr-2 text-gray-500 hover:text-gray-900 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                                <IoCloseOutline className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-6">
                            {/* User Info Section */}
                            {isAuthenticated ? (
                                <div className="flex items-center gap-3 p-3 bg-white/50 dark:bg-gray-800/50 rounded-xl border border-white/20 dark:border-white/10">
                                    <div className="p-2 bg-white dark:bg-gray-700 rounded-full shadow-sm">
                                        <IoPersonCircleOutline className="w-8 h-8 text-gray-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 dark:text-white truncate">
                                            {username}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {isAdmin ? '管理员' : '普通用户'}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <Link
                                    to="/login"
                                    onClick={onClose}
                                    className="flex items-center justify-center gap-2 w-full p-3 bg-gradient-to-r from-nebula-600 to-cosmic-500 text-white rounded-xl font-medium shadow-nebula hover:shadow-nebula-hover transition-all active:scale-95"
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
                                            className="flex items-center gap-3 p-3 text-gray-600 dark:text-gray-400 hover:text-apple-blue dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl transition-colors"
                                        >
                                            <Icon className="w-5 h-5" />
                                            <span className="font-medium">{item.label}</span>
                                        </Link>
                                    );
                                })}
                            </div>

                            {/* Settings Links */}
                            {isAuthenticated && (
                                <div className="space-y-1 pt-4 border-t border-gray-100 dark:border-gray-800">
                                    <div className="px-3 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                        设置
                                    </div>

                                    {isAdmin ? (
                                        <Link
                                            to="/admin"
                                            onClick={onClose}
                                            className="flex items-center gap-3 p-3 text-gray-600 dark:text-gray-400 hover:text-apple-blue dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl transition-colors"
                                        >
                                            <IoSettingsOutline className="w-5 h-5" />
                                            <span className="font-medium">后台管理</span>
                                        </Link>
                                    ) : (
                                        <Link
                                            to="/settings/apikey"
                                            onClick={onClose}
                                            className="flex items-center gap-3 p-3 text-gray-600 dark:text-gray-400 hover:text-apple-blue dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl transition-colors"
                                        >
                                            <IoKeyOutline className="w-5 h-5" />
                                            <span className="font-medium">API Key 设置</span>
                                        </Link>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer Actions */}
                        <div className="p-4 border-t border-white/10 dark:border-white/5 space-y-4">
                            {/* Theme Toggler */}
                            <div className="flex items-center justify-between px-3">
                                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">深色模式</span>
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
