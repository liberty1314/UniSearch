import React, { useMemo } from 'react';
import DOMPurify from 'dompurify';
import { Bell } from 'lucide-react';
import type { Announcement } from '@/types/api';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      onDismiss(announcement.id, true);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <div className="space-y-6">
          <DialogHeader className="items-center text-center">
            <div className={cn(
              'mb-2 flex h-16 w-16 items-center justify-center rounded-[20px]',
              'border border-blue-200/50 bg-gradient-to-br from-blue-50 to-blue-100/50 shadow-inner',
              'dark:border-white/[0.08] dark:from-white/[0.08] dark:to-white/[0.02]'
            )}>
              <Bell className="h-8 w-8 text-blue-500 drop-shadow-sm dark:text-slate-200" strokeWidth={2} />
            </div>
            <DialogTitle className="text-[22px] leading-snug">{announcement.title}</DialogTitle>
            <DialogDescription className="sr-only">{announcement.title}</DialogDescription>
          </DialogHeader>

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

          <button
            onClick={() => handleOpenChange(false)}
            className={cn(
              'w-full rounded-[14px] px-6 py-3.5',
              'bg-slate-900 font-semibold text-[15px] text-white transition-all duration-300 hover:bg-slate-800',
              'shadow-[0_8px_16px_rgba(15,23,42,0.15)] dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 dark:shadow-[0_8px_20px_rgba(255,255,255,0.15)]'
            )}
          >
            我知道了
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
