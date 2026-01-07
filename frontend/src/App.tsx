import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import Navbar from '@/components/Navbar';
import Home from '@/pages/Home';
import Login from '@/pages/Login';
import AdminLogin from '@/pages/AdminLogin';
import Admin from '@/pages/Admin';
import UserApiKeySettings from '@/pages/UserApiKeySettings';
import { useAuthStore } from '@/stores/authStore';
import PageLoader from '@/components/PageLoader';

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

const App: React.FC = () => {
  const [isInitialLoading, setIsInitialLoading] = useState(true);

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
    // 模拟初始化加载
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {/* 页面加载动画 */}
      <PageLoader isLoading={isInitialLoading} />

      <Router>
        <div className="bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
          <Navbar />

          <main>
            <Routes>
              <Route path="/" element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              } />
              <Route path="/login" element={<Login />} />
              <Route path="/admin/login" element={<AdminLogin />} />
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
                    <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-300 mb-4">
                      页面未找到
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-8">
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
          </main>

          {/* Toast 通知 */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 2000,
            }}
            closeButton
          />
        </div>
      </Router>
    </>
  );
};

export default App;