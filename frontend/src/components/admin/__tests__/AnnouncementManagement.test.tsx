import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AnnouncementManagement } from '../AnnouncementManagement';

const announcements = Array.from({ length: 12 }, (_, index) => {
  const id = index + 1;
  return {
    id,
    title: `公告 ${id}`,
    content: `<p>公告内容 ${id}</p>`,
    priority: 'medium',
    start_time: '2026-05-17T00:00:00Z',
    end_time: null,
    is_enabled: true,
    created_at: '2026-05-17T00:00:00Z',
    updated_at: '2026-05-17T00:00:00Z',
  };
});

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({ token: 'test-token' }),
}));

vi.mock('@/components/admin/CreateUserDialog', () => ({
  CreateUserDialog: () => null,
}));

vi.mock('@/components/admin/EditUserDialog', () => ({
  EditUserDialog: () => null,
}));

vi.mock('@/components/admin/ResetPasswordDialog', () => ({
  ResetPasswordDialog: () => null,
}));

vi.mock('@/components/admin/BatchDeleteDialog', () => ({
  BatchDeleteDialog: () => null,
}));

vi.mock('@/components/admin/BatchUpdateRoleDialog', () => ({
  BatchUpdateRoleDialog: () => null,
}));

vi.mock('@/components/ui/confirm-dialog', () => ({
  ConfirmDialog: () => null,
}));

vi.mock('@/services/announcementService', () => ({
  AnnouncementService: {
    getAnnouncementFeatureEnabled: vi.fn(async () => true),
    listAnnouncements: vi.fn(async (_page: number, pageSize: number) => ({
      announcements: announcements.slice((_page - 1) * pageSize, _page * pageSize),
      total: announcements.length,
      page: _page,
      page_size: pageSize,
      total_pages: Math.ceil(announcements.length / pageSize),
    })),
    setAnnouncementFeatureEnabled: vi.fn(),
    setAnnouncementStatus: vi.fn(),
    createAnnouncement: vi.fn(),
    updateAnnouncement: vi.fn(),
    deleteAnnouncement: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('AnnouncementManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('会渲染分页器并支持切换页大小', async () => {
    render(<AnnouncementManagement />);

    expect(await screen.findByText('公告 1')).toBeInTheDocument();
    expect(screen.queryByText('公告 11')).not.toBeInTheDocument();

    const pageSizeSelect = screen.getByRole('combobox', { name: '每页条数' });
    await userEvent.selectOptions(pageSizeSelect, '20');

    expect(await screen.findByText('公告 11')).toBeInTheDocument();
  });
});
