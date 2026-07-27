import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MobileMenu } from '@/components/MobileMenu';

const { authState, revokeRefreshTokenMock, useAuthStoreMock } = vi.hoisted(() => {
  const authState = {
    isAuthenticated: true,
    isAdmin: true,
    username: 'admin',
    rememberMe: true,
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
    revokeRefreshTokenMock: vi.fn(),
    useAuthStoreMock,
  };
});

vi.mock('@/stores/authStore', () => ({
  useAuthStore: useAuthStoreMock,
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

vi.mock('@/components/ui/animated-theme-toggler', () => ({
  AnimatedThemeToggler: () => <div>theme toggle</div>,
}));

describe('MobileMenu', () => {
  beforeEach(() => {
    revokeRefreshTokenMock.mockClear();
    authState.logout.mockClear();
  });

  it('links admins to the underscore-form admin dashboard url', () => {
    render(
      <MemoryRouter>
        <MobileMenu isOpen onClose={vi.fn()} navItems={[]} />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: '后台管理' })).toHaveAttribute('href', '/admin?view=system_info');
  });

  it('退出登录时会撤销 refresh token 并关闭菜单', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <MemoryRouter>
        <MobileMenu isOpen onClose={onClose} navItems={[]} />
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: '退出登录' }));

    await waitFor(() => {
      expect(revokeRefreshTokenMock).toHaveBeenCalled();
    });
    expect(authState.logout).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
