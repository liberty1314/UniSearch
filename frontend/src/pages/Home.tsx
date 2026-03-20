import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, BriefcaseBusiness, KeyRound, Lightbulb, RefreshCw } from 'lucide-react';
import SearchBox from '@/components/SearchBox';
import CloudTypeFilter from '@/components/CloudTypeFilter';
import SearchResults from '@/components/SearchResults';
import { SparklesText } from "@/components/magicui/sparkles-text";
import GradientText from '@/components/GradientText';
import { useSearchStore } from '@/stores/searchStore';
import { useSearchAccessStatus } from '@/stores/searchAccessStore';
import { FeatureCardsSkeleton } from '@/components/SkeletonLoader';
import { GlowCard } from '@/components/ui/glowing-effect';
import { NumberTicker } from '@/components/ui/number-ticker';
import PublicPageShell from '@/components/PublicPageShell';
import { BLUE_CYAN_TEXT_GRADIENT_WITH_DARK } from '@/lib/brandTheme';

const featureCards = [
  {
    title: '多平台搜索',
    description: '支持百度网盘、阿里云盘、夸克网盘等多个主流网盘平台，一站式搜索体验',
    Icon: BriefcaseBusiness,
    iconGradient: 'from-blue-500 via-sky-500 to-cyan-400',
    iconGlow: 'shadow-[0_18px_32px_rgba(14,165,233,0.24)] group-hover:shadow-[0_22px_40px_rgba(14,165,233,0.28)]',
    accentText: 'group-hover:text-blue-500',
    accentBorder: 'group-hover:border-blue-400/28 dark:group-hover:border-blue-400/42',
    depthGlow: 'from-blue-200/45 via-sky-100/20 to-cyan-200/38 dark:from-slate-800/72 dark:via-blue-950/28 dark:to-cyan-950/42',
    surfaceTint: 'from-blue-500/[0.10] via-sky-100/20 to-cyan-500/[0.08] dark:from-blue-400/[0.12] dark:via-slate-950/10 dark:to-cyan-400/[0.10]',
    edgeTint: 'from-blue-400/40 via-white/55 to-cyan-300/38 dark:from-blue-400/34 dark:via-slate-400/12 dark:to-cyan-400/28',
  },
  {
    title: '智能匹配',
    description: '采用先进的搜索算法和AI技术，精准匹配您的搜索需求，提高搜索效率',
    Icon: Lightbulb,
    iconGradient: 'from-emerald-500 via-teal-500 to-green-400',
    iconGlow: 'shadow-[0_18px_32px_rgba(16,185,129,0.24)] group-hover:shadow-[0_22px_40px_rgba(16,185,129,0.28)]',
    accentText: 'group-hover:text-teal-500',
    accentBorder: 'group-hover:border-teal-400/28 dark:group-hover:border-teal-400/42',
    depthGlow: 'from-emerald-200/45 via-teal-100/20 to-green-200/38 dark:from-slate-800/72 dark:via-emerald-950/28 dark:to-teal-950/42',
    surfaceTint: 'from-emerald-500/[0.10] via-teal-100/18 to-green-500/[0.08] dark:from-emerald-400/[0.12] dark:via-slate-950/10 dark:to-teal-400/[0.10]',
    edgeTint: 'from-emerald-400/40 via-white/55 to-teal-300/38 dark:from-emerald-400/34 dark:via-slate-400/12 dark:to-teal-400/28',
  },
  {
    title: '实时更新',
    description: '资源库实时更新维护，确保您获得最新最全的搜索结果和资源信息',
    Icon: RefreshCw,
    iconGradient: 'from-amber-500 via-orange-500 to-yellow-400',
    iconGlow: 'shadow-[0_18px_32px_rgba(245,158,11,0.24)] group-hover:shadow-[0_22px_40px_rgba(245,158,11,0.28)]',
    accentText: 'group-hover:text-amber-500',
    accentBorder: 'group-hover:border-amber-400/28 dark:group-hover:border-amber-400/42',
    depthGlow: 'from-amber-200/45 via-orange-100/20 to-yellow-200/38 dark:from-slate-800/72 dark:via-amber-950/28 dark:to-orange-950/42',
    surfaceTint: 'from-amber-500/[0.10] via-orange-100/18 to-yellow-500/[0.08] dark:from-amber-400/[0.12] dark:via-slate-950/10 dark:to-orange-400/[0.10]',
    edgeTint: 'from-amber-400/40 via-white/55 to-orange-300/38 dark:from-amber-400/34 dark:via-slate-400/12 dark:to-orange-400/28',
  },
] as const;

