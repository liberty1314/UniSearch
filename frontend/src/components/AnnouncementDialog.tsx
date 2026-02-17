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
          {/* 背景遮罩 - Apple Style: 更加柔和的深色模糊背景 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={handleBackdropClick}
          />

          {/* 公告卡片 - Nebula Premium Style */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{
              type: "spring",
              damping: 25,
              stiffness: 300,
              mass: 0.8
            }}
            className="relative w-full max-w-md group"
          >
            {/* 动态光晕背景 */}
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-blue-500 to-purple-600 rounded-3xl opacity-25 blur-xl group-hover:opacity-40 transition-opacity duration-1000 animate-gradient" />

            <div className={cn(
              "relative overflow-hidden",
              "rounded-3xl",
              "glass-card-3d", // 使用项目定义的 3D 玻璃效果
              "p-1" // 给内部内容留一点边距，显示边框效果
            )}>

              {/* 装饰性背景光斑 */}
              <div className="absolute top-0 right-0 -mt-16 -mr-16 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

              <div className="relative bg-white/40 dark:bg-[#121214]/60 backdrop-blur-xl rounded-[22px] p-6 pt-8 flex flex-col items-center">

                {/* 关闭按钮 */}
                <button
                  onClick={handleClose}
                  className={cn(
                    'absolute top-4 right-4 z-10',
                    'w-8 h-8 rounded-full',
                    'flex items-center justify-center',
                    'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10',
                    'transition-all duration-200',
                    'backdrop-blur-sm'
                  )}
                >
                  <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </button>

                {/* 图标 - Nebula Style */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0, y: 10 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.4 }}
                  className="mb-6 relative"
                >
                  <div className={cn(
                    'w-16 h-16 rounded-2xl',
                    'bg-gradient-to-br from-white/80 to-white/20 dark:from-white/10 dark:to-transparent', // 玻璃质感
                    'border border-white/50 dark:border-white/10',
                    'flex items-center justify-center',
                    'shadow-lg shadow-purple-500/10',
                    'relative z-10'
                  )}>
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 opacity-50" />
                    <Bell className="w-8 h-8 text-purple-600 dark:text-blue-400 drop-shadow-sm" strokeWidth={2} />
                  </div>
                  {/* 图标背后的发光 */}
                  <div className="absolute inset-0 bg-blue-500/30 blur-xl rounded-full transform scale-150 z-0" />
                </motion.div>

                {/* 标题 */}
                <motion.h2
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, duration: 0.4 }}
                  className="text-2xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-purple-800 to-gray-900 dark:from-white dark:via-blue-200 dark:to-white mb-3 tracking-tight"
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
                  <div className="max-h-[60vh] overflow-y-auto px-2 custom-scrollbar">
                    <div
                      className={cn(
                        'prose prose-sm dark:prose-invert max-w-none text-center',
                        'text-gray-600 dark:text-gray-300',
                        'leading-relaxed'
                      )}
                      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
                    />
                  </div>
                </motion.div>

                {/* 底部操作区 - Premium Style 按钮 */}
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25, duration: 0.4 }}
                  onClick={handleClose}
                  className={cn(
                    'w-full py-3.5 px-6',
                    'rounded-xl',
                    'btn-primary', // 使用项目定义的渐变按钮
                    'text-white font-semibold text-[16px]',
                    'hover-lift', // 悬停上浮效果
                    'shadow-nebula group-hover:shadow-nebula-hover',
                    'relative overflow-hidden'
                  )}
                >
                  <span className="relative z-10">我知道了</span>
                  {/* 按钮内部的光泽扫过效果 */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

