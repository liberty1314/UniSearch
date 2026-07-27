import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import AppRoutes, { RouteFallback } from '@/routes/AppRoutes';
import { shouldUseLazyRouteFallback } from '@/routes/appRouteUtils';

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

vi.mock('@/pages/SearchPage', () => ({
  default: () => <div>Search Page</div>,
}));

vi.mock('@/pages/HotPage', () => ({
  default: () => <div>Hot Page</div>,
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
  it('uses the suspense fallback path for every page route', () => {
    expect(shouldUseLazyRouteFallback()).toBe(true);
  });

  it('keeps the generic lazy route loading state compact for non-specialized pages', () => {
    const { container } = render(<RouteFallback />);
    const wrapper = container.firstElementChild;

    expect(wrapper).toHaveClass('min-h-[calc(100vh-4rem)]');
    expect(wrapper).toHaveClass('items-center');
    expect(wrapper).toHaveClass('justify-center');
    expect(wrapper?.className).not.toContain('min-h-[40vh]');
    expect(screen.getByText('正在整理页面内容')).toBeInTheDocument();
  });

  it('renders a structure-preserving hot ranking skeleton for the trending route', () => {
    render(<RouteFallback pathname="/trending" />);

    expect(screen.getByRole('status', { name: '热门榜单加载中' })).toBeInTheDocument();
    expect(screen.getByText('正在加载热门榜单')).toBeInTheDocument();
    expect(screen.getByText('热榜控制台')).toBeInTheDocument();
    expect(screen.getAllByTestId('route-hot-card-skeleton')).toHaveLength(6);
    expect(screen.queryByText('正在整理页面内容')).not.toBeInTheDocument();
  });

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

  it('renders the search page at /search', async () => {
    renderRoutesAt('/search?q=%E7%94%B5%E5%BD%B1');

    expect(await screen.findByText('Search Page')).toBeInTheDocument();
    expect(screen.getByTestId('navbar')).toBeInTheDocument();
    expect(screen.getByTestId('site-footer')).toBeInTheDocument();
    expect(screen.queryByTestId('cinematic-footer')).not.toBeInTheDocument();
  });

  it('renders the hot page at /trending', async () => {
    renderRoutesAt('/trending');

    expect(await screen.findByText('Hot Page')).toBeInTheDocument();
    expect(screen.getByTestId('navbar')).toBeInTheDocument();
    expect(screen.getByTestId('site-footer')).toBeInTheDocument();
  });

  it('does not render the public navbar or site footer for admin routes', async () => {
    renderRoutesAt('/admin');

    expect(await screen.findByText('Admin Page')).toBeInTheDocument();
    expect(screen.queryByTestId('navbar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('site-footer')).not.toBeInTheDocument();
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
