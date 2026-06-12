import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ResetPasswordDialog } from '@/components/admin/ResetPasswordDialog';

const { getSettingsMock } = vi.hoisted(() => ({
  getSettingsMock: vi.fn(),
}));

vi.mock('@/services/systemSettingsService', () => ({
  SystemSettingsService: {
    getSettings: getSettingsMock,
  },
}));

describe('ResetPasswordDialog', () => {
  beforeEach(() => {
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
      await screen.findByText('密码长度应在 10-24 个字符之间，首尾空格会计入密码内容')
    ).toBeInTheDocument();
  });
});
