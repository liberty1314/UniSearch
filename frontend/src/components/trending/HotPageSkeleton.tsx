import React from "react";

const HotPageSkeleton: React.FC = () => {
  return (
    <section
      className="space-y-8"
      data-testid="hot-page-skeleton"
      aria-label="热门榜单加载中"
    >
      <div
        className="glass-card-premium overflow-hidden p-0"
        data-testid="hot-page-skeleton-hero"
      >
        <div className="min-h-[420px] animate-pulse bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_42%),linear-gradient(135deg,#cbd5e1,#e2e8f0)] p-6 dark:bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_42%),linear-gradient(135deg,#0f172a,#1e293b)] md:p-8">
          <div className="flex h-full flex-col justify-between">
            <div className="max-w-3xl space-y-4">
              <div className="flex flex-wrap gap-3">
                <div className="h-8 w-28 rounded-full bg-white/50 dark:bg-slate-800/80" />
                <div className="h-8 w-16 rounded-full bg-white/50 dark:bg-slate-800/80" />
                <div className="h-8 w-20 rounded-full bg-white/50 dark:bg-slate-800/80" />
              </div>
              <div className="h-3 w-24 rounded-full bg-white/50 dark:bg-slate-800/80" />
              <div className="h-12 w-72 rounded-2xl bg-white/55 dark:bg-slate-800/80" />
              <div className="h-5 w-48 rounded-full bg-white/50 dark:bg-slate-800/80" />
              <div className="h-4 w-full max-w-2xl rounded-full bg-white/50 dark:bg-slate-800/80" />
              <div className="h-4 w-4/5 max-w-xl rounded-full bg-white/50 dark:bg-slate-800/80" />
            </div>

            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={`hero-stat-${index}`}
                    className="rounded-[1.25rem] bg-white/35 px-4 py-4 dark:bg-slate-800/60"
                  >
                    <div className="h-3 w-16 rounded-full bg-white/55 dark:bg-slate-700/80" />
                    <div className="mt-3 h-6 w-20 rounded-full bg-white/55 dark:bg-slate-700/80" />
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="flex gap-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={`dot-${index}`}
                      className={`rounded-full ${index === 0 ? "h-2.5 w-8" : "h-2.5 w-2.5"} bg-white/50 dark:bg-slate-700/80`}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <div className="h-10 w-10 rounded-full bg-white/45 dark:bg-slate-700/80" />
                  <div className="h-10 w-10 rounded-full bg-white/45 dark:bg-slate-700/80" />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={`preview-${index}`}
                    className="h-20 rounded-[1.25rem] bg-white/35 dark:bg-slate-800/60"
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
            <div className="h-3 w-16 animate-pulse rounded-full bg-slate-200/80 dark:bg-slate-800/80" />
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`period-${index}`}
                  className="h-10 animate-pulse rounded-2xl bg-slate-200/80 dark:bg-slate-800/80"
                />
              ))}
            </div>
          </div>
          <div className="glass-toolbar rounded-[1.35rem] p-3">
            <div className="h-3 w-16 animate-pulse rounded-full bg-slate-200/80 dark:bg-slate-800/80" />
            <div className="mt-3 grid grid-cols-3 gap-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={`category-${index}`}
                  className="h-10 animate-pulse rounded-2xl bg-slate-200/80 dark:bg-slate-800/80"
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
            className="glass-card-premium h-64 animate-pulse bg-slate-100/80 dark:bg-slate-900/60"
            data-testid="hot-page-skeleton-card"
          />
        ))}
      </div>
    </section>
  );
};

export default HotPageSkeleton;
