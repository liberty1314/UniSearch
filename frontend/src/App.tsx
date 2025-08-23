import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Toaster } from 'sonner';
import Navbar from '@/components/Navbar';
import Home from '@/pages/Home';

const App: React.FC = () => {
  // 简化的主题管理，默认使用系统主题
  React.useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const updateTheme = () => {
      if (mediaQuery.matches) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };
    
    updateTheme();
    mediaQuery.addEventListener('change', updateTheme);
    
    return () => mediaQuery.removeEventListener('change', updateTheme);
  }, []);

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        <Navbar />
        
        <main className="pt-16">
          <Routes>
            <Route path="/" element={<Home />} />
            {/* 404 页面 */}
            <Route path="*" element={
              <div className="min-h-screen flex items-center justify-center">
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
            duration: 4000,
          }}
        />
      </div>
    </Router>
  );
};

export default App;