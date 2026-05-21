import React from 'react';
import { motion } from 'framer-motion';
import { Film, BookOpen, MonitorPlay, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import HomeSectionHeader from '@/components/home/HomeSectionHeader';
import { Card } from '@/components/ui/card';
import { SearchService } from '@/services/searchService';
import { useAuthStore } from '@/stores/authStore';
import { useSearchAccessStatus } from '@/stores/searchAccessStore';

type Category = {
  id: number;
  title: string;
  description: string;
  icon: typeof Film;
  badgeGradient: string;
  badgeShadow: string;
  accentText: string;
  keywords: string[];
};

const categories: Category[] = [
  {
    id: 1,
    title: '影视娱乐',
    description: '从电影、剧集、动漫等高频资源入口快速开始。',
    icon: Film,
    badgeGradient: 'from-rose-500 via-pink-500 to-orange-400',
    badgeShadow: 'shadow-[0_14px_30px_rgba(244,63,94,0.22)]',
    accentText: 'group-hover:text-rose-500',
    keywords: ['4K', '剧集', '动漫'],
  },
  {
    id: 2,
    title: '学习资料',
    description: '适合先搜课程名、考试科目或资料方向。',
    icon: BookOpen,
    badgeGradient: 'from-sky-500 via-blue-500 to-cyan-400',
    badgeShadow: 'shadow-[0_14px_30px_rgba(14,165,233,0.22)]',
    accentText: 'group-hover:text-cyan-500',
    keywords: ['考研', '教程', '网课'],
  },
  {
    id: 3,
    title: '实用软件',
    description: '优先定位软件名、版本名和使用场景关键词。',
    icon: MonitorPlay,
    badgeGradient: 'from-emerald-500 via-teal-500 to-green-400',
    badgeShadow: 'shadow-[0_14px_30px_rgba(16,185,129,0.22)]',
    accentText: 'group-hover:text-teal-500',
    keywords: ['效率', '设计', '工具'],
  },
  {
    id: 4,
    title: '黑科技',
    description: '从 AI、源码、自动化等方向切入更容易命中。',
    icon: Zap,
    badgeGradient: 'from-violet-500 via-fuchsia-500 to-indigo-400',
    badgeShadow: 'shadow-[0_14px_30px_rgba(139,92,246,0.22)]',
    accentText: 'group-hover:text-violet-500',
    keywords: ['AI', '源码', '前沿'],
  },
];

const buildRouteSnapshotFromUrl = (url: string) => {
  const parsedUrl = new URL(url, window.location.origin);
  return {
    pathname: parsedUrl.pathname || '/',
    search: parsedUrl.search || '',
    hash: parsedUrl.hash || '',
  };
};

const buildQuickSearchUrl = (keyword: string) =>
  SearchService.buildSearchUrl({
    keyword,
    source: 'all',
    resultType: 'merge',
    cloudTypes: [],
    channels: [],
    plugins: [],
    concurrency: 5,
    refresh: false,
    ext: {},
  });

interface TrendingCategoriesProps {
  shouldPlayEntrance?: boolean;
}

export const TrendingCategories = ({
  shouldPlayEntrance = true,
}: TrendingCategoriesProps) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { status: searchAccessStatus } = useSearchAccessStatus();

  const handleKeywordClick = (keyword: string) => {
    const targetUrl = buildQuickSearchUrl(keyword);

    if (!isAuthenticated || searchAccessStatus === 'anonymous') {
      navigate('/login', {
        state: {
          from: buildRouteSnapshotFromUrl(targetUrl),
          pendingSearch: { keyword },
        },
      });
      return;
    }

    navigate(targetUrl);
  };

  return (
    <section className="mt-20 w-full">
      <motion.div
        initial={shouldPlayEntrance ? { opacity: 0, y: 20 } : false}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.6 }}
        className="mb-10"
      >
        <HomeSectionHeader
          eyebrow="快捷探索"
          title="热门分类"
          description="不知道搜什么时，先从常见资源方向快速开始。"
        />
      </motion.div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:gap-6">
        {categories.map((category, index) => {
          const Icon = category.icon;

          return (
            <motion.div
              key={category.id}
              initial={
                shouldPlayEntrance
                  ? { opacity: 0, y: 28, filter: 'blur(10px)', scale: 0.98 }
                  : false
              }
              whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)', scale: 1 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ delay: index * 0.08, duration: 0.55, ease: 'easeOut' }}
            >
              <Card
                data-testid="trending-category-card"
                data-glass-panel="true"
                className="group relative overflow-hidden p-5 md:p-6"
              >
                <div className="relative z-10 flex items-start gap-4">
                  <div
                    data-testid="trending-category-badge"
                    className={cn(
                      'flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.15rem] bg-gradient-to-br text-white ring-1 ring-white/60 dark:ring-white/15',
                      category.badgeGradient,
                      category.badgeShadow,
                    )}
                  >
                    <Icon className="h-5 w-5" strokeWidth={2} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3
                      className={cn(
                        'text-lg font-semibold tracking-tight text-slate-900 transition-colors duration-300 dark:text-slate-50',
                        category.accentText,
                      )}
                    >
                      {category.title}
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300/80">
                      {category.description}
                    </p>
                  </div>
                </div>

                <div className="relative z-10 mt-5 flex flex-wrap gap-2.5">
                  {category.keywords.map((keyword) => (
                    <button
                      key={keyword}
                      type="button"
                      data-testid="trending-category-chip"
                      onClick={() => handleKeywordClick(keyword)}
                      aria-label={`快捷搜索 ${keyword}`}
                      className="inline-flex items-center rounded-full border border-slate-200/70 bg-white/75 px-3.5 py-1.5 text-sm font-medium text-slate-600 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-200 hover:text-cyan-700 dark:border-white/10 dark:bg-slate-900/40 dark:text-slate-300 dark:hover:border-cyan-400/40 dark:hover:text-cyan-200"
                    >
                      {keyword}
                    </button>
                  ))}
                </div>

                <div className="pointer-events-none absolute inset-x-6 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-300/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:via-cyan-300/25" />
              </Card>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};

export default TrendingCategories;
