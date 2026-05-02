// Toast 全局配置
export const TOAST_CONFIG = {
  position: 'top-right' as const,
  offset: '72px',
  toastOptions: {
    duration: 2000,
    className: 'group backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 border-[0.5px] border-slate-200/50 dark:border-white/10 shadow-lg text-slate-800 dark:text-slate-100 rounded-2xl',
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
