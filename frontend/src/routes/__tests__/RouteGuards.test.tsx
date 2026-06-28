import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import {
  AdminGuestRoute,
  AdminRoute,
  GuestRoute,
  ProtectedRoute,
} from '@/routes/RouteGuards';

const authState = vi.hoisted(() => ({
  token: null as string | null,
  isAdmin: false,
  isAuthenticated: false,
  logout: vi.fn(),
}));

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => authState,
}));

const getCurrentUserMock = vi.hoisted(() => vi.fn());

vi.mock('@/services/authService', () => ({
  AuthService: {
    getCurrentUser: getCurrentUserMock,
  },
}));

const LocationProbe = () => {
  const location = useLocation();
  return (
    <div>
      <div data-testid="location">{`${location.pathname}${location.search}`}</div>
      <div data-testid="state">{JSON.stringify(location.state ?? null)}</div>
    </div>
  );
};

describe('RouteGuards', () => {
  beforeEach(() => {
    authState.token = null;
    authState.isAdmin = false;
    authState.isAuthenticated = false;
    authState.logout.mockReset();
    getCurrentUserMock.mockReset();
  });

  it('redirects authenticated admins from /admin/login to the default admin view', () => {
    authState.isAdmin = true;

    render(
      <MemoryRouter initialEntries={['/admin/login']}>
        <Routes>
          <Route
            path="/admin/login"
            element={
              <AdminGuestRoute>
                <div>Admin login</div>
              </AdminGuestRoute>
            }
          />
          <Route
            path="/admin"
            element={<LocationProbe />}
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('location')).toHaveTextContent('/admin?view=system_info');
  });

  it('renders the admin login page for non-admin visitors', () => {
    authState.isAdmin = false;

    render(
      <MemoryRouter initialEntries={['/admin/login']}>
        <Routes>
          <Route
            path="/admin/login"
            element={
              <AdminGuestRoute>
                <div>Admin login</div>
              </AdminGuestRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Admin login')).toBeInTheDocument();
  });

  it('stores the original protected destination in route state when redirecting to /login', () => {
    authState.isAuthenticated = false;

    render(
      <MemoryRouter initialEntries={['/account?tab=security']}>
        <Routes>
          <Route
            path="/account"
            element={
              <ProtectedRoute>
                <div>Account page</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('location')).toHaveTextContent('/login');
    expect(screen.getByTestId('state')).toHaveTextContent('/account');
    expect(screen.getByTestId('state')).toHaveTextContent('security');
  });

  it('stores the original admin destination in route state when redirecting to /admin/login', () => {
    authState.isAdmin = false;

    render(
      <MemoryRouter initialEntries={['/admin?view=plugins']}>
        <Routes>
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <div>Admin page</div>
              </AdminRoute>
            }
          />
          <Route path="/admin/login" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('location')).toHaveTextContent('/admin/login');
    expect(screen.getByTestId('state')).toHaveTextContent('/admin');
    expect(screen.getByTestId('state')).toHaveTextContent('plugins');
  });

  it('confirms admin role with backend before rendering admin route', async () => {
    authState.token = 'admin-token';
    authState.isAdmin = true;
    getCurrentUserMock.mockResolvedValue({
      id: 1,
      username: 'admin',
      role: 'admin',
      is_enabled: true,
    });

    render(
      <MemoryRouter initialEntries={['/admin?view=plugins']}>
        <Routes>
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <div>Admin page</div>
              </AdminRoute>
            }
          />
          <Route path="/admin/login" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole('status', { name: '正在确认管理员权限' })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Admin page')).toBeInTheDocument();
    });
    expect(getCurrentUserMock).toHaveBeenCalledTimes(1);
  });

  it('logs out and redirects when backend role is not admin', async () => {
    authState.token = 'user-token';
    authState.isAdmin = true;
    getCurrentUserMock.mockResolvedValue({
      id: 2,
      username: 'user',
      role: 'user',
      is_enabled: true,
    });

    render(
      <MemoryRouter initialEntries={['/admin?view=plugins']}>
        <Routes>
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <div>Admin page</div>
              </AdminRoute>
            }
          />
          <Route path="/admin/login" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(authState.logout).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/admin/login');
    });
  });

  it('returns authenticated users to the original destination when they revisit /login', () => {
    authState.isAuthenticated = true;

    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/login',
            state: {
              from: {
                pathname: '/account',
                search: '?tab=security',
              },
            },
          },
        ]}
      >
        <Routes>
          <Route
            path="/login"
            element={
              <GuestRoute>
                <div>Login page</div>
              </GuestRoute>
            }
          />
          <Route path="/account" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('location')).toHaveTextContent('/account?tab=security');
  });
});
