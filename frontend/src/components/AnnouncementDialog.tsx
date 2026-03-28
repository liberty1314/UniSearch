import React, { useMemo } from 'react';
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
      ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.-]+(?:[^a-z+.:-]|$))/i,
    });
  }, [announcement.content]);

  /**
   * 处理弹窗关闭
   */
  const handleClose = () => {
    onOpenChange(false);
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
          {/* 背景遮罩 - Apple Style: 深度透明与较强模糊 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-slate-900/20 dark:bg-[#020617]/50 backdrop-blur-md"
            onClick={handleBackdropClick}
          />

          {/* 公告卡片 - Minimalist Glassmorphism */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{
              type: "spring",
              damping: 25,
              stiffness: 300,
              mass: 0.8
            }}
            className="relative w-full max-w-md group"
          >
            {/* 极简底部光晕 */}
            <div className="absolute -inset-1 bg-gradient-to-b from-blue-500/10 to-transparent rounded-[26px] opacity-0 dark:opacity-100 blur-xl pointer-events-none" />

            <div className={cn(
              "relative overflow-hidden",
              "rounded-[24px]",
              "border border-white/60 dark:border-white/[0.08]",
              "bg-white/70 dark:bg-slate-950/40 backdrop-blur-2xl",
              "shadow-[0_24px_48px_rgba(15,23,42,0.06)] dark:shadow-[0_24px_48px_rgba(0,0,0,0.5)]",
              "p-1 transition-all duration-300"
            )}>
              <div className="relative rounded-[22px] px-6 pb-6 pt-8 flex flex-col items-center bg-white/40 dark:bg-white/[0.01]">

                {/* 关闭按钮 */}
                <button
                  onClick={handleClose}
                  className={cn(
                    'absolute top-4 right-4 z-10',
                    'w-8 h-8 rounded-full',
                    'flex items-center justify-center',
                    'bg-slate-100/50 dark:bg-white/[0.04] hover:bg-slate-200/50 dark:hover:bg-white/[0.08]',
                    'border border-transparent dark:border-white/[0.05]',
                    'transition-all duration-200',
                    'backdrop-blur-md'
                  )}
                >
                  <X className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                </button>

                {/* 图标 - High-end Tech Style */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0, y: 10 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.4 }}
                  className="mb-5 relative"
                >
                  <div className={cn(
                    'w-16 h-16 rounded-[20px]',
                    'bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-white/[0.08] dark:to-white/[0.02]',
                    'border border-blue-200/50 dark:border-white/[0.08]',
                    'flex items-center justify-center',
                    'shadow-inner',
                    'relative z-10'
                  )}>
                    <Bell className="w-8 h-8 text-blue-500 dark:text-slate-200 drop-shadow-sm" strokeWidth={2} />
                  </div>
                </motion.div>

                {/* 标题 */}
                <motion.h2
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, duration: 0.4 }}
                  className="text-[22px] leading-snug font-bold text-slate-800 dark:text-slate-100 mb-3 tracking-tight text-center"
                >
                  {announcement.title}
                </motion.h2>

                {/* 公告内容 */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="w-full mb-8 relative"
                >
                  <div className="max-h-[50vh] overflow-y-auto px-2 custom-scrollbar">
                    <div
                      className={cn(
                        'prose prose-sm dark:prose-invert max-w-none text-center',
                        'text-slate-600 dark:text-slate-300/90',
                        'leading-relaxed prose-p:my-2'
                      )}
                      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
                    />
                  </div>
                </motion.div>

                {/* 底部操作区 - Minimalist Button */}
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ delay: 0.25, duration: 0.4 }}
                  onClick={handleClose}
                  className={cn(
                    'w-full py-3.5 px-6',
                    'rounded-[14px]',
                    'bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100',
                    'text-white dark:text-slate-900 font-semibold text-[15px]',
                    'shadow-[0_8px_16px_rgba(15,23,42,0.15)] dark:shadow-[0_8px_20px_rgba(255,255,255,0.15)]',
                    'transition-all duration-300'
                  )}
                >
                  我知道了
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
