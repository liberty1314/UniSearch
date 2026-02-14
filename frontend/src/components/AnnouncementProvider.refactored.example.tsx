import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { AnnouncementDialog } from './AnnouncementDialog';
import { useAnnouncementStore } from '@/stores/announcementStore';
import { useAuthStore } from '@/stores/authStore';
import type { Announcement } from '@/types/api';

/**
 * 公告显示配置
 */
const ANNOUNCEMENT_CONFIG = {
  /** 允许显示公告的路由路径 */
  ENABLED_ROUTES: ['/'],
  /** 公告关闭动画持续时间（毫秒） */
  CLOSE_ANIMATION_DURATION: 300,
} as const;

/**
 * 公告提供者组件（重构版）
 * 
 * 负责在用户登录后加载有效公告，并自动显示未读公告。
 * 应该在应用的根组件或主布局中使用。
 * 
 * 功能：
 * - 检查用户登录状态
 * - 检查公告功能开关状态
 * - 检查当前路由（只在指定路由显示公告）
 * - 自动加载有效公告
 * - 过滤已读公告
 * - 依次显示未读公告
 * - 处理"不再提示"功能
 * - 离开指定路由时自动关闭公告
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
    isLoading,
    featureEnabled,
  } = useAnnouncementStore();

  const { isAuthenticated } = useAuthStore();
  const location = useLocation();

  const [currentAnnouncement, setCurrentAnnouncement] = useState<Announcement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  
  // 用于清理 setTimeout 的 ref
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * 判断当前路由是否允许显示公告
   */
  const isEnabledRoute = useMemo(
    () => ANNOUNCEMENT_CONFIG.ENABLED_ROUTES.includes(location.pathname),
    [location.pathname]
  );

  /**
   * 显示下一个未读公告
   */
  const showNextAnnouncement = useCallback(() => {
    const unreadAnnouncements = getUnreadAnnouncements();
    if (unreadAnnouncements.length > 0) {
      setCurrentAnnouncement(unreadAnnouncements[0]);
      setIsOpen(true);
    }
  }, [getUnreadAnnouncements]);

  /**
   * 用户登录后加载功能开关状态和有效公告
   * 
   * 验证需求: 5.1, 13.2
   */
  useEffect(() => {
    if (isAuthenticated) {
      // 先加载功能开关状态
      loadFeatureStatus().then(() => {
        // 然后加载有效公告（后端会再次检查功能开关）
        loadActiveAnnouncements();
      });
    }
  }, [isAuthenticated, loadActiveAnnouncements, loadFeatureStatus]);

  /**
   * 当有未读公告且功能已启用时，显示第一个
   * 
   * 验证需求: 5.4, 13.2
   * 
   * 注意：只在指定路由时显示公告
   */
  useEffect(() => {
    const shouldShowAnnouncement =
      isAuthenticated &&
      featureEnabled &&
      !isLoading &&
      isEnabledRoute &&
      !currentAnnouncement;

    if (shouldShowAnnouncement) {
      showNextAnnouncement();
    }

    // 如果离开指定路由，关闭当前公告
    if (!isEnabledRoute && currentAnnouncement) {
      setIsOpen(false);
      setCurrentAnnouncement(null);
    }
  }, [
    isAuthenticated,
    featureEnabled,
    isLoading,
    isEnabledRoute,
    currentAnnouncement,
    showNextAnnouncement,
  ]);

  /**
   * 组件卸载时清理 timeout
   */
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  /**
   * 处理公告关闭
   * 
   * @param announcementId - 公告 ID
   * @param neverShow - 是否不再提示
   */
  const handleDismiss = useCallback(
    (announcementId: number, neverShow: boolean) => {
      // 如果用户选择"不再提示"，标记为已读
      if (neverShow) {
        markAsRead(announcementId);
      }

      // 关闭当前公告
      setIsOpen(false);
      setCurrentAnnouncement(null);

      // 清理之前的 timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // 延迟显示下一个未读公告（如果有）
      timeoutRef.current = setTimeout(() => {
        showNextAnnouncement();
        timeoutRef.current = null;
      }, ANNOUNCEMENT_CONFIG.CLOSE_ANIMATION_DURATION);
    },
    [markAsRead, showNextAnnouncement]
  );

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
