import React, { Suspense, lazy } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import Navbar from '@/components/Navbar';
import { AnnouncementProvider } from '@/components/AnnouncementProvider';
import DisclaimerFooter from '@/components/DisclaimerFooter';
import PageTransition from '@/components/PageTransition';
import { shouldShowDisclaimer } from '@/lib/disclaimer';
import ScrollToTop from './ScrollToTop';
import {
  AdminGuestRoute,
  AdminRoute,
  GuestRoute,
  ProtectedRoute,
} from './RouteGuards';

const Home = lazy(() => import('@/pages/Home'));
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/RegisterPage'));
const ApiKeyLoginPage = lazy(() => import('@/pages/ApiKeyLoginPage'));
const AdminLogin = lazy(() => import('@/pages/AdminLogin'));
const Admin = lazy(() => import('@/pages/Admin'));
const UserApiKeySettings = lazy(() => import('@/pages/UserApiKeySettings'));
const DisclaimerPage = lazy(() => import('@/pages/DisclaimerPage'));

const TOAST_CONFIG = {
  position: 'top-right' as const,
  offset: '72px',
  toastOptions: {
    duration: 2000,
  },
  closeButton: true,
};

const RouteFallback: React.FC = () => (
  <div className="flex min-h-[40vh] items-center justify-center">
    <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-blue-500 dark:border-slate-700 dark:border-t-blue-400" />
  </div>
);

const renderLazyRoute = (element: React.ReactNode) => (
  <Suspense fallback={<RouteFallback />}>{element}</Suspense>
);

const NotFoundPage: React.FC = () => (
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
);

const AppRoutes: React.FC = () => {
  const { pathname } = useLocation();
  const showDisclaimer = shouldShowDisclaimer(pathname);

  return (
    <div className="bg-gray-50 dark:bg-slate-950 transition-colors duration-200">
      <ScrollToTop />
      <Navbar />
      <AnnouncementProvider />

      <main className="relative min-h-screen">
        <PageTransition>
          <Routes>
            <Route
              path="/"
              element={renderLazyRoute(
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/login"
              element={renderLazyRoute(
                <GuestRoute>
                  <LoginPage />
                </GuestRoute>
              )}
            />
            <Route
              path="/register"
              element={renderLazyRoute(
                <GuestRoute>
                  <RegisterPage />
                </GuestRoute>
              )}
            />
            <Route
              path="/auth/apikey"
              element={renderLazyRoute(
                <GuestRoute>
                  <ApiKeyLoginPage />
                </GuestRoute>
              )}
            />
            <Route path="/disclaimer" element={renderLazyRoute(<DisclaimerPage />)} />
            <Route path="/auth" element={<Navigate to="/login" replace />} />
            <Route
              path="/admin/login"
              element={renderLazyRoute(
                <AdminGuestRoute>
                  <AdminLogin />
                </AdminGuestRoute>
              )}
            />
            <Route
              path="/admin"
              element={renderLazyRoute(
                <AdminRoute>
                  <Admin />
                </AdminRoute>
              )}
            />
            <Route
              path="/settings/apikey"
              element={renderLazyRoute(
                <ProtectedRoute>
                  <UserApiKeySettings />
                </ProtectedRoute>
              )}
            />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </PageTransition>
      </main>

      {showDisclaimer && <DisclaimerFooter />}
      <Toaster {...TOAST_CONFIG} />
    </div>
  );
};

export default AppRoutes;
