import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AccountPage from '@/pages/AccountPage';

const { getMock, postMock, toastErrorMock, toastSuccessMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
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
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
    section: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => <section {...props}>{children}</section>,
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

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({
    username: 'cached-user',
  }),
}));

vi.mock('@/lib/error', () => ({
  getErrorMessage: (_error: unknown, fallback?: string) => fallback ?? '请求失败',
}));

describe('AccountPage', () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
    toastErrorMock.mockReset();
    toastSuccessMock.mockReset();

    getMock.mockResolvedValue({
      id: 1,
      username: 'alice',
      role: 'admin',
      is_enabled: true,
      last_login_at: '2026-04-05T08:00:00.000Z',
      created_at: '2026-03-01T08:00:00.000Z',
    });
  });

  it('renders account workspace navigation and toggles between overview and security modules', async () => {
    const user = userEvent.setup();

    render(<AccountPage />);

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

    expect(screen.queryByLabelText('当前密码')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '立即修改密码' }));

    expect(screen.getByText('安全设置')).toBeInTheDocument();
    expect(screen.getByText('ACCOUNT SECURITY')).toBeInTheDocument();
    expect(screen.getByText('密码更新建议')).toBeInTheDocument();
    expect(screen.getByLabelText('当前密码')).toBeInTheDocument();
    expect(screen.queryByText('安全提示')).not.toBeInTheDocument();
  });

  it('shows a toast when profile loading fails', async () => {
    getMock.mockRejectedValueOnce(new Error('boom'));

    render(<AccountPage />);

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith('加载个人中心失败');
    });
  });

  it('blocks password submission when confirmation does not match', async () => {
    const user = userEvent.setup();

    render(<AccountPage />);

    await screen.findByRole('button', { name: /^修改密码$/ });
    await user.click(screen.getByRole('button', { name: /^修改密码$/ }));
    await user.type(screen.getByLabelText('当前密码'), 'old-password');
    await user.type(screen.getByLabelText('新密码'), 'new-password');
    await user.type(screen.getByLabelText('确认新密码'), 'different-password');
    await user.click(screen.getByRole('button', { name: '更新密码' }));

    expect(postMock).not.toHaveBeenCalled();
    expect(toastErrorMock).toHaveBeenCalledWith('两次输入的密码不一致');
  });

  it('submits password changes and clears the form on success', async () => {
    const user = userEvent.setup();

    postMock.mockResolvedValueOnce({});

    render(<AccountPage />);

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
