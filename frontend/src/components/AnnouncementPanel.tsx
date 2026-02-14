import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAnnouncementStore } from '@/stores/announcementStore';
import { AnnouncementDialog } from './AnnouncementDialog';
import type { Announcement } from '@/types/api';

/**
 * 公告面板组件属性
 */
interface AnnouncementPanelProps {
  /** 是否打开面板 */
  open: boolean;
  /** 面板打开状态变化回调 */
  onOpenChange: (open: boolean) => void;
}

/**
 * 公告面板组件
 * 
 * 显示所有公告列表（已读和未读），点击可查看详情
 */
export const AnnouncementPanel: React.FC<AnnouncementPanelProps> = ({
  open,
  onOpenChange,
}) => {
  const {
    activeAnnouncements,
    loadActiveAnnouncements,
    isRead,
    markAsRead,
    isLoading,
  } = useAnnouncementStore();

  // 分离已读和未读公告
  const unreadList = activeAnnouncements.filter(a => !isRead(a.id));
  const readList = activeAnnouncements.filter(a => isRead(a.id));

  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  /**
   * 加载公告列表
   */
  useEffect(() => {
    if (open) {
      loadActiveAnnouncements();
    }
  }, [open, loadActiveAnnouncements]);

  /**
   * 处理公告点击
   * 关闭面板，打开详情弹窗
   */
  const handleAnnouncementClick = (announcement: Announcement) => {
    onOpenChange(false); // 先关闭面板
    setSelectedAnnouncement(announcement);
    setIsDialogOpen(true);
  };

  /**
   * 处理公告关闭
   * 关闭弹窗后重新打开面板
   */
  const handleAnnouncementDismiss = (announcementId: number, neverShow: boolean) => {
    if (neverShow) {
      markAsRead(announcementId);
    }
    setIsDialogOpen(false);
    setSelectedAnnouncement(null);
    // 重新打开面板
    onOpenChange(true);
  };

  /**
   * 处理背景点击
   */
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onOpenChange(false);
    }
  };

  /**
   * 渲染单个公告卡片
   */
  const renderAnnouncementCard = (announcement: Announcement, index: number, isUnread: boolean) => (
    <motion.button
      key={announcement.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      onClick={() => handleAnnouncementClick(announcement)}
      className={cn(
        'w-full text-left p-4 rounded-xl transition-all duration-200',
        'border hover:shadow-md group relative overflow-hidden',
        isUnread
          ? 'bg-gradient-to-br from-blue-50/80 to-indigo-50/50 dark:from-blue-900/20 dark:to-indigo-900/10 border-blue-100 dark:border-blue-800'
          : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
      )}
    >
      {isUnread && (
        <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-blue-500/10 to-transparent -mr-8 -mt-8 rounded-full blur-xl pointer-events-none"></div>
      )}
      <div className="flex items-start justify-between gap-3 relative z-10">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <h3 className={cn(
              'font-semibold text-sm truncate',
              isUnread
                ? 'text-gray-900 dark:text-white'
                : 'text-gray-600 dark:text-gray-300'
            )}>
              {announcement.title}
            </h3>
            {isUnread && (
              <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
                NEW
              </span>
            )}
          </div>
          <p className={cn(
            'text-xs line-clamp-2 leading-relaxed',
            isUnread
              ? 'text-gray-600 dark:text-gray-300'
              : 'text-gray-400 dark:text-gray-500'
          )}>
            {announcement.content.replace(/<[^>]*>/g, '').substring(0, 80)}...
          </p>
          <div className="mt-2 text-[10px] text-gray-400 dark:text-gray-600">
            {new Date(announcement.created_at).toLocaleDateString()}
          </div>
        </div>
        <ChevronRight className={cn(
          'w-4 h-4 flex-shrink-0 transition-all duration-200 group-hover:translate-x-1 mt-1',
          isUnread
            ? 'text-blue-500'
            : 'text-gray-300 dark:text-gray-600 group-hover:text-gray-400'
        )} />
      </div>
    </motion.button>
  );

  return (
    <>
      {/* 公告详情弹窗 - 放在面板外部，确保面板关闭后弹窗仍可显示 */}
      {selectedAnnouncement && (
        <AnnouncementDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          announcement={selectedAnnouncement}
          onDismiss={handleAnnouncementDismiss}
        />
      )}

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 flex items-start justify-end p-4 pt-20">
            {/* 背景遮罩 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
              onClick={handleBackdropClick}
            />

            {/* 公告面板 */}
            <motion.div
              initial={{ opacity: 0, x: 300, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 300, scale: 0.95 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="relative w-full max-w-md max-h-[calc(100vh-6rem)] bg-white/95 dark:bg-gray-800/95 backdrop-blur-apple rounded-2xl shadow-card border border-gray-200/50 dark:border-gray-700/50 overflow-hidden"
            >
              {/* 头部 */}
              <div className="sticky top-0 z-10 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-b border-gray-200/50 dark:border-gray-700/50 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
                      <Bell className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                        系统公告
                      </h2>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {activeAnnouncements.length} 条公告
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => onOpenChange(false)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100/80 dark:bg-gray-700/80 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200 hover:scale-110 active:scale-95"
                  >
                    <X className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                  </button>
                </div>
              </div>

              {/* 公告列表 */}
              <div className="overflow-y-auto max-h-[calc(100vh-12rem)] p-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
                  </div>
                ) : activeAnnouncements.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Bell className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">暂无公告</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* 未读公告区域 */}
                    {unreadList.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider px-1 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                          未读消息 ({unreadList.length})
                        </h3>
                        {unreadList.map((announcement, index) => renderAnnouncementCard(announcement, index, true))}
                      </div>
                    )}

                    {/* 已读公告区域 */}
                    {readList.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-1">
                          历史消息
                        </h3>
                        {readList.map((announcement, index) => renderAnnouncementCard(announcement, index, false))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
