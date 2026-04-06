import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { buildAdminUrl } from '@/lib/adminRoute';

interface GuardProps {
  children: React.ReactNode;
}

export const AdminRoute: React.FC<GuardProps> = ({ children }) => {
  const { isAdmin } = useAuthStore();

  if (!isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
};

export const ProtectedRoute: React.FC<GuardProps> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const GuestRoute: React.FC<GuardProps> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export const AdminGuestRoute: React.FC<GuardProps> = ({ children }) => {
  const { isAdmin } = useAuthStore();

  if (isAdmin) {
    return <Navigate to={buildAdminUrl()} replace />;
  }

  return <>{children}</>;
};
