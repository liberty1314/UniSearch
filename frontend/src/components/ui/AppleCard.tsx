import React from 'react';
import { cn } from '@/lib/utils';

interface AppleCardProps {
  /** 卡片图片 URL */
  image?: string;
  /** 图片 alt 文本 (必填，用于无障碍) */
  imageAlt?: string;
  /** 卡片标题 */
  title?: string;
  /** 卡片描述 */
  description?: string;
  /** 标签列表 */
  tags?: string[];
  /** 自定义子元素 (优先级高于 props) */
  children?: React.ReactNode;
  /** 点击事件 */
  onClick?: () => void;
  /** 自定义类名 */
  className?: string;
  /** 是否禁用悬浮效果 (移动端自动禁用) */
  disableHover?: boolean;
}

export const AppleCard = React.forwardRef<HTMLElement, AppleCardProps>(
  (
    {
      image,
      imageAlt = '',
      title,
      description,
      tags,
      children,
      onClick,
      className,
      disableHover = false,
    },
    ref
  ) => {
    const isInteractive = !!onClick;

    return (
      <article
        ref={ref}
        onClick={onClick}
        role={isInteractive ? 'button' : undefined}
        tabIndex={isInteractive ? 0 : undefined}
        aria-label={isInteractive ? title : undefined}
        onKeyDown={
          isInteractive
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onClick?.();
                }
              }
            : undefined
        }
        className={cn(
          // 基础样式
          'group relative overflow-hidden rounded-3xl bg-white',
          'border border-gray-200/80',
          'shadow-sm',
          
          // 桌面端 3D 悬浮效果
          !disableHover && [
            'transition-all duration-300 ease-out',
            'hover:shadow-2xl hover:shadow-gray-200/50',
            'hover:-translate-y-2 hover:scale-[1.02]',
            'hover:border-gray-300/60',
          ],
          
          // 移动端优化 (禁用 hover，启用 active)
          'active:scale-[0.98] active:shadow-md',
          'md:active:scale-100', // 桌面端取消 active 缩放
          
          // 键盘焦点样式
          'focus-visible:outline-none focus-visible:ring-2',
          'focus-visible:ring-blue-500 focus-visible:ring-offset-2',
          
          // 交互光标
          isInteractive && 'cursor-pointer',
          
          className
        )}
      >
        {children ? (
          children
        ) : (
          <>
            {/* 图片区域 */}
            {image && (
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-gray-50">
                <img
                  src={image}
                  alt={imageAlt}
                  className={cn(
                    'h-full w-full object-cover',
                    'transition-transform duration-500 ease-out',
                    !disableHover && 'group-hover:scale-105'
                  )}
                  loading="lazy"
                />
                {/* 渐变遮罩 (可选) */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              </div>
            )}

            {/* 内容区域 */}
            <div className="p-6 md:p-8">
              {/* 标签 */}
              {tags && tags.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 transition-colors duration-200 group-hover:bg-blue-50 group-hover:text-blue-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* 标题 */}
              {title && (
                <h3 className="mb-2 text-xl font-semibold tracking-tight text-gray-900 md:text-2xl">
                  {title}
                </h3>
              )}

              {/* 描述 */}
              {description && (
                <p className="text-sm leading-relaxed text-gray-600 md:text-base">
                  {description}
                </p>
              )}
            </div>
          </>
        )}

        {/* 交互指示器 (可选) */}
        {isInteractive && (
          <div className="absolute right-4 top-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <svg
              className="h-5 w-5 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        )}
      </article>
    );
  }
);

AppleCard.displayName = 'AppleCard';
