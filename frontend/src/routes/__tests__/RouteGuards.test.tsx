import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AdminGuestRoute } from '@/routes/RouteGuards';

const authState = vi.hoisted(() => ({
  isAdmin: false,
  isAuthenticated: false,
}));

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => authState,
}));

const LocationProbe = () => {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
};

describe('RouteGuards', () => {
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
    authState.isAdmin = false;
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
});
