import React from 'react';
import { Marquee } from '@/components/ui/marquee';
import { platformThemes } from '@/components/home/platformThemes';
import { cn } from '@/lib/utils';
import HomeSectionHeader from '@/components/home/HomeSectionHeader';

export const PlatformMarquee = () => {
  return (
    <div className="relative w-full max-w-full overflow-hidden mt-20 mb-28 pt-12">
      <HomeSectionHeader
        eyebrow="能力覆盖"
        title="支持识别 / 聚合以下链接类型"
        description="自动识别主流网盘分享链接，统一聚合到搜索结果中"
        className="mb-8 max-w-3xl"
      />

      <div className="relative flex w-full flex-col items-center justify-center overflow-hidden">
        <Marquee repeat={2} pauseOnHover className="[--duration:38s] [--gap:4rem] sm:[--gap:5rem] py-6">
          {platformThemes.map((platform) => (
            <div
              key={platform.type}
              className={cn(
                "group flex items-center justify-center rounded-full border border-transparent bg-gradient-to-r px-6 py-3 text-white backdrop-blur-md shadow-md transition-all duration-300 cursor-default hover:-translate-y-1 hover:shadow-lg ring-1 ring-white/20 dark:ring-white/10",
                platform.color,
                platform.shadow
              )}
            >
              <span className="text-sm sm:text-base font-semibold text-white/95 transition-colors duration-300 group-hover:text-white">
                {platform.name}
              </span>
            </div>
          ))}
        </Marquee>

        <div className="pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-[#F9FAFB] dark:from-[#020617] to-transparent"></div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l from-[#F9FAFB] dark:from-[#020617] to-transparent"></div>
      </div>
    </div>
  );
};

export default PlatformMarquee;
