import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  IoMoonOutline,
  IoSunnyOutline,
  IoMenuOutline,
  IoCloseOutline,
  IoLogoGithub,
  IoHeartOutline
} from 'react-icons/io5';
import { cn } from '@/lib/utils';
import IconButton from './IconButton';

interface NavbarProps {
  className?: string;
}

const Navbar: React.FC<NavbarProps> = ({ className }) => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      return savedTheme === 'dark';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const toggleTheme = () => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDark(false);
    } else {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDark(true);
    }
  };

  const getThemeIcon = () => {
    return isDark ? <IoMoonOutline className="w-5 h-5" /> : <IoSunnyOutline className="w-5 h-5" />;
  };

  const navItems = [
    // 导航菜单项（当前为空）
  ];

  const isActivePath = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
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
                src="/Uni.png" 
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
            {/* 主题切换 */}
            <IconButton
              onClick={toggleTheme}
              aria-label={`切换到${isDark ? '浅色' : '深色'}主题`}
              title={`切换到${isDark ? '浅色' : '深色'}主题`}
            >
              {getThemeIcon()}
            </IconButton>

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
  );
};

export default Navbar;