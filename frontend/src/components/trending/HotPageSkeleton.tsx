import React from "react";

const HotSkeletonBlock: React.FC<{
  className: string;
  delay?: string;
}> = ({ className, delay = "0ms" }) => (
  <div
    className={`hot-page-skeleton-block ${className}`}
    style={{ animationDelay: delay }}
  />
);

const HotPageSkeleton: React.FC = () => {
  return (
    <section
      className="space-y-8"
      data-testid="hot-page-skeleton"
      aria-label="热门榜单加载中"
    >
      <div
        className="glass-card-premium overflow-hidden p-0 shadow-[0_24px_60px_rgba(15,23,42,0.12)]"
        data-testid="hot-page-skeleton-hero"
      >
        <div className="hot-page-skeleton-hero relative min-h-[520px] overflow-hidden p-6 md:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.12),transparent_34%)]" />
          <div className="relative flex h-full flex-col justify-between gap-8">
            <div className="max-w-3xl space-y-4">
              <div className="flex flex-wrap gap-3">
                <HotSkeletonBlock className="h-8 w-28 rounded-full" />
                <HotSkeletonBlock className="h-8 w-20 rounded-full" delay="120ms" />
              </div>
              <HotSkeletonBlock className="h-3 w-24 rounded-full" delay="160ms" />
              <HotSkeletonBlock className="h-14 w-72 max-w-full rounded-[1.4rem]" delay="220ms" />
              <HotSkeletonBlock className="h-5 w-56 max-w-full rounded-full" delay="260ms" />
              <HotSkeletonBlock className="h-4 w-full max-w-2xl rounded-full" delay="320ms" />
              <HotSkeletonBlock className="h-4 w-4/5 max-w-xl rounded-full" delay="360ms" />
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <HotSkeletonBlock className="h-11 w-44 rounded-full" delay="420ms" />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={`hero-stat-${index}`}
                    className="rounded-[1.25rem] border border-white/20 bg-white/18 px-4 py-4 backdrop-blur-md dark:border-white/10 dark:bg-slate-900/28"
                  >
                    <HotSkeletonBlock className="h-3 w-16 rounded-full" delay={`${480 + index * 80}ms`} />
                    <HotSkeletonBlock className="mt-3 h-7 w-20 rounded-full" delay={`${540 + index * 80}ms`} />
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="flex gap-2">
                  <HotSkeletonBlock className="h-10 w-10 rounded-full" delay="700ms" />
                  <HotSkeletonBlock className="h-10 w-10 rounded-full" delay="760ms" />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <HotSkeletonBlock
                    key={`preview-${index}`}
                    className="h-20 rounded-[1.25rem]"
                    delay={`${820 + index * 70}ms`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card-premium p-5 md:p-6">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="glass-toolbar rounded-[1.35rem] p-3">
            <HotSkeletonBlock className="h-3 w-16 rounded-full" />
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <HotSkeletonBlock
                  key={`period-${index}`}
                  className="h-10 rounded-2xl"
                  delay={`${80 + index * 70}ms`}
                />
              ))}
            </div>
          </div>
          <div className="glass-toolbar rounded-[1.35rem] p-3">
            <HotSkeletonBlock className="h-3 w-16 rounded-full" delay="120ms" />
            <div className="mt-3 grid grid-cols-3 gap-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <HotSkeletonBlock
                  key={`category-${index}`}
                  className="h-10 rounded-2xl"
                  delay={`${180 + index * 70}ms`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={`list-card-${index}`}
            className="glass-card-premium overflow-hidden p-5 md:p-6"
            data-testid="hot-page-skeleton-card"
          >
            <div className="grid gap-4 sm:grid-cols-[5.5rem_minmax(0,1fr)]">
              <HotSkeletonBlock
                className="h-28 rounded-[1.35rem]"
                delay={`${120 + index * 90}ms`}
              />

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-1 gap-2">
                    <HotSkeletonBlock className="h-3 w-8 rounded-full" delay={`${180 + index * 90}ms`} />
                    <HotSkeletonBlock className="h-3 w-10 rounded-full" delay={`${240 + index * 90}ms`} />
                    <HotSkeletonBlock className="h-3 w-8 rounded-full" delay={`${300 + index * 90}ms`} />
                  </div>
                  <HotSkeletonBlock className="h-6 w-14 rounded-full" delay={`${360 + index * 90}ms`} />
                </div>
                <HotSkeletonBlock className="h-7 w-40 max-w-full rounded-full" delay={`${220 + index * 90}ms`} />
                <HotSkeletonBlock className="h-4 w-32 rounded-full" delay={`${280 + index * 90}ms`} />
                <HotSkeletonBlock className="h-3.5 w-full rounded-full" delay={`${340 + index * 90}ms`} />
                <HotSkeletonBlock className="h-3.5 w-11/12 rounded-full" delay={`${400 + index * 90}ms`} />
                <HotSkeletonBlock className="h-3.5 w-3/4 rounded-full" delay={`${460 + index * 90}ms`} />

                <div className="flex flex-wrap gap-2 pt-1">
                  <HotSkeletonBlock className="h-7 w-12 rounded-full" delay={`${520 + index * 90}ms`} />
                  <HotSkeletonBlock className="h-7 w-12 rounded-full" delay={`${580 + index * 90}ms`} />
                  <HotSkeletonBlock className="h-7 w-12 rounded-full" delay={`${640 + index * 90}ms`} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default HotPageSkeleton;
