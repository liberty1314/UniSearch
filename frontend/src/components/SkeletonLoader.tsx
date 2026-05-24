import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SkeletonLoaderProps {
  className?: string;
  variant?: "card" | "list" | "text" | "circle";
  count?: number;
  animate?: boolean;
}

const baseClasses =
  "unisearch-skeleton-block relative overflow-hidden rounded-[inherit] bg-slate-200/80 dark:bg-slate-800/75";

const variants = {
  card: "h-48 rounded-2xl",
  list: "h-20 rounded-xl",
  text: "h-4 rounded-full",
  circle: "h-12 w-12 rounded-full",
} as const;

/**
 * 通用骨架屏组件
 * 统一首页、搜索页与热门页的加载质感，避免出现割裂的 pulse 效果。
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
      initial={animate ? { opacity: 0.55, y: 10 } : false}
      animate={animate ? { opacity: 1, y: 0 } : false}
      transition={{
        delay: index * 0.08,
        duration: 0.42,
        ease: [0.22, 1, 0.36, 1],
      }}
      style={animate ? { animationDelay: `${index * 90}ms` } : undefined}
    />
  ));

  return count === 1 ? items[0] : <>{items}</>;
};

/**
 * 搜索结果骨架屏
 */
export const SearchResultsSkeleton: React.FC<{ viewMode?: "grid" | "list" }> = ({
  viewMode = "grid",
}) => {
  const isGrid = viewMode === "grid";

  return (
    <div
      className={cn(
        isGrid
          ? "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          : "space-y-6",
      )}
      data-testid="search-results-skeleton"
    >
      {Array.from({ length: isGrid ? 8 : 6 }, (_, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05, duration: 0.34 }}
          className={cn(
            "glass-card-premium overflow-hidden p-5 md:p-6",
            isGrid ? "min-h-[16rem]" : "min-h-[12rem]",
          )}
        >
          <div className={cn(isGrid ? "space-y-4" : "grid gap-4 sm:grid-cols-[5.5rem_minmax(0,1fr)]")}>
            {!isGrid ? (
              <SkeletonLoader
                variant="card"
                className="h-28 rounded-[1.35rem]"
                animate
              />
            ) : null}

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 flex-1 gap-2">
                  <SkeletonLoader variant="text" className="h-3 w-10" />
                  <SkeletonLoader variant="text" className="h-3 w-12" />
                </div>
                <SkeletonLoader variant="text" className="h-6 w-16 rounded-full" />
              </div>

              <div className="space-y-2.5">
                <SkeletonLoader variant="text" className="h-6 w-3/4" />
                <SkeletonLoader variant="text" className="h-4 w-1/2" />
                <SkeletonLoader variant="text" className="h-3.5 w-full" />
                <SkeletonLoader variant="text" className="h-3.5 w-11/12" />
                <SkeletonLoader variant="text" className="h-3.5 w-4/5" />
              </div>

              <div className="flex flex-wrap gap-2">
                <SkeletonLoader variant="text" className="h-7 w-12 rounded-full" />
                <SkeletonLoader variant="text" className="h-7 w-12 rounded-full" />
                <SkeletonLoader variant="text" className="h-7 w-16 rounded-full" />
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

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
