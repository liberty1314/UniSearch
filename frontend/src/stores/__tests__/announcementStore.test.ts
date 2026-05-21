import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAnnouncementStore } from '@/stores/announcementStore';

const getActiveAnnouncementsMock = vi.fn();
const getAnnouncementFeatureEnabledMock = vi.fn();

vi.mock('@/services/announcementService', () => ({
  AnnouncementService: {
    getActiveAnnouncements: (...args: unknown[]) => getActiveAnnouncementsMock(...args),
    getAnnouncementFeatureEnabled: (...args: unknown[]) => getAnnouncementFeatureEnabledMock(...args),
  },
}));

describe('announcementStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useAnnouncementStore.getState().reset();
    useAnnouncementStore.setState({
      readStatus: {},
      featureEnabled: false,
      error: null,
    });
    getActiveAnnouncementsMock.mockReset();
    getAnnouncementFeatureEnabledMock.mockReset();
  });

  it('只在显式标记时持久保存已读公告', () => {
    useAnnouncementStore.setState({
      activeAnnouncements: [
        {
          id: 1,
          title: '公告',
          content: '内容',
          priority: 'medium',
          start_time: '2026-05-21T00:00:00Z',
          end_time: null,
          is_enabled: true,
          created_at: '2026-05-21T00:00:00Z',
          updated_at: '2026-05-21T00:00:00Z',
          created_by: 'admin',
          updated_by: null,
        },
      ],
    });

    expect(useAnnouncementStore.getState().getUnreadAnnouncements()).toHaveLength(1);

    useAnnouncementStore.getState().markAsRead(1);

    expect(useAnnouncementStore.getState().isRead(1)).toBe(true);
    expect(useAnnouncementStore.getState().getUnreadAnnouncements()).toHaveLength(0);
    expect(localStorage.getItem('announcement_read_status')).toContain('"1":true');
  });

  it('加载公告失败时会回退为空列表并记录错误', async () => {
    getActiveAnnouncementsMock.mockRejectedValue(new Error('网络繁忙'));

    await useAnnouncementStore.getState().loadActiveAnnouncements();

    expect(useAnnouncementStore.getState().activeAnnouncements).toEqual([]);
    expect(useAnnouncementStore.getState().error).toBe('网络繁忙');
    expect(useAnnouncementStore.getState().isAnnouncementsLoading).toBe(false);
  });
});
