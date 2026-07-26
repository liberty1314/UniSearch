import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateUserDialog } from '@/components/admin/CreateUserDialog';

const { createUserMock, getSettingsMock } = vi.hoisted(() => ({
  createUserMock: vi.fn(),
  getSettingsMock: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('@/services/userService', () => ({
  UserService: {
    createUser: createUserMock,
  },
}));

vi.mock('@/services/systemSettingsService', () => ({
  SystemSettingsService: {
    getSettings: getSettingsMock,
  },
}));

describe('CreateUserDialog', () => {
  beforeEach(() => {
    createUserMock.mockReset();
    createUserMock.mockResolvedValue({ restored: false });
    getSettingsMock.mockResolvedValue({
      auth_username_min_length: 5,
      auth_username_max_length: 18,
      auth_password_min_length: 8,
      auth_password_max_length: 20,
    });
  });

  it('toggles password visibility for both password fields', async () => {
    const user = userEvent.setup();

    render(
      <CreateUserDialog
        open
        onOpenChange={() => {}}
        onSuccess={() => {}}
      />
    );

    expect(screen.getByRole('dialog', { name: '创建用户' })).toHaveClass('modal-shell-surface');
    expect(screen.getByRole('button', { name: '关闭弹窗' })).toHaveClass('modal-shell-close');

    const passwordInput = screen.getByLabelText('密码') as HTMLInputElement;
    const confirmPasswordInput = screen.getByLabelText('确认密码') as HTMLInputElement;

    expect(passwordInput.type).toBe('password');
    expect(confirmPasswordInput.type).toBe('password');

    await user.click(screen.getByRole('button', { name: '显示密码' }));
    await user.click(screen.getByRole('button', { name: '显示确认密码' }));

    expect(passwordInput.type).toBe('text');
    expect(confirmPasswordInput.type).toBe('text');

    await user.click(screen.getByRole('button', { name: '隐藏密码' }));
    await user.click(screen.getByRole('button', { name: '隐藏确认密码' }));

    expect(passwordInput.type).toBe('password');
    expect(confirmPasswordInput.type).toBe('password');
  });

  it('renders auth policy driven helper text', async () => {
    render(
      <CreateUserDialog
        open
        onOpenChange={() => {}}
        onSuccess={() => {}}
      />
    );

    expect(await screen.findByText('用户名长度为 5-18 字符')).toBeInTheDocument();
    expect(screen.getByText(/密码长度需在 8-20 个字符之间/)).toBeInTheDocument();
  });

  it('removes whitespace before creating a user password', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();

    render(
      <CreateUserDialog
        open
        onOpenChange={() => {}}
        onSuccess={onSuccess}
      />
    );

    await user.type(screen.getByLabelText('用户名'), 'neo-user');
    await user.type(screen.getByLabelText('密码'), 'Secret 1234');
    await user.type(screen.getByLabelText('确认密码'), 'Secret1234');
    await user.click(screen.getByRole('button', { name: '创建用户' }));

    expect(createUserMock).toHaveBeenCalledWith('neo-user', 'Secret1234', 'user', false);
  });
});
