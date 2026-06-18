import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Announcement, AnnouncementReadStatus } from '@/types/api';
import { AnnouncementService } from '@/services/announcementService';
import { getErrorMessage, getErrorStatus } from '@/lib/error';
import { readJsonStorage, writeJsonStorage } from '@/lib/safeStorage';

/**
 * 本地存储键名
 */
const READ_STATUS_KEY = 'announcement_read_status';

/**
 * 公告状态接口
 */
interface AnnouncementState {
  // 公告列表（缓存）
  announcements: Announcement[];

  // 当前有效公告（用户端）
  activeAnnouncements: Announcement[];

  // 已读状态（本地存储）
  readStatus: AnnouncementReadStatus;

  // 功能开关加载状态
  isFeatureLoading: boolean;

  // 公告列表加载状态
  isAnnouncementsLoading: boolean;

  // 错误信息
  error: string | null;

  // 功能开关状态
  featureEnabled: boolean;

  // 操作方法
  loadActiveAnnouncements: () => Promise<void>;
  markAsRead: (announcementId: number) => void;
  isRead: (announcementId: number) => boolean;
  getUnreadAnnouncements: () => Announcement[];
  loadFeatureStatus: () => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

/**
 * 从 localStorage 加载已读状态
 */
const loadReadStatusFromStorage = (): AnnouncementReadStatus => {
  return readJsonStorage<AnnouncementReadStatus>(READ_STATUS_KEY, {});
};

/**
 * 保存已读状态到 localStorage
 */
const saveReadStatusToStorage = (status: AnnouncementReadStatus): void => {
  writeJsonStorage(READ_STATUS_KEY, status);
};

/**
 * 公告状态管理
 * 
 * 管理公告列表缓存、已读状态和功能开关状态。
 * 已读状态存储在 localStorage 中，格式为 { [announcementId]: true }。
 */
export const useAnnouncementStore = create<AnnouncementState>()(
  devtools(
    (set, get) => ({
      // 初始状态
      announcements: [],
      activeAnnouncements: [],
      readStatus: loadReadStatusFromStorage(),
      isFeatureLoading: false,
      isAnnouncementsLoading: false,
      error: null,
      featureEnabled: false,

      /**
       * 加载当前有效公告（用户端）
       * 
       * 从后端获取有效公告列表，后端会自动检查功能开关状态。
       * 如果功能未启用，后端返回空数组。
       */
      loadActiveAnnouncements: async () => {
        set({ isAnnouncementsLoading: true, error: null });

        try {
          const announcements = await AnnouncementService.getActiveAnnouncements();
          set({
            activeAnnouncements: announcements,
            isAnnouncementsLoading: false,
          });
        } catch (error) {
          if (getErrorStatus(error) === 401) {
            set({
              activeAnnouncements: [],
              isAnnouncementsLoading: false,
            });
            return;
          }

          console.error('加载有效公告失败:', error);
          set({
            error: getErrorMessage(error, '加载公告失败'),
            isAnnouncementsLoading: false,
            activeAnnouncements: [], // 失败时设置为空数组，不阻塞用户操作
          });
        }
      },

      /**
       * 标记公告为已读（不再提示）
       * 
       * @param announcementId - 公告 ID
       */
      markAsRead: (announcementId: number) => {
        const state = get();
        const newReadStatus = {
          ...state.readStatus,
          [announcementId]: true,
        };

        set({ readStatus: newReadStatus });
        saveReadStatusToStorage(newReadStatus);
      },

      /**
       * 检查公告是否已读
       * 
       * @param announcementId - 公告 ID
       * @returns 是否已读
       */
      isRead: (announcementId: number) => {
        const state = get();
        return state.readStatus[announcementId] === true;
      },

      /**
       * 获取未读的有效公告
       * 
       * 过滤掉已标记为"不再提示"的公告。
       * 
       * @returns 未读公告列表
       */
      getUnreadAnnouncements: () => {
        const state = get();
        return state.activeAnnouncements.filter(
          (announcement) => !state.readStatus[announcement.id]
        );
      },

      /**
       * 加载功能开关状态
       * 
       * 从后端获取公告功能是否启用。
       */
      loadFeatureStatus: async () => {
        set({ isFeatureLoading: true });
        try {
          const enabled = await AnnouncementService.getAnnouncementFeatureEnabled();
          set({ featureEnabled: enabled, isFeatureLoading: false });
        } catch (error) {
          console.error('加载公告功能状态失败:', error);
          // 失败时默认为禁用
          set({ featureEnabled: false, isFeatureLoading: false });
        }
      },

      /**
       * 清除错误信息
       */
      clearError: () => {
        set({ error: null });
      },

      /**
       * 重置状态
       */
      reset: () => {
        set({
          announcements: [],
          activeAnnouncements: [],
          isFeatureLoading: false,
          isAnnouncementsLoading: false,
          error: null,
        });
      },
    }),
    {
      name: 'announcement-store',
    }
  )
);

// 导出便捷的选择器
export const useActiveAnnouncements = () =>
  useAnnouncementStore((state) => state.activeAnnouncements);
export const useAnnouncementLoading = () =>
  useAnnouncementStore((state) => state.isFeatureLoading || state.isAnnouncementsLoading);
export const useAnnouncementError = () =>
  useAnnouncementStore((state) => state.error);
export const useAnnouncementFeatureEnabled = () =>
  useAnnouncementStore((state) => state.featureEnabled);
export const useAnnouncementFeatureLoading = () =>
  useAnnouncementStore((state) => state.isFeatureLoading);
export const useAnnouncementListLoading = () =>
  useAnnouncementStore((state) => state.isAnnouncementsLoading);
export const useUnreadAnnouncements = () =>
  useAnnouncementStore((state) => state.getUnreadAnnouncements());
