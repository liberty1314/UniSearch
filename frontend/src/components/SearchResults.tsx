import React, { useState, useMemo } from 'react';
import {
  IoGridOutline,
  IoListOutline,
  IoAlertCircleOutline,
  IoSearchOutline
} from 'react-icons/io5';
import { useSearchStore } from '@/stores/searchStore';
import { CloudType, CloudTypeValue } from '@/types/api';
import { cn } from '@/lib/utils';
import PasswordModal from './PasswordModal';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import LoadingState from '@/components/LoadingState';

interface SearchResultsProps {
  className?: string;
}

type ViewMode = 'list' | 'grid';

// Skeleton Card Component
const SkeletonCard = ({ index }: { index: number }) => (
  <div 
    className="group bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 animate-pulse shadow-sm hover:shadow-lg transition-all duration-500"
    style={{ animationDelay: `${index * 100}ms` }}
  >
    <div className="flex items-start space-x-4">
      <div className="w-12 h-12 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-xl animate-pulse"></div>
      <div className="flex-1 space-y-3">
        <div className="space-y-2">
          <div className="h-5 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 rounded-lg w-4/5 animate-shimmer"></div>
          <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 rounded-lg w-3/5 animate-shimmer"></div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="h-6 bg-gradient-to-r from-blue-200 via-blue-300 to-blue-200 dark:from-blue-800 dark:via-blue-700 dark:to-blue-800 rounded-full w-20 animate-shimmer"></div>
          <div className="h-5 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 rounded-md w-16 animate-shimmer"></div>
        </div>
      </div>
    </div>
    <div className="mt-4 pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
      <div className="flex items-center justify-between">
        <div className="flex space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-xl animate-pulse"></div>
          <div className="w-8 h-8 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-xl animate-pulse"></div>
        </div>
        <div className="h-9 bg-gradient-to-r from-blue-200 via-blue-300 to-blue-200 dark:from-blue-800 dark:via-blue-700 dark:to-blue-800 rounded-xl w-24 animate-shimmer"></div>
      </div>
    </div>
  </div>
);

