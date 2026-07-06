import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Navbar from '@/components/Navbar';

const {
  authState,
  unreadAnnouncementsMock,
  toggleMobileSidebarMock,
  revokeRefreshTokenMock,
  useAuthStoreMock,
} = vi.hoisted(() => {
  const authState = {
    isAuthenticated: true,
    isAdmin: true,
    username: 'admin',
    refreshToken: 'refresh-token',
    logout: vi.fn(),
  };

  const useAuthStoreMock = Object.assign(
    () => authState,
    {
      getState: () => authState,
    }
  );

  return {
    authState,
    unreadAnnouncementsMock: vi.fn(() => []),
    toggleMobileSidebarMock: vi.fn(),
    revokeRefreshTokenMock: vi.fn(),
    useAuthStoreMock,
  };
});

vi.mock('@/stores/authStore', () => ({
  useAuthStore: useAuthStoreMock,
}));

vi.mock('@/stores/announcementStore', () => ({
  useAnnouncementStore: () => ({
    getUnreadAnnouncements: unreadAnnouncementsMock,
  }),
}));

vi.mock('@/stores/adminStore', () => ({
  useAdminStore: () => ({
    toggleMobileSidebar: toggleMobileSidebarMock,
  }),
}));

vi.mock('@/components/MobileMenu', () => ({
  MobileMenu: () => null,
}));

vi.mock('@/components/ui/animated-theme-toggler', () => ({
  AnimatedThemeToggler: () => <div>theme toggle</div>,
}));

vi.mock('@/components/AnnouncementPanel', () => ({
  AnnouncementPanel: () => null,
}));

vi.mock('@/services/authService', () => ({
  AuthService: {
    revokeRefreshToken: revokeRefreshTokenMock,
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
  },
}));

describe('Navbar', () => {
  beforeEach(() => {
    unreadAnnouncementsMock.mockClear();
    toggleMobileSidebarMock.mockClear();
    revokeRefreshTokenMock.mockClear();
    authState.logout.mockClear();
  });

  it('links admins to the underscore-form admin dashboard url', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: /admin/i }));

    expect(screen.getByRole('link', { name: '后台管理' })).toHaveAttribute('href', '/admin?view=system_info');
  });

  it('头像菜单打开后保持浮层定位，不撑开导航布局', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    const userMenuButton = screen.getByRole('button', { name: /admin/i });
    expect(userMenuButton).toHaveAttribute('aria-expanded', 'false');

    await user.click(userMenuButton);

    const userMenu = screen.getByTestId('navbar-user-menu');
    expect(userMenuButton).toHaveAttribute('aria-expanded', 'true');
    expect(userMenu).toHaveAttribute('role', 'menu');
    expect(userMenu.className).toContain('!absolute');
    expect(userMenu.className).toContain('top-full');
    expect(userMenu.className).toContain('glass-panel');
  });

  it('renders the hot ranking entry in the navbar', () => {
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: '热门榜单' })).toHaveAttribute('href', '/trending');
  });

  it('当前桌面导航项会标记为当前页面', () => {
    render(
      <MemoryRouter initialEntries={['/trending']}>
        <Navbar />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: '热门榜单' })).toHaveAttribute('aria-current', 'page');
  });

  it('移动菜单按钮具有明确名称', () => {
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: '打开菜单' })).toBeInTheDocument();
  });

  it('退出登录时会先撤销 refresh token 再清理本地登录态', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: /admin/i }));
    await user.click(screen.getByRole('button', { name: '退出登录' }));

    await waitFor(() => {
      expect(revokeRefreshTokenMock).toHaveBeenCalledWith('refresh-token');
    });
    expect(authState.logout).toHaveBeenCalled();
  });
});
