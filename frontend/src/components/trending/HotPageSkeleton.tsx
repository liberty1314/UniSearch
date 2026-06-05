import React from "react";

const HotSkeletonBlock: React.FC<React.HTMLAttributes<HTMLDivElement> & {
  className: string;
  delay?: string;
}> = ({ className, delay = "0ms", style, ...props }) => (
  <div
    className={`hot-page-skeleton-block ${className}`}
    style={{ ...style, animationDelay: delay }}
    {...props}
  />
);

/**
 * 内容区骨架块——使用 skeleton-shimmer 类（石板灰底色 + 流光扫描），
 * 与 hot-page-skeleton-block（白色半透明底色、仅适用于深色 Hero 区域）不同，
 * 此组件在亮色/暗色模式的白色卡片背景上都清晰可见。
 */
const ContentSkeletonBlock: React.FC<{
  className: string;
  delay?: string;
}> = ({ className, delay = "0ms" }) => (
  <div
    className={`skeleton-shimmer ${className}`}
    style={{ animationDelay: delay }}
  />
);

/** 单个媒体卡片骨架（与 HotMediaCard 布局完全对齐）*/
const HotMediaCardSkeleton: React.FC<{ index: number }> = ({ index }) => (
  <div
    className="skeleton-card-wrap rounded-[1.75rem] border border-slate-200/60 bg-white/80 p-4 backdrop-blur-sm md:p-5 dark:border-white/8 dark:bg-slate-900/52"
    data-testid="hot-media-card-skeleton"
  >
    <div className="flex flex-col gap-4 sm:flex-row">
      {/* 海报占位 */}
      <ContentSkeletonBlock
        className="h-40 w-full shrink-0 rounded-[1.4rem] sm:h-36 sm:w-28"
        delay={`${index * 60}ms`}
      />

      <div className="min-w-0 flex-1 space-y-3">
        {/* 排名 + 分类标签行 */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ContentSkeletonBlock className="h-3 w-14 rounded-full" delay={`${40 + index * 60}ms`} />
            <ContentSkeletonBlock className="h-5 w-16 rounded-full" delay={`${80 + index * 60}ms`} />
          </div>
          {/* 评分徽章 */}
          <ContentSkeletonBlock className="h-6 w-14 rounded-full" delay={`${120 + index * 60}ms`} />
        </div>

        {/* 标题 */}
        <ContentSkeletonBlock className="h-6 w-3/5 rounded-full" delay={`${160 + index * 60}ms`} />
        {/* 原始标题 */}
        <ContentSkeletonBlock className="h-4 w-2/5 rounded-full" delay={`${200 + index * 60}ms`} />

        {/* 简介三行 */}
        <ContentSkeletonBlock className="h-3.5 w-full rounded-full" delay={`${240 + index * 60}ms`} />
        <ContentSkeletonBlock className="h-3.5 w-11/12 rounded-full" delay={`${280 + index * 60}ms`} />
        <ContentSkeletonBlock className="h-3.5 w-3/4 rounded-full" delay={`${320 + index * 60}ms`} />

        {/* 类型标签 */}
        <div className="flex flex-wrap gap-2 pt-1">
          <ContentSkeletonBlock className="h-6 w-12 rounded-full" delay={`${360 + index * 60}ms`} />
          <ContentSkeletonBlock className="h-6 w-12 rounded-full" delay={`${400 + index * 60}ms`} />
          <ContentSkeletonBlock className="h-6 w-12 rounded-full" delay={`${440 + index * 60}ms`} />
        </div>

        {/* 底部元信息 + 搜索按钮 */}
        <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-3">
            <ContentSkeletonBlock className="h-3 w-28 rounded-full" delay={`${480 + index * 60}ms`} />
            <ContentSkeletonBlock className="h-3 w-16 rounded-full" delay={`${520 + index * 60}ms`} />
          </div>
          <ContentSkeletonBlock className="h-8 w-20 rounded-full" delay={`${560 + index * 60}ms`} />
        </div>
      </div>
    </div>
  </div>
);

/**
 * HotMediaGridSkeleton
 * 精确模拟 HotMediaGrid（标题行 + 2列卡片网格）的骨架屏，
 * 用于筛选项变更时的刷新态，避免内容闪烁。
 */
export const HotMediaGridSkeleton: React.FC<{
  /** 渲染的卡片骨架数量，默认 6 */
  count?: number;
  /** 是否显示 section 标题行骨架，默认 true */
  showHeader?: boolean;
}> = ({ count = 6, showHeader = true }) => (
  <section className="space-y-5" aria-label="热门榜单内容加载中" data-testid="hot-media-grid-skeleton">
    {showHeader ? (
      <div className="flex items-center justify-between gap-4">
        <ContentSkeletonBlock className="h-7 w-32 rounded-full" />
        <ContentSkeletonBlock className="h-10 w-10 rounded-full" delay="80ms" />
      </div>
    ) : null}

    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {Array.from({ length: count }).map((_, idx) => (
        <HotMediaCardSkeleton key={`media-skeleton-${idx}`} index={idx} />
      ))}
    </div>
  </section>
);

const HotPageSkeleton: React.FC = () => {
  return (
    <section
      className="space-y-4"
      data-testid="hot-page-skeleton"
      aria-label="热门榜单加载中"
    >
      <div
        className="glass-card-premium relative h-[520px] overflow-hidden rounded-[2rem] bg-slate-950 p-0 shadow-[0_24px_60px_rgba(15,23,42,0.18)] md:h-[560px]"
        data-testid="hot-page-skeleton-hero"
      >
        <div className="hot-page-skeleton-hero relative h-[520px] overflow-hidden md:h-[560px]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.14),transparent_32%)]" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/92 via-slate-950/46 to-slate-950/24" />
          <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-slate-950/90 via-slate-950/48 to-transparent" />

          <div className="relative z-10 flex h-[520px] flex-col justify-between p-6 pb-28 text-white md:h-[560px] md:p-8 md:pb-32 xl:pb-10">
            <div className="flex min-h-0 max-w-full flex-1 flex-col lg:min-h-[400px]">
              <div className="flex flex-wrap items-center gap-2.5">
                <HotSkeletonBlock className="h-8 w-28 rounded-full" />
                <HotSkeletonBlock className="h-8 w-20 rounded-full" delay="120ms" />
              </div>
              <HotSkeletonBlock className="mt-6 h-3 w-32 rounded-full" delay="160ms" />
              <HotSkeletonBlock className="mt-3 h-14 w-80 max-w-full rounded-[1.4rem]" delay="220ms" />
              <HotSkeletonBlock className="mt-3 h-5 w-56 max-w-full rounded-full" delay="260ms" />
              <HotSkeletonBlock className="mt-5 h-4 w-full max-w-xl rounded-full" delay="320ms" />
              <HotSkeletonBlock className="mt-3 h-4 w-11/12 max-w-xl rounded-full" delay="360ms" />
              <HotSkeletonBlock className="mt-3 h-4 w-3/4 max-w-lg rounded-full" delay="400ms" />

              <div className="mt-10 flex flex-col gap-5 lg:mt-auto lg:max-w-2xl lg:pt-16">
                <HotSkeletonBlock className="h-11 w-44 rounded-full" delay="460ms" />

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div
                      key={`hero-stat-${index}`}
                      className="rounded-[1.4rem] border border-white/12 bg-white/7 px-4 py-4 backdrop-blur-md"
                    >
                      <HotSkeletonBlock className="h-3 w-20 rounded-full" delay={`${520 + index * 80}ms`} />
                      <HotSkeletonBlock className="mt-3 h-7 w-20 rounded-full" delay={`${580 + index * 80}ms`} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-3 px-2">
        <HotSkeletonBlock className="h-10 w-10 shrink-0 rounded-full" delay="760ms" />
        <div className="flex max-w-full gap-2 overflow-hidden rounded-2xl bg-white/88 px-3 py-2 shadow-[0_18px_40px_rgba(15,23,42,0.12)] ring-1 ring-slate-200/80 backdrop-blur-md dark:bg-slate-900/72 dark:ring-white/10">
          {Array.from({ length: 5 }).map((_, index) => (
            <HotSkeletonBlock
              key={`thumbnail-${index}`}
              className="h-16 w-24 shrink-0 rounded-xl md:h-20 md:w-32"
              delay={`${820 + index * 70}ms`}
              data-testid="hot-page-skeleton-thumbnail"
            />
          ))}
        </div>
        <HotSkeletonBlock className="h-10 w-10 shrink-0 rounded-full" delay="1220ms" />
      </div>
    </section>
  );
};

export default HotPageSkeleton;
