import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  IoMenuOutline,
  IoKeyOutline,
  IoSettingsOutline,
  IoLogInOutline,
  IoLogOutOutline,
  IoNotificationsOutline,
  IoPersonCircleOutline,
  IoChevronDownOutline
} from 'react-icons/io5';
import { cn } from '@/lib/utils';
import IconButton from './IconButton';
import { MobileMenu } from '@/components/MobileMenu';
import { AnimatedThemeToggler } from '@/components/magicui/animated-theme-toggler';
import { useAuthStore } from '@/stores/authStore';
import { useAnnouncementStore } from '@/stores/announcementStore';
import { useAdminStore } from '@/stores/adminStore';
import { AnnouncementPanel } from './AnnouncementPanel';
import { AuthService } from '@/services/authService';
import { toast } from 'sonner';

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

  // 获取认证状态
  const { isAuthenticated, isAdmin, logout, username } = useAuthStore();

  // 获取公告状态
  const { getUnreadAnnouncements } = useAnnouncementStore();
  const unreadAnnouncements = getUnreadAnnouncements();

  // Theme toggling moved to AnimatedThemeToggler component

  // 点击外部关闭用户菜单
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

  const navItems = [
    // 示例：{ path: '/about', label: '关于', icon: IoInformationCircleOutline }
  ];

  const isActivePath = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  /**
   * 处理登出
   */
  const handleLogout = async () => {
    // 如果有刷新令牌，先撤销
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
    navigate('/');
    setIsUserMenuOpen(false);
  };

  return (
    <>
      <nav className={cn(
        'sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 shadow-apple',
        className
      )}>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">

              {/* Logo */}
              <Link
                to="/"
                className="flex items-center gap-3 text-xl font-bold text-gray-900 dark:text-white hover:text-apple-blue dark:hover:text-apple-blue transition-all duration-300 transform hover:scale-105 group"
                title="点击返回首页"
              >
                <div className="relative">
                  <img
                    src="/Uni.png?v=20250908"
                    alt="UniSearch Logo"
                    className="w-8 h-8 transition-transform duration-300 group-hover:rotate-12"
                  />
                  {/* Logo悬停时的光晕效果 */}
                  <div className="absolute inset-0 bg-apple-blue/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm scale-110"></div>
                </div>
                <span className="hidden sm:block font-extrabold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent group-hover:from-apple-blue group-hover:to-apple-blue/80 transition-all duration-300">
                  UniSearch
                </span>
              </Link>
            </div>

            {/* 桌面端导航 */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = isActivePath(item.path);

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-apple-blue text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                    )}
                    title={item.description}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* 右侧操作 - Desktop & Tablet */}
            <div className="flex items-center gap-2">
              {/* 公告按钮 */}
              {isAuthenticated && (
                <button
                  onClick={() => setIsAnnouncementPanelOpen(true)}
                  className="relative p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
                  title={unreadAnnouncements.length > 0 ? `${unreadAnnouncements.length} 条未读公告` : '查看公告'}
                >
                  <IoNotificationsOutline className="w-5 h-5" />
                  {unreadAnnouncements.length > 0 && (
                    <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full shadow-lg animate-pulse">
                      {unreadAnnouncements.length > 99 ? '99+' : unreadAnnouncements.length}
                    </span>
                  )}
                </button>
              )}

              {/* Desktop Auth & Theme */}
              <div className="hidden md:flex items-center gap-2">
                {isAuthenticated ? (
                  <div className="relative" ref={userMenuRef}>
                    <button
                      onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                      className={cn(
                        'flex items-center gap-1.5 px-2 py-1.5 rounded-xl text-sm font-medium transition-all duration-200',
                        isUserMenuOpen
                          ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                      )}
                    >
                      <IoPersonCircleOutline className="w-6 h-6" />
                      <IoChevronDownOutline className={cn(
                        'w-3 h-3 transition-transform duration-200',
                        isUserMenuOpen && 'rotate-180'
                      )} />
                    </button>

                    {isUserMenuOpen && (
                      <div
                        className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl border border-gray-200/60 dark:border-gray-700/60 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl shadow-lg shadow-black/10 dark:shadow-black/30 ring-1 ring-black/5 dark:ring-white/5 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                      >
                        <div className="px-4 py-3 border-b border-gray-200/60 dark:border-gray-700/60">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                            {username || '用户'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {isAdmin ? '管理员' : '普通用户'}
                          </p>
                        </div>

                        <div className="py-1.5">
                          {isAdmin ? (
                            <Link
                              to="/admin"
                              onClick={() => setIsUserMenuOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-gray-700/50 transition-colors"
                            >
                              <IoSettingsOutline className="w-4 h-4" />
                              <span>后台管理</span>
                            </Link>
                          ) : (
                            <Link
                              to="/settings/apikey"
                              onClick={() => setIsUserMenuOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-gray-700/50 transition-colors"
                            >
                              <IoKeyOutline className="w-4 h-4" />
                              <span>API Key 设置</span>
                            </Link>
                          )}
                        </div>

                        <div className="border-t border-gray-200/60 dark:border-gray-700/60 py-1.5">
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 dark:text-red-400 hover:bg-red-50/80 dark:hover:bg-red-500/10 transition-colors"
                          >
                            <IoLogOutOutline className="w-4 h-4" />
                            <span>退出登录</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    to="/login"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-apple-blue hover:text-apple-blue/80 hover:bg-apple-blue/10 transition-all duration-200"
                  >
                    <IoLogInOutline className="w-5 h-5" />
                    <span>登录</span>
                  </Link>
                )}
                <AnimatedThemeToggler />
              </div>

              {/* Mobile Menu Toggle - Visible only on mobile */}
              <div className="md:hidden flex items-center">
                <IconButton
                  onClick={() => {
                    if (isAdminPage) {
                      toggleMobileSidebar();
                    } else {
                      setIsMobileMenuOpen(true);
                    }
                  }}
                  className="text-gray-600 dark:text-gray-300"
                  aria-label={isAdminPage ? "打开侧边栏" : "打开菜单"}
                >
                  <IoMenuOutline className="w-6 h-6" />
                </IconButton>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        navItems={navItems as any[]}
      />

      {/* 公告面板 */}
      <AnnouncementPanel
        open={isAnnouncementPanelOpen}
        onOpenChange={setIsAnnouncementPanelOpen}
      />
    </>
  );
};

export default Navbar;