const SearchResults: React.FC<SearchResultsProps> = ({ className }) => {
  const { 
    searchResults, 
    isLoading, 
    error, 
    hasMore, 
    loadMore,
    searchParams,
    performSearch
  } = useSearchStore();

  const debouncedIsLoading = useDebouncedValue(isLoading, 200);

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [passwordModal, setPasswordModal] = useState<{
    isOpen: boolean;
    password: string;
    url: string;
    cloudType: string;
  }>({
    isOpen: false,
    password: '',
    url: '',
    cloudType: ''
  });

  /**
   * 获取网盘类型优先级
   * 优先级：热门网盘（夸克、百度、阿里、天翼） > 其他网盘 > 种子资源
   */
  const getCloudTypePriority = (cloudType: CloudTypeValue): number => {
    // 第一优先级：热门网盘（夸克、百度、阿里、天翼）
    const hotCloudTypes = [CloudType.QUARK, CloudType.BAIDU, CloudType.ALIYUN, CloudType.TIANYI];
    if (hotCloudTypes.includes(cloudType as CloudType)) {
      return 1;
    }
    
    // 最低优先级：种子资源
    const seedTypes = [CloudType.MAGNET, CloudType.ED2K];
    if (seedTypes.includes(cloudType as CloudType)) {
      return 3;
    }
    
    // 第二优先级：其他网盘类型
    return 2;
  };

  const getCloudTypeInfo = (cloudType: CloudTypeValue) => {
    const cloudTypeMap = {
      [CloudType.BAIDU]: { name: '百度网盘', color: 'bg-blue-500', textColor: 'text-blue-700' },
      [CloudType.ALIYUN]: { name: '阿里云盘', color: 'bg-orange-500', textColor: 'text-orange-700' },
      [CloudType.QUARK]: { name: '夸克网盘', color: 'bg-purple-500', textColor: 'text-purple-700' },
      [CloudType.TIANYI]: { name: '天翼云盘', color: 'bg-cyan-500', textColor: 'text-cyan-700' },
      [CloudType.UC]: { name: 'UC网盘', color: 'bg-green-500', textColor: 'text-green-700' },
      [CloudType.MOBILE]: { name: '移动云盘', color: 'bg-indigo-500', textColor: 'text-indigo-700' },
      [CloudType.ONE_ONE_FIVE]: { name: '115网盘', color: 'bg-red-500', textColor: 'text-red-700' },
      [CloudType.XUNLEI]: { name: '迅雷网盘', color: 'bg-yellow-500', textColor: 'text-yellow-700' },
      [CloudType.ONE_TWO_THREE]: { name: '123网盘', color: 'bg-teal-500', textColor: 'text-teal-700' },
      [CloudType.LANZOU]: { name: '蓝奏云', color: 'bg-blue-600', textColor: 'text-blue-700' },
      [CloudType.PIKPAK]: { name: 'PikPak', color: 'bg-pink-500', textColor: 'text-pink-700' },
      [CloudType.ONEDRIVE]: { name: 'OneDrive', color: 'bg-blue-700', textColor: 'text-blue-700' },
      [CloudType.GOOGLEDRIVE]: { name: 'Google Drive', color: 'bg-yellow-600', textColor: 'text-yellow-700' },
      [CloudType.MAGNET]: { name: '磁力链接', color: 'bg-gray-600', textColor: 'text-gray-700' },
      [CloudType.ED2K]: { name: 'ED2K链接', color: 'bg-slate-500', textColor: 'text-slate-700' },
    };
    return cloudTypeMap[cloudType] || { name: '未知类型', color: 'bg-gray-500', textColor: 'text-gray-700' };
  };

  // 处理并排序所有搜索结果
  const sortedResults = useMemo(() => {
    if (!searchResults?.merged_by_type) return [];
    
    const allResults: Array<{ link: any; cloudType: string; priority: number; datetime: number }> = [];
    
    // 收集所有结果并添加优先级和时间信息
    Object.entries(searchResults.merged_by_type).forEach(([cloudType, links]) => {
      const priority = getCloudTypePriority(cloudType as CloudTypeValue);
      
      links.forEach((link: any) => {
        const datetime = link.datetime ? new Date(link.datetime).getTime() : 0;
        allResults.push({ link, cloudType, priority, datetime });
      });
    });
    
    // 按优先级和时间排序
    return allResults.sort((a, b) => {
      // 首先按网盘类型优先级排序
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      // 同优先级内按时间降序排列（最新优先）
      return b.datetime - a.datetime;
    });
  }, [searchResults]);

  const renderResultItem = (item: { link: any; cloudType: string }, index: number) => {
    const { link, cloudType } = item;
    const linkId = `${cloudType}-${link.url}`;
    const cloudInfo = getCloudTypeInfo(cloudType as CloudTypeValue);
    const hasPassword = link.password && link.password.trim() !== '';

    // 处理链接点击
    const handleLinkClick = () => {
      if (hasPassword) {
        // 如果有密码，显示密码弹窗
        setPasswordModal({
          isOpen: true,
          password: link.password,
          url: link.url,
          cloudType: cloudInfo.name
        });
      } else {
        // 如果没有密码，直接打开链接
        window.open(link.url, '_blank');
      }
    };

    if (viewMode === 'grid') {
      return (
        <div
          key={linkId}
          className="group relative p-6 bg-white/95 dark:bg-gray-800/95 backdrop-blur-apple rounded-3xl border border-gray-200/60 dark:border-gray-700/60 hover:shadow-xl hover:shadow-blue-200/50 dark:hover:shadow-blue-500/20 hover:-translate-y-2 transition-all duration-300 animate-fade-in cursor-pointer h-35"
          style={{ animationDelay: `${index * 50}ms` }}
          onClick={handleLinkClick}
        >
          {/* 卡片内容布局 */}
          <div className="flex flex-col h-full">
            {/* 标题区域 - 占75%高度 */}
            <div className="flex-1 mb-3 min-h-0">
              <h3 className="font-bold text-gray-900 dark:text-white text-lg line-clamp-2 leading-tight group-hover:text-apple-blue transition-colors duration-300 h-full">
                {link.note || '网盘资源'}
              </h3>
            </div>
            
            {/* 底部信息区域 - 占25%高度 */}
            <div className="flex items-center justify-between flex-shrink-0">
              {/* 左下角：网盘类别 */}
              <div className={cn('px-3 py-1.5 rounded-full text-white text-sm font-bold shadow-sm', cloudInfo.color)}>
                {cloudInfo.name}
              </div>
              
              {/* 右下角：访问码提示 */}
              {hasPassword && (
                <div className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium rounded-full">
                  有访问码
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    // 列表视图
    return (
      <div
        key={linkId}
        className="group relative p-5 bg-white/95 dark:bg-gray-800/95 backdrop-blur-apple rounded-2xl border border-gray-200/60 dark:border-gray-700/60 hover:shadow-lg hover:shadow-blue-200/50 dark:hover:shadow-blue-500/20 hover:border-apple-blue/30 transition-all duration-300 animate-fade-in cursor-pointer"
        style={{ animationDelay: `${index * 30}ms` }}
        onClick={handleLinkClick}
      >
        <div className="flex items-center gap-5">
          {/* 文件信息 */}
          <div className="flex-1 min-w-0 space-y-2">
            <h3 className="font-bold text-gray-900 dark:text-white text-lg line-clamp-1 group-hover:text-apple-blue transition-colors duration-300 leading-tight">
              {link.note || '网盘资源'}
            </h3>
            <div className="flex items-center gap-3">
              {/* 左下角：网盘类别 */}
              <div className={cn('px-3 py-1.5 rounded-full text-white text-sm font-bold shadow-sm', cloudInfo.color)}>
                {cloudInfo.name}
              </div>
              
              {/* 网盘类别右边：访问码提示 */}
              {hasPassword && (
                <div className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium rounded-full">
                  有访问码
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (error) {
    return (
      <div className="text-center py-16">
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-pink-500/20 rounded-full blur-xl"></div>
          <div className="relative text-red-500 bg-red-50 dark:bg-red-900/20 rounded-full p-6 w-24 h-24 mx-auto flex items-center justify-center">
            <IoAlertCircleOutline className="w-12 h-12" />
          </div>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">搜索出错</h3>
        <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto leading-relaxed">{error}</p>
        <button 
          onClick={() => performSearch(searchParams)} 
          className="mt-6 inline-flex items-center px-4 py-2 bg-gradient-to-r from-apple-blue to-apple-blue/90 text-white font-medium rounded-xl hover:shadow-lg transition-all duration-300 transform hover:scale-105"
        >
          重新尝试
        </button>
      </div>
    );
  }

  if (!isLoading && sortedResults.length === 0 && searchParams.keyword) {
    return (
      <div className={cn('text-center py-20', className)}>
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-400/20 to-gray-500/20 rounded-full blur-xl"></div>
          <div className="relative text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-full p-8 w-32 h-32 mx-auto flex items-center justify-center">
            <IoSearchOutline className="w-16 h-16" />
          </div>
        </div>
        <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">未找到相关资源</h3>
        <p className="text-gray-500 dark:text-gray-400 max-w-lg mx-auto leading-relaxed mb-8">
          很抱歉，没有找到与您搜索关键词相关的资源。请尝试使用不同的关键词或检查拼写。
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            搜索建议：
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {['电影', '音乐', '软件', '电子书', '游戏'].map((keyword) => (
              <button
                key={keyword}
                className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-sm hover:bg-apple-blue hover:text-white transition-all duration-300 transform hover:scale-105"
              >
                {keyword}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!searchParams.keyword) {
    return (
      <div className={cn('text-center py-12', className)}>
        <div className="text-gray-500 dark:text-gray-400 mb-2">开始搜索</div>
        <div className="text-gray-400 dark:text-gray-500 text-sm">
          输入关键词开始搜索网盘资源
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* 结果头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            找到 <span className="font-medium text-gray-900 dark:text-white">{sortedResults.length}</span> 个结果
          </div>
          {debouncedIsLoading && (
            <LoadingState type="inline" size="sm" message="正在更新..." />
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-2 transition-colors',
                viewMode === 'list'
                  ? 'bg-apple-blue text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              )}
            >
              <IoListOutline className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-2 transition-colors',
                viewMode === 'grid'
                  ? 'bg-apple-blue text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              )}
            >
              <IoGridOutline className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 搜索结果 */}
      <div className={cn(
        viewMode === 'grid'
          ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
          : 'space-y-6'
      )}>
        {sortedResults.map((item, index) => 
          renderResultItem(item, index)
        )}
      </div>

      {/* 加载更多 */}
      {hasMore && (
        <div className="text-center py-6">
          <button
            onClick={loadMore}
            disabled={debouncedIsLoading}
            className="px-6 py-3 bg-apple-blue text-white rounded-lg hover:bg-apple-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {debouncedIsLoading ? '加载中...' : '加载更多'}
          </button>
        </div>
      )}

      {/* 加载状态 */}
      {debouncedIsLoading && sortedResults.length === 0 && (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <SkeletonCard key={index} index={index} />
          ))}
        </div>
      )}

      {/* 密码弹窗 */}
      <PasswordModal
        isOpen={passwordModal.isOpen}
        onClose={() => setPasswordModal(prev => ({ ...prev, isOpen: false }))}
        password={passwordModal.password}
        url={passwordModal.url}
        cloudType={passwordModal.cloudType}
      />
    </div>
  );
};

export default SearchResults;