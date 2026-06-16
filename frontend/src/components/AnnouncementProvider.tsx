import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AnnouncementDialog } from './AnnouncementDialog';
import { useAnnouncementStore } from '@/stores/announcementStore';
import { useAuthStore } from '@/stores/authStore';
import { readAccountPreferences } from '@/lib/accountPreferences';
import type { Announcement } from '@/types/api';

/**
 * 公告提供者组件
 * 
 * 负责在用户登录后加载有效公告，并自动显示未读公告。
 * 应该在应用的根组件或主布局中使用。
 * 
 * 功能：
 * - 检查用户登录状态
 * - 检查公告功能开关状态
 * - 检查当前路由（只在首页 '/' 显示公告）
 * - 自动加载有效公告
 * - 过滤已读公告
 * - 依次显示未读公告
 * - 处理"不再提示"功能
 * - 离开首页时自动关闭公告
 * 
 * 验证需求: 5.1, 5.4, 13.2
 * 
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <>
 *       <AnnouncementProvider />
 *       <YourAppContent />
 *     </>
 *   );
 * }
 * ```
 */
export const AnnouncementProvider: React.FC = () => {
  const {
    loadActiveAnnouncements,
    loadFeatureStatus,
    getUnreadAnnouncements,
    markAsRead,
    isFeatureLoading,
    isAnnouncementsLoading,
    featureEnabled,
  } = useAnnouncementStore();

  const { isAuthenticated } = useAuthStore();
  const location = useLocation();
  const announcementReminderEnabled = readAccountPreferences().announcementReminder;

  const [currentAnnouncement, setCurrentAnnouncement] = useState<Announcement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<number>>(new Set());

  /**
   * 用户登录后加载功能开关状态和有效公告
   * 
   * 验证需求: 5.1, 13.2
   */
  useEffect(() => {
    if (isAuthenticated && announcementReminderEnabled) {
      void Promise.allSettled([loadFeatureStatus(), loadActiveAnnouncements()]);
    }
  }, [announcementReminderEnabled, isAuthenticated, loadActiveAnnouncements, loadFeatureStatus]);

  /**
   * 当有未读公告且功能已启用时，显示第一个
   * 
   * 验证需求: 5.4, 13.2
   * 
   * 注意：只在首页（路径为 '/'）时显示公告
   */
  useEffect(() => {
    // 只有在用户已登录、功能已启用、不在加载中、在首页、且没有当前公告时才显示
    const isHomePage = location.pathname === '/';
    
    // 如果正在关闭动画中，不要自动显示下一个
    if (isDismissing) {
      return;
    }
    
    if (
      isAuthenticated &&
      announcementReminderEnabled &&
      featureEnabled &&
      !isFeatureLoading &&
      !isAnnouncementsLoading &&
      isHomePage &&
      !currentAnnouncement
    ) {
      const unreadAnnouncements = getUnreadAnnouncements();
      // 过滤掉本次会话中已关闭的公告
      const availableAnnouncements = unreadAnnouncements.filter(
        (announcement) => !dismissedIds.has(announcement.id)
      );
      
      if (availableAnnouncements.length > 0) {
        setCurrentAnnouncement(availableAnnouncements[0]);
        setIsOpen(true);
      }
    }
    
    // 如果离开首页，关闭当前公告
    if (!isHomePage && currentAnnouncement) {
      setIsOpen(false);
      setCurrentAnnouncement(null);
    }
  }, [announcementReminderEnabled, isAuthenticated, featureEnabled, isFeatureLoading, isAnnouncementsLoading, location.pathname, currentAnnouncement, getUnreadAnnouncements, isDismissing, dismissedIds]);

  /**
   * 处理公告关闭
   * 
   * @param announcementId - 公告 ID
   * @param neverShow - 是否不再提示
   */
  const handleDismiss = (announcementId: number, neverShow: boolean) => {
    // 如果用户选择"不再提示"，标记为已读（永久存储到 localStorage）
    if (neverShow) {
      markAsRead(announcementId);
    }

    // 无论是否勾选"不再提示"，都将此公告加入本次会话的已关闭列表
    setDismissedIds((prev) => new Set(prev).add(announcementId));

    // 设置关闭标志，防止立即显示下一个
    setIsDismissing(true);
    
    // 关闭当前公告
    setIsOpen(false);
    setCurrentAnnouncement(null);

    // 延迟显示下一个未读公告（如果有）
    setTimeout(() => {
      setIsDismissing(false);
    }, 300); // 等待关闭动画完成
  };

  // 如果没有当前公告，不渲染任何内容
  if (!currentAnnouncement) {
    return null;
  }

  return (
    <AnnouncementDialog
      open={isOpen}
      onOpenChange={setIsOpen}
      announcement={currentAnnouncement}
      onDismiss={handleDismiss}
    />
  );
};
