import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Navbar from '@/components/Navbar';

const { authState, unreadAnnouncementsMock, toggleMobileSidebarMock, revokeRefreshTokenMock } = vi.hoisted(() => ({
  authState: {
    isAuthenticated: true,
    isAdmin: true,
    username: 'admin',
    logout: vi.fn(),
  },
  unreadAnnouncementsMock: vi.fn(() => []),
  toggleMobileSidebarMock: vi.fn(),
  revokeRefreshTokenMock: vi.fn(),
}));

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => authState,
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

  it('renders the hot ranking entry in the navbar', () => {
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: '热门榜单' })).toHaveAttribute('href', '/hot');
  });
});
