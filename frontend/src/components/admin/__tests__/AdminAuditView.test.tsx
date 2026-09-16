import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminAuditView from '@/components/admin/AdminAuditView';

const { listMock, cleanupMock, logoutMock, toastSuccessMock } = vi.hoisted(() => ({
  listMock: vi.fn(),
  cleanupMock: vi.fn(),
  logoutMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: toastSuccessMock,
  },
}));

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({ isAdmin: true, logout: logoutMock }),
}));

vi.mock('@/services/adminAuditService', () => ({
  AdminAuditService: {
    list: listMock,
    cleanup: cleanupMock,
  },
}));

describe('AdminAuditView', () => {
  beforeEach(() => {
    listMock.mockReset();
    cleanupMock.mockReset();
    listMock.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      size: 10,
    });
    cleanupMock.mockResolvedValue({ success: true, deleted: 12 });
  });

  it('默认展示 30 天并支持自定义留存天数后清理', async () => {
    const user = userEvent.setup();
    render(<AdminAuditView />);

    await user.click(await screen.findByRole('button', { name: /清理旧记录/ }));

    const daysInput = await screen.findByLabelText('留存天数');
    expect(daysInput).toHaveValue(30);

    await user.clear(daysInput);
    await user.type(daysInput, '15');
    expect(screen.getByText(/将删除 15 天前的操作审计记录/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '确认清理' }));

    expect(cleanupMock).toHaveBeenCalledWith(15);
    expect(toastSuccessMock).toHaveBeenCalledWith('已清理 12 条 15 天前的记录');
  });

  it('留存天数非法时禁用确认按钮', async () => {
    const user = userEvent.setup();
    render(<AdminAuditView />);

    await user.click(await screen.findByRole('button', { name: /清理旧记录/ }));

    const daysInput = await screen.findByLabelText('留存天数');
    await user.clear(daysInput);
    await user.type(daysInput, '-3');

    expect(screen.getByText('请输入大于 0 的整数天数')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '确认清理' })).toBeDisabled();
    expect(cleanupMock).not.toHaveBeenCalled();
  });
});
