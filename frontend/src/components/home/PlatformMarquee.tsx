import React from 'react';
import { platformThemes } from '@/components/home/platformThemes';
import HomeSectionHeader from '@/components/home/HomeSectionHeader';

export const PlatformMarquee = () => {
  return (
    <section className="relative mt-12 mb-12 w-full max-w-full pt-4 sm:mt-16 sm:mb-16">
      <HomeSectionHeader
        eyebrow="能力覆盖"
        title="支持识别与聚合这些链接类型"
        description="以下平台能力会统一折叠进搜索结果与详情页判断路径中。"
        className="mb-5 max-w-3xl"
      />

      <div className="surface-panel relative overflow-visible px-4 pb-5 pt-7 sm:px-5 sm:pb-6 sm:pt-8"
      >
        <div className="mb-4 text-center text-xs font-semibold uppercase tracking-[0.26em] text-slate-400 dark:text-slate-500">
          平台覆盖
        </div>
        <div
          data-testid="platform-coverage-list"
          className="flex flex-wrap items-center justify-center gap-2.5 overflow-visible sm:gap-3"
        >
          {platformThemes.map((platform) => (
            <div
              key={platform.type}
              className={[
                'relative flex items-center justify-center gap-2 rounded-full px-3 py-2 text-white transition-transform duration-200 hover:-translate-y-0.5 sm:gap-3 sm:px-4 sm:py-2.5',
                platform.color,
                'shadow-[0_10px_24px_rgba(15,23,42,0.12)]',
              ].join(' ')}
            >
              <span className="h-2.5 w-2.5 rounded-full border border-white/35 bg-white/90 shadow-[0_0_10px_rgba(255,255,255,0.3)]" />
              <span className="text-sm font-semibold tracking-wide text-white">
                {platform.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PlatformMarquee;
