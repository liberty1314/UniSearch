import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DOMPurify from 'dompurify';
import { X, Bell } from 'lucide-react';
import type { Announcement } from '@/types/api';
import { cn } from '@/lib/utils';

/**
 * 公告弹窗组件属性
 */
interface AnnouncementDialogProps {
  /** 是否打开弹窗 */
  open: boolean;
  /** 弹窗打开状态变化回调 */
  onOpenChange: (open: boolean) => void;
  /** 公告信息 */
  announcement: Announcement;
  /** 关闭回调，传递公告 ID 和是否不再提示 */
  onDismiss: (announcementId: number, neverShow: boolean) => void;
}

/**
 * 公告弹窗组件（首页风格 - 蓝色主题）
 * 
 * 采用统一的蓝色渐变设计：
 * - 毛玻璃效果（backdrop-blur）
 * - 蓝色渐变背景装饰
 * - 流畅的动画效果
 * - 圆角卡片设计
 * - 悬浮阴影
 * 
 * @example
 * ```tsx
 * <AnnouncementDialog
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   announcement={announcement}
 *   onDismiss={(id, neverShow) => {
 *     if (neverShow) {
 *       markAsRead(id);
 *     }
 *   }}
 * />
 * ```
 */
export const AnnouncementDialog: React.FC<AnnouncementDialogProps> = ({
  open,
  onOpenChange,
  announcement,
  onDismiss,
}) => {

  /**
   * 使用 DOMPurify 净化 HTML 内容，防止 XSS 攻击
   */
  const sanitizedContent = useMemo(() => {
    return DOMPurify.sanitize(announcement.content, {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'em', 'u', 's', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'a', 'img', 'table',
        'thead', 'tbody', 'tr', 'th', 'td', 'div', 'span',
      ],
      ALLOWED_ATTR: [
        'href', 'target', 'rel', 'src', 'alt', 'title', 'class', 'style',
      ],
      ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    });
  }, [announcement.content]);

  /**
   * 处理弹窗关闭
   */
  const handleClose = () => {
    // 用户点击关闭或我知道了，直接标记为已读（不再提示）
    onDismiss(announcement.id, true);
  };

  /**
   * 处理背景点击
   */
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={handleBackdropClick}
          />

          {/* 公告卡片 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="relative w-full max-w-lg"
          >
            {/* 背景装饰光晕 - 蓝色主题 */}
            <motion.div
              animate={{
                scale: [1, 1.05, 1],
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute -inset-4 rounded-3xl blur-2xl bg-gradient-to-r from-nebula-500/10 to-cosmic-500/10"
            />

            {/* 卡片主体 */}
            <div className="relative glass-panel rounded-2xl shadow-nebula border border-nebula-100 dark:border-nebula-800 overflow-hidden">
              {/* 顶部渐变装饰条 - 蓝色渐变 */}
              <div className="h-1.5 bg-gradient-to-r from-nebula-500 to-cosmic-500" />

              {/* 关闭按钮 */}
              <button
                onClick={handleClose}
                className={cn(
                  'absolute top-4 right-4 z-10',
                  'w-8 h-8 rounded-full',
                  'flex items-center justify-center',
                  'bg-gray-100/80 dark:bg-gray-700/80',
                  'hover:bg-gray-200 dark:hover:bg-gray-600',
                  'transition-all duration-200',
                  'hover:scale-110 active:scale-95',
                  'group'
                )}
              >
                <X className="w-4 h-4 text-gray-600 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors" />
              </button>

              {/* 内容区域 */}
              <div className="p-8">
                {/* 图标和标题 */}
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.4 }}
                  className="flex items-start gap-4 mb-6"
                >
                  {/* 图标 - 蓝色渐变 */}
                  <div className={cn(
                    'flex-shrink-0 w-12 h-12 rounded-2xl',
                    'bg-gradient-to-r from-nebula-500 to-cosmic-500',
                    'flex items-center justify-center',
                    'shadow-lg shadow-nebula-500/30',
                    'transition-transform duration-300'
                  )}>
                    <Bell className="w-6 h-6 text-white" />
                  </div>

                  {/* 标题 */}
                  <div className="flex-1 min-w-0 pr-8">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">
                      {announcement.title}
                    </h2>
                  </div>
                </motion.div>

                {/* 公告内容 */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                  className="mb-6 max-h-[50vh] overflow-y-auto"
                >
                  <div
                    className={cn(
                      'prose prose-sm dark:prose-invert max-w-none',
                      'text-gray-700 dark:text-gray-300',
                      'leading-relaxed'
                    )}
                    dangerouslySetInnerHTML={{ __html: sanitizedContent }}
                  />
                </motion.div>

                {/* 底部操作区 */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.4 }}
                  className="space-y-4"
                >


                  {/* 确认按钮 - 蓝色渐变 */}
                  <button
                    onClick={handleClose}
                    className={cn(
                      'w-full py-3 px-6',
                      'rounded-xl',
                      'bg-gradient-to-r from-nebula-500 to-cosmic-500',
                      'text-white font-medium',
                      'shadow-lg shadow-nebula-500/30',
                      'transition-all duration-200',
                      'hover:scale-[1.02] hover:shadow-xl hover:shadow-nebula-500/40',
                      'active:scale-[0.98]',
                      'focus:outline-none focus:ring-2 focus:ring-nebula-500/50 focus:ring-offset-2'
                    )}
                  >
                    我知道了
                  </button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

