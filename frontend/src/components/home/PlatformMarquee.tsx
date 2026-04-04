import React from 'react';
import { Marquee } from '@/components/ui/marquee';

const platforms = [
  { name: '阿里云盘' },
  { name: '百度网盘' },
  { name: '夸克网盘' },
  { name: '迅雷云盘' },
  { name: '天翼云盘' },
  { name: '移动云盘' },
  { name: '115网盘' },
];

export const PlatformMarquee = () => {
  return (
    <div className="relative mt-10 w-full max-w-full overflow-hidden rounded-[2rem] border border-white/60 bg-white/50 px-4 py-4 shadow-[0_10px_32px_rgba(15,23,42,0.04)] backdrop-blur-3xl dark:border-slate-700/50 dark:bg-slate-950/55 dark:shadow-[0_10px_32px_rgba(0,0,0,0.28)] sm:px-5">
      <div className="mb-4 flex flex-col gap-2 px-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">
            支持识别/聚合以下链接类型
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            自动识别主流网盘分享链接，统一聚合到搜索结果中。
          </p>
        </div>

        <span className="inline-flex w-fit items-center rounded-full border border-slate-200/70 bg-white/70 px-3 py-1.5 text-[11px] font-semibold tracking-[0.18em] text-slate-500 shadow-sm backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-slate-400">
          统一入口
        </span>
      </div>

      <div className="relative flex w-full flex-col items-center justify-center overflow-hidden">
        <Marquee repeat={2} pauseOnHover className="[--duration:34s] [--gap:1rem] py-2">
          {platforms.map((platform, index) => (
              <div 
                key={index}
                className="group flex items-center justify-center rounded-full border border-slate-200/60 bg-white/55 px-4 py-2.5 backdrop-blur-md shadow-sm transition-all duration-300 cursor-default hover:-translate-y-0.5 hover:border-slate-300/70 hover:bg-white/75 hover:shadow-md dark:border-slate-800/60 dark:bg-slate-900/55 dark:hover:border-slate-700/60 dark:hover:bg-slate-900/80"
              >
                <span className="text-sm font-semibold tracking-wide text-slate-700 transition-colors duration-300 group-hover:text-slate-900 dark:text-slate-200 dark:group-hover:text-white">
                  {platform.name}
                </span>
              </div>
          ))}
        </Marquee>

        <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-white via-white/95 to-transparent dark:from-slate-950 dark:via-slate-950/85" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-white via-white/95 to-transparent dark:from-slate-950 dark:via-slate-950/85" />
      </div>
    </div>
  );
};

export default PlatformMarquee;
