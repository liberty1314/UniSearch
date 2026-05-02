// Toast 全局配置
export const TOAST_CONFIG = {
  position: 'top-right' as const,
  offset: '72px',
  toastOptions: {
    duration: 2000,
  },
  closeButton: true,
};

// 路由已知模式列表
export const KNOWN_ROUTE_PATTERNS = [
  '/',
  '/login',
  '/register',
  '/account',
  '/disclaimer',
  '/auth',
  '/admin/login',
  '/admin',
];
