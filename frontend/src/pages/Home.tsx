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
    isLoading,
    error,
    performSearch,
    clearResults,
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
          {/* 背景装饰 - 双光晕创造深度感 */}
          <div className="absolute inset-0 -z-10 overflow-visible pointer-events-none">
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.2, 0.4, 0.2],
                x: [0, 20, 0],
                y: [0, -20, 0],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full blur-[100px]"
            />
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.1, 0.3, 0.1],
                x: [0, -30, 0],
                y: [0, 30, 0],
              }}
              transition={{
                duration: 10,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1,
              }}
              className="absolute top-0 left-1/4 transform -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-gradient-to-tr from-cyan-400/10 to-blue-400/10 rounded-full blur-[80px]"
            />
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <SparklesText>
              <GradientText
                className="text-6xl md:text-8xl font-bold mb-6 tracking-tighter"
                colors={["#4F46E5", "#E11D48", "#4F46E5"]}
                animationSpeed={8}
                showBorder={false}
              >
                UniSearch
              </GradientText>
            </SparklesText>

            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="text-2xl sm:text-3xl text-gray-700 dark:text-gray-200 font-medium tracking-tight mb-4"
            >
              智能网盘资源搜索引擎
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="text-base sm:text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed"
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
            {/* 搜索框背景光晕 */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/30 via-purple-500/30 to-pink-500/30 rounded-[2rem] blur-3xl transform scale-105 opacity-60 dark:opacity-40" />

            <div className="relative bg-white/60 dark:bg-gray-900/60 backdrop-blur-2xl rounded-[2rem] p-3 sm:p-5 border border-white/60 dark:border-white/10 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)] dark:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.3)] ring-1 ring-white/40 dark:ring-white/5">
              <SearchBox className="w-full" />
            </div>


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
                  <h2 className="text-3xl sm:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 mb-6 tracking-tight">
                    为什么选择 UniSearch？
                  </h2>
                  <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                    专业的网盘资源搜索平台，为您提供高效便捷的搜索体验
                  </p>
                </motion.div>

                {isPageLoading ? (
                  <FeatureCardsSkeleton />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4">
                    {/* 多平台搜索 */}
                    <motion.div
                      initial={{ opacity: 0, y: 30 }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        transition: { delay: 1.0, duration: 0.5 }
                      }}
                    >
                      <motion.div
                        whileHover={{ y: -8 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="group relative h-full"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-400/10 rounded-[2rem] -z-10 transition-all duration-300 group-hover:from-blue-500/20 group-hover:to-cyan-400/20" />
                        <div className="relative h-full bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl rounded-[2rem] p-8 border border-white/40 dark:border-white/5 shadow-sm hover:shadow-xl transition-all duration-300">
                          <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform duration-300">
                            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                          </div>
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            多平台聚合
                          </h3>
                          <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm">
                            一键连接阿里云盘、百度网盘、夸克网盘等多个平台，打破信息孤岛，实现全网资源一站式搜索。
                          </p>
                        </div>
                      </motion.div>
                    </motion.div>

                    {/* 智能匹配 */}
                    <motion.div
                      initial={{ opacity: 0, y: 30 }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        transition: { delay: 1.1, duration: 0.5 }
                      }}
                    >
                      <motion.div
                        whileHover={{ y: -8 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="group relative h-full"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 rounded-[2rem] -z-10 transition-all duration-300 group-hover:from-violet-500/20 group-hover:to-fuchsia-500/20" />
                        <div className="relative h-full bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl rounded-[2rem] p-8 border border-white/40 dark:border-white/5 shadow-sm hover:shadow-xl transition-all duration-300">
                          <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-violet-500/30 group-hover:scale-110 transition-transform duration-300">
                            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                          </div>
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                            智能语义匹配
                          </h3>
                          <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm">
                            内置先进的语义分析引擎，不仅匹配关键词，更能理解您的搜索意图，为您精准推荐最相关的资源。
                          </p>
                        </div>
                      </motion.div>
                    </motion.div>

                    {/* 实时更新 */}
                    <motion.div
                      initial={{ opacity: 0, y: 30 }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        transition: { delay: 1.2, duration: 0.5 }
                      }}
                    >
                      <motion.div
                        whileHover={{ y: -8 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="group relative h-full"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-400/10 to-amber-400/10 rounded-[2rem] -z-10 transition-all duration-300 group-hover:from-orange-400/20 group-hover:to-amber-400/20" />
                        <div className="relative h-full bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl rounded-[2rem] p-8 border border-white/40 dark:border-white/5 shadow-sm hover:shadow-xl transition-all duration-300">
                          <div className="w-14 h-14 bg-gradient-to-br from-orange-400 to-amber-400 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-orange-500/30 group-hover:scale-110 transition-transform duration-300">
                            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          </div>
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                            实时索引更新
                          </h3>
                          <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm">
                            资源库毫秒级实时更新索引，确保您永远获取到最新发布的一手资料，告别失效链接。
                          </p>
                        </div>
                      </motion.div>
                    </motion.div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* 搜索结果 */
            <div className="space-y-6">
              {/* 搜索结果头部 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    搜索结果
                  </h2>
                  {searchParams.keyword && (
                    <span className="px-3 py-1 bg-nebula-500 text-white text-sm rounded-full">
                      "{searchParams.keyword}"
                    </span>
                  )}
                </div>

                {(!isLoading && searchResults) && (
                  <button
                    onClick={() => { clearResults(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                  >
                    清空结果
                  </button>
                )}
              </div>

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