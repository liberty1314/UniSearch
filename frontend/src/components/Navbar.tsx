import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  IoMenuOutline,
  IoCloseOutline,
  IoLogoGithub,
  IoHeartOutline,
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
import { AnimatedThemeToggler } from '@/components/magicui/animated-theme-toggler';
import { useAuthStore } from '@/stores/authStore';
import { useAnnouncementStore } from '@/stores/announcementStore';
import { AnnouncementPanel } from './AnnouncementPanel';
import { AuthService } from '@/services/authService';
import { toast } from 'sonner';

interface NavbarProps {
  className?: string;
}

const Navbar: React.FC<NavbarProps> = ({ className }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAnnouncementPanelOpen, setIsAnnouncementPanelOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

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
    // 导航菜单项（当前为空）
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
    setIsMobileMenuOpen(false);
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

            {/* 右侧操作 */}
            <div className="flex items-center gap-2">
              {/* 公告按钮 - 只在已登录时显示 */}
              {isAuthenticated && (
                <button
                  onClick={() => setIsAnnouncementPanelOpen(true)}
                  className="relative p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
                  title={unreadAnnouncements.length > 0 ? `${unreadAnnouncements.length} 条未读公告` : '查看公告'}
                >
                  <IoNotificationsOutline className="w-5 h-5" />
                  {/* 未读数量徽章 */}
                  {unreadAnnouncements.length > 0 && (
                    <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full shadow-lg animate-pulse">
                      {unreadAnnouncements.length > 99 ? '99+' : unreadAnnouncements.length}
                    </span>
                  )}
                </button>
              )}

              {/* 认证相关按钮 */}
              {isAuthenticated ? (
                <>
                  {/* 用户菜单 - 桌面端 */}
                  <div className="hidden md:block relative" ref={userMenuRef}>
                    <button
                      onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                      className={cn(
                        'flex items-center gap-1.5 px-2 py-1.5 rounded-xl text-sm font-medium transition-all duration-200',
                        isUserMenuOpen
                          ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                      )}
                      title="用户菜单"
                    >
                      <IoPersonCircleOutline className="w-6 h-6" />
                      <IoChevronDownOutline className={cn(
                        'w-3 h-3 transition-transform duration-200',
                        isUserMenuOpen && 'rotate-180'
                      )} />
                    </button>

                    {/* 下拉菜单 */}
                    {isUserMenuOpen && (
                      <div
                        className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl border border-gray-200/60 dark:border-gray-700/60 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl shadow-lg shadow-black/10 dark:shadow-black/30 ring-1 ring-black/5 dark:ring-white/5 overflow-hidden"
                        style={{ animation: 'userMenuFadeIn 0.15s ease-out' }}
                      >
                        {/* 用户信息 */}
                        <div className="px-4 py-3 border-b border-gray-200/60 dark:border-gray-700/60">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                            {username || '用户'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {isAdmin ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-gradient-to-r from-amber-500/15 to-orange-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                管理员
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-gradient-to-r from-blue-500/15 to-cyan-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                普通用户
                              </span>
                            )}
                          </p>
                        </div>

                        {/* 菜单项 */}
                        <div className="py-1.5">
                          {isAdmin ? (
                            <Link
                              to="/admin"
                              onClick={() => setIsUserMenuOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-gray-700/50 transition-colors duration-150"
                            >
                              <IoSettingsOutline className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                              <span>后台管理</span>
                            </Link>
                          ) : (
                            <Link
                              to="/settings/apikey"
                              onClick={() => setIsUserMenuOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-gray-700/50 transition-colors duration-150"
                            >
                              <IoKeyOutline className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                              <span>API Key 设置</span>
                            </Link>
                          )}
                        </div>

                        {/* 退出登录 */}
                        <div className="border-t border-gray-200/60 dark:border-gray-700/60 py-1.5">
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 dark:text-red-400 hover:bg-red-50/80 dark:hover:bg-red-500/10 transition-colors duration-150"
                          >
                            <IoLogOutOutline className="w-4 h-4" />
                            <span>退出登录</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 普通用户移动端：显示 API Key 设置图标 */}
                  {!isAdmin && (
                    <Link
                      to="/settings/apikey"
                      className="md:hidden p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
                      title="API Key 设置"
                    >
                      <IoKeyOutline className="w-5 h-5" />
                    </Link>
                  )}
                </>
              ) : (
                /* 未登录：显示登录/注册入口 */
                <Link
                  to="/login"
                  className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-apple-blue hover:text-apple-blue/80 hover:bg-apple-blue/10 transition-all duration-200"
                  title="登录/注册"
                >
                  <IoLogInOutline className="w-4 h-4" />
                  <span>登录/注册</span>
                </Link>
              )}

              {/* 主题切换 */}
              <AnimatedThemeToggler />
              {/* 移动端菜单按钮 */}
              <IconButton
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label={isMobileMenuOpen ? '关闭菜单' : '打开菜单'}
                className="md:hidden"
              >
                {isMobileMenuOpen ? (
                  <IoCloseOutline className="w-5 h-5" />
                ) : (
                  <IoMenuOutline className="w-5 h-5" />
                )}
              </IconButton>
            </div>
          </div>

          {/* 移动端菜单 */}
          {isMobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-gray-200 dark:border-gray-700">
              <div className="space-y-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = isActivePath(item.path);

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200',
                        isActive
                          ? 'bg-apple-blue text-white shadow-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      <div>
                        <div>{item.label}</div>
                        <div className="text-xs opacity-75">{item.description}</div>
                      </div>
                    </Link>
                  );
                })}

                {/* 移动端认证相关链接 */}
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  {isAuthenticated ? (
                    <>
                      {/* 管理员：后台管理 */}
                      {isAdmin && (
                        <Link
                          to="/admin"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                          <IoSettingsOutline className="w-5 h-5" />
                          <div>
                            <div>后台管理</div>
                            <div className="text-xs opacity-75">管理 API Keys 和系统</div>
                          </div>
                        </Link>
                      )}

                      {/* 普通用户：API Key 设置 */}
                      {!isAdmin && (
                        <Link
                          to="/settings/apikey"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                          <IoKeyOutline className="w-5 h-5" />
                          <div>
                            <div>API Key 设置</div>
                            <div className="text-xs opacity-75">管理您的 API Key</div>
                          </div>
                        </Link>
                      )}

                      {/* 登出 */}
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        <IoLogOutOutline className="w-5 h-5" />
                        <div>
                          <div>退出登录</div>
                          <div className="text-xs opacity-75">安全退出系统</div>
                        </div>
                      </button>
                    </>
                  ) : (
                    /* 未登录：登录/注册入口 */
                    <Link
                      to="/login"
                      className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-apple-blue hover:text-apple-blue/80 hover:bg-apple-blue/10 transition-colors"
                    >
                      <IoLogInOutline className="w-5 h-5" />
                      <div>
                        <div>登录/注册</div>
                        <div className="text-xs opacity-75">创建账户或使用 API Key</div>
                      </div>
                    </Link>
                  )}
                </div>

                {/* 移动端额外链接 */}
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <a
                    href="https://github.com/your-repo/unisearch"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <IoLogoGithub className="w-5 h-5" />
                    <div>
                      <div>GitHub</div>
                      <div className="text-xs opacity-75">查看源代码</div>
                    </div>
                  </a>

                  <a
                    href="https://github.com/sponsors/your-username"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <IoHeartOutline className="w-5 h-5" />
                    <div>
                      <div>赞助</div>
                      <div className="text-xs opacity-75">支持项目发展</div>
                    </div>
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* 公告面板 - 放在 nav 外部，因为 nav 的 backdrop-blur 会创建新的层叠上下文，
          导致内部 fixed 定位的弹窗无法相对视口居中 */}
      <AnnouncementPanel
        open={isAnnouncementPanelOpen}
        onOpenChange={setIsAnnouncementPanelOpen}
      />
    </>
  );
};

export default Navbar;