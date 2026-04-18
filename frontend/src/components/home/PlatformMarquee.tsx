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

      <div 
        className="relative flex w-full flex-col items-center justify-center overflow-hidden"
        style={{
          maskImage: 'linear-gradient(to right, transparent, black 120px, black calc(100% - 120px), transparent)',
          WebkitMaskImage: 'linear-gradient(to right, transparent, black 120px, black calc(100% - 120px), transparent)'
        }}
      >
        <Marquee repeat={2} pauseOnHover className="[--duration:38s] [--gap:4rem] sm:[--gap:5rem] py-6">
          {platformThemes.map((platform) => (
            <div
              key={platform.type}
              className={cn(
                "group relative flex items-center justify-center gap-3 rounded-[1.4rem] px-6 py-3 transition-colors duration-300 cursor-pointer overflow-hidden",
                "bg-white/60 border-[0.5px] border-white/80 backdrop-blur-md dark:bg-slate-800/40 dark:border-white/10",
                "shadow-[0_2px_12px_rgba(0,0,0,0.04)]",
                "hover:bg-white hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)]",
                "active:bg-slate-50",
                "dark:hover:bg-slate-700/60",
              )}
            >
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


      </div>
    </div>
  );
};

export default PlatformMarquee;
