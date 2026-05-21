import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bell, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAnnouncementStore } from "@/stores/announcementStore";
import { AnnouncementDialog } from "./AnnouncementDialog";
import type { Announcement } from "@/types/api";
import { getAnnouncementPreviewText } from "@/lib/announcement";

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
    isAnnouncementsLoading,
  } = useAnnouncementStore();

  // 分离已读和未读公告
  const unreadList = activeAnnouncements.filter((a) => !isRead(a.id));
  const readList = activeAnnouncements.filter((a) => isRead(a.id));

  const [selectedAnnouncement, setSelectedAnnouncement] =
    useState<Announcement | null>(null);
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
  const handleAnnouncementDismiss = (
    announcementId: number,
    neverShow: boolean,
  ) => {
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
  const renderAnnouncementCard = (
    announcement: Announcement,
    index: number,
    isUnread: boolean,
  ) => (
    <motion.button
      key={announcement.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      onClick={() => handleAnnouncementClick(announcement)}
      className={cn(
        "w-full text-left p-4 rounded-xl transition-all duration-200",
        "border group relative overflow-hidden",
        isUnread
          ? "bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800"
          : "bg-white dark:bg-[#1C1C1E] border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-slate-800",
      )}
    >
      <div className="flex items-start justify-between gap-3 relative z-10">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <h3
              className={cn(
                "font-semibold text-[15px] truncate", // iOS 字体大小
                isUnread
                  ? "text-gray-900 dark:text-white"
                  : "text-gray-600 dark:text-slate-400",
              )}
            >
              {announcement.title}
            </h3>
            {isUnread && (
              <span className="flex-shrink-0 w-2 h-2 rounded-full bg-[#007AFF]"></span>
            )}
          </div>
          <p
            className={cn(
              "text-[13px] line-clamp-2 leading-relaxed",
              isUnread
                ? "text-gray-600 dark:text-slate-300"
                : "text-gray-400 dark:text-slate-500",
            )}
          >
            {getAnnouncementPreviewText(announcement.content, 80)}
          </p>
          <div className="mt-2 text-[11px] text-gray-400 dark:text-slate-500">
            {new Date(announcement.created_at).toLocaleDateString()}
          </div>
        </div>
        <ChevronRight
          className={cn(
            "w-4 h-4 flex-shrink-0 transition-all duration-200 group-hover:translate-x-0.5 mt-0.5",
            "text-gray-300 dark:text-gray-600",
          )}
        />
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
              className="absolute inset-0 bg-transparent" // 面板通常不需要强遮罩，或者使用透明遮罩点击关闭
              onClick={handleBackdropClick}
            />

            {/* 公告面板 */}
            <motion.div
              initial={{ opacity: 0, x: 20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.95 }}
              transition={{
                duration: 0.3,
                type: "spring",
                damping: 25,
                stiffness: 300,
              }}
              className={cn(
                "relative w-full max-w-sm max-h-[calc(100vh-6rem)]",
                "bg-white/90 dark:bg-[#1C1C1E]/90", // 高模糊背景
                "backdrop-blur-xl",
                "rounded-2xl shadow-2xl shadow-black/10",
                "border border-white/20 dark:border-white/10",
                "overflow-hidden flex flex-col",
              )}
            >
              {/* 头部 */}
              <div className="flex-shrink-0 bg-white/50 dark:bg-white/5 border-b border-gray-200/50 dark:border-white/10 px-5 py-4 backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-9 h-9 rounded-xl",
                        "bg-gradient-to-b from-blue-400 to-blue-600",
                        "flex items-center justify-center",
                        "shadow-sm shadow-blue-500/20",
                      )}
                    >
                      <Bell className="w-4.5 h-4.5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-[17px] font-semibold text-gray-900 dark:text-white">
                        系统公告
                      </h2>
                    </div>
                  </div>
                  <button
                    onClick={() => onOpenChange(false)}
                    className="w-7 h-7 rounded-full flex items-center justify-center bg-gray-100/80 dark:bg-slate-700/80 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    <X className="w-3.5 h-3.5 text-gray-500 dark:text-slate-400" />
                  </button>
                </div>
              </div>

              {/* 公告列表 */}
              <div className="flex-1 overflow-y-auto p-4 min-h-0">
                {isAnnouncementsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
                  </div>
                ) : activeAnnouncements.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Bell className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      暂无公告
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* 未读公告区域 */}
                    {unreadList.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-[11px] font-medium text-gray-400 uppercase tracking-wider px-1">
                          未读消息
                        </h3>
                        {unreadList.map((announcement, index) =>
                          renderAnnouncementCard(announcement, index, true),
                        )}
                      </div>
                    )}

                    {/* 已读公告区域 */}
                    {readList.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-[11px] font-medium text-gray-400 uppercase tracking-wider px-1">
                          历史消息
                        </h3>
                        {readList.map((announcement, index) =>
                          renderAnnouncementCard(announcement, index, false),
                        )}
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
