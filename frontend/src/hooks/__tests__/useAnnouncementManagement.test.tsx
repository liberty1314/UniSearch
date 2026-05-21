import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAnnouncementManagement } from '../useAnnouncementManagement';

const getAnnouncementFeatureEnabledMock = vi.fn();
const listAnnouncementsMock = vi.fn();

vi.mock('@/services/announcementService', () => ({
  AnnouncementService: {
    getAnnouncementFeatureEnabled: (...args: unknown[]) =>
      getAnnouncementFeatureEnabledMock(...args),
    listAnnouncements: (...args: unknown[]) => listAnnouncementsMock(...args),
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

describe('useAnnouncementManagement', () => {
  beforeEach(() => {
    getAnnouncementFeatureEnabledMock.mockReset();
    listAnnouncementsMock.mockReset();

    getAnnouncementFeatureEnabledMock.mockResolvedValue(true);
    listAnnouncementsMock.mockImplementation(async (page: number, pageSize: number) => ({
      announcements: Array.from({ length: Math.min(pageSize, 2) }, (_, index) => ({
        id: (page - 1) * pageSize + index + 1,
        title: `公告 ${(page - 1) * pageSize + index + 1}`,
        content: '## 公告内容',
        priority: 'medium',
        start_time: '2026-05-20T00:00:00Z',
        end_time: null,
        is_enabled: true,
        created_at: '2026-05-20T00:00:00Z',
        updated_at: '2026-05-20T00:00:00Z',
        created_by: 'admin',
        updated_by: null,
      })),
      total: 12,
      page,
      page_size: pageSize,
      total_pages: 2,
    }));
  });

  it('切换页码时只刷新公告列表，不重复请求功能开关', async () => {
    const { result } = renderHook(() => useAnnouncementManagement());

    await waitFor(() => {
      expect(getAnnouncementFeatureEnabledMock).toHaveBeenCalledTimes(1);
      expect(listAnnouncementsMock).toHaveBeenCalledWith(
        1,
        10,
        'created_at',
        'desc',
        {
          keyword: undefined,
          priority: undefined,
          is_enabled: undefined,
          lifecycle_status: undefined,
        }
      );
    });

    act(() => {
      result.current.actions.setCurrentPage(2);
    });

    await waitFor(() => {
      expect(listAnnouncementsMock).toHaveBeenLastCalledWith(
        2,
        10,
        'created_at',
        'desc',
        {
          keyword: undefined,
          priority: undefined,
          is_enabled: undefined,
          lifecycle_status: undefined,
        }
      );
    });

    expect(getAnnouncementFeatureEnabledMock).toHaveBeenCalledTimes(1);
  });
});
