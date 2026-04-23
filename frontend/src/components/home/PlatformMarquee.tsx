import React from 'react';
import { Marquee } from '@/components/ui/marquee';
import { platformThemes } from '@/components/home/platformThemes';
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
              className={[
                'group relative flex cursor-pointer items-center justify-center gap-3 overflow-hidden rounded-[1.4rem] bg-gradient-to-r px-6 py-3 text-white transition-all duration-300',
                platform.color,
                platform.shadow,
                'shadow-[0_8px_24px_rgba(15,23,42,0.14)] hover:-translate-y-0.5 hover:brightness-105 hover:shadow-[0_12px_28px_rgba(15,23,42,0.18)] active:scale-[0.98]',
              ].join(' ')}
            >
              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.24),transparent_45%,rgba(255,255,255,0.08))] opacity-80" />
              <div className="relative z-10 h-2.5 w-2.5 rounded-full border border-white/30 bg-white/90 shadow-[0_0_10px_rgba(255,255,255,0.35)]" />
              <span className="relative z-10 text-[15px] font-bold tracking-wide text-white">
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
