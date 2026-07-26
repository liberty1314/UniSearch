import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ResetPasswordDialog } from '@/components/admin/ResetPasswordDialog';

const { getSettingsMock, resetPasswordMock } = vi.hoisted(() => ({
  getSettingsMock: vi.fn(),
  resetPasswordMock: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('@/services/userService', () => ({
  UserService: {
    resetPassword: resetPasswordMock,
  },
}));

vi.mock('@/services/systemSettingsService', () => ({
  SystemSettingsService: {
    getSettings: getSettingsMock,
  },
}));

describe('ResetPasswordDialog', () => {
  beforeEach(() => {
    resetPasswordMock.mockReset();
    resetPasswordMock.mockResolvedValue(undefined);
    getSettingsMock.mockResolvedValue({
      auth_password_min_length: 10,
      auth_password_max_length: 24,
    });
  });

  it('renders password helper text from auth policy', async () => {
    render(
      <ResetPasswordDialog
        open
        onOpenChange={() => {}}
        user={{
          id: 1,
          username: 'neo',
          role: 'user',
          is_enabled: true,
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
          last_login_at: '2026-01-01T00:00:00.000Z',
        }}
        onSuccess={() => {}}
      />
    );

    expect(
      await screen.findByText(/密码长度需在 10-24 个字符之间/)
    ).toBeInTheDocument();
  });

  it('removes whitespace before submitting a reset password request', async () => {
    const user = userEvent.setup();

    render(
      <ResetPasswordDialog
        open
        onOpenChange={() => {}}
        user={{
          id: 1,
          username: 'neo',
          role: 'user',
          is_enabled: true,
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
          last_login_at: '2026-01-01T00:00:00.000Z',
        }}
        onSuccess={() => {}}
      />
    );

    await user.type(screen.getByLabelText(/^新密码/), 'reset password 123');
    await user.type(screen.getByLabelText(/^确认密码/), 'resetpassword123');
    await user.click(screen.getByRole('button', { name: '重置密码' }));

    await waitFor(() => {
      expect(resetPasswordMock).toHaveBeenCalledWith(1, 'resetpassword123');
    });
  });
});
