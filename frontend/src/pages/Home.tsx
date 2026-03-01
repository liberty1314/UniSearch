import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import SearchBox from '@/components/SearchBox';
import CloudTypeFilter from '@/components/CloudTypeFilter';
import SearchResults from '@/components/SearchResults';
import { SparklesText } from "@/components/magicui/sparkles-text";
import GradientText from '@/components/GradientText';
import { useSearchStore } from '@/stores/searchStore';
import { FeatureCardsSkeleton } from '@/components/SkeletonLoader';

const Home: React.FC = () => {
  const {
    searchParams,
    searchResults,
  } = useSearchStore();

  const [isPageLoading, setIsPageLoading] = useState(true);

  // 页面加载效果：移除人为延迟，直接展示
  useEffect(() => {
    setIsPageLoading(false);
  }, []);



  const hasSearched = searchParams.keyword || (searchResults?.results && searchResults.results.length > 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 pt-24">
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
                colors={["#3b82f6", "#8b5cf6", "#3b82f6"]}
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
              className="text-2xl sm:text-3xl text-transparent bg-clip-text bg-gradient-to-r from-slate-700 via-indigo-600 to-slate-700 dark:from-slate-300 dark:via-indigo-300 dark:to-slate-300 font-bold tracking-tight mb-4 animate-gradient-breath-slow"
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
        </motion.div>

        {/* 搜索区域 - 增强设计 */}
        <div className="w-full flex flex-col items-center mb-24 space-y-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8, ease: "easeOut" }}
            className="relative max-w-4xl w-full z-20"
          >
            {/* 搜索框背景光晕 - 更强的动态光效 */}
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-fuchsia-500/20 rounded-[2rem] blur-3xl transform scale-105 opacity-50 dark:opacity-30 animate-pulse-slow" />

            <SearchBox className="w-full" />

          </motion.div>

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
            <div className="space-y-16 pb-40">
              {/* 功能特色 - 增强视觉设计 */}
              <div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.6 }}
                  className="text-center mb-16 px-4"
                >
                  <h2 className="text-3xl sm:text-4xl font-bold mb-6 tracking-tight text-gradient-premium">
                    为什么选择 UniSearch？
                  </h2>
                  <p className="text-lg text-gray-600 dark:text-slate-400 max-w-2xl mx-auto">
                    专业的网盘资源搜索平台，为您提供高效便捷的搜索体验
                  </p>
                </motion.div>

                {isPageLoading ? (
                  <FeatureCardsSkeleton />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* 多平台搜索 */}
                    <motion.div
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.0, duration: 0.5 }}
                      className="group relative cursor-pointer"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-2xl blur-xl group-hover:blur-2xl group-hover:scale-110 transition-all duration-500"></div>
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-cyan-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      <div className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-apple rounded-2xl p-8 shadow-card hover:shadow-hover transition-all duration-500 border border-gray-200/50 dark:border-white/10 group-hover:-translate-y-3 group-hover:border-blue-500/30">
                        <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:scale-125 group-hover:rotate-3 transition-all duration-500 group-hover:shadow-lg">
                          <svg className="w-8 h-8 text-white group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center group-hover:text-blue-500 group-hover:-translate-y-1 transition-all duration-300">
                          多平台搜索
                        </h3>
                        <p className="text-gray-600 dark:text-slate-300 text-center leading-relaxed group-hover:text-gray-700 dark:group-hover:text-gray-200 group-hover:-translate-y-1 transition-all duration-300">
                          支持百度网盘、阿里云盘、夸克网盘等多个主流网盘平台，一站式搜索体验
                        </p>
                      </div>
                    </motion.div>

                    {/* 智能匹配 */}
                    <motion.div
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.1, duration: 0.5 }}
                      className="group relative cursor-pointer"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-teal-500/10 to-emerald-500/10 rounded-2xl blur-xl group-hover:blur-2xl group-hover:scale-110 transition-all duration-500"></div>
                      <div className="absolute inset-0 bg-gradient-to-r from-teal-500/5 to-emerald-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      <div className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-apple rounded-2xl p-8 shadow-card hover:shadow-hover transition-all duration-500 border border-gray-200/50 dark:border-white/10 group-hover:-translate-y-3 group-hover:border-teal-500/30">
                        <div className="w-16 h-16 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:scale-125 group-hover:rotate-3 transition-all duration-500 group-hover:shadow-lg">
                          <svg className="w-8 h-8 text-white group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center group-hover:text-teal-500 group-hover:-translate-y-1 transition-all duration-300">
                          智能匹配
                        </h3>
                        <p className="text-gray-600 dark:text-slate-300 text-center leading-relaxed group-hover:text-gray-700 dark:group-hover:text-gray-200 group-hover:-translate-y-1 transition-all duration-300">
                          采用先进的搜索算法和AI技术，精准匹配您的搜索需求，提高搜索效率
                        </p>
                      </div>
                    </motion.div>

                    {/* 实时更新 */}
                    <motion.div
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.2, duration: 0.5 }}
                      className="group relative cursor-pointer"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-2xl blur-xl group-hover:blur-2xl group-hover:scale-110 transition-all duration-500"></div>
                      <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-orange-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      <div className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-apple rounded-2xl p-8 shadow-card hover:shadow-hover transition-all duration-500 border border-gray-200/50 dark:border-white/10 group-hover:-translate-y-3 group-hover:border-amber-500/30">
                        <div className="w-16 h-16 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:scale-125 group-hover:rotate-3 transition-all duration-500 group-hover:shadow-lg">
                          <svg className="w-8 h-8 text-white group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center group-hover:text-amber-500 group-hover:-translate-y-1 transition-all duration-300">
                          实时更新
                        </h3>
                        <p className="text-gray-600 dark:text-slate-300 text-center leading-relaxed group-hover:text-gray-700 dark:group-hover:text-gray-200 group-hover:-translate-y-1 transition-all duration-300">
                          资源库实时更新维护，确保您获得最新最全的搜索结果和资源信息
                        </p>
                      </div>
                    </motion.div>
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
      </div>
    </div>
  );
};

export default Home;
