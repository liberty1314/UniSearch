import React from "react";
import { motion } from "framer-motion";
import { IoFlashOutline, IoKeyOutline, IoTimeOutline } from "react-icons/io5";
import { cn } from "@/lib/utils";
import {
  getCloudTypeInfo,
  formatResultTime,
  type ResultItem,
} from "@/utils/cloudTypeUtils";
import type { ResourceAction } from "@/types/api";

// ─── Props ────────────────────────────────────────────────────────────────────

interface SearchResultGridCardProps {
  item: ResultItem;
  /** 在当前已渲染列表中的绝对下标，用于错落入场延迟 */
  index: number;
  onOpenDetail: (item: ResultItem) => void;
  onActionClick: (action: ResourceAction, item: ResultItem) => void;
}

// ─── 组件 ─────────────────────────────────────────────────────────────────────

/**
 * 搜索结果网格卡片（React.memo）
 *
 * 动画设计：
 * - 首次挂载时执行 fade+slide 入场，delay 基于 `index % 48`
 *   使得每批次（初始加载 / loadMore）最多交错 48 帧，视觉流畅。
 * - 由于组件被 React.memo 包裹，loadMore 时旧卡片不会重渲染，
 *   因此旧卡片不会重放入场动画，只有新挂载的卡片会动画进入。
 */
export const SearchResultGridCard = React.memo<SearchResultGridCardProps>(
  ({ item, index, onOpenDetail, onActionClick }) => {
    const { resource, primaryLink, cloudType, datetime } = item;
    const cloudInfo = getCloudTypeInfo(cloudType);
    const hasPassword = Boolean(primaryLink?.password?.trim());
    const visibleActions = resource.actions.slice(0, 2);

    const handleAction = () => {
      onOpenDetail(item);
    };

    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      handleAction();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        e.stopPropagation();
        handleAction();
      }
    };

    const ariaLabel = `${cloudInfo.name}资源：${resource.title || "未命名资源"}${
      hasPassword ? "（需要访问码）" : ""
    }`;

    return (
      <motion.div
        // 入场动画：只在首次挂载时触发
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{
          // 每批次最多交错 20 项（0.04s × 20 = 0.8s），避免延迟过长
          delay: Math.min(index % 48, 20) * 0.04,
          duration: 0.4,
          ease: [0.22, 1, 0.36, 1],
        }}
        whileHover={{ y: -4, scale: 1.01 }}
        role="button"
        tabIndex={0}
        aria-label={ariaLabel}
        className="group relative h-full rounded-[24px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        data-testid="search-result-grid-card-wrapper"
      >
        {/* 发光底座 */}
        <div className="absolute inset-x-8 -bottom-4 h-12 rounded-full bg-slate-900/5 blur-xl opacity-0 transition-all duration-500 group-hover:translate-y-2 group-hover:opacity-100 dark:bg-black/40" />

        <div
          data-testid="search-result-grid-card"
          className="relative h-full flex flex-col p-5 bg-white/60 dark:bg-slate-950/40 backdrop-blur-xl rounded-[24px] border border-white/60 dark:border-white/[0.06] hover:border-slate-200/70 dark:hover:border-white/10 shadow-[0_12px_32px_rgba(15,23,42,0.04)] dark:shadow-[0_12px_32px_rgba(0,0,0,0.4)] hover:shadow-[0_20px_48px_rgba(15,23,42,0.08)] dark:hover:shadow-[0_20px_48px_rgba(0,0,0,0.6)] transition-colors transition-shadow duration-300 cursor-pointer overflow-hidden"
        >
          {/* 顶部高光线 */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

          {/* 顶部彩色装饰条（悬停时显示，颜色来自云盘类型配置） */}
          <div
            className={cn(
              "absolute top-0 left-0 right-0 h-1 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300",
              cloudInfo.gradient,
            )}
          />

          {/* 标题 */}
          <div className="flex-1 mb-4 min-h-[3.5rem]">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg line-clamp-2 leading-snug group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-purple-600 dark:group-hover:from-blue-400 dark:group-hover:to-purple-400 transition-all duration-300">
              {resource.title || "未命名资源"}
            </h3>
            {resource.description ? (
              <p className="mt-2 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">
                {resource.description}
              </p>
            ) : null}
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full border border-slate-200/70 bg-slate-50 px-2.5 py-1 text-slate-600 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-300">
              {resource.source.name || resource.source.id || resource.source.type}
            </span>
            {resource.media_type ? (
              <span className="rounded-full border border-cyan-200/60 bg-cyan-50 px-2.5 py-1 text-cyan-700 dark:border-cyan-400/20 dark:bg-cyan-500/10 dark:text-cyan-200">
                {resource.media_type}
              </span>
            ) : null}
            {resource.target_type ? (
              <span className="rounded-full border border-amber-200/60 bg-amber-50 px-2.5 py-1 text-amber-700 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-200">
                {resource.target_type}
              </span>
            ) : null}
          </div>

          {/* 元数据行（时间） */}
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400 mb-4 px-1">
            <div className="flex items-center gap-1.5">
              <IoTimeOutline className="w-3.5 h-3.5" />
              <span>{formatResultTime(datetime)}</span>
            </div>
            <span>{resource.links.length} 个链接</span>
          </div>

          {/* 底部：网盘类型徽章 + 访问码标记 */}
          <div className="mt-auto pt-3 border-t border-slate-200/50 dark:border-white/[0.04] space-y-3">
            <div className="flex items-center justify-between">
              <div
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
                  cloudInfo.bg,
                  cloudInfo.text,
                  cloudInfo.border,
                )}
              >
                {cloudInfo.name}
              </div>

              {hasPassword && (
                <div
                  className="flex items-center gap-1 px-2 py-1 bg-green-50 dark:bg-emerald-400/[0.08] text-green-600 dark:text-emerald-200 text-xs font-medium rounded-full border border-green-200/50 dark:border-emerald-300/16"
                  title="需要访问码"
                >
                  <IoKeyOutline className="w-3 h-3" />
                  <span>有码</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {visibleActions.map((action) => (
                <button
                  key={action.key}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onActionClick(action, item);
                  }}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200/70 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-blue-300 hover:text-blue-600 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-200 dark:hover:border-cyan-300/30 dark:hover:text-cyan-200"
                >
                  <IoFlashOutline className="h-3.5 w-3.5" />
                  {action.label}
                </button>
              ))}
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenDetail(item);
                }}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200/70 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-300"
              >
                查看详情
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  },
);

SearchResultGridCard.displayName = "SearchResultGridCard";
