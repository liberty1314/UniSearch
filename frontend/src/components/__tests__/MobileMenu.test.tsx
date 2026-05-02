import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MobileMenu } from '@/components/MobileMenu';

const { authState, revokeRefreshTokenMock } = vi.hoisted(() => ({
  authState: {
    isAuthenticated: true,
    isAdmin: true,
    username: 'admin',
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
  });

  it('links admins to the underscore-form admin dashboard url', () => {
    render(
      <MemoryRouter>
        <MobileMenu isOpen onClose={vi.fn()} navItems={[]} />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: '后台管理' })).toHaveAttribute('href', '/admin?view=system_info');
  });
});
