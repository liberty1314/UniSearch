import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import Navbar from '@/components/Navbar';
import { AnnouncementProvider } from '@/components/AnnouncementProvider';
import Home from '@/pages/Home';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import ApiKeyLoginPage from '@/pages/ApiKeyLoginPage';
import AdminLogin from '@/pages/AdminLogin';
import Admin from '@/pages/Admin';
import UserApiKeySettings from '@/pages/UserApiKeySettings';
import { useAuthStore } from '@/stores/authStore';
import PageLoader from '@/components/PageLoader';
import PageTransition from '@/components/PageTransition';
import { useAutoRefreshToken } from '@/hooks/useAutoRefreshToken';

// 常量配置
const INITIAL_LOADING_DURATION = 800;
const TOAST_CONFIG = {
  position: 'top-right' as const,
  offset: '72px',
  toastOptions: {
    duration: 2000,
  },
  closeButton: true,
};

/**
 * 管理员路由保护组件
 * 只有管理员才能访问被保护的路由
 */
interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { isAdmin } = useAuthStore();

  if (!isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
};

/**
 * 用户路由保护组件
 * 只有已登录用户才能访问被保护的路由
 */
interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

/**
 * 访客路由保护组件
 * 已登录用户访问登录页时自动重定向到首页
 */
const GuestRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

/**
 * 管理员访客路由保护组件
 * 已登录管理员访问管理员登录页时自动重定向到后台
 */
const AdminGuestRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAdmin } = useAuthStore();

  if (isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
};

/**
 * 滚动到顶部组件
 * 监听路由变化，每次路由切换或页面刷新时自动滚动到页面顶部
 */
const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // 禁用浏览器的自动滚动恢复功能
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    // 强制滚动到顶部
    window.scrollTo(0, 0);
  }, [pathname]);

  // 组件挂载时也执行一次（处理页面刷新的情况）
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return null;
};

const App: React.FC = () => {
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // 启用自动刷新令牌功能
  useAutoRefreshToken();

  // 主题初始化：优先使用保存的偏好，其次使用系统设置
  React.useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const saved = localStorage.getItem('theme');

    const apply = () => {
      const shouldDark = saved ? saved === 'dark' : mediaQuery.matches;
      root.classList.toggle('dark', shouldDark);
    };

    apply();
    const handler = () => {
      if (!saved) {
        apply();
      }
    };
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // 初始加载效果
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, INITIAL_LOADING_DURATION);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {/* 页面加载动画 */}
      <PageLoader isLoading={isInitialLoading} />

      <Router>
        <div className="bg-gray-50 dark:bg-slate-950 transition-colors duration-200">
          {/* 路由变化时自动滚动到顶部 */}
          <ScrollToTop />

          <Navbar />

          {/* 系统公告提供者 - 用户登录后自动检查并显示公告 */}
          <AnnouncementProvider />

          <main className="relative min-h-screen">
            <PageTransition>
              <Routes>
                <Route path="/" element={
                  <ProtectedRoute>
                    <Home />
                  </ProtectedRoute>
                } />
                <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
                <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
                <Route path="/auth/apikey" element={<GuestRoute><ApiKeyLoginPage /></GuestRoute>} />
                <Route path="/auth" element={<Navigate to="/login" replace />} />
                <Route path="/admin/login" element={<AdminGuestRoute><AdminLogin /></AdminGuestRoute>} />
                <Route
                  path="/admin"
                  element={
                    <AdminRoute>
                      <Admin />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/settings/apikey"
                  element={
                    <ProtectedRoute>
                      <UserApiKeySettings />
                    </ProtectedRoute>
                  }
                />

                {/* 404 页面 */}
                <Route path="*" element={
                  <div className="min-h-screen flex items-center justify-center pt-16">
                    <div className="text-center">
                      <h1 className="text-6xl font-bold text-gray-300 dark:text-gray-600 mb-4">404</h1>
                      <h2 className="text-2xl font-semibold text-gray-700 dark:text-slate-300 mb-4">
                        页面未找到
                      </h2>
                      <p className="text-gray-500 dark:text-slate-400 mb-8">
                        抱歉，您访问的页面不存在。
                      </p>
                      <Link
                        to="/"
                        className="inline-flex items-center px-6 py-3 bg-apple-blue text-white rounded-lg hover:bg-apple-blue/90 transition-colors"
                      >
                        返回首页
                      </Link>
                    </div>
                  </div>
                } />

              </Routes>
            </PageTransition>
          </main>

          {/* Toast 通知 */}
          <Toaster {...TOAST_CONFIG} />
        </div>
      </Router >
    </>
  );
};

export default App;