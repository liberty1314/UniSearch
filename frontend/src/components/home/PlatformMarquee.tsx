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
    <div className="relative w-full max-w-full overflow-hidden mb-16 pt-4">
      <div className="text-center mb-6">
        <h3 className="text-sm md:text-base font-medium text-slate-400 dark:text-slate-500 uppercase tracking-widest">
          支持识别/聚合以下链接类型
        </h3>
      </div>
      
      <div className="relative flex w-full flex-col items-center justify-center overflow-hidden">
        {/* 跑马灯组件 */}
        <Marquee pauseOnHover className="[--duration:30s] [--gap:3rem] sm:[--gap:4rem] py-4">
          {platforms.map((platform, index) => (
              <div 
                key={index}
                className="group flex items-center justify-center px-6 py-3 rounded-full bg-white/40 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-md shadow-sm hover:shadow-md transition-all duration-300 cursor-default hover:-translate-y-1 hover:border-slate-300/50 dark:hover:border-slate-700/50"
              >
                <span className="text-sm sm:text-base font-semibold text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors duration-300">
                  {platform.name}
                </span>
              </div>
          ))}
        </Marquee>

        {/* 左右渐隐遮罩 */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-[#F9FAFB] dark:from-[#020617] to-transparent"></div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l from-[#F9FAFB] dark:from-[#020617] to-transparent"></div>
      </div>
    </div>
  );
};

export default PlatformMarquee;
