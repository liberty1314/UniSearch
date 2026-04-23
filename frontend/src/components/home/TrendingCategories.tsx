import React from 'react';
import { motion } from 'framer-motion';
import { Film, BookOpen, MonitorPlay, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import HomeSectionHeader from '@/components/home/HomeSectionHeader';

type Category = {
  id: number;
  title: string;
  description: string;
  icon: typeof Film;
  badgeGradient: string;
  badgeShadow: string;
  accentText: string;
  accentGlow: string;
  accentBorder: string;
  chips: string[];
};

const categories: Category[] = [
  {
    id: 1,
    title: '影视娱乐',
    description: '最新高清大片、热门剧集、经典动漫',
    icon: Film,
    badgeGradient: 'from-rose-500 via-pink-500 to-orange-400',
    badgeShadow: 'shadow-[0_18px_34px_rgba(244,63,94,0.24)] group-hover:shadow-[0_22px_44px_rgba(244,63,94,0.30)]',
    accentText: 'group-hover:text-rose-500',
    accentGlow: 'from-rose-400/30 via-pink-300/16 to-orange-300/22 dark:from-rose-500/22 dark:via-pink-500/10 dark:to-orange-400/18',
    accentBorder: 'group-hover:border-rose-300/55 dark:group-hover:border-rose-400/42',
    chips: ['4K', '剧集', '动漫'],
  },
  {
    id: 2,
    title: '学习资料',
    description: '考研资料、专业教程、名校网课',
    icon: BookOpen,
    badgeGradient: 'from-sky-500 via-blue-500 to-cyan-400',
    badgeShadow: 'shadow-[0_18px_34px_rgba(14,165,233,0.24)] group-hover:shadow-[0_22px_44px_rgba(14,165,233,0.30)]',
    accentText: 'group-hover:text-cyan-500',
    accentGlow: 'from-sky-400/30 via-cyan-300/16 to-blue-300/22 dark:from-sky-500/22 dark:via-blue-500/10 dark:to-cyan-400/18',
    accentBorder: 'group-hover:border-sky-300/55 dark:group-hover:border-cyan-400/42',
    chips: ['考研', '教程', '网课'],
  },
  {
    id: 3,
    title: '实用软件',
    description: '设计工具、效率神器、破解版特供',
    icon: MonitorPlay,
    badgeGradient: 'from-emerald-500 via-teal-500 to-green-400',
    badgeShadow: 'shadow-[0_18px_34px_rgba(16,185,129,0.24)] group-hover:shadow-[0_22px_44px_rgba(16,185,129,0.30)]',
    accentText: 'group-hover:text-teal-500',
    accentGlow: 'from-emerald-400/30 via-teal-300/16 to-green-300/22 dark:from-emerald-500/22 dark:via-teal-500/10 dark:to-green-400/18',
    accentBorder: 'group-hover:border-emerald-300/55 dark:group-hover:border-teal-400/42',
    chips: ['效率', '设计', '工具'],
  },
  {
    id: 4,
    title: '黑科技',
    description: 'AI模型、前沿技术源码、私有资源',
    icon: Zap,
    badgeGradient: 'from-violet-500 via-fuchsia-500 to-indigo-400',
    badgeShadow: 'shadow-[0_18px_34px_rgba(139,92,246,0.24)] group-hover:shadow-[0_22px_44px_rgba(139,92,246,0.30)]',
    accentText: 'group-hover:text-violet-500',
    accentGlow: 'from-violet-400/30 via-fuchsia-300/16 to-indigo-300/22 dark:from-violet-500/22 dark:via-fuchsia-500/10 dark:to-indigo-400/18',
    accentBorder: 'group-hover:border-violet-300/55 dark:group-hover:border-violet-400/42',
    chips: ['AI', '源码', '前沿'],
  }
];

export const TrendingCategories = () => {
  return (
    <div className="w-full mt-28">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.6 }}
        className="mb-10"
      >
        <HomeSectionHeader
          eyebrow="推荐探索"
          title="探索热门分类"
          description="不知道搜什么？看看大家都在找些什么优质资源"
        />
      </motion.div>

      <div className="grid grid-cols-1 gap-5 p-4 md:grid-cols-12 md:auto-rows-[minmax(240px,auto)] xl:gap-6 lg:px-2">
        {categories.map((category, index) => {
          const Icon = category.icon;
          const bentoClass = index === 0 || index === 3 ? "md:col-span-7" : "md:col-span-5";

          return (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 40, filter: "blur(12px)", scale: 0.96 }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)", scale: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: index * 0.12, duration: 0.7, type: "spring", bounce: 0.3 }}
              className={cn("h-full h-full min-h-[220px] md:min-h-[240px]", bentoClass)}
            >
              <div
                data-testid="trending-category-card"
                data-glass-panel="true"
                className={cn(
                  "group relative flex h-full min-h-[220px] flex-col justify-between overflow-hidden rounded-[2.5rem] p-5 text-left transition-all duration-500 md:min-h-[240px]",
                  "cursor-pointer border border-white/40 bg-white/20 backdrop-blur-3xl",
                  "shadow-[0_12px_40px_rgba(15,23,42,0.04),inset_0_1px_1px_rgba(255,255,255,0.5)]",
                  "hover:-translate-y-2 hover:shadow-[0_24px_64px_rgba(15,23,42,0.08),inset_0_1px_1px_rgba(255,255,255,0.8)] hover:bg-white/30",
                  "active:scale-[0.98]",
                  "dark:border-slate-700/55 dark:bg-slate-950/80 dark:shadow-[0_12px_40px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.05)]",
                  "dark:hover:border-slate-600/70 dark:hover:bg-slate-900/85 dark:hover:shadow-[0_24px_64px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.08)]",
                  "md:p-6"
                )}
              >
              <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-white/80 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:via-white/40" />
              <div className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-white/75 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:via-white/30" />
              <div
                aria-hidden="true"
                className={cn(
                  "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-500 group-hover:opacity-100",
                  category.accentGlow
                )}
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.2),rgba(255,255,255,0.05)_30%,transparent_68%)] dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.05),transparent_32%,transparent_100%)]"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-10 top-8 h-28 w-28 rounded-full bg-white/40 blur-3xl transition-all duration-500 group-hover:scale-105 dark:bg-white/[0.05]"
              />

              <div className="relative z-10 flex items-start gap-3">
                <div
                  data-testid="trending-category-badge"
                  className={cn(
                    "flex items-center justify-center rounded-[1.25rem] bg-gradient-to-br text-white ring-1 ring-white/60 transition-shadow duration-500 dark:ring-white/20",
                    "h-12 w-12 shadow-[inset_0_1px_2px_rgba(255,255,255,0.5)] md:h-14 md:w-14",
                    category.badgeGradient,
                    category.badgeShadow
                  )}
                >
                  <Icon className="h-6 w-6 md:h-7 md:w-7" strokeWidth={2} />
                </div>
              </div>

              <div className="relative z-10 mt-6 flex flex-1 flex-col justify-between">
                <div>
                  <div className="mb-3.5 inline-flex items-center rounded-full border border-white/40 bg-white/30 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                    <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current opacity-70"></span>
                    热门搜索
                  </div>
                  <h3 className={cn("mb-2.5 text-xl font-bold tracking-tight text-slate-800 transition-colors duration-300 dark:text-slate-100 md:text-2xl", category.accentText)}>
                    {category.title}
                  </h3>
                  <p className="max-w-sm text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300/80">
                    {category.description}
                  </p>
                </div>

                <div className="mt-6">
                  <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
                    热门标签
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {category.chips.map((chip, chipIndex) => (
                      <span
                        key={chip}
                        data-testid="trending-category-chip"
                        style={{ transitionDelay: `${(index * 0.12 + chipIndex * 0.08 + 0.3).toFixed(2)}s` }}
                        className={cn(
                          "inline-flex items-center rounded-full border border-white/30 bg-white/20 px-3.5 py-1.5 text-[11px] font-semibold text-slate-600 shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:scale-105 hover:bg-white/40 active:scale-95 cursor-pointer",
                          "dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10",
                          category.accentBorder
                        )}
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-10 -right-10 h-32 w-32 rounded-full bg-white/25 blur-3xl transition-all duration-500 group-hover:scale-110 group-hover:opacity-100 dark:bg-white/[0.03]"
              />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default TrendingCategories;
