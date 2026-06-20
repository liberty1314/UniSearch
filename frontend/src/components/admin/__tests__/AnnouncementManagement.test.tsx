import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AnnouncementManagement } from '../AnnouncementManagement';
import type { Announcement } from "@/types/announcement";
import type { AnnouncementLifecycleStatus } from '@/lib/announcement';

const now = new Date('2026-05-21T12:00:00Z');
const announcements: Announcement[] = [
  {
    id: 1,
    title: '进行中公告',
    content: '## 进行中\n\n公告内容 1',
    priority: 'high',
    start_time: '2026-05-20T00:00:00Z',
    end_time: '2026-05-22T00:00:00Z',
    is_enabled: true,
    created_at: '2026-05-20T00:00:00Z',
    updated_at: '2026-05-20T00:00:00Z',
    created_by: 'admin',
    updated_by: null,
  },
  {
    id: 2,
    title: '未生效公告',
    content: '## 未生效\n\n公告内容 2',
    priority: 'medium',
    start_time: '2026-05-22T00:00:00Z',
    end_time: null,
    is_enabled: true,
    created_at: '2026-05-21T00:00:00Z',
    updated_at: '2026-05-21T00:00:00Z',
    created_by: 'admin',
    updated_by: null,
  },
  {
    id: 3,
    title: '已过期公告',
    content: '## 已过期\n\n公告内容 3',
    priority: 'low',
    start_time: '2026-05-18T00:00:00Z',
    end_time: '2026-05-20T00:00:00Z',
    is_enabled: true,
    created_at: '2026-05-18T00:00:00Z',
    updated_at: '2026-05-18T00:00:00Z',
    created_by: 'admin',
    updated_by: null,
  },
  ...Array.from({ length: 9 }, (_, index) => {
    const id = index + 4;
    return {
      id,
      title: `公告 ${id}`,
      content: `公告内容 ${id}`,
      priority: 'medium' as const,
      start_time: '2026-05-17T00:00:00Z',
      end_time: null,
      is_enabled: true,
      created_at: '2026-05-17T00:00:00Z',
      updated_at: '2026-05-17T00:00:00Z',
      created_by: 'admin',
      updated_by: null,
    };
  }),
];

const listAnnouncementsMock = vi.fn(async (_page: number, pageSize: number, _sortBy?: string, _sortOrder?: string, filters?: {
  keyword?: string;
  priority?: string;
  is_enabled?: boolean;
  lifecycle_status?: string;
}) => {
  const filtered = announcements.filter((announcement) => {
    if (filters?.keyword && !announcement.title.includes(filters.keyword)) {
      return false;
    }
    if (filters?.priority && announcement.priority !== filters.priority) {
      return false;
    }
    if (typeof filters?.is_enabled === 'boolean' && announcement.is_enabled !== filters.is_enabled) {
      return false;
    }
    if (filters?.lifecycle_status === 'scheduled') {
      return new Date(announcement.start_time) > now;
    }
    if (filters?.lifecycle_status === 'active') {
      return new Date(announcement.start_time) <= now &&
        (!announcement.end_time || new Date(announcement.end_time) >= now);
    }
    if (filters?.lifecycle_status === 'expired') {
      return announcement.end_time ? new Date(announcement.end_time) < now : false;
    }
    return true;
  });

  return {
    announcements: filtered.slice((_page - 1) * pageSize, _page * pageSize),
    total: filtered.length,
    page: _page,
    page_size: pageSize,
    total_pages: Math.max(1, Math.ceil(filtered.length / pageSize)),
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

vi.mock('@/lib/announcement', async () => {
  const actual = await vi.importActual<typeof import('@/lib/announcement')>('@/lib/announcement');

  const getLifecycleStatus = (announcement: {
    start_time: string;
    end_time: string | null;
  }): AnnouncementLifecycleStatus => {
    const startTime = new Date(announcement.start_time);
    const endTime = announcement.end_time ? new Date(announcement.end_time) : null;

    if (startTime > now) {
      return 'scheduled';
    }
    if (endTime && endTime < now) {
      return 'expired';
    }
    return 'active';
  };

  return {
    ...actual,
    getAnnouncementLifecycleStatus: getLifecycleStatus,
  };
});

vi.mock('@/services/announcementService', () => ({
  AnnouncementService: {
    getAnnouncementFeatureEnabled: vi.fn(async () => true),
    listAnnouncements: (...args: Parameters<typeof listAnnouncementsMock>) =>
      listAnnouncementsMock(...args),
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

    expect(await screen.findByText('进行中公告')).toBeInTheDocument();
    expect(screen.queryByText('公告 11')).not.toBeInTheDocument();

    const pageSizeSelect = screen.getByRole('combobox', { name: '每页条数' });
    await userEvent.click(pageSizeSelect);
    const listbox = await screen.findByRole('listbox');
    await userEvent.click(within(listbox).getByRole('option', { name: '20 条' }));

    expect(await screen.findByText('公告 11')).toBeInTheDocument();
  });

  it('支持按关键字和生命周期筛选公告列表', async () => {
    const user = userEvent.setup();

    render(<AnnouncementManagement />);

    expect(await screen.findByText('进行中公告')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('按标题搜索公告'), '未生效');
    await user.click(screen.getByRole('combobox', { name: '生命周期状态' }));
    await user.click(await screen.findByRole('option', { name: '未生效' }));

    expect(await screen.findByText('未生效公告')).toBeInTheDocument();
    expect(screen.queryByText('进行中公告')).not.toBeInTheDocument();
    expect(listAnnouncementsMock).toHaveBeenLastCalledWith(
      1,
      10,
      'created_at',
      'desc',
      expect.objectContaining({
        keyword: '未生效',
        lifecycle_status: 'scheduled',
      })
    );
  });

  it('会展示生命周期状态并在表单中实时预览 Markdown 内容', async () => {
    const user = userEvent.setup();

    render(<AnnouncementManagement />);

    expect((await screen.findAllByText('进行中')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('未生效').length).toBeGreaterThan(0);
    expect(screen.getAllByText('已过期').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: /创建公告/i }));
    expect(
      screen.getByText('配置公告标题、Markdown 内容、生效时间和启用状态，保存后会按生命周期规则向用户展示。')
    ).toBeInTheDocument();
    await user.type(screen.getByLabelText(/内容/), '# 预览标题\n\n**加粗内容**');

    expect(await screen.findByRole('heading', { name: '预览标题' })).toBeInTheDocument();
    expect(screen.getByText('加粗内容')).toBeInTheDocument();
  });
});
