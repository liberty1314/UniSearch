import React from 'react';
import SearchBox from '@/components/SearchBox';
import CloudTypeFilter from '@/components/CloudTypeFilter';
import SearchResults from '@/components/SearchResults';
import LoadingState from '@/components/LoadingState';
import GradientText from '@/components/GradientText';
import { useSearchStore } from '@/stores/searchStore';

const Home: React.FC = () => {
  const {
    searchParams,
    searchResults,
    isLoading,
    error,
    performSearch,
    clearResults,
  } = useSearchStore();



  const hasSearched = searchParams.keyword || (searchResults?.results && searchResults.results.length > 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* 页面头部 - 增强品牌形象 */}
        <div className="text-center mb-16 relative">
          {/* 背景装饰 */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-apple-blue/10 to-apple-purple/10 rounded-full blur-3xl animate-pulse-slow"></div>
          </div>
          
          <div className="animate-fade-in">
            <GradientText 
              className="text-5xl md:text-7xl font-bold mb-6 tracking-tight"
              colors={["#3b82f6", "#8b5cf6", "#3b82f6"]}
              animationSpeed={6}
              showBorder={false}
            >
              UniSearch
            </GradientText>
            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed font-medium">
              智能网盘资源搜索引擎
            </p>
            <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto mt-3">
              快速找到您需要的文件，支持多平台资源搜索
            </p>
          </div>
        </div>

        {/* 搜索区域 - 增强设计 */}
        <div className="w-full flex flex-col items-center mb-16 space-y-6">
          <div className="relative animate-slide-up max-w-4xl w-full py-6 md:py-6">
            {/* 搜索框背景装饰 */}
            <div className="absolute inset-0 bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl shadow-apple blur-sm transform scale-105"></div>
            
            <SearchBox className="w-full" />

          </div>
          
          {/* 网盘类型筛选器 - 只在搜索后显示 */}
          {hasSearched && (
            <div className="animate-slide-up max-w-4xl w-full" style={{ animationDelay: '200ms' }}>
              <CloudTypeFilter />
            </div>
          )}
        </div>

        {/* 主要内容区域 */}
        <div className="max-w-6xl mx-auto">
          {!hasSearched ? (
            /* 首页内容 */
            <div className="space-y-8 pb-40">




              {/* 功能特色 - 增强视觉设计 */}
              <div>
                <div className="text-center mb-12 animate-fade-in">
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                    为什么选择UniSearch？
                  </h2>
                  <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                    专业的网盘资源搜索平台，为您提供高效便捷的搜索体验
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* 多平台搜索 */}
                  <div className="group relative cursor-pointer">
                    <div className="absolute inset-0 bg-gradient-to-r from-apple-blue/10 to-apple-green/10 rounded-2xl blur-xl group-hover:blur-2xl group-hover:scale-110 transition-all duration-500"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-apple-blue/5 to-apple-green/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-apple rounded-2xl p-8 shadow-card hover:shadow-hover transition-all duration-500 border border-gray-200/50 dark:border-gray-700/50 group-hover:-translate-y-3 group-hover:border-apple-blue/30">
                      <div className="w-16 h-16 bg-gradient-to-r from-apple-blue to-apple-green rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:scale-125 group-hover:rotate-3 transition-all duration-500 group-hover:shadow-lg">
                        <svg className="w-8 h-8 text-white group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center group-hover:text-apple-blue group-hover:-translate-y-1 transition-all duration-300">
                        多平台搜索
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300 text-center leading-relaxed group-hover:text-gray-700 dark:group-hover:text-gray-200 group-hover:-translate-y-1 transition-all duration-300">
                        支持百度网盘、阿里云盘、夸克网盘等多个主流网盘平台，一站式搜索体验
                      </p>

                    </div>
                  </div>
                  
                  {/* 智能匹配 */}
                  <div className="group relative cursor-pointer">
                    <div className="absolute inset-0 bg-gradient-to-r from-apple-purple/10 to-apple-pink/10 rounded-2xl blur-xl group-hover:blur-2xl group-hover:scale-110 transition-all duration-500"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-apple-purple/5 to-apple-pink/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-apple rounded-2xl p-8 shadow-card hover:shadow-hover transition-all duration-500 border border-gray-200/50 dark:border-gray-700/50 group-hover:-translate-y-3 group-hover:border-apple-purple/30">
                      <div className="w-16 h-16 bg-gradient-to-r from-apple-purple to-apple-pink rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:scale-125 group-hover:rotate-3 transition-all duration-500 group-hover:shadow-lg">
                        <svg className="w-8 h-8 text-white group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center group-hover:text-apple-purple group-hover:-translate-y-1 transition-all duration-300">
                        智能匹配
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300 text-center leading-relaxed group-hover:text-gray-700 dark:group-hover:text-gray-200 group-hover:-translate-y-1 transition-all duration-300">
                        采用先进的搜索算法和AI技术，精准匹配您的搜索需求，提高搜索效率
                      </p>

                    </div>
                  </div>
                  
                  {/* 实时更新 */}
                  <div className="group relative cursor-pointer">
                    <div className="absolute inset-0 bg-gradient-to-r from-apple-orange/10 to-apple-yellow/10 rounded-2xl blur-xl group-hover:blur-2xl group-hover:scale-110 transition-all duration-500"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-apple-orange/5 to-apple-yellow/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-apple rounded-2xl p-8 shadow-card hover:shadow-hover transition-all duration-500 border border-gray-200/50 dark:border-gray-700/50 group-hover:-translate-y-3 group-hover:border-apple-orange/30">
                      <div className="w-16 h-16 bg-gradient-to-r from-apple-orange to-apple-yellow rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:scale-125 group-hover:rotate-3 transition-all duration-500 group-hover:shadow-lg">
                        <svg className="w-8 h-8 text-white group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center group-hover:text-apple-orange group-hover:-translate-y-1 transition-all duration-300">
                        实时更新
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300 text-center leading-relaxed group-hover:text-gray-700 dark:group-hover:text-gray-200 group-hover:-translate-y-1 transition-all duration-300">
                        资源库实时更新维护，确保您获得最新最全的搜索结果和资源信息
                      </p>

                    </div>
                  </div>
                </div>
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
                    <span className="px-3 py-1 bg-apple-blue text-white text-sm rounded-full">
                      "{searchParams.keyword}"
                    </span>
                  )}
                </div>
                
                <button
                  onClick={clearResults}
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  清空结果
                </button>
              </div>

              {/* 搜索结果内容 */}
              {isLoading && (!searchResults?.results || searchResults.results.length === 0) ? (
                <LoadingState type="search" message="正在搜索网盘资源..." />
              ) : error ? (
                <div className="text-center py-12">
                  <div className="text-red-500 dark:text-red-400 mb-2">搜索失败</div>
                  <div className="text-gray-600 dark:text-gray-400 text-sm mb-4">{error}</div>
                  <button
                    onClick={() => performSearch(searchParams)}
                    className="px-4 py-2 bg-apple-blue text-white rounded-lg hover:bg-apple-blue/90 transition-colors"
                  >
                    重试
                  </button>
                </div>
              ) : (
                <SearchResults />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;