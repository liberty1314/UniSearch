import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { buildAdminUrl } from '@/lib/adminRoute';

interface GuardProps {
  children: React.ReactNode;
}

interface RouteGuardState {
  from?: {
    pathname?: string;
    search?: string;
  };
}

export const AdminRoute: React.FC<GuardProps> = ({ children }) => {
  const { isAdmin } = useAuthStore();
  const location = useLocation();

  if (!isAdmin) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
};

export const ProtectedRoute: React.FC<GuardProps> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
};

export const GuestRoute: React.FC<GuardProps> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();
  const routeState = location.state as RouteGuardState | null;
  const fromPath = routeState?.from?.pathname;
  const fromSearch = routeState?.from?.search || '';

  if (isAuthenticated) {
    return <Navigate to={fromPath ? `${fromPath}${fromSearch}` : '/'} replace />;
  }

  return <>{children}</>;
};

export const AdminGuestRoute: React.FC<GuardProps> = ({ children }) => {
  const { isAdmin } = useAuthStore();
  const location = useLocation();
  const routeState = location.state as RouteGuardState | null;
  const fromPath = routeState?.from?.pathname;
  const fromSearch = routeState?.from?.search || '';
  const nextAdminPath =
    fromPath && fromPath.startsWith('/admin')
      ? `${fromPath}${fromSearch}`
      : buildAdminUrl();

  if (isAdmin) {
    return <Navigate to={nextAdminPath} replace />;
  }

  return <>{children}</>;
};
