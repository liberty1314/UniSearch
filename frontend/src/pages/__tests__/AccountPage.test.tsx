import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HelmetProvider } from 'react-helmet-async';
import AccountPage from '@/pages/AccountPage';

const { getMock, postMock, getSettingsMock, toastErrorMock, toastSuccessMock, logoutMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
  getSettingsMock: vi.fn(),
  toastErrorMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  logoutMock: vi.fn(),
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
    refreshToken: 'refresh-token',
    logout: logoutMock,
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
    localStorage.clear();
    document.documentElement.classList.remove('dark');
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
      monthly_login_days: ['2026-04-01', '2026-04-05'],
      monthly_login_day_count: 2,
    });
    getSettingsMock.mockResolvedValue({
      auth_password_min_length: 8,
      auth_password_max_length: 20,
    });
  });

  it('renders account workspace navigation and toggles between overview, preferences and security modules', async () => {
    const user = userEvent.setup();

    const { container } = renderAccountPage();

    expect(await screen.findByText('欢迎回来，alice')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /账号概览/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /偏好设置/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /账号安全/ })).toBeInTheDocument();
    expect(screen.getByText('账号工作台')).toBeInTheDocument();
    expect(screen.getByText('ACCOUNT OVERVIEW')).toBeInTheDocument();
    expect(screen.getByText('账号状态')).toBeInTheDocument();
    expect(screen.getByText('本月活跃')).toBeInTheDocument();
    expect(screen.getByText('已登录 2 天')).toBeInTheDocument();
    expect(screen.getByText('身份说明')).toBeInTheDocument();
    expect(screen.getByText('活跃状态')).toBeInTheDocument();
    expect(screen.getByText('快捷动作')).toBeInTheDocument();
    expect(screen.getByText('安全提示')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '立即修改密码' })).toBeInTheDocument();
    expect(screen.queryByText(/API Key/i)).not.toBeInTheDocument();
    expect(screen.queryByText('搜索活动')).not.toBeInTheDocument();
    expect(screen.queryByText('搜索历史')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /账号安全/ })).toHaveClass('dark:hover:bg-cyan-400/[0.08]');
    expect(container.innerHTML).toContain('dark:bg-slate-950/[0.82]');

    expect(screen.queryByLabelText('当前密码')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /偏好设置/ }));

    expect(screen.getByText('PREFERENCES')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: '主题偏好' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: '默认结果视图' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: '公告提醒' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '立即修改密码' }));

    expect(screen.getByText('安全设置')).toBeInTheDocument();
    expect(screen.getByText('ACCOUNT SECURITY')).toBeInTheDocument();
    expect(screen.getByText('密码更新建议')).toBeInTheDocument();
    expect(screen.getAllByText('密码长度需在 8-20 个字符之间').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('当前密码')).toBeInTheDocument();
    expect(screen.queryByText('安全提示')).not.toBeInTheDocument();
  });

  it('shows an inline error state and retries when profile loading fails', async () => {
    const user = userEvent.setup();
    getMock
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({
        id: 2,
        username: 'retry-user',
        role: 'user',
        is_enabled: true,
        last_login_at: null,
        created_at: '2026-03-01T08:00:00.000Z',
        monthly_login_days: [],
        monthly_login_day_count: 0,
      });

    renderAccountPage();

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith('加载个人中心失败');
    });
    expect(screen.getByText('个人资料暂时无法同步')).toBeInTheDocument();
    expect(screen.getByText('仍可调整本地偏好，或稍后重新加载账号资料。')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '重新加载' }));

    expect(await screen.findByText('欢迎回来，retry-user')).toBeInTheDocument();
    expect(getMock).toHaveBeenCalledTimes(2);
  });

  it('persists local account preferences without showing search activity controls', async () => {
    const user = userEvent.setup();

    renderAccountPage();

    await screen.findByText('欢迎回来，alice');
    await user.click(screen.getByRole('button', { name: /偏好设置/ }));
    await user.click(screen.getByRole('button', { name: '深色' }));
    await user.click(screen.getByRole('button', { name: '列表视图' }));
    await user.click(screen.getByLabelText('阿里云盘'));
    await user.click(screen.getByRole('switch', { name: '公告提醒' }));
    await user.click(screen.getByRole('button', { name: '保存偏好' }));

    expect(toastSuccessMock).toHaveBeenCalledWith('偏好设置已保存');
    expect(localStorage.getItem('unisearch_account_preferences')).toContain('"theme":"dark"');
    expect(localStorage.getItem('unisearch_account_preferences')).toContain('"resultView":"list"');
    expect(localStorage.getItem('unisearch_account_preferences')).toContain('"defaultCloudTypes":["aliyun"]');
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(document.documentElement).toHaveClass('dark');
    expect(localStorage.getItem('unisearch_search_results_view_mode')).toBe(JSON.stringify('list'));
    expect(localStorage.getItem('unisearch_account_search_defaults')).toContain('"cloudTypes":["aliyun"]');
    expect(screen.queryByText('最近有效搜索')).not.toBeInTheDocument();
    expect(screen.queryByText('最近资源')).not.toBeInTheDocument();
  });

  it('blocks password submission when confirmation does not match', async () => {
    const user = userEvent.setup();

    renderAccountPage();

    await screen.findByRole('button', { name: /账号安全/ });
    await user.click(screen.getByRole('button', { name: /账号安全/ }));
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

    await screen.findByRole('button', { name: /账号安全/ });
    await user.click(screen.getByRole('button', { name: /账号安全/ }));
    await user.type(screen.getByLabelText('当前密码'), 'old-password');
    await user.type(screen.getByLabelText('新密码'), 'short77');
    await user.type(screen.getByLabelText('确认新密码'), 'short77');
    await user.click(screen.getByRole('button', { name: '更新密码' }));

    expect(postMock).not.toHaveBeenCalled();
    expect(toastErrorMock).toHaveBeenCalledWith('密码长度至少为 8 个字符');
  });

  it('removes whitespace from all password fields before changing password', async () => {
    const user = userEvent.setup();

    postMock.mockResolvedValueOnce({});

    renderAccountPage();

    await screen.findByRole('button', { name: /账号安全/ });
    await user.click(screen.getByRole('button', { name: /账号安全/ }));
    await user.type(screen.getByLabelText('当前密码'), 'old password');
    await user.type(screen.getByLabelText('新密码'), 'new password 123');
    await user.type(screen.getByLabelText('确认新密码'), 'newpassword123');
    await user.click(screen.getByRole('button', { name: '更新密码' }));

    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith('/user/change-password', {
        current_password: 'oldpassword',
        new_password: 'newpassword123',
      });
    });
  });

  it('toggles visibility for every account password input', async () => {
    const user = userEvent.setup();

    renderAccountPage();

    await screen.findByRole('button', { name: /账号安全/ });
    await user.click(screen.getByRole('button', { name: /账号安全/ }));

    const currentPasswordInput = screen.getByLabelText('当前密码') as HTMLInputElement;
    const newPasswordInput = screen.getByLabelText('新密码') as HTMLInputElement;
    const confirmPasswordInput = screen.getByLabelText('确认新密码') as HTMLInputElement;

    expect(currentPasswordInput.type).toBe('password');
    expect(newPasswordInput.type).toBe('password');
    expect(confirmPasswordInput.type).toBe('password');

    await user.click(screen.getByRole('button', { name: '显示当前密码' }));
    await user.click(screen.getByRole('button', { name: '显示新密码' }));
    await user.click(screen.getByRole('button', { name: '显示确认新密码' }));

    expect(currentPasswordInput.type).toBe('text');
    expect(newPasswordInput.type).toBe('text');
    expect(confirmPasswordInput.type).toBe('text');

    await user.click(screen.getByRole('button', { name: '隐藏当前密码' }));
    await user.click(screen.getByRole('button', { name: '隐藏新密码' }));
    await user.click(screen.getByRole('button', { name: '隐藏确认新密码' }));

    expect(currentPasswordInput.type).toBe('password');
    expect(newPasswordInput.type).toBe('password');
    expect(confirmPasswordInput.type).toBe('password');
  });

  it('submits password changes and clears the form on success', async () => {
    const user = userEvent.setup();

    postMock.mockResolvedValueOnce({});

    renderAccountPage();

    await screen.findByRole('button', { name: /账号安全/ });
    await user.click(screen.getByRole('button', { name: /账号安全/ }));

    const currentPasswordInput = screen.getByLabelText('当前密码') as HTMLInputElement;
    const newPasswordInput = screen.getByLabelText('新密码') as HTMLInputElement;
    const confirmPasswordInput = screen.getByLabelText('确认新密码') as HTMLInputElement;

    expect(screen.getByRole('button', { name: '更新密码' })).toBeDisabled();

    await user.type(currentPasswordInput, 'old-password');
    await user.type(newPasswordInput, 'new-password');
    await user.type(confirmPasswordInput, 'new-password');
    expect(screen.getByRole('button', { name: '更新密码' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: '更新密码' }));

    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith('/user/change-password', {
        current_password: 'old-password',
        new_password: 'new-password',
      });
    });

    expect(toastSuccessMock).toHaveBeenCalledWith('密码修改成功，下次登录请使用新密码');
    expect(currentPasswordInput.value).toBe('');
    expect(newPasswordInput.value).toBe('');
    expect(confirmPasswordInput.value).toBe('');
  });
});
