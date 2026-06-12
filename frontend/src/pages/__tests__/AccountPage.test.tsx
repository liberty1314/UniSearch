import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HelmetProvider } from 'react-helmet-async';
import AccountPage from '@/pages/AccountPage';

const { getMock, postMock, getSettingsMock, toastErrorMock, toastSuccessMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
  getSettingsMock: vi.fn(),
  toastErrorMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    error: toastErrorMock,
    success: toastSuccessMock,
  },
}));

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>) => {
      const { initial, animate, exit, transition, whileHover, whileTap, layout, layoutId, ...rest } = props;
      void initial; void animate; void exit; void transition; void whileHover; void whileTap; void layout; void layoutId;
      return <div {...rest}>{children}</div>;
    },
    section: ({ children, ...props }: React.HTMLAttributes<HTMLElement> & Record<string, unknown>) => {
      const { initial, animate, exit, transition, whileHover, whileTap, layout, layoutId, ...rest } = props;
      void initial; void animate; void exit; void transition; void whileHover; void whileTap; void layout; void layoutId;
      return <section {...rest}>{children}</section>;
    },
  },
}));

vi.mock('@/components/PublicPageShell', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="public-page-shell">{children}</div>,
}));

vi.mock('@/components/home/HomeSectionHeader', () => ({
  __esModule: true,
  default: ({
    eyebrow,
    title,
    description,
  }: {
    eyebrow?: string;
    title: string;
    description: string;
  }) => (
    <div>
      {eyebrow ? <p>{eyebrow}</p> : null}
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  ),
}));

vi.mock('@/lib/api', () => ({
  apiClient: {
    get: getMock,
    post: postMock,
  },
}));

vi.mock('@/services/systemSettingsService', () => ({
  SystemSettingsService: {
    getSettings: getSettingsMock,
  },
}));

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({
    username: 'cached-user',
  }),
}));

vi.mock('@/lib/error', () => ({
  getErrorMessage: (_error: unknown, fallback?: string) => fallback ?? '请求失败',
}));

describe('AccountPage', () => {
  const renderAccountPage = () =>
    render(
      <HelmetProvider>
        <AccountPage />
      </HelmetProvider>
    );

  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
    toastErrorMock.mockReset();
    toastSuccessMock.mockReset();
    getSettingsMock.mockReset();

    getMock.mockResolvedValue({
      id: 1,
      username: 'alice',
      role: 'admin',
      is_enabled: true,
      last_login_at: '2026-04-05T08:00:00.000Z',
      created_at: '2026-03-01T08:00:00.000Z',
    });
    getSettingsMock.mockResolvedValue({
      auth_password_min_length: 8,
      auth_password_max_length: 20,
    });
  });

  it('renders account workspace navigation and toggles between overview and security modules', async () => {
    const user = userEvent.setup();

    const { container } = renderAccountPage();

    expect(await screen.findByText('欢迎回来，alice')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /账号概览/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^修改密码$/ })).toBeInTheDocument();
    expect(screen.getByText('账号工作台')).toBeInTheDocument();
    expect(screen.getByText('ACCOUNT OVERVIEW')).toBeInTheDocument();
    expect(screen.getByText('身份说明')).toBeInTheDocument();
    expect(screen.getByText('活跃状态')).toBeInTheDocument();
    expect(screen.getByText('快捷动作')).toBeInTheDocument();
    expect(screen.getByText('安全提示')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '立即修改密码' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^修改密码$/ })).toHaveClass('dark:hover:bg-cyan-400/[0.08]');
    expect(container.innerHTML).toContain('dark:bg-slate-950/[0.82]');

    expect(screen.queryByLabelText('当前密码')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '立即修改密码' }));

    expect(screen.getByText('安全设置')).toBeInTheDocument();
    expect(screen.getByText('ACCOUNT SECURITY')).toBeInTheDocument();
    expect(screen.getByText('密码更新建议')).toBeInTheDocument();
    expect(screen.getAllByText('密码长度需控制在 8-20 个字符之间，首尾空格会计入密码内容').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('当前密码')).toBeInTheDocument();
    expect(screen.queryByText('安全提示')).not.toBeInTheDocument();
  });

  it('shows a toast when profile loading fails', async () => {
    getMock.mockRejectedValueOnce(new Error('boom'));

    renderAccountPage();

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith('加载个人中心失败');
    });
  });

  it('blocks password submission when confirmation does not match', async () => {
    const user = userEvent.setup();

    renderAccountPage();

    await screen.findByRole('button', { name: /^修改密码$/ });
    await user.click(screen.getByRole('button', { name: /^修改密码$/ }));
    await user.type(screen.getByLabelText('当前密码'), 'old-password');
    await user.type(screen.getByLabelText('新密码'), 'new-password');
    await user.type(screen.getByLabelText('确认新密码'), 'different-password');
    await user.click(screen.getByRole('button', { name: '更新密码' }));

    expect(postMock).not.toHaveBeenCalled();
    expect(toastErrorMock).toHaveBeenCalledWith('两次输入的密码不一致');
  });

  it('uses the configured auth policy when validating the new password', async () => {
    const user = userEvent.setup();

    renderAccountPage();

    await screen.findByRole('button', { name: /^修改密码$/ });
    await user.click(screen.getByRole('button', { name: /^修改密码$/ }));
    await user.type(screen.getByLabelText('当前密码'), 'old-password');
    await user.type(screen.getByLabelText('新密码'), 'short77');
    await user.type(screen.getByLabelText('确认新密码'), 'short77');
    await user.click(screen.getByRole('button', { name: '更新密码' }));

    expect(postMock).not.toHaveBeenCalled();
    expect(toastErrorMock).toHaveBeenCalledWith('密码长度至少为 8 个字符');
  });

  it('submits password changes and clears the form on success', async () => {
    const user = userEvent.setup();

    postMock.mockResolvedValueOnce({});

    renderAccountPage();

    await screen.findByRole('button', { name: /^修改密码$/ });
    await user.click(screen.getByRole('button', { name: /^修改密码$/ }));

    const currentPasswordInput = screen.getByLabelText('当前密码') as HTMLInputElement;
    const newPasswordInput = screen.getByLabelText('新密码') as HTMLInputElement;
    const confirmPasswordInput = screen.getByLabelText('确认新密码') as HTMLInputElement;

    await user.type(currentPasswordInput, 'old-password');
    await user.type(newPasswordInput, 'new-password');
    await user.type(confirmPasswordInput, 'new-password');
    await user.click(screen.getByRole('button', { name: '更新密码' }));

    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith('/user/change-password', {
        current_password: 'old-password',
        new_password: 'new-password',
      });
    });

    expect(toastSuccessMock).toHaveBeenCalledWith('密码修改成功');
    expect(currentPasswordInput.value).toBe('');
    expect(newPasswordInput.value).toBe('');
    expect(confirmPasswordInput.value).toBe('');
  });
});
