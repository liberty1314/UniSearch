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

vi.mock('@/components/ui/motion-footer', () => ({
  CinematicFooter: () => <div data-testid="cinematic-footer" />,
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

vi.mock('@/pages/ResourceDetailPage', () => ({
  default: () => <div>Resource Detail Page</div>,
}));

vi.mock('@/pages/LoginPage', () => ({
  default: () => <div>Login Page</div>,
}));

vi.mock('@/pages/RegisterPage', () => ({
  default: () => <div>Register Page</div>,
}));

vi.mock('@/pages/AdminLogin', () => ({
  default: () => <div>Admin Login Page</div>,
}));

vi.mock('@/pages/Admin', () => ({
  default: () => <div>Admin Page</div>,
}));

vi.mock('@/pages/AccountPage', () => ({
  default: () => <div>Account Page</div>,
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
  it('renders the cinematic footer only on the home page', async () => {
    renderRoutesAt('/');

    expect(await screen.findByText('Home Page')).toBeInTheDocument();
    expect(screen.getByTestId('cinematic-footer')).toBeInTheDocument();
    expect(screen.queryByTestId('site-footer')).not.toBeInTheDocument();
  });

  it('renders the account page at /account', async () => {
    renderRoutesAt('/account');

    expect(await screen.findByText('Account Page')).toBeInTheDocument();
    expect(screen.getByTestId('site-footer')).toBeInTheDocument();
    expect(screen.queryByTestId('cinematic-footer')).not.toBeInTheDocument();
  });

  it('renders the resource detail page at /resource/:resourceId', async () => {
    renderRoutesAt('/resource/resource-1');

    expect(await screen.findByText('Resource Detail Page')).toBeInTheDocument();
    expect(screen.getByTestId('site-footer')).toBeInTheDocument();
    expect(screen.queryByTestId('cinematic-footer')).not.toBeInTheDocument();
  });

  it('does not resolve /apikey and falls back to 404', async () => {
    renderRoutesAt('/apikey');

    expect(await screen.findByText('页面未找到')).toBeInTheDocument();
    expect(screen.queryByText('Account Page')).not.toBeInTheDocument();
    expect(screen.queryByTestId('navbar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('site-footer')).not.toBeInTheDocument();
    expect(screen.queryByTestId('cinematic-footer')).not.toBeInTheDocument();
  });

  it('uses the shared obsidian shell for standard pages but keeps auth page shell unchanged', async () => {
    const { container, unmount } = renderRoutesAt('/');

    expect(await screen.findByText('Home Page')).toBeInTheDocument();
    expect(container.firstChild).toHaveClass('bg-white');
    expect(container.firstChild).toHaveClass('obsidian-shell');

    unmount();

    const loginRender = renderRoutesAt('/login');
    expect(await screen.findByText('Login Page')).toBeInTheDocument();
    expect(loginRender.container.firstChild).toHaveClass('bg-gray-50');
    expect(loginRender.container.firstChild).toHaveClass('obsidian-shell');
  });
});
