import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SkeletonLoaderProps {
  className?: string;
  variant?: "card" | "list" | "text" | "circle";
  count?: number;
  animate?: boolean;
}

/**
 * 骨架块基础样式：
 * - 亮色模式使用 slate-200 灰色底色，确保在白色背景下清晰可见
 * - 深色模式使用 slate-800 深蓝灰底色
 * - 叠加流光扫描动画（skeleton-shimmer）
 */
const baseClasses =
  "skeleton-shimmer relative overflow-hidden rounded-[inherit]";

const variants = {
  card: "h-48 rounded-2xl",
  list: "h-20 rounded-xl",
  text: "h-4 rounded-full",
  circle: "h-12 w-12 rounded-full",
} as const;

/**
 * 通用骨架屏组件
 * 统一首页、搜索页与热门页的加载质感
 */
const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  className,
  variant = "card",
  count = 1,
  animate = true,
}) => {
  const items = Array.from({ length: count }, (_, index) => (
    <motion.div
      key={index}
      className={cn(baseClasses, variants[variant], className)}
      initial={animate ? { opacity: 0, y: 8 } : false}
      animate={animate ? { opacity: 1, y: 0 } : false}
      transition={{
        delay: index * 0.06,
        duration: 0.38,
        ease: [0.22, 1, 0.36, 1],
      }}
    />
  ));

  return count === 1 ? items[0] : <>{items}</>;
};

// ──── 搜索结果网格骨架卡片 ────────────────────────────────────────────────────

/**
 * 网格模式骨架卡片
 * 严格对齐真实 SearchResultGridCard 的布局：
 *   - 顶部：大标题（2行）
 *   - 中部：时间图标行 + 大小角标
 *   - 底部分隔线后：网盘标签 + "详情 >" 入口
 */
const GridSkeletonCard: React.FC<{ delay: number }> = ({ delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20, scale: 0.96 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ delay, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    // 与真实卡片完全相同的容器样式
    className="relative h-full flex flex-col p-5 bg-white/60 dark:bg-slate-950/40 backdrop-blur-xl rounded-[24px] border border-white/60 dark:border-white/[0.06] shadow-[0_12px_32px_rgba(15,23,42,0.04)] dark:shadow-[0_12px_32px_rgba(0,0,0,0.4)] overflow-hidden"
  >
    {/* 标题占位（对应 h3，2 行，min-h-[3.5rem]） */}
    <div className="flex-1 mb-4 min-h-[3.5rem] space-y-2">
      <div className="skeleton-shimmer h-6 w-11/12 rounded-lg" />
      <div className="skeleton-shimmer h-6 w-3/4 rounded-lg" />
    </div>

    {/* 元数据行（对应时间 + 大小） */}
    <div className="flex items-center justify-between mb-4 px-1">
      {/* 时间：图标 + 文字 */}
      <div className="flex items-center gap-1.5">
        <div className="skeleton-shimmer h-3.5 w-3.5 rounded-full" />
        <div className="skeleton-shimmer h-3.5 w-16 rounded-full" />
      </div>
      {/* 大小胶囊 */}
      <div className="skeleton-shimmer h-5 w-14 rounded-full" />
    </div>

    {/* 底部：分隔线 + 网盘标签 + 详情按钮 */}
    <div className="mt-auto pt-3 border-t border-slate-200/50 dark:border-white/[0.04] flex items-center justify-between gap-3">
      {/* 网盘类型彩色胶囊 */}
      <div className="skeleton-shimmer h-6 w-20 rounded-full" />
      {/* "详情 >" 入口 */}
      <div className="skeleton-shimmer h-4 w-12 rounded" />
    </div>
  </motion.div>
);

// ──── 搜索结果列表骨架条目 ────────────────────────────────────────────────────

/**
 * 列表模式骨架条目
 * 严格对齐真实 SearchResultListItem 的布局：
 *   - 左侧：正方形网盘图标头像（w-12 h-12 rounded-2xl）
 *   - 中间：标题（1行）+ 元数据行（标签 + 时间 + 大小）
 *   - 右侧：详情按钮
 */
const ListSkeletonItem: React.FC<{ delay: number }> = ({ delay }) => (
  <motion.div
    initial={{ opacity: 0, x: -8 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    // 与真实列表条目完全相同的容器样式
    className="relative p-4 flex items-center gap-5 bg-white/60 dark:bg-slate-950/40 backdrop-blur-xl rounded-[20px] border border-white/60 dark:border-white/[0.06] shadow-[0_8px_24px_rgba(15,23,42,0.03)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.3)] overflow-hidden"
  >
    {/* 左侧竖条（hover 态，骨架下隐藏，保持占位不变） */}
    <div className="w-0" />

    {/* 左侧网盘图标方形头像（对应 w-12 h-12 rounded-2xl） */}
    <div className="skeleton-shimmer h-12 w-12 flex-shrink-0 rounded-2xl" />

    {/* 中间：标题 + 元数据 */}
    <div className="flex-1 min-w-0 space-y-2">
      {/* 标题（1 行） */}
      <div className="skeleton-shimmer h-5 w-4/5 rounded-lg" />
      {/* 元数据行：网盘标签 + 时间 + 大小 */}
      <div className="flex items-center gap-3">
        <div className="skeleton-shimmer h-5 w-16 rounded-md" />
        <div className="flex items-center gap-1">
          <div className="skeleton-shimmer h-3.5 w-3.5 rounded-full" />
          <div className="skeleton-shimmer h-3.5 w-14 rounded-full" />
        </div>
        <div className="skeleton-shimmer h-4 w-12 rounded-md" />
      </div>
    </div>

    {/* 右侧：详情按钮 */}
    <div className="flex-shrink-0">
      <div className="skeleton-shimmer h-4 w-12 rounded" />
    </div>
  </motion.div>
);

// ──── 导出：搜索结果骨架屏 ───────────────────────────────────────────────────

/**
 * 搜索结果骨架屏
 * - grid 模式：4 列网格，8 张卡片，布局与真实结果区完全一致
 * - list 模式：纵向列表，6 条，布局与真实结果区完全一致
 */
export const SearchResultsSkeleton: React.FC<{ viewMode?: "grid" | "list" }> = ({
  viewMode = "grid",
}) => {
  const isGrid = viewMode === "grid";
  const count = isGrid ? 8 : 6;

  return (
    <div
      className={cn(
        isGrid
          ? "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          : "flex flex-col gap-4",
      )}
      data-testid="search-results-skeleton"
    >
      {Array.from({ length: count }, (_, index) =>
        isGrid ? (
          <GridSkeletonCard key={index} delay={index * 0.04} />
        ) : (
          <ListSkeletonItem key={index} delay={index * 0.03} />
        ),
      )}
    </div>
  );
};

// ──── 导出：首页特性卡片骨架屏 ───────────────────────────────────────────────

/**
 * 首页特性卡片骨架屏
 */
export const FeatureCardsSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-3" data-testid="feature-cards-skeleton">
      {Array.from({ length: 3 }, (_, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: index * 0.08, duration: 0.38 }}
          className="glass-card-premium overflow-hidden p-8"
        >
          <div className="space-y-6 text-center">
            <SkeletonLoader variant="circle" className="mx-auto h-16 w-16" />
            <SkeletonLoader variant="text" className="mx-auto h-6 w-32" />

            <div className="space-y-2.5">
              <SkeletonLoader variant="text" className="h-4 w-full" />
              <SkeletonLoader variant="text" className="h-4 w-[88%] mx-auto" />
              <SkeletonLoader variant="text" className="h-4 w-3/4 mx-auto" />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default SkeletonLoader;
