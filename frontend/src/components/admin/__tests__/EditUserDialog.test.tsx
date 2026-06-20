import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditUserDialog } from '@/components/admin/EditUserDialog';
import type { UserInfo } from "@/types/user";

const authState = {
  username: 'admin',
};

const { getSettingsMock } = vi.hoisted(() => ({
  getSettingsMock: vi.fn(),
}));

vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector?: (state: typeof authState) => unknown) =>
    (selector ? selector(authState) : authState),
}));

vi.mock('@/services/systemSettingsService', () => ({
  SystemSettingsService: {
    getSettings: getSettingsMock,
  },
}));

const mockUser: UserInfo = {
  id: 61,
  username: 'lihua',
  role: 'user',
  is_enabled: true,
  created_at: '2026-01-19T08:25:00.000Z',
  updated_at: '2026-05-01T14:17:08.000Z',
  last_login_at: '2026-05-01T14:17:08.000Z',
};

const getBracketZIndex = (className: string): number => {
  const match = className.match(/z-\[(\d+)\]/);
  return match ? Number(match[1]) : 0;
};

describe('EditUserDialog', () => {
  beforeEach(() => {
    getSettingsMock.mockReset();
    getSettingsMock.mockResolvedValue({
      auth_username_min_length: 4,
      auth_username_max_length: 16,
    });
  });

  beforeAll(() => {
    if (!HTMLElement.prototype.scrollIntoView) {
      HTMLElement.prototype.scrollIntoView = () => {};
    }
    if (!HTMLElement.prototype.hasPointerCapture) {
      HTMLElement.prototype.hasPointerCapture = () => false;
    }
    if (!HTMLElement.prototype.setPointerCapture) {
      HTMLElement.prototype.setPointerCapture = () => {};
    }
    if (!HTMLElement.prototype.releasePointerCapture) {
      HTMLElement.prototype.releasePointerCapture = () => {};
    }
  });

  afterAll(() => {
    delete (HTMLElement.prototype as Partial<HTMLElement>).scrollIntoView;
    delete (HTMLElement.prototype as Partial<HTMLElement>).hasPointerCapture;
    delete (HTMLElement.prototype as Partial<HTMLElement>).setPointerCapture;
    delete (HTMLElement.prototype as Partial<HTMLElement>).releasePointerCapture;
  });

  afterEach(() => {
    authState.username = 'admin';
  });

  it('在共享弹窗壳中打开角色下拉时，浮层层级高于 dialog 内容层', async () => {
    const user = userEvent.setup();

    authState.username = 'admin';

    render(
      <EditUserDialog
        open
        onOpenChange={() => {}}
        user={mockUser}
        onSuccess={() => {}}
      />
    );

    const dialog = screen.getByRole('dialog', { name: '编辑用户' });
    expect(dialog).toHaveClass('modal-shell-surface');

    await user.click(screen.getByRole('combobox', { name: /角色/i }));

    const listbox = await screen.findByRole('listbox');
    expect(within(listbox).getByRole('option', { name: '管理员' })).toBeInTheDocument();
    expect(getBracketZIndex(listbox.className)).toBeGreaterThan(getBracketZIndex(dialog.className));
  });

  it('renders username helper text from auth policy', async () => {
    render(
      <EditUserDialog
        open
        onOpenChange={() => {}}
        user={mockUser}
        onSuccess={() => {}}
      />
    );

    expect(await screen.findByText('用户名长度为 4-16 字符')).toBeInTheDocument();
  });
});
