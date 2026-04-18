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
                "group relative flex items-center justify-center gap-3 rounded-[1.5rem] px-7 py-3 transition-all duration-300 cursor-pointer overflow-hidden",
                "bg-white/40 border border-white/50 backdrop-blur-3xl dark:bg-white/5 dark:border-white/10",
                "shadow-[0_8px_32px_rgba(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,0.5)]",
                "hover:-translate-y-0.5 hover:scale-105 hover:bg-white/60 hover:shadow-[0_16px_48px_rgba(0,0,0,0.08),inset_0_1px_1px_rgba(255,255,255,0.8)]",
                "active:scale-95",
                "dark:shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.1)]",
                "dark:hover:shadow-[0_16px_48px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.2)] dark:hover:bg-white/10",
              )}
            >
              <div 
                className={cn(
                  "absolute inset-0 opacity-0 group-hover:opacity-10 dark:group-hover:opacity-20 transition-opacity duration-300",
                  platform.color
                )}
              />
              <div className={cn(
                "w-2.5 h-2.5 rounded-full border border-white/20 dark:border-white/10 shadow-[0_0_10px_rgba(0,0,0,0.1)] dark:shadow-[0_0_10px_rgba(255,255,255,0.1)] relative z-10",
                platform.color
              )} />
              <span className="relative z-10 text-[15px] font-bold tracking-wide text-slate-700 dark:text-slate-200 transition-colors duration-300 group-hover:text-slate-900 dark:group-hover:text-white">
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
