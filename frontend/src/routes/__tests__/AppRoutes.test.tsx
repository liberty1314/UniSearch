import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AppRoutes from '@/routes/AppRoutes';

vi.mock('@/components/Navbar', () => ({
  default: () => <div data-testid="navbar" />,
}));

vi.mock('@/components/AnnouncementProvider', () => ({
  AnnouncementProvider: () => null,
}));

vi.mock('@/components/SiteFooter', () => ({
  default: () => <div data-testid="site-footer" />,
}));

vi.mock('@/components/PageTransition', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/routes/ScrollToTop', () => ({
  default: () => null,
}));

vi.mock('@/routes/RouteGuards', () => ({
  AdminGuestRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  AdminRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  GuestRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/pages/Home', () => ({
  default: () => <div>Home Page</div>,
}));

vi.mock('@/pages/LoginPage', () => ({
  default: () => <div>Login Page</div>,
}));

vi.mock('@/pages/RegisterPage', () => ({
  default: () => <div>Register Page</div>,
}));

vi.mock('@/pages/ApiKeyLoginPage', () => ({
  default: () => <div>API Key Login Page</div>,
}));

vi.mock('@/pages/AdminLogin', () => ({
  default: () => <div>Admin Login Page</div>,
}));

vi.mock('@/pages/Admin', () => ({
  default: () => <div>Admin Page</div>,
}));

vi.mock('@/pages/UserApiKeySettings', () => ({
  default: () => <div>User API Key Settings</div>,
}));

vi.mock('@/pages/DisclaimerPage', () => ({
  default: () => <div>Disclaimer Page</div>,
}));

const renderRoutesAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>
  );

describe('AppRoutes', () => {
  it('renders the API key login page at /apikey and hides the site footer', async () => {
    renderRoutesAt('/apikey');

    expect(await screen.findByText('API Key Login Page')).toBeInTheDocument();
    expect(screen.queryByTestId('site-footer')).not.toBeInTheDocument();
  });

  it('does not resolve /auth/apikey and falls back to 404', async () => {
    renderRoutesAt('/auth/apikey');

    expect(await screen.findByText('页面未找到')).toBeInTheDocument();
    expect(screen.queryByText('API Key Login Page')).not.toBeInTheDocument();
  });
});
