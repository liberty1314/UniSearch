import React, { Suspense, lazy } from 'react';
import { Navigate, Route, Routes, matchPath, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import Navbar from '@/components/Navbar';
import { AnnouncementProvider } from '@/components/AnnouncementProvider';
import SiteFooter from '@/components/SiteFooter';
import PageTransition from '@/components/PageTransition';
import { CinematicFooter } from '@/components/ui/motion-footer';
import NotFoundPage from '@/components/ui/page-not-found';
import ScrollToTop from './ScrollToTop';
import { isAuthRoute } from '@/components/auth/authRouteMotion';
import {
  AdminGuestRoute,
  AdminRoute,
  GuestRoute,
  ProtectedRoute,
} from './RouteGuards';

import Home from '@/pages/Home';
const SearchPage = lazy(() => import('@/pages/SearchPage'));
const HotPage = lazy(() => import('@/pages/HotPage'));
const ResourceDetailPage = lazy(() => import('@/pages/ResourceDetailPage'));
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/RegisterPage'));
const AccountPage = lazy(() => import('@/pages/AccountPage'));
const AdminLogin = lazy(() => import('@/pages/AdminLogin'));
const Admin = lazy(() => import('@/pages/Admin'));
const DisclaimerPage = lazy(() => import('@/pages/DisclaimerPage'));

import { TOAST_CONFIG, KNOWN_ROUTE_PATTERNS } from '@/config/constants';
import { shouldUseLazyRouteFallback } from '@/routes/appRouteUtils';



const RouteFallback: React.FC = () => (
  <div className="flex min-h-[40vh] items-center justify-center px-6">
    <div className="flex flex-col items-center gap-4 rounded-[1.8rem] border border-white/60 bg-white/75 px-8 py-7 text-center shadow-[0_18px_45px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/55">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-cyan-500 dark:border-slate-700 dark:border-t-cyan-400" />
      <div className="space-y-1">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          正在整理页面内容
        </p>
        <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
          即将进入 UniSearch 工作区
        </p>
      </div>
    </div>
  </div>
);

const renderLazyRoute = (element: React.ReactNode) => (
  <Suspense fallback={<RouteFallback />}>{element}</Suspense>
);

const renderRouteElement = (path: string, element: React.ReactNode) =>
  shouldUseLazyRouteFallback(path) ? renderLazyRoute(element) : element;

const AppRoutes: React.FC = () => {
  const { pathname } = useLocation();
  const isStandaloneAuthPage = isAuthRoute(pathname);
  const isKnownRoute = KNOWN_ROUTE_PATTERNS.some((path) =>
    matchPath({ path, end: true }, pathname)
  );
  const isNotFoundRoute = !isKnownRoute;
  const showSiteFooter =
    !isNotFoundRoute &&
    !pathname.startsWith('/admin') &&
    pathname !== '/auth' &&
    !isStandaloneAuthPage;
  const showCinematicFooter = showSiteFooter && pathname === '/';
  const showNavbar = !isNotFoundRoute;
  const appShellClassName = isNotFoundRoute
    ? 'bg-black'
    : isStandaloneAuthPage
      ? 'bg-gray-50'
      : 'bg-white';

  return (
    <div className={`${appShellClassName} obsidian-shell transition-colors duration-200`}>
      <ScrollToTop />
      {showNavbar && <Navbar />}
      <AnnouncementProvider />

      <main className="relative min-h-screen">
        <PageTransition>
          <Routes>
            <Route
              path="/"
              element={renderRouteElement('/', <Home />)}
            />
            <Route
              path="/search"
              element={renderRouteElement('/search', <SearchPage />)}
            />
            <Route
              path="/hot"
              element={renderRouteElement('/hot', <HotPage />)}
            />
            <Route
              path="/resource/:resourceId"
              element={renderRouteElement('/resource/:resourceId', <ResourceDetailPage />)}
            />
            <Route
              path="/login"
              element={renderRouteElement('/login',
                <GuestRoute>
                  <LoginPage />
                </GuestRoute>
              )}
            />
            <Route
              path="/register"
              element={renderRouteElement('/register',
                <GuestRoute>
                  <RegisterPage />
                </GuestRoute>
              )}
            />
            <Route
              path="/account"
              element={renderRouteElement('/account',
                <ProtectedRoute>
                  <AccountPage />
                </ProtectedRoute>
              )}
            />
            <Route path="/disclaimer" element={renderRouteElement('/disclaimer', <DisclaimerPage />)} />
            <Route path="/auth" element={<Navigate to="/login" replace />} />
            <Route
              path="/admin/login"
              element={renderRouteElement('/admin/login',
                <AdminGuestRoute>
                  <AdminLogin />
                </AdminGuestRoute>
              )}
            />
            <Route
              path="/admin"
              element={renderRouteElement('/admin',
                <AdminRoute>
                  <Admin />
                </AdminRoute>
              )}
            />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </PageTransition>
      </main>

      {showCinematicFooter ? <CinematicFooter /> : showSiteFooter && <SiteFooter />}
      <Toaster {...TOAST_CONFIG} />
    </div>
  );
};

export default AppRoutes;
