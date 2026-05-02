import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import AdminLogin from '@/pages/AdminLogin';

const { navigateMock, getSettingsMock, setTokenMock, adminLoginWithRememberMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  getSettingsMock: vi.fn(),
  setTokenMock: vi.fn(),
  adminLoginWithRememberMock: vi.fn(),
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

vi.mock('@/services/authService', () => ({
  AuthService: {
    adminLoginWithRemember: adminLoginWithRememberMock,
  },
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
    adminLoginWithRememberMock.mockReset();
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
    expect(screen.getByRole('button', { name: '登录' }).className).not.toContain(' glass ');
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
    expect(screen.getByRole('button', { name: '立即注册' }).className).not.toContain(' glass ');
  });

  it('keeps auth primary actions available before input state updates so browser autofill cannot lock the page', async () => {
    const loginRender = render(
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage />
      </MemoryRouter>
    );

    expect(await screen.findByRole('button', { name: '登录' })).toBeEnabled();
    cleanup();

    const registerRender = render(
      <MemoryRouter initialEntries={['/register']}>
        <RegisterPage />
      </MemoryRouter>
    );

    expect(await screen.findByRole('button', { name: '立即注册' })).toBeEnabled();
    cleanup();

    render(
      <MemoryRouter initialEntries={['/admin/login']}>
        <AdminLogin />
      </MemoryRouter>
    );

    expect(await screen.findByRole('button', { name: '登录后台' })).toBeEnabled();

    loginRender.unmount();
    registerRender.unmount();
  });

  it('keeps login and register pages on the same fixed auth layout footprint', async () => {
    const loginRender = render(
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage />
      </MemoryRouter>
    );

    await screen.findByText('欢迎回来');

    const loginRoot = loginRender.container.firstChild as HTMLElement;
    const loginCard = loginRender.container.querySelector('.glass-card-premium') as HTMLElement;

    expect(loginRoot).toHaveClass('min-h-dvh');
    expect(loginRoot).toHaveClass('overflow-hidden');
    expect(loginRoot).not.toHaveClass('overflow-y-auto');
    expect(loginCard.className).toContain('min-h-[35rem]');

    cleanup();

    const registerRender = render(
      <MemoryRouter initialEntries={['/register']}>
        <RegisterPage />
      </MemoryRouter>
    );

    await screen.findByText('创建账户');

    const registerRoot = registerRender.container.firstChild as HTMLElement;
    const registerCard = registerRender.container.querySelector('.glass-card-premium') as HTMLElement;

    expect(registerRoot.className).toBe(loginRoot.className);
    expect(registerCard.className).toContain('min-h-[35rem]');
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
    expect(screen.getByRole('button', { name: '登录后台' }).className).not.toContain(' glass ');
  });

  it('does not perform an extra client-side navigate after successful admin login', async () => {
    adminLoginWithRememberMock.mockResolvedValue({
      access_token: 'token',
      refresh_token: 'refresh',
      username: 'admin',
    });

    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/admin/login']}>
        <AdminLogin />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('管理员登录')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('用户名'), 'admin');
    await user.type(screen.getByLabelText('管理员密码'), 'secret');
    await user.click(screen.getByRole('button', { name: '登录后台' }));

    await waitFor(() => {
      expect(setTokenMock).toHaveBeenCalledWith('token', 'admin', true, 'refresh');
    });

    expect(adminLoginWithRememberMock).toHaveBeenCalledWith('admin', 'secret', false);
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
