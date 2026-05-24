import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, ArrowRight, User, LogOut, LayoutDashboard, Flame, House, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { MobileMenu } from '@/components/MobileMenu';
import { AnimatedThemeToggler } from '@/components/ui/animated-theme-toggler';
import { useAuthStore } from '@/stores/authStore';
import { useAnnouncementStore } from '@/stores/announcementStore';
import { useAdminStore } from '@/stores/adminStore';
import { AnnouncementPanel } from './AnnouncementPanel';
import { AuthService } from '@/services/authService';
import { toast } from 'sonner';
import { IoNotificationsOutline } from 'react-icons/io5';
import {
  BLUE_CYAN_HOVER_SURFACE,
  BLUE_CYAN_HOVER_TEXT,
  BLUE_CYAN_TEXT_GRADIENT_WITH_DARK,
} from '@/lib/brandTheme';
import { buildAdminUrl } from '@/lib/adminRoute';

interface NavbarProps {
  className?: string;
}

const Navbar: React.FC<NavbarProps> = ({ className }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAnnouncementPanelOpen, setIsAnnouncementPanelOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Admin Sidebar State
  const { toggleMobileSidebar } = useAdminStore();
  const isAdminPage = location.pathname.startsWith('/admin');

  // Auth State
  const { isAuthenticated, isAdmin, logout, username } = useAuthStore();

  // Announcement State
  const { getUnreadAnnouncements } = useAnnouncementStore();
  const unreadAnnouncements = getUnreadAnnouncements();

  const [isScrolled, setIsScrolled] = useState(false);

  // Handle scroll
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);


  // Close user menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isUserMenuOpen]);

  const handleLogout = async () => {
    const { refreshToken } = useAuthStore.getState();
    if (refreshToken) {
      try {
        await AuthService.revokeRefreshToken(refreshToken);
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    logout();
    toast.success('已退出登录');
    navigate('/');
    setIsUserMenuOpen(false);
  };

  const navItems: Array<{ path: string; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    {
      path: '/',
      label: '首页',
      icon: House,
    },
    {
      path: '/search',
      label: '搜索',
      icon: Search,
    },
    {
      path: '/hot',
      label: '热门榜单',
      icon: Flame,
    },
  ];
  return (
    <>
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className={cn(
          'fixed top-0 left-0 right-0 z-40 transition-all duration-300 ease-in-out',
          isScrolled
            ? 'h-16 glass shadow-[0_16px_36px_rgba(14,165,233,0.12)] backdrop-blur-xl'
            : 'h-20 bg-transparent',
          className
        )}
      >
        <div className="container mx-auto grid h-full grid-cols-[auto_1fr_auto] items-center gap-4 px-4">
          {/* Logo Area */}
          <Link
            to="/"
            className="flex items-center gap-3 group relative overflow-hidden rounded-2xl px-3 py-2 transition-all duration-300 hover:bg-white/10"
          >
            <div className="relative w-10 h-10 flex items-center justify-center">
              <img
                src="/Uni.png"
                alt="UniSearch"
                className="w-8 h-8 object-contain relative z-10 transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110"
              />
            </div>
            <span className={`${BLUE_CYAN_TEXT_GRADIENT_WITH_DARK} text-xl font-bold group-hover:tracking-wide transition-all duration-300`}>
              UniSearch
            </span>
          </Link>

          {/* Desktop Primary Navigation */}
          <div className="hidden md:flex items-center justify-center">
            <nav
              aria-label="主导航"
              className="flex items-center gap-1 rounded-full border border-white/60 bg-white/55 px-2 py-1.5 shadow-[0_12px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/25"
            >
              {navItems.map((item) => {
                const Icon = item.icon;
                const isSearchRoute = item.path === '/search' && location.pathname.startsWith('/search');
                const isActive = item.path === '/' ? location.pathname === '/' : isSearchRoute || location.pathname === item.path;

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-cyan-50 text-cyan-700 shadow-[0_10px_24px_rgba(34,211,238,0.14)] dark:bg-cyan-500/10 dark:text-cyan-200'
                        : `text-gray-700 hover:bg-gray-100/80 dark:text-gray-200 dark:hover:bg-white/10 ${BLUE_CYAN_HOVER_TEXT}`,
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Actions */}
          <div className="flex items-center justify-end gap-2 md:gap-3">
            {/* Announcements */}
            {isAuthenticated && (
              <button
                onClick={() => setIsAnnouncementPanelOpen(true)}
                className={cn(
                  "relative rounded-xl p-2 text-gray-600 transition-all duration-300 hover:bg-gray-100/50 dark:text-slate-300 dark:hover:bg-white/10",
                  unreadAnnouncements.length === 0 && "opacity-75"
                )}
                aria-label="通知中心"
              >
                <IoNotificationsOutline className="w-5 h-5" />
                {unreadAnnouncements.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex items-center justify-center min-w-[8px] h-[8px] rounded-full bg-red-500 shadow-lg animate-pulse" />
                )}
              </button>
            )}

            {/* Theme Toggle */}
            <AnimatedThemeToggler className="relative rounded-xl p-2 text-gray-600 transition-all duration-300 hover:bg-gray-100/50 dark:text-slate-300 dark:hover:bg-white/10" />

            <div className="hidden md:flex items-center">
              {isAuthenticated ? (
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className={cn(
                      "flex items-center gap-2 rounded-2xl border px-3 py-1.5 transition-all duration-200 outline-none focus:outline-none",
                      isUserMenuOpen
                        ? "border-cyan-200/60 bg-white/70 text-blue-600 dark:border-cyan-300/20 dark:bg-white/10 dark:text-cyan-300"
                        : "border-transparent bg-white/35 text-gray-700 hover:bg-white/60 dark:bg-white/5 dark:text-gray-200 dark:hover:bg-white/10"
                    )}
                  >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                      {username ? username[0].toUpperCase() : <User className="w-4 h-4" />}
                    </div>
                    <span className="text-sm font-medium pr-1 max-w-[100px] truncate">{username}</span>
                  </button>

                  <AnimatePresence>
                    {isUserMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 mt-2 w-56 rounded-xl glass-panel shadow-xl overflow-hidden z-50"
                      >
                        <div className="px-4 py-3 border-b border-gray-100 dark:border-white/10">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                            {username || 'User'}
                          </p>
                          <div className="mt-1 flex items-center gap-2">
                            <p className="text-xs text-gray-500 dark:text-slate-400">
                              {isAdmin ? '管理员' : '普通用户'}
                            </p>
                          </div>
                        </div>

                        <div className="p-1">
                          {isAdmin ? (
                            <Link
                              to={buildAdminUrl()}
                              onClick={() => setIsUserMenuOpen(false)}
                              className={`flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 ${BLUE_CYAN_HOVER_SURFACE} ${BLUE_CYAN_HOVER_TEXT} rounded-lg transition-colors`}
                            >
                              <LayoutDashboard className="w-4 h-4" />
                              <span>后台管理</span>
                            </Link>
                          ) : (
                            <Link
                              to="/account"
                              onClick={() => setIsUserMenuOpen(false)}
                              className={`flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 ${BLUE_CYAN_HOVER_SURFACE} ${BLUE_CYAN_HOVER_TEXT} rounded-lg transition-colors`}
                            >
                              <User className="w-4 h-4" />
                              <span>个人中心</span>
                            </Link>
                          )}
                        </div>

                        <div className="border-t border-gray-100 dark:border-white/10 p-1">
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <LogOut className="w-4 h-4" />
                            <span>退出登录</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Link
                    to="/login"
                    className={`group flex items-center gap-2 rounded-full border border-slate-200/60 bg-white/70 px-4 py-2 text-sm font-medium text-gray-700 transition-all duration-300 backdrop-blur-sm hover:border-cyan-300 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-gray-200 dark:hover:bg-white/10 ${BLUE_CYAN_HOVER_TEXT}`}
                  >
                    <span>登录</span>
                    <ArrowRight className="w-4 h-4 ml-0.5 group-hover:translate-x-0.5 transition-transform duration-300" />
                  </Link>
                </motion.div>
              )}
            </div>

            {/* Mobile Menu Toggle */}
            <div className="md:hidden">
              <button
                onClick={() => isAdminPage ? toggleMobileSidebar() : setIsMobileMenuOpen(true)}
                className="p-2 text-gray-600 dark:text-slate-300 hover:bg-gray-100/50 dark:hover:bg-white/10 rounded-xl transition-colors"
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        navItems={navItems}
      />

      {/* Announcement Panel */}
      <AnnouncementPanel
        open={isAnnouncementPanelOpen}
        onOpenChange={setIsAnnouncementPanelOpen}
      />
    </>
  );
};

export default Navbar;
