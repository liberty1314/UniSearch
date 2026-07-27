import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Admin from '@/pages/Admin';

const { authState, revokeRefreshTokenMock } = vi.hoisted(() => ({
  authState: {
    isAdmin: true,
    username: 'root',
    rememberMe: true,
    logout: vi.fn(),
  },
  revokeRefreshTokenMock: vi.fn(),
}));

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => authState,
}));

vi.mock('@/services/authService', () => ({
  AuthService: {
    revokeRefreshToken: revokeRefreshTokenMock,
  },
}));

vi.mock('@/components/ui/animated-theme-toggler', () => ({
  AnimatedThemeToggler: ({ className }: { className?: string }) => (
    <button className={className}>切换主题</button>
  ),
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('@/components/admin/SystemInfoView', () => ({
  SystemInfoView: () => <div>SystemInfoView</div>,
}));

vi.mock('@/components/admin/SystemSettingsView', () => ({
  SystemSettingsView: () => <div>SystemSettingsView</div>,
}));

vi.mock('@/components/admin/AnnouncementManagement', () => ({
  AnnouncementManagement: () => <div>AnnouncementManagement</div>,
}));

vi.mock('@/components/admin/ChannelManagementView', () => ({
  ChannelManagementView: () => <div>ChannelManagementView</div>,
}));

vi.mock('@/components/admin/PluginManagementView', () => ({
  PluginManagementView: () => <div>PluginManagementView</div>,
}));

vi.mock('@/components/admin/PluginPerformanceDashboard', () => ({
  PluginPerformanceDashboard: () => <div>PluginPerformanceDashboard</div>,
}));

vi.mock('@/components/admin/AdminUsersView', () => ({
  default: () => <div>AdminUsersView</div>,
}));

const LocationProbe = () => {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
};

describe('Admin 导航集成', () => {
  beforeEach(() => {
    document.title = '初始标题';
    authState.logout.mockClear();
    revokeRefreshTokenMock.mockClear();
  });

  it('系统设置固定放在导航末尾', async () => {
    render(
      <MemoryRouter initialEntries={['/admin?view=system_info']}>
        <Routes>
          <Route
            path="/admin"
            element={
              <>
                <LocationProbe />
                <Admin />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    const nav = screen.getAllByRole('navigation', { name: '后台模块导航' })[0];
    const labels = within(nav)
      .getAllByRole('button')
      .map((button) => button.textContent?.trim().replace(/\s+/g, ' '));

    expect(labels.at(-1)).toBe('系统设置');
    expect(labels).toContain('性能监控');
    expect(screen.getByRole('heading', { name: '系统监控' })).toBeInTheDocument();
  });

  it('后台顶部导航使用前台品牌导航样式且不显示模块胶囊', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/admin?view=system_info']}>
        <Routes>
          <Route
            path="/admin"
            element={
              <>
                <LocationProbe />
                <Admin />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole('banner')).toHaveClass('h-20');
    expect(screen.getByRole('banner')).toHaveClass('glass');
    expect(screen.getByText('UniSearch')).toHaveClass('bg-clip-text');
    expect(screen.queryByLabelText('当前后台模块')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '系统监控' })).toHaveClass('sr-only');
    expect(container.querySelector('.top-20')).toBeInTheDocument();
  });

  it('后台顶部仅保留 logo 作为回首页入口', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/admin?view=system_info']}>
        <Routes>
          <Route path="/" element={<LocationProbe />} />
          <Route
            path="/admin"
            element={
              <>
                <LocationProbe />
                <Admin />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    const logoAction = screen.getByRole('link', { name: '返回 UniSearch 首页' });

    expect(logoAction).toHaveAttribute('href', '/');
    expect(screen.queryByRole('link', { name: '返回首页' })).not.toBeInTheDocument();

    await user.click(logoAction);

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/');
    });
  });

  it('后台右侧账号操作区固定在导航栏右侧', async () => {
    render(
      <MemoryRouter initialEntries={['/admin?view=system_info']}>
        <Routes>
          <Route
            path="/admin"
            element={
              <>
                <LocationProbe />
                <Admin />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByLabelText('后台通知').parentElement).toHaveClass('col-start-3');
    expect(screen.getByLabelText('后台通知').parentElement).toHaveClass('justify-end');
  });

  it('后台头像菜单可以点击展开并执行退出登录', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/admin?view=system_info']}>
        <Routes>
          <Route path="/" element={<LocationProbe />} />
          <Route
            path="/admin"
            element={
              <>
                <LocationProbe />
                <Admin />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    const accountButton = screen.getByRole('button', { name: /root/i });
    expect(accountButton).toHaveAttribute('aria-expanded', 'false');

    await user.click(accountButton);

    const userMenu = screen.getByTestId('admin-user-menu');
    expect(accountButton).toHaveAttribute('aria-expanded', 'true');
    expect(userMenu).toHaveAttribute('role', 'menu');
    expect(userMenu.className).toContain('!absolute');
    expect(userMenu.className).toContain('top-full');
    expect(screen.getByRole('menuitem', { name: '个人中心' })).toHaveAttribute('href', '/account');

    await user.click(screen.getByRole('menuitem', { name: '退出登录' }));

    await waitFor(() => {
      expect(revokeRefreshTokenMock).toHaveBeenCalled();
    });
    expect(authState.logout).toHaveBeenCalled();
    expect(screen.getByTestId('location')).toHaveTextContent('/');
  });

  it('点击侧边栏后会同步切换 URL 与页面内容', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/admin?view=plugin_management']}>
        <Routes>
          <Route
            path="/admin"
            element={
              <>
                <LocationProbe />
                <Admin />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('PluginManagementView')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/admin?view=plugin_management');

    await user.click(screen.getAllByRole('button', { name: 'Telegram 频道' })[0]);

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/admin?view=channel_management');
    });
    expect(await screen.findByText('ChannelManagementView')).toBeInTheDocument();
    expect(screen.queryByText('PluginManagementView')).not.toBeInTheDocument();
  });

  it('性能监控入口可以进入插件观测页面', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/admin?view=plugin_management']}>
        <Routes>
          <Route
            path="/admin"
            element={
              <>
                <LocationProbe />
                <Admin />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    await user.click(screen.getAllByRole('button', { name: '性能监控' })[0]);

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/admin?view=plugin_observability');
    });
    expect(await screen.findByText('PluginPerformanceDashboard')).toBeInTheDocument();
  });
});
