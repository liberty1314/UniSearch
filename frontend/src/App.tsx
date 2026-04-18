import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { useAutoRefreshToken } from '@/hooks/useAutoRefreshToken';
import AppRoutes from '@/routes/AppRoutes';

const App: React.FC = () => {
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

  return (
    <>

      <Router>
        <AppRoutes />
      </Router >
    </>
  );
};

export default App;
