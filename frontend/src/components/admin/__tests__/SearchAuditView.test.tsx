import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SearchAuditView from '@/components/admin/SearchAuditView';
import type { SearchAuditLog } from '@/types/searchAudit';

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

vi.mock('@/services/searchAuditService', () => ({
  SearchAuditService: {
    list: listMock,
    cleanup: cleanupMock,
  },
}));

const buildLog = (id: number): SearchAuditLog => ({
  id,
  user_id: 1,
  username: 'admin',
  keyword: `关键词${id}`,
  result_count: id,
  scope: 'normal',
  client_ip: '::1',
  request_id: `req-${id}`,
  created_at: '2026-09-01T09:00:00+08:00',
});

describe('SearchAuditView', () => {
  beforeEach(() => {
    listMock.mockReset();
    cleanupMock.mockReset();
    toastSuccessMock.mockClear();
    listMock.mockResolvedValue({
      items: [buildLog(1)],
      total: 1,
      page: 1,
      size: 10,
    });
    cleanupMock.mockResolvedValue({ success: true, deleted: 5 });
  });

  it('默认展示 30 天并支持自定义留存天数后清理', async () => {
    const user = userEvent.setup();
    render(<SearchAuditView />);

    await user.click(await screen.findByRole('button', { name: /清理旧记录/ }));

    const daysInput = await screen.findByLabelText('留存天数');
    expect(daysInput).toHaveValue(30);

    await user.clear(daysInput);
    await user.type(daysInput, '7');
    expect(screen.getByText(/将删除 7 天前的搜索审计记录/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '确认清理' }));

    expect(cleanupMock).toHaveBeenCalledWith(7);
    expect(toastSuccessMock).toHaveBeenCalledWith('已清理 5 条 7 天前的记录');
  });

  it('留存天数非法时禁用确认按钮', async () => {
    const user = userEvent.setup();
    render(<SearchAuditView />);

    await user.click(await screen.findByRole('button', { name: /清理旧记录/ }));

    const daysInput = await screen.findByLabelText('留存天数');
    await user.clear(daysInput);
    await user.type(daysInput, '0');

    expect(screen.getByText('请输入大于 0 的整数天数')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '确认清理' })).toBeDisabled();
    expect(cleanupMock).not.toHaveBeenCalled();
  });
});
