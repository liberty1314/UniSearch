import React, { useState } from 'react';
import { Search, Download, Heart, Star, Settings } from 'lucide-react';
import { AnimatedButton } from './AnimatedButton';
import { SearchButton } from './SearchButton';
import { LoadingSpinner } from './LoadingSpinner';
import { cn } from '@/lib/utils';

export const AnimationDemo: React.FC = () => {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

  const toggleLoading = (key: string) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
    
    // 3秒后自动停止加载
    setTimeout(() => {
      setLoadingStates(prev => ({
        ...prev,
        [key]: false
      }));
    }, 3000);
  };

  return (
    <div className="p-8 space-y-12 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 min-h-screen">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          动画效果演示
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          展示搜索按钮和组件的流畅动画过渡效果
        </p>
      </div>

      {/* 搜索按钮演示 */}
      <section className="space-y-8">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 text-center">
          搜索按钮效果
        </h2>
        
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-4">
              搜索功能演示
            </h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="输入搜索关键词..."
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-apple-blue focus:border-transparent transition-all duration-300"
              />
              <div className="flex space-x-3">
                <SearchButton
                  onClick={() => toggleLoading('search')}
                  loading={loadingStates.search}
                  loadingText="搜索中..."
                  size="md"
                >
                  搜索
                </SearchButton>
                
                <SearchButton
                  onClick={() => toggleLoading('advanced')}
                  loading={loadingStates.advanced}
                  loadingText="高级搜索..."
                  size="md"
                >
                  高级搜索
                </SearchButton>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-4">
              搜索按钮状态对比
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center space-y-3">
                <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">正常状态</h4>
                <SearchButton size="md">搜索</SearchButton>
              </div>
              <div className="text-center space-y-3">
                <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">搜索中状态</h4>
                <SearchButton size="md" loading={true} loadingText="搜索中...">搜索</SearchButton>
              </div>
              <div className="text-center space-y-3">
                <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">禁用状态</h4>
                <SearchButton size="md" disabled={true}>搜索</SearchButton>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 按钮动画演示 */}
      <section className="space-y-8">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 text-center">
          按钮动画效果
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* 主要按钮 */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">主要按钮</h3>
            <div className="space-y-3">
              <AnimatedButton
                onClick={() => toggleLoading('primary')}
                loading={loadingStates.primary}
                loadingText="加载中..."
                variant="primary"
                size="md"
              >
                点击体验
              </AnimatedButton>
              
              <AnimatedButton
                onClick={() => toggleLoading('primary-lg')}
                loading={loadingStates['primary-lg']}
                loadingText="处理中..."
                variant="primary"
                size="lg"
                icon={<Search className="w-5 h-5" />}
              >
                大号按钮
              </AnimatedButton>
            </div>
          </div>

          {/* 次要按钮 */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">次要按钮</h3>
            <div className="space-y-3">
              <AnimatedButton
                onClick={() => toggleLoading('secondary')}
                loading={loadingStates.secondary}
                loadingText="保存中..."
                variant="secondary"
                size="md"
                icon={<Download className="w-4 h-4" />}
              >
                保存
              </AnimatedButton>
              
              <AnimatedButton
                onClick={() => toggleLoading('secondary-sm')}
                loading={loadingStates['secondary-sm']}
                loadingText="..."
                variant="secondary"
                size="sm"
              >
                小按钮
              </AnimatedButton>
            </div>
          </div>

          {/* 幽灵按钮 */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">幽灵按钮</h3>
            <div className="space-y-3">
              <AnimatedButton
                onClick={() => toggleLoading('ghost')}
                loading={loadingStates.ghost}
                loadingText="设置中..."
                variant="ghost"
                size="md"
                icon={<Settings className="w-4 h-4" />}
              >
                设置
              </AnimatedButton>
              
              <AnimatedButton
                onClick={() => toggleLoading('ghost-lg')}
                loading={loadingStates['ghost-lg']}
                loadingText="收藏中..."
                variant="ghost"
                size="lg"
                icon={<Heart className="w-5 h-5" />}
              >
                收藏
              </AnimatedButton>
            </div>
          </div>
        </div>
      </section>

      {/* 加载动画演示 */}
      <section className="space-y-8">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 text-center">
          加载动画效果
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* 旋转加载 */}
          <div className="text-center space-y-4">
            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">旋转加载</h3>
            <div className="flex justify-center space-x-4">
              <LoadingSpinner size="sm" variant="spinner" color="primary" />
              <LoadingSpinner size="md" variant="spinner" color="primary" />
              <LoadingSpinner size="lg" variant="spinner" color="primary" />
            </div>
          </div>

          {/* 点状加载 */}
          <div className="text-center space-y-4">
            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">点状加载</h3>
            <div className="flex justify-center space-x-4">
              <LoadingSpinner size="sm" variant="dots" color="primary" />
              <LoadingSpinner size="md" variant="dots" color="primary" />
              <LoadingSpinner size="lg" variant="dots" color="primary" />
            </div>
          </div>

          {/* 脉冲加载 */}
          <div className="text-center space-y-4">
            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">脉冲加载</h3>
            <div className="flex justify-center space-x-4">
              <LoadingSpinner size="sm" variant="pulse" color="primary" />
              <LoadingSpinner size="md" variant="pulse" color="primary" />
              <LoadingSpinner size="lg" variant="pulse" color="primary" />
            </div>
          </div>

          {/* 弹跳加载 */}
          <div className="text-center space-y-4">
            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">弹跳加载</h3>
            <div className="flex justify-center space-x-4">
              <LoadingSpinner size="sm" variant="bounce" color="primary" />
              <LoadingSpinner size="md" variant="bounce" color="primary" />
              <LoadingSpinner size="lg" variant="bounce" color="primary" />
            </div>
          </div>

          {/* 涟漪加载 */}
          <div className="text-center space-y-4">
            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">涟漪加载</h3>
            <div className="flex justify-center space-x-4">
              <LoadingSpinner size="sm" variant="ripple" color="primary" />
              <LoadingSpinner size="md" variant="ripple" color="primary" />
              <LoadingSpinner size="lg" variant="ripple" color="primary" />
            </div>
          </div>

          {/* 颜色变体 */}
          <div className="text-center space-y-4">
            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">颜色变体</h3>
            <div className="flex justify-center space-x-4">
              <LoadingSpinner size="md" variant="spinner" color="primary" />
              <LoadingSpinner size="md" variant="spinner" color="white" />
              <LoadingSpinner size="md" variant="spinner" color="gray" />
            </div>
          </div>
        </div>
      </section>

      {/* 交互演示 */}
      <section className="space-y-8">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 text-center">
          交互效果演示
        </h2>
        
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-4">
              操作按钮组
            </h3>
            <div className="flex flex-wrap gap-3">
              <AnimatedButton
                onClick={() => toggleLoading('like')}
                loading={loadingStates.like}
                loadingText="点赞中..."
                variant="ghost"
                size="sm"
                icon={<Heart className="w-4 h-4" />}
              >
                点赞
              </AnimatedButton>
              
              <AnimatedButton
                onClick={() => toggleLoading('star')}
                loading={loadingStates.star}
                loadingText="收藏中..."
                variant="ghost"
                size="sm"
                icon={<Star className="w-4 h-4" />}
              >
                收藏
              </AnimatedButton>
              
              <AnimatedButton
                onClick={() => toggleLoading('share')}
                loading={loadingStates.share}
                loadingText="分享中..."
                variant="ghost"
                size="sm"
                icon={<Download className="w-4 h-4" />}
              >
                分享
              </AnimatedButton>
            </div>
          </div>
        </div>
      </section>

      {/* 动画说明 */}
      <section className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
          <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-4">
            动画特性说明
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-600 dark:text-gray-400">
            <div className="space-y-2">
              <h4 className="font-medium text-gray-700 dark:text-gray-300">按钮动画</h4>
              <ul className="space-y-1 list-disc list-inside">
                <li>按压效果：点击时按钮缩小到95%</li>
                <li>悬停效果：鼠标悬停时按钮放大到105%</li>
                <li>涟漪效果：点击位置产生扩散动画</li>
                <li>状态过渡：加载状态平滑切换</li>
                <li><strong>搜索状态：橙色背景主题</strong></li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-gray-700 dark:text-gray-300">加载动画</h4>
              <ul className="space-y-1 list-disc list-inside">
                <li>旋转加载：经典圆形旋转动画</li>
                <li>点状加载：三个点依次脉冲</li>
                <li>脉冲加载：整体缩放脉冲效果</li>
                <li>弹跳加载：三个点依次弹跳</li>
                <li>涟漪加载：同心圆扩散效果</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-gradient-to-r from-search-orange/10 to-yellow-500/10 rounded-xl border border-search-orange/20">
            <h4 className="font-medium text-search-orange mb-2">搜索状态特色</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              搜索按钮在搜索中状态下会切换到橙色主题，提供清晰的视觉反馈，让用户明确知道搜索正在进行中。
              橙色背景配合白色文字和加载动画，既美观又实用。
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AnimationDemo;
