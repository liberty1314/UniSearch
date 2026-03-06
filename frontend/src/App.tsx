import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import PageLoader from '@/components/PageLoader';
import { useAutoRefreshToken } from '@/hooks/useAutoRefreshToken';
import AppRoutes from '@/routes/AppRoutes';

// 常量配置
const INITIAL_LOADING_DURATION = 800;

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
        <AppRoutes />
      </Router >
    </>
  );
};

export default App;
