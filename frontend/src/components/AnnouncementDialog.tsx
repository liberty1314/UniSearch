import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bell } from 'lucide-react';
import type { Announcement } from "@/types/announcement";
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
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
 */
export const AnnouncementDialog: React.FC<AnnouncementDialogProps> = ({
  open,
  onOpenChange,
	announcement,
	onDismiss,
}) => {
  const [neverShow, setNeverShow] = useState(false);

  useEffect(() => {
    if (open) {
      setNeverShow(false);
    }
  }, [announcement.id, open]);

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      onDismiss(announcement.id, neverShow);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg">
        <div className="space-y-6">
          <DialogHeader className="flex flex-col items-center text-center space-y-4">
            <div className={cn(
              'flex h-14 w-14 items-center justify-center rounded-2xl',
              'border border-slate-200/80 bg-slate-100/50 shadow-sm backdrop-blur-md',
              'dark:border-white/10 dark:bg-white/5 dark:shadow-none'
            )}>
              <Bell className="h-6 w-6 text-slate-800 dark:text-slate-200" strokeWidth={1.5} />
            </div>
            <DialogTitle className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
              {announcement.title}
            </DialogTitle>
            <DialogDescription className="sr-only">{announcement.title}</DialogDescription>
          </DialogHeader>

          <div className="max-h-[50vh] overflow-y-auto px-4 custom-scrollbar">
            <div
              className={cn(
                'prose prose-sm dark:prose-invert max-w-none text-left',
                'text-slate-600 dark:text-slate-300/95',
                'leading-[1.75] prose-p:my-3 prose-headings:mb-3 prose-headings:mt-6 prose-headings:font-semibold prose-headings:tracking-tight',
                'prose-a:font-medium prose-a:text-blue-600 hover:prose-a:text-blue-700 dark:prose-a:text-blue-400 dark:hover:prose-a:text-blue-300',
                'prose-strong:font-semibold prose-strong:text-slate-900 dark:prose-strong:text-white'
              )}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {announcement.content}
              </ReactMarkdown>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-slate-200/70 bg-slate-50/80 px-4 py-3 dark:border-white/10 dark:bg-white/5">
            <Checkbox
              id={`announcement-never-show-${announcement.id}`}
              checked={neverShow}
              onCheckedChange={(checked) => setNeverShow(checked === true)}
              aria-label="不再提示此公告"
            />
            <Label
              htmlFor={`announcement-never-show-${announcement.id}`}
              className="cursor-pointer text-sm text-slate-600 dark:text-slate-300"
            >
              不再提示此公告
            </Label>
          </div>

          <button
            onClick={() => handleOpenChange(false)}
            className={cn(
              'w-full rounded-xl px-6 py-3',
              'bg-slate-900 font-medium text-[15px] text-white transition-all duration-200',
              'hover:bg-slate-800 hover:shadow-md active:scale-[0.98]',
              'dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 dark:hover:shadow-[0_4px_12px_rgba(255,255,255,0.1)]'
            )}
          >
            我知道了
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
