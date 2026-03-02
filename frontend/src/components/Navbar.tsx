import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, ArrowRight, User, LogOut, LayoutDashboard, Key } from 'lucide-react';
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
    // Add nav items if needed
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
            ? 'h-16 glass shadow-nebula backdrop-blur-nebula'
            : 'h-20 bg-transparent',
          className
        )}
      >
        <div className="container mx-auto px-4 h-full flex items-center justify-between">
          {/* Logo Area */}
          <Link
            to="/"
            className="flex items-center gap-3 group relative overflow-hidden rounded-xl px-2 py-1 transition-all duration-300 hover:bg-white/10"
          >
            <div className="relative w-10 h-10 flex items-center justify-center">
              <img
                src="/Uni.png"
                alt="UniSearch"
                className="w-8 h-8 object-contain relative z-10 transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110"
              />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-nebula-600 via-purple-600 to-cosmic-600 dark:from-nebula-400 dark:via-purple-400 dark:to-cosmic-400 bg-clip-text text-transparent group-hover:tracking-wide transition-all duration-300">
              UniSearch
            </span>
          </Link>

          {/* Right Actions */}
          <div className="flex items-center gap-2 md:gap-4">
            {/* Announcements */}
            {isAuthenticated && (
              <button
                onClick={() => setIsAnnouncementPanelOpen(true)}
                className="relative p-2 rounded-xl text-gray-600 dark:text-slate-300 hover:bg-gray-100/50 dark:hover:bg-white/10 transition-all duration-300"
              >
                <IoNotificationsOutline className="w-5 h-5" />
                {unreadAnnouncements.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex items-center justify-center min-w-[8px] h-[8px] rounded-full bg-red-500 shadow-lg animate-pulse" />
                )}
              </button>
            )}

            {/* Theme Toggle */}
            <AnimatedThemeToggler className="relative p-2 rounded-xl text-gray-600 dark:text-slate-300 hover:bg-gray-100/50 dark:hover:bg-white/10 transition-all duration-300" />

            {/* Desktop Menu Items */}
            <div className="hidden md:flex items-center gap-3">
              {isAuthenticated ? (
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-200 outline-none focus:outline-none",
                      isUserMenuOpen
                        ? "bg-white/20 border-transparent text-nebula-600 dark:text-nebula-300"
                        : "border-transparent hover:bg-white/10 hover:border-white/20 text-gray-700 dark:text-gray-200"
                    )}
                  >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-nebula-400 to-cosmic-400 flex items-center justify-center text-white font-bold text-sm shadow-sm">
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
                          <p className="text-xs text-gray-500 dark:text-slate-400">
                            {isAdmin ? '管理员' : '普通用户'}
                          </p>
                        </div>

                        <div className="p-1">
                          {isAdmin ? (
                            <Link
                              to="/admin"
                              onClick={() => setIsUserMenuOpen(false)}
                              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-nebula-50 dark:hover:bg-nebula-900/30 hover:text-nebula-600 dark:hover:text-nebula-300 rounded-lg transition-colors"
                            >
                              <LayoutDashboard className="w-4 h-4" />
                              <span>后台管理</span>
                            </Link>
                          ) : (
                            <Link
                              to="/settings/apikey"
                              onClick={() => setIsUserMenuOpen(false)}
                              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-nebula-50 dark:hover:bg-nebula-900/30 hover:text-nebula-600 dark:hover:text-nebula-300 rounded-lg transition-colors"
                            >
                              <Key className="w-4 h-4" />
                              <span>API Key 设置</span>
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
                    className="group flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-nebula-600 dark:hover:text-nebula-400 bg-gray-100/50 dark:bg-white/5 hover:bg-gray-200/50 dark:hover:bg-white/10 transition-all duration-300 backdrop-blur-sm"
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
