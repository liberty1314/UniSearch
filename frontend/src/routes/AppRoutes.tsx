import React, { Suspense, lazy, useEffect, useState } from 'react';
import { Navigate, Route, Routes, matchPath, useLocation } from 'react-router';
import { Toaster } from 'sonner';
import Navbar from '@/components/Navbar';
import { AnnouncementProvider } from '@/components/AnnouncementProvider';
import SiteFooter from '@/components/SiteFooter';
import NotFoundPage from '@/components/ui/page-not-found';
import ScrollToTop from './ScrollToTop';
import { isAuthRoute } from '@/components/auth/authRouteMotion';
import {
  AdminGuestRoute,
  AdminRoute,
  GuestRoute,
  ProtectedRoute,
} from './RouteGuards';

const PageTransition = lazy(() => import('@/components/PageTransition'));
const CinematicFooter = lazy(() =>
  import('@/components/ui/motion-footer').then((module) => ({
    default: module.CinematicFooter,
  }))
);
const Home = lazy(() => import('@/pages/Home'));
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


interface RouteFallbackProps {
  pathname?: string;
}

const RouteHotSkeletonBlock: React.FC<{
  className: string;
  delay?: string;
}> = ({ className, delay = '0ms' }) => (
  <div
    className={`skeleton-shimmer ${className}`}
    style={{ animationDelay: delay }}
  />
);

const RouteHotCardSkeleton: React.FC<{ index: number }> = ({ index }) => (
  <div
    className="skeleton-card-wrap rounded-[1.5rem] border border-slate-200/60 bg-white/80 p-4 md:p-5 dark:border-white/10 dark:bg-slate-900/52"
    data-testid="route-hot-card-skeleton"
  >
    <div className="flex flex-col gap-4 sm:flex-row">
      <div className="flex flex-col gap-3 sm:w-28 sm:shrink-0">
        <RouteHotSkeletonBlock
          className="h-40 w-full rounded-[1.2rem] sm:h-36"
          delay={`${index * 45}ms`}
        />
        <RouteHotSkeletonBlock className="h-3 w-16 rounded-full" delay={`${240 + index * 45}ms`} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <RouteHotSkeletonBlock className="h-3 w-14 rounded-full" delay={`${40 + index * 45}ms`} />
            <RouteHotSkeletonBlock className="h-5 w-16 rounded-full" delay={`${80 + index * 45}ms`} />
          </div>
          <RouteHotSkeletonBlock className="h-6 w-14 rounded-full" delay={`${120 + index * 45}ms`} />
        </div>

        <RouteHotSkeletonBlock className="h-6 w-3/5 rounded-full" delay={`${160 + index * 45}ms`} />
        <RouteHotSkeletonBlock className="h-4 w-2/5 rounded-full" delay={`${200 + index * 45}ms`} />
        <RouteHotSkeletonBlock className="h-3.5 w-full rounded-full" delay={`${240 + index * 45}ms`} />
        <RouteHotSkeletonBlock className="h-3.5 w-11/12 rounded-full" delay={`${280 + index * 45}ms`} />
        <RouteHotSkeletonBlock className="h-3.5 w-3/4 rounded-full" delay={`${320 + index * 45}ms`} />

        <div className="flex flex-wrap gap-2 pt-1">
          <RouteHotSkeletonBlock className="h-6 w-12 rounded-full" delay={`${360 + index * 45}ms`} />
          <RouteHotSkeletonBlock className="h-6 w-12 rounded-full" delay={`${400 + index * 45}ms`} />
          <RouteHotSkeletonBlock className="h-6 w-12 rounded-full" delay={`${440 + index * 45}ms`} />
        </div>
      </div>
    </div>
  </div>
);

const RouteHotRankingFallback: React.FC = () => (
  <section
    role="status"
    aria-label="热门榜单加载中"
    aria-live="polite"
    className="min-h-[calc(100vh-4rem)] bg-white px-4 py-8 pt-24 dark:bg-slate-950"
  >
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 rounded-[1.5rem] border border-slate-200/70 bg-white/80 p-5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/55 md:flex-row md:items-center md:justify-between md:p-6">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">正在加载热门榜单</p>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
            正在同步热榜控制台与资源卡片
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {['趋势', '每日', '全部'].map((label, index) => (
            <span
              key={label}
              className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-medium text-cyan-700 dark:bg-cyan-400/10 dark:text-cyan-200"
            >
              {index === 0 ? '热榜控制台' : label}
            </span>
          ))}
        </div>
      </div>

      <section className="space-y-5" aria-label="热门榜单内容加载中">
        <div className="flex items-center justify-between gap-4">
          <RouteHotSkeletonBlock className="h-7 w-32 rounded-full" />
          <RouteHotSkeletonBlock className="h-10 w-10 rounded-full" delay="80ms" />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <RouteHotCardSkeleton key={`route-hot-card-${index}`} index={index} />
          ))}
        </div>
      </section>
    </div>
  </section>
);

