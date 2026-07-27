import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuthStore } from '@/stores/authStore';
import { buildAdminUrl } from '@/lib/adminRoute';
import { AuthService } from '@/services/authService';

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
  const { token, isAdmin, logout } = useAuthStore();
  const location = useLocation();
  const [isVerifiedAdmin, setIsVerifiedAdmin] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(() => Boolean(token && isAdmin));

  useEffect(() => {
    let active = true;

    if (!token || !isAdmin) {
      setIsVerifiedAdmin(false);
      setIsCheckingAdmin(false);
      return;
    }

    setIsCheckingAdmin(true);
    AuthService.getCurrentUser()
      .then((user) => {
        if (!active) return;
        if (user.role === 'admin' && user.is_enabled) {
          setIsVerifiedAdmin(true);
          return;
        }
        logout();
        setIsVerifiedAdmin(false);
      })
      .catch(() => {
        if (!active) return;
        logout();
        setIsVerifiedAdmin(false);
      })
      .finally(() => {
        if (active) {
          setIsCheckingAdmin(false);
        }
      });

    return () => {
      active = false;
    };
  }, [isAdmin, logout, token]);

  if (!token || !isAdmin) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  if (isCheckingAdmin) {
    return <div role="status" aria-label="正在确认管理员权限" />;
  }

  if (!isVerifiedAdmin) {
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
