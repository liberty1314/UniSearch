import React from 'react';
import { Marquee } from '@/components/ui/marquee';
import { cn } from '@/lib/utils';

// 真实平台数据
const platforms = [
  { name: '阿里云盘', src: '/阿里云盘.svg' },
  { name: '百度网盘', src: '/百度网盘.svg' },
  { name: '夸克网盘', src: '/夸克云盘.svg' },
  { name: '迅雷云盘', src: '/迅雷网盘.svg' },
  { name: '天翼云盘', src: '/天翼云盘.svg' },
  { name: '移动云盘', src: '/中国移动云盘.svg' },
  { name: '115网盘', src: '/115网盘.svg' },
];

export const PlatformMarquee = () => {
  return (
    <div className="relative w-full max-w-full overflow-hidden mb-16 pt-4">
      <div className="text-center mb-6">
        <h3 className="text-sm md:text-base font-medium text-slate-400 dark:text-slate-500 uppercase tracking-widest">
          全网海量资源・一站聚合搜索
        </h3>
      </div>
      
      <div className="relative flex w-full flex-col items-center justify-center overflow-hidden">
        {/* 跑马灯组件 */}
        <Marquee pauseOnHover className="[--duration:30s] [--gap:3rem] sm:[--gap:4rem] py-4">
          {platforms.map((platform, index) => (
              <div 
                key={index}
                className="group flex items-center gap-3 px-6 py-3 rounded-full bg-white/40 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-md shadow-sm hover:shadow-md transition-all duration-300 cursor-default hover:-translate-y-1 hover:border-slate-300/50 dark:hover:border-slate-700/50"
              >
                <img 
                  src={platform.src} 
                  alt={platform.name} 
                  className="w-6 h-6 object-contain transition-transform duration-300 group-hover:scale-110" 
                />
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
