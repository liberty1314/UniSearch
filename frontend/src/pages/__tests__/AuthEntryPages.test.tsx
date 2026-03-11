import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import ApiKeyLoginPage from '@/pages/ApiKeyLoginPage';
import AdminLogin from '@/pages/AdminLogin';

const { navigateMock, getSettingsMock, setTokenMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  getSettingsMock: vi.fn(),
  setTokenMock: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');

  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({
    setToken: setTokenMock,
  }),
}));

vi.mock('@/services/systemSettingsService', () => ({
  SystemSettingsService: {
    getSettings: getSettingsMock,
  },
}));

vi.mock('@/components/PageLoader', () => ({
  __esModule: true,
  default: ({ isLoading }: { isLoading: boolean }) => (isLoading ? <div>loading</div> : null),
}));

vi.mock('@/components/auth/AuthBackground', () => ({
  __esModule: true,
  default: () => <div data-testid="auth-background" />,
}));

vi.mock('@/components/auth/AuthCardShell', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/auth/AuthSwitchMotion', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/auth/useAuthParticles', () => ({
  useAuthParticles: () => [],
}));

describe('Auth entry pages', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    getSettingsMock.mockReset();
    setTokenMock.mockReset();
    getSettingsMock.mockResolvedValue({
      enable_user_auth: true,
      enable_user_login: true,
      enable_user_signup: true,
    });
  });

  it('does not render the decorative sparkle icon on the login page', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage />
      </MemoryRouter>
    );

    await screen.findByText('欢迎回来');

    expect(container.querySelector('.auth-sparkle-intro')).toBeNull();
    expect(screen.getByRole('button', { name: '登录' }).className).not.toContain('hover:scale-[1.02]');
  });

  it('does not render the decorative sparkle icon on the register page', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/register']}>
        <RegisterPage />
      </MemoryRouter>
    );

    await screen.findByText('创建账户');

    expect(container.querySelector('.auth-sparkle-intro')).toBeNull();
    expect(screen.getByRole('button', { name: '立即注册' }).className).not.toContain('hover:scale-[1.02]');
  });

  it('does not render the decorative sparkle icon on the API key login page', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/apikey']}>
        <ApiKeyLoginPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('API Key 访问')).toBeInTheDocument();
    });

    expect(container.querySelector('.auth-sparkle-intro')).toBeNull();
    expect(screen.getByRole('button', { name: '登录' }).className).not.toContain('hover:scale-[1.02]');
  });

  it('does not render the decorative sparkle icon on the admin login page', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/admin/login']}>
        <AdminLogin />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('管理员登录')).toBeInTheDocument();
    });

    expect(container.querySelector('.auth-sparkle-intro')).toBeNull();
    expect(screen.getByRole('button', { name: '登录后台' }).className).not.toContain('hover:scale-[1.02]');
  });
});