const Home: React.FC = () => {
  const {
    searchParams,
    searchResults,
  } = useSearchStore();
  const { status: searchAccessStatus, initialized: searchAccessInitialized } = useSearchAccessStatus();

  const [isPageLoading, setIsPageLoading] = useState(true);

  // 页面加载效果：移除人为延迟，直接展示
  useEffect(() => {
    setIsPageLoading(false);
  }, []);



  const hasSearched = searchParams.keyword || (searchResults?.results && searchResults.results.length > 0);

  return (
    <PublicPageShell contentClassName="container mx-auto px-4 py-8 pt-24 pb-12">
        {/* 页面头部 - 增强品牌形象 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-20 relative z-10"
        >


          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >


            <SparklesText>
              <GradientText
                className="text-5xl md:text-7xl font-bold mb-6 tracking-tight"
                colors={["#3b82f6", "#0ea5e9", "#06b6d4"]}
                animationSpeed={6}
                showBorder={false}
              >
                UniSearch
              </GradientText>
            </SparklesText>

            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="text-2xl sm:text-3xl text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-cyan-600 to-blue-700 dark:from-blue-200 dark:via-cyan-300 dark:to-blue-200 font-bold tracking-tight mb-4 animate-gradient-breath-slow"
            >
              智能网盘资源搜索引擎
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="text-base sm:text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed"
            >
              快速找到您需要的文件，支持多平台一站式聚合搜索
            </motion.p>
          </motion.div>

          {/* 统计数字标签 - 21st.dev NumberTicker 风格 */}
          {!hasSearched && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.6 }}
              className="flex items-center justify-center gap-6 mt-8 flex-wrap"
            >
              {[
                { value: 5, suffix: '+', label: '支持平台' },
                { value: 100, suffix: 'w+', label: '资源索引' },
                { value: 99, suffix: '%', label: '搜索准确率' },
              ].map(({ value, suffix, label }) => (
                <div key={label} className="flex flex-col items-center gap-1 px-5 py-2.5 rounded-2xl bg-white/60 dark:bg-white/5 border border-white/70 dark:border-white/10 shadow-sm backdrop-blur-md">
                  <p className={`text-2xl font-extrabold ${BLUE_CYAN_TEXT_GRADIENT_WITH_DARK} tabular-nums`}>
                    <NumberTicker value={value} delay={0.9} />
                    <span>{suffix}</span>
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{label}</p>
                </div>
              ))}
            </motion.div>
          )}
        </motion.div>

        {/* 搜索区域 - 增强设计 */}
        <div className="w-full flex flex-col items-center mb-24 space-y-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8, ease: "easeOut" }}
            className="relative max-w-4xl w-full z-20"
          >
            <SearchBox className="w-full" />
          </motion.div>

          {searchAccessInitialized && searchAccessStatus === 'session_only' && !hasSearched && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.72, duration: 0.45 }}
              className="max-w-4xl w-full"
            >
              <div className="mx-auto flex w-fit max-w-full flex-col items-center gap-3 rounded-full border border-amber-200/70 bg-white/75 px-4 py-3 text-center shadow-[0_16px_40px_rgba(148,163,184,0.14)] backdrop-blur-xl dark:border-amber-400/15 dark:bg-slate-900/60 sm:flex-row sm:text-left">
                <div className="flex items-center gap-2 text-[13px] font-medium text-slate-600 dark:text-slate-300">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300">
                    <KeyRound className="h-4 w-4" />
                  </span>
                  <span>当前账号已登录，绑定 API Key 后即可开始搜索</span>
                </div>
                <Link
                  to="/settings/apikey"
                  className="group inline-flex items-center gap-1 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-all duration-300 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                >
                  去绑定
                  <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
                </Link>
              </div>
            </motion.div>
          )}

          {/* 网盘类型筛选器 - 只在搜索后显示 */}
          {hasSearched && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="max-w-4xl w-full"
            >
              <CloudTypeFilter />
            </motion.div>
          )}
        </div>

        {/* 主要内容区域 */}
        <div className="max-w-6xl mx-auto">
          {!hasSearched ? (
            /* 首页内容 */
            <div className="space-y-16 pb-24">
              {/* 功能特色 - 增强视觉设计 */}
              <div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.6 }}
                  className="text-center mb-16 px-4"
                >
                  <h2 className="text-3xl sm:text-4xl font-bold mb-6 tracking-tight text-blue-950 dark:text-cyan-100">
                    为什么选择 UniSearch？
                  </h2>
                  <p className="text-lg text-gray-600 dark:text-slate-400 max-w-2xl mx-auto">
                    专业的网盘资源搜索平台，为您提供高效便捷的搜索体验
                  </p>
                </motion.div>

                {isPageLoading ? (
                  <FeatureCardsSkeleton />
                ) : (
                  <div className="grid grid-cols-1 gap-8 md:grid-cols-3 [perspective:1600px]">
                    {featureCards.map((feature, index) => {
                      const { Icon } = feature;

                      return (
                        <motion.div
                          key={feature.title}
                          initial={{ opacity: 0, y: 30 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 1 + index * 0.1, duration: 0.5 }}
                          className="group relative cursor-pointer"
                        >
                          {/* 21st.dev GlowCard - 鼠标跟踪发光边框 */}
                          <GlowCard
                            className="rounded-[2rem] h-full"
                            glowColorClass={`${
                              index === 0 ? 'from-blue-500/60 via-sky-400/40 to-cyan-500/60' :
                              index === 1 ? 'from-emerald-500/60 via-teal-400/40 to-green-500/60' :
                                           'from-amber-500/60 via-orange-400/40 to-yellow-500/60'
                            }`}
                          >
                            <div
                              aria-hidden="true"
                              data-testid="feature-card-depth"
                              className={`pointer-events-none absolute inset-x-7 bottom-2 top-14 rounded-[2rem] bg-gradient-to-b ${feature.depthGlow} opacity-80 blur-2xl transition-all duration-500 group-hover:translate-y-5 group-hover:scale-[0.94] group-hover:opacity-100`}
                            />
                            <div
                              aria-hidden="true"
                              className="pointer-events-none absolute inset-x-10 bottom-0 h-10 rounded-full bg-slate-950/12 blur-2xl transition-all duration-500 group-hover:translate-y-3 group-hover:scale-x-90 dark:bg-black/35"
                            />

                            <div
                              data-testid="feature-card-surface"
                              className={`relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/90 p-8 shadow-[0_22px_50px_rgba(15,23,42,0.08),0_6px_18px_rgba(255,255,255,0.7)_inset,0_-18px_30px_rgba(148,163,184,0.08)_inset] backdrop-blur-apple transition-all duration-500 will-change-transform [transform-style:preserve-3d] dark:bg-slate-950/80 dark:border-slate-700/55 dark:shadow-[0_30px_60px_rgba(2,6,23,0.56),0_1px_0_rgba(148,163,184,0.12)_inset,0_-24px_34px_rgba(15,23,42,0.28)_inset] group-hover:[transform:translateY(-12px)_scale(1.01)] ${feature.accentBorder}`}
                            >
                              <div
                                aria-hidden="true"
                                className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${feature.surfaceTint} opacity-90`}
                              />
                              <div
                                aria-hidden="true"
                                className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.24),transparent_22%,transparent_100%)] opacity-80 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.05),transparent_18%,transparent_100%)] dark:opacity-100"
                              />
                              <div
                                aria-hidden="true"
                                className={`pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent ${feature.edgeTint} to-transparent opacity-85`}
                              />
                              <div
                                aria-hidden="true"
                                className="pointer-events-none absolute -right-10 top-10 h-24 w-24 rounded-full bg-white/22 blur-3xl transition-all duration-500 group-hover:scale-110 group-hover:opacity-80 dark:bg-slate-200/5"
                              />

                              <div className="relative z-10">
                                <div className={`mx-auto mb-6 flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-[1.6rem] bg-gradient-to-br ${feature.iconGradient} text-white ring-1 ring-white/40 transition-all duration-500 group-hover:-translate-y-1 group-hover:scale-[1.18] group-hover:rotate-3 ${feature.iconGlow}`}>
                                  <Icon className="h-8 w-8 transition-transform duration-300 group-hover:scale-110" strokeWidth={2.2} />
                                </div>

                                <h3 className={`mb-4 text-center text-xl font-bold text-gray-900 transition-all duration-300 group-hover:-translate-y-1 dark:text-white ${feature.accentText}`}>
                                  {feature.title}
                                </h3>

                                <p className="text-center leading-relaxed text-gray-600 transition-all duration-300 group-hover:-translate-y-1 group-hover:text-gray-700 dark:text-slate-300 dark:group-hover:text-gray-200">
                                  {feature.description}
                                </p>
                              </div>
                            </div>
                          </GlowCard>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* 搜索结果 */
            <div className="space-y-6">


              {/* 搜索结果内容 */}
              <SearchResults />
            </div>
          )}
        </div>
    </PublicPageShell>
  );
};

export default Home;