export const RouteFallback: React.FC<RouteFallbackProps> = ({ pathname }) => {
  if (pathname === '/trending') {
    return <RouteHotRankingFallback />;
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-6">
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
};

const renderLazyRoute = (element: React.ReactNode, pathname: string) => (
  <Suspense fallback={<RouteFallback pathname={pathname} />}>{element}</Suspense>
);

const renderRouteElement = (element: React.ReactNode, pathname: string) =>
  shouldUseLazyRouteFallback() ? renderLazyRoute(element, pathname) : element;

const AppRoutes: React.FC = () => {
  const { pathname } = useLocation();
  const [prefersCompactFooter, setPrefersCompactFooter] = useState(false);
  const isStandaloneAuthPage = isAuthRoute(pathname);
  const isAdminRoute = pathname.startsWith('/admin');
  const isKnownRoute = KNOWN_ROUTE_PATTERNS.some((path) =>
    matchPath({ path, end: true }, pathname)
  );
  const isNotFoundRoute = !isKnownRoute;
  const showSiteFooter =
    !isNotFoundRoute &&
    !isAdminRoute &&
    pathname !== '/auth' &&
    !isStandaloneAuthPage;
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const updateFooterMode = () => setPrefersCompactFooter(mediaQuery.matches);
    updateFooterMode();
    mediaQuery.addEventListener('change', updateFooterMode);

    return () => mediaQuery.removeEventListener('change', updateFooterMode);
  }, []);

  const showCinematicFooter = showSiteFooter && pathname === '/' && !prefersCompactFooter;
  const showNavbar = !isNotFoundRoute && !isAdminRoute;
  const appShellClassName = isNotFoundRoute
    ? 'bg-black'
    : isStandaloneAuthPage
      ? 'bg-gray-50'
      : 'bg-white';

  const routes = (
    <Routes>
      <Route
        path="/"
        element={renderRouteElement(<Home />, pathname)}
      />
      <Route
        path="/search"
        element={renderRouteElement(<SearchPage />, pathname)}
      />
      <Route
        path="/trending"
        element={renderRouteElement(<HotPage />, pathname)}
      />
      <Route
        path="/resource/:resourceId"
        element={renderRouteElement(<ResourceDetailPage />, pathname)}
      />
      <Route
        path="/login"
        element={renderRouteElement(
          <GuestRoute>
            <LoginPage />
          </GuestRoute>,
          pathname
        )}
      />
      <Route
        path="/register"
        element={renderRouteElement(
          <GuestRoute>
            <RegisterPage />
          </GuestRoute>,
          pathname
        )}
      />
      <Route
        path="/account"
        element={renderRouteElement(
          <ProtectedRoute>
            <AccountPage />
          </ProtectedRoute>,
          pathname
        )}
      />
      <Route path="/disclaimer" element={renderRouteElement(<DisclaimerPage />, pathname)} />
      <Route path="/auth" element={<Navigate to="/login" replace />} />
      <Route
        path="/admin/login"
        element={renderRouteElement(
          <AdminGuestRoute>
            <AdminLogin />
          </AdminGuestRoute>,
          pathname
        )}
      />
      <Route
        path="/admin"
        element={renderRouteElement(
          <AdminRoute>
            <Admin />
          </AdminRoute>,
          pathname
        )}
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );

  return (
    <div className={`${appShellClassName} obsidian-shell transition-colors duration-200`}>
      <ScrollToTop />
      {showNavbar && <Navbar />}
      <AnnouncementProvider />

      <main className="relative min-h-screen">
        <Suspense fallback={<RouteFallback pathname={pathname} />}>
          <PageTransition>{routes}</PageTransition>
        </Suspense>
      </main>

      {showCinematicFooter ? (
        <Suspense fallback={<SiteFooter />}>
          <CinematicFooter />
        </Suspense>
      ) : showSiteFooter && <SiteFooter />}
      <Toaster {...TOAST_CONFIG} />
    </div>
  );
};

export default AppRoutes;
