import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  IoGridOutline,
  IoListOutline,
  IoAlertCircleOutline,
  IoSearchOutline,
  IoKeyOutline,
  IoTimeOutline
} from 'react-icons/io5';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchStore } from '@/stores/searchStore';
import type { MergedLink } from '@/types/api';
import { CloudType, CloudTypeValue } from '@/types/api';
import { cn } from '@/lib/utils';
import PasswordModal from './PasswordModal';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import LoadingState from '@/components/LoadingState';
import { GlassSurface } from '@/components/ui/glass-surface';

interface SearchResultsProps {
  className?: string;
}

type ViewMode = 'list' | 'grid';

interface SearchResultLink extends MergedLink {
  size?: number | string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.02
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 260,
      damping: 24,
      mass: 0.8
    }
  }
} as const;

const SearchResults: React.FC<SearchResultsProps> = ({ className }) => {
  const {
    searchResults,
    isLoading,
    error,
    hasMore,
    loadMore,
    searchParams,
    performSearch,
    displayedCount,
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

  // 无限滚动观察器
  const observerTarget = useRef<HTMLDivElement>(null);

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
    const seedTypes = [CloudType.MAGNET];
    if (seedTypes.includes(cloudType as CloudType)) {
      return 3;
    }

    // 第二优先级：其他网盘类型
    return 2;
  };

  const getCloudTypeInfo = (cloudType: CloudTypeValue) => {
    const cloudTypeMap = {
      [CloudType.BAIDU]: {
        name: '百度网盘',
        bg: 'bg-blue-500/10 dark:bg-blue-500/20',
        text: 'text-blue-600 dark:text-blue-400',
        border: 'border-blue-200/50 dark:border-blue-700/50',
        icon: 'text-blue-500'
      },
      [CloudType.ALIYUN]: {
        name: '阿里云盘',
        bg: 'bg-orange-500/10 dark:bg-orange-500/20',
        text: 'text-orange-600 dark:text-orange-400',
        border: 'border-orange-200/50 dark:border-orange-700/50',
        icon: 'text-orange-500'
      },
      [CloudType.QUARK]: {
        name: '夸克网盘',
        bg: 'bg-purple-500/10 dark:bg-purple-500/20',
        text: 'text-purple-600 dark:text-purple-400',
        border: 'border-purple-200/50 dark:border-purple-700/50',
        icon: 'text-purple-500'
      },
      [CloudType.TIANYI]: {
        name: '天翼云盘',
        bg: 'bg-cyan-500/10 dark:bg-cyan-500/20',
        text: 'text-cyan-600 dark:text-cyan-400',
        border: 'border-cyan-200/50 dark:border-cyan-700/50',
        icon: 'text-cyan-500'
      },
      [CloudType.UC]: {
        name: 'UC网盘',
        bg: 'bg-green-500/10 dark:bg-green-500/20',
        text: 'text-green-600 dark:text-green-400',
        border: 'border-green-200/50 dark:border-green-700/50',
        icon: 'text-green-500'
      },
      [CloudType.MOBILE]: {
        name: '移动云盘',
        bg: 'bg-indigo-500/10 dark:bg-indigo-500/20',
        text: 'text-indigo-600 dark:text-indigo-400',
        border: 'border-indigo-200/50 dark:border-indigo-700/50',
        icon: 'text-indigo-500'
      },
      [CloudType.ONE_ONE_FIVE]: {
        name: '115网盘',
        bg: 'bg-red-500/10 dark:bg-red-500/20',
        text: 'text-red-600 dark:text-red-400',
        border: 'border-red-200/50 dark:border-red-700/50',
        icon: 'text-red-500'
      },
      [CloudType.XUNLEI]: {
        name: '迅雷网盘',
        bg: 'bg-yellow-500/10 dark:bg-yellow-500/20',
        text: 'text-yellow-600 dark:text-yellow-400',
        border: 'border-yellow-200/50 dark:border-yellow-700/50',
        icon: 'text-yellow-500'
      },
      [CloudType.ONE_TWO_THREE]: {
        name: '123网盘',
        bg: 'bg-teal-500/10 dark:bg-teal-500/20',
        text: 'text-teal-600 dark:text-teal-400',
        border: 'border-teal-200/50 dark:border-teal-700/50',
        icon: 'text-teal-500'
      },
      [CloudType.LANZOU]: {
        name: '蓝奏云',
        bg: 'bg-blue-600/10 dark:bg-blue-600/20',
        text: 'text-blue-700 dark:text-blue-300',
        border: 'border-blue-300/50 dark:border-blue-600/50',
        icon: 'text-blue-600'
      },
      [CloudType.MAGNET]: {
        name: '磁力链接',
        bg: 'bg-gray-600/10 dark:bg-gray-600/20',
        text: 'text-gray-700 dark:text-slate-300',
        border: 'border-gray-300/50 dark:border-slate-700/50',
        icon: 'text-gray-600'
      },
    };
    return cloudTypeMap[cloudType] || {
      name: '未知类型',
      bg: 'bg-gray-500/10',
      text: 'text-gray-600',
      border: 'border-gray-200',
      icon: 'text-gray-500'
    };
  };

  // 处理并排序所有搜索结果（全量数据）
  const allSortedResults = useMemo(() => {
    if (!searchResults?.merged_by_type) return [];

    const allResults: Array<{ link: SearchResultLink; cloudType: string; priority: number; datetime: number }> = [];

    // 收集所有结果并添加优先级和时间信息
    Object.entries(searchResults.merged_by_type).forEach(([cloudType, links]) => {
      const priority = getCloudTypePriority(cloudType as CloudTypeValue);

      links.forEach((link: SearchResultLink) => {
        const datetime = link.datetime ? new Date(link.datetime).getTime() : 0;
        allResults.push({ link, cloudType, priority, datetime });
      });
    });

    // 按时间降序排列（最新优先）
    return allResults.sort((a, b) => {
      // 首先按照时间排序 (最新优先)
      if (Math.abs(b.datetime - a.datetime) > 1000) { // 稍微忽略毫秒级的完全一致，如果需要精确对比则去掉Math.abs
        return b.datetime - a.datetime;
      }

      // 时间相同时，按网盘类型优先级排序
      return a.priority - b.priority;
    });
  }, [searchResults]);

  // 根据 displayedCount 切片显示的结果
  const displayedResults = useMemo(() => {
    return allSortedResults.slice(0, displayedCount);
  }, [allSortedResults, displayedCount]);

  // 设置 IntersectionObserver 实现无限滚动
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // 当观察目标进入视口且还有更多数据时，加载更多
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          loadMore();
        }
      },
      {
        root: null, // 使用视口作为根
        rootMargin: '200px', // 提前200px触发加载
        threshold: 0.1,
      }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, isLoading, loadMore]);

  // 格式化时间，处理无效日期
  const formatResultTime = (timestamp: number) => {
    if (!timestamp) return '未知时间';
    const date = new Date(timestamp);
    // 过滤无效日期 (比如 0001-01-01) 和过早的日期
    // 网盘资源如果不可能是 2000 年以前的，这里作为一个简单的过滤器
    if (date.getFullYear() < 2000) {
      return '未知时间';
    }
    return date.toLocaleDateString();
  };

  const renderResultItem = (item: { link: SearchResultLink; cloudType: string; datetime: number }) => {
    const { link, cloudType } = item;
    const linkId = `${cloudType}-${link.url}`;
    const cloudInfo = getCloudTypeInfo(cloudType as CloudTypeValue);
    const hasPassword = link.password && link.password.trim() !== '';

    // 处理链接点击
    const handleLinkClick = (e: React.MouseEvent) => {
      // 阻止冒泡，防止触发其他点击事件(如果有)
      e.stopPropagation();

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
        <motion.div
          initial="hidden"
          animate="visible"
          key={linkId}
          variants={itemVariants}
          whileHover={{ y: -4, scale: 1.01 }}
          className="group relative h-full"
          onClick={handleLinkClick}
        >
          {/* 发光底座 */}
          <div className="absolute inset-x-8 -bottom-4 h-12 rounded-full bg-slate-900/5 blur-xl opacity-0 transition-all duration-500 group-hover:translate-y-2 group-hover:opacity-100 dark:bg-black/40" />
          
          <div
            data-testid="search-result-grid-card"
            className="relative h-full flex flex-col p-5 bg-white/60 dark:bg-slate-950/40 backdrop-blur-xl rounded-[24px] border border-white/60 dark:border-white/[0.06] hover:border-slate-200/70 dark:hover:border-white/10 shadow-[0_12px_32px_rgba(15,23,42,0.04)] dark:shadow-[0_12px_32px_rgba(0,0,0,0.4)] hover:shadow-[0_20px_48px_rgba(15,23,42,0.08)] dark:hover:shadow-[0_20px_48px_rgba(0,0,0,0.6)] transition-all duration-300 cursor-pointer overflow-hidden"
          >
            {/* 顶部的极简高光装饰 */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            {/* 顶部装饰条 */}
            <div className={cn("absolute top-0 left-0 right-0 h-1 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300",
              cloudInfo.text.includes("blue") ? "from-blue-400 to-cyan-300" :
                cloudInfo.text.includes("orange") ? "from-orange-400 to-yellow-300" :
                  cloudInfo.text.includes("purple") ? "from-purple-400 to-pink-300" :
                    "from-gray-400 to-gray-300"
            )} />

            {/* 标题区域 */}
            <div className="flex-1 mb-4 min-h-[3.5rem]">
              <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg line-clamp-2 leading-snug group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-purple-600 dark:group-hover:from-blue-400 dark:group-hover:to-purple-400 transition-all duration-300">
                {link.note || '未命名资源'}
              </h3>
            </div>

            {/* 元数据行 */}
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400 mb-4 px-1">
              <div className="flex items-center gap-1.5">
                <IoTimeOutline className="w-3.5 h-3.5" />
                <span>{formatResultTime(item.datetime)}</span>
              </div>
              {link.size && (
                <div className="bg-gray-100 dark:border dark:border-cyan-300/10 dark:bg-slate-900/72 px-2 py-0.5 rounded-full">
                  {link.size}
                </div>
              )}
            </div>

            {/* 底部功能区 */}
            <div className="mt-auto pt-3 border-t border-slate-200/50 dark:border-white/[0.04] flex items-center justify-between">
              {/* 网盘类型 */}
              <div className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
                cloudInfo.bg,
                cloudInfo.text,
                cloudInfo.border
              )}>
                {cloudInfo.name}
              </div>

              {/* 操作按钮 */}
              <div className="flex items-center gap-2">
                {hasPassword && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-green-50 dark:bg-emerald-400/[0.08] text-green-600 dark:text-emerald-200 text-xs font-medium rounded-full border border-green-200/50 dark:border-emerald-300/16" title="需要访问码">
                    <IoKeyOutline className="w-3 h-3" />
                    <span>有码</span>
                  </div>
                )}


              </div>
            </div>
          </div>
        </motion.div>
      );
    }

    // 列表视图
    return (
      <motion.div
        initial="hidden"
        animate="visible"
        key={linkId}
        variants={itemVariants}
        whileHover={{ x: 4 }}
        onClick={handleLinkClick}
        className="group relative p-4 flex items-center gap-5 bg-white/60 dark:bg-slate-950/40 backdrop-blur-xl rounded-[20px] border border-white/60 dark:border-white/[0.06] hover:border-slate-200/70 dark:hover:border-white/10 shadow-[0_8px_24px_rgba(15,23,42,0.03)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.3)] hover:shadow-[0_16px_32px_rgba(15,23,42,0.06)] dark:hover:shadow-[0_16px_32px_rgba(0,0,0,0.5)] cursor-pointer overflow-hidden transition-all duration-300"
      >
        <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-blue-400 to-cyan-300 opacity-0 group-hover:opacity-100 transition-opacity duration-300 dark:from-blue-500/50 dark:to-cyan-400/50" />
        <div className="flex w-full items-center gap-5 relative z-10">
          {/* 左侧图标/类型 */}
          <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner",
            cloudInfo.bg,
            cloudInfo.text
          )}>
            <span className="font-bold">{cloudInfo.name.charAt(0)}</span>
          </div>

          {/* 中间信息 */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg line-clamp-1 mb-1 group-hover:text-apple-blue transition-colors">
              {link.note || '未命名资源'}
            </h3>
            <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-slate-400">
              <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium bg-opacity-50", cloudInfo.bg, cloudInfo.text)}>
                {cloudInfo.name}
              </span>
              <span className="flex items-center gap-1">
                <IoTimeOutline className="w-3.5 h-3.5" />
                {formatResultTime(item.datetime)}
              </span>
              {link.size && <span>• {link.size}</span>}
            </div>
          </div>

          {/* 右侧操作 */}
          <div className="flex items-center gap-3">
            {hasPassword && (
              <div className="px-2.5 py-1 bg-green-50 dark:bg-emerald-400/[0.08] text-green-600 dark:text-emerald-200 text-xs font-medium rounded-full border border-green-200/50 dark:border-emerald-300/16 flex items-center gap-1">
                <IoKeyOutline className="w-3.5 h-3.5" />
                <span>访问码</span>
              </div>
            )}

          </div>
        </div>
      </motion.div>
    );
  };

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-16"
      >
        <div className="relative mx-auto max-w-xl">
          <div className="relative overflow-hidden rounded-[2.5rem] bg-white/60 dark:bg-slate-950/40 backdrop-blur-3xl border border-white/60 dark:border-white/[0.06] shadow-[0_24px_60px_rgba(15,23,42,0.06)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.4)] px-8 py-10 transition-all duration-300">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-pink-500/10 rounded-full blur-xl dark:from-red-500/10 dark:to-pink-500/10" />
              <div className="relative text-red-500 bg-red-50/50 dark:bg-red-500/10 dark:border dark:border-red-500/10 rounded-full p-6 w-24 h-24 mx-auto flex items-center justify-center shadow-inner backdrop-blur-md">
                <IoAlertCircleOutline className="w-12 h-12" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 tracking-tight">搜索请求失败</h3>
            <p className="text-gray-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed mb-8">{error}</p>
            <button
              onClick={() => performSearch(searchParams)}
              className="px-6 py-3 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-slate-900 font-semibold rounded-xl shadow-lg transition-all duration-300 transform active:scale-95"
            >
              重新尝试
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  if (!isLoading && allSortedResults.length === 0 && searchParams.keyword) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn('text-center py-20', className)}
      >
        <div className="relative mx-auto max-w-2xl">
          <div className="relative overflow-hidden rounded-[2.5rem] bg-white/60 dark:bg-slate-950/40 backdrop-blur-3xl border border-white/60 dark:border-white/[0.06] shadow-[0_24px_60px_rgba(15,23,42,0.06)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.4)] px-8 py-12 transition-all duration-300">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-cyan-500/5 rounded-full blur-xl dark:from-blue-500/10 dark:to-cyan-500/10" />
              <div className="relative text-slate-400 bg-white/50 dark:bg-white/[0.02] dark:border dark:border-white/[0.06] rounded-full p-8 w-28 h-28 mx-auto flex items-center justify-center shadow-inner backdrop-blur-md">
                <IoSearchOutline className="w-14 h-14" />
              </div>
            </div>
            <h3 className="text-[22px] font-bold text-gray-900 dark:text-slate-100 mb-4 tracking-tight">未找到相关资源</h3>
            <p className="text-gray-500 dark:text-slate-400 max-w-lg mx-auto leading-relaxed mb-8">
              很抱歉，没有找到与您搜索关键词"<span className="text-slate-800 dark:text-slate-200 font-semibold px-1">{searchParams.keyword}</span>"相关的资源。
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <div className="text-[13px] font-medium text-slate-500 dark:text-slate-400">
                试着搜搜看：
              </div>
              <div className="flex flex-wrap gap-2.5 justify-center">
                {['考研', '原神', '短剧', '电子书', '黑神话悟空'].map((keyword) => (
                  <button
                    key={keyword}
                    onClick={() => performSearch({ ...searchParams, keyword })}
                    className="px-4 py-1.5 bg-white/50 dark:bg-white/[0.04] backdrop-blur-md border border-slate-200/60 dark:border-white/[0.06] text-slate-600 dark:text-slate-300 rounded-[10px] text-[13px] font-medium shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 hover:text-slate-900 dark:hover:text-white"
                  >
                    {keyword}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  if (!searchParams.keyword) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className={cn('text-center py-20', className)}
      >
        <div className="relative inline-flex items-center justify-center mb-6 group">
          <div className="absolute inset-0 bg-blue-500/10 dark:bg-blue-400/10 rounded-3xl blur-2xl transition-all duration-700 group-hover:bg-blue-500/20 group-hover:scale-110" />
          <div className="relative w-20 h-20 rounded-[1.75rem] bg-white/60 dark:bg-white/[0.03] border border-white/60 dark:border-white/[0.08] shadow-[0_8px_32px_rgba(15,23,42,0.04)] dark:shadow-inner backdrop-blur-xl flex items-center justify-center">
            <IoSearchOutline className="w-10 h-10 text-slate-400 dark:text-slate-500 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors duration-500" />
          </div>
        </div>
        <div className="text-[20px] font-bold text-slate-800 dark:text-slate-200 mb-3 tracking-tight">等待搜索探索指令</div>
        <div className="text-slate-500 dark:text-slate-400/80 text-[15px]">
          在上方输入关键词，全网海量高品质网盘资源即可呈现
        </div>
      </motion.div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* 结果头部 */}
      {allSortedResults.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          data-testid="search-results-toolbar"
          className="flex items-center justify-between gap-4 p-4 rounded-[20px] bg-white/60 dark:bg-slate-950/40 backdrop-blur-xl border border-white/60 dark:border-white/[0.06] shadow-[0_8px_24px_rgba(15,23,42,0.03)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.3)] mb-2"
        >
          <div className="flex items-center gap-4">
            <div className="text-[14px] font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <span className="flex items-center justify-center min-w-6 h-6 px-1.5 rounded-full bg-blue-50/80 text-blue-600 text-xs font-bold border border-blue-200/50 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-300 shadow-sm">
                {allSortedResults.length}
              </span>
              <span>个结果</span>
              {displayedResults.length < allSortedResults.length && (
                <span className="text-slate-400 dark:text-slate-500 text-[13px] ml-1">
                  (已显示 {displayedResults.length})
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="bg-white/50 dark:bg-black/20 p-2.5 rounded-[14px] flex items-center justify-center border border-slate-200/60 dark:border-white/[0.06] shadow-sm hover:shadow-md transition-all duration-300 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white/80 dark:hover:bg-white/[0.08] active:scale-90"
              title={viewMode === 'grid' ? "切换为列表视图" : "切换为网格视图"}
            >
              <AnimatePresence mode="wait" initial={false}>
                {viewMode === 'grid' ? (
                  <motion.div
                    key="icon-list"
                    initial={{ opacity: 0, y: 15, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -15, scale: 0.8 }}
                    transition={{ duration: 0.2, ease: "circOut" }}
                  >
                    <IoListOutline className="w-5 h-5 drop-shadow-sm" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="icon-grid"
                    initial={{ opacity: 0, y: -15, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 15, scale: 0.8 }}
                    transition={{ duration: 0.2, ease: "circOut" }}
                  >
                    <IoGridOutline className="w-5 h-5 drop-shadow-sm" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>
        </motion.div>
      )}

      {/* 搜索结果包装层 */}
      <div
        data-testid="search-results-stage"
        className="relative"
      >
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className={cn(
            'relative z-10 w-full',
            viewMode === 'grid'
              ? 'grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
              : 'flex flex-col gap-4'
          )}
        >
          {displayedResults.map((item) => renderResultItem(item))}
        </motion.div>
      </div>

      {/* 无限滚动触发器 */}
      {hasMore && (
        <div
          ref={observerTarget}
          className="flex justify-center items-center py-8"
        >
          <LoadingState type="inline" size="sm" message="正在加载更多优质资源..." />
        </div>
      )}

      {/* 已加载全部提示 */}
      {!hasMore && displayedResults.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          className="text-center py-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100/50 dark:border dark:border-cyan-300/10 dark:bg-slate-900/72 rounded-full text-xs text-gray-500 dark:text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
            已加载全部 {allSortedResults.length} 条结果
          </div>
        </motion.div>
      )}

      {/* 初次加载状态 */}
      {debouncedIsLoading && displayedResults.length === 0 && (
        <LoadingState type="search" size="lg" />
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
