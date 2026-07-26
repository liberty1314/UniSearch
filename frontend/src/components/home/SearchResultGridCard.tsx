import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronRight, Clock3, KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getCloudTypeInfo,
  formatResultTime,
  type ResultItem,
} from "@/utils/cloudTypeUtils";
import {
  resolveResourceDisplaySize,
  resolveResourceDisplayTitle,
  resolveResourceSourcePresentation,
} from "@/utils/resourceDisplay";

// ─── 属性 ─────────────────────────────────────────────────────────────────────

interface SearchResultGridCardProps {
  item: ResultItem;
  entranceDelay?: number;
  canOpenResource: boolean;
  isResolvingResource?: boolean;
  showDetailEntry: boolean;
  showSourceBadge: boolean;
  onOpenResource: (item: ResultItem) => void;
  onCancelResolveResource: () => void;
  onOpenDetail: (item: ResultItem) => void;
}

// ─── 组件 ─────────────────────────────────────────────────────────────────────

/**
 * 搜索结果网格卡片（React.memo）
 *
 * 入场延迟由结果列表显式传入，减少动态效果时不执行位移动画。
 */
export const SearchResultGridCard = React.memo<SearchResultGridCardProps>(
  ({ item, entranceDelay = 0, canOpenResource, isResolvingResource = false, showDetailEntry, showSourceBadge, onOpenResource, onCancelResolveResource, onOpenDetail }) => {
    const shouldReduceMotion = useReducedMotion();
    const resolvedEntranceDelay = shouldReduceMotion ? 0 : entranceDelay;
    const { resource, primaryLink, cloudType, datetime } = item;
    const cloudInfo = getCloudTypeInfo(cloudType);
    const sourceInfo = resolveResourceSourcePresentation(resource);
    const sourceType = resource.source.type?.trim().toLowerCase();
    const sourceId = String(resource.source.id || "unknown").trim() || "unknown";
    const hasPassword = Boolean(primaryLink?.password?.trim());
    const sizeLabel = resolveResourceDisplaySize(item);
    const displayTitle = resolveResourceDisplayTitle(resource);

    const handleClick = (e: React.MouseEvent) => {
      if (!canOpenResource || isResolvingResource) {
        return;
      }
      e.stopPropagation();
      onOpenResource(item);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (!canOpenResource || isResolvingResource) {
        return;
      }
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        e.stopPropagation();
        onOpenResource(item);
      }
    };

    const ariaLabel = `${cloudInfo.name}资源：${displayTitle || "未命名资源"}${
      hasPassword ? "（需要访问码）" : ""
    }`;

    return (
      <motion.div
        initial={shouldReduceMotion
          ? false
          : { opacity: 0, y: 8, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{
          delay: resolvedEntranceDelay,
          duration: shouldReduceMotion ? 0 : 0.22,
          ease: [0.22, 1, 0.36, 1],
        }}
        whileHover={shouldReduceMotion
          ? undefined
          : canOpenResource
            ? { y: -4, scale: 1.01 }
            : { y: -2 }}
        role={canOpenResource ? "button" : undefined}
        tabIndex={canOpenResource ? 0 : undefined}
        aria-label={ariaLabel}
        aria-busy={isResolvingResource || undefined}
        className={cn(
          "group relative h-full rounded-[24px] dark:focus-visible:ring-offset-slate-950",
          canOpenResource &&
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
        )}
        onClick={canOpenResource ? handleClick : undefined}
        onKeyDown={canOpenResource ? handleKeyDown : undefined}
        data-testid="search-result-grid-card-wrapper"
        data-source-id={sourceId}
        data-resource-id={resource.id}
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
              {displayTitle || "未命名资源"}
            </h3>
          </div>

          {/* 元数据行（时间 + 大小） */}
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400 mb-4 px-1">
            <div className="flex items-center gap-1.5">
              <Clock3 className="w-3.5 h-3.5" />
              <span>{formatResultTime(datetime)}</span>
            </div>
            {sizeLabel ? (
              <div className="rounded-full bg-gray-100 px-2 py-0.5 dark:border dark:border-cyan-300/10 dark:bg-slate-900/72">
                {sizeLabel}
              </div>
            ) : null}
          </div>

          {/* 底部：左侧网盘类型 + 访问码，右侧详情 */}
          <div
            data-testid="search-result-grid-card-footer"
            className="mt-auto pt-3 border-t border-slate-200/50 dark:border-white/[0.04] flex items-center justify-between gap-3"
          >
            <div
              data-testid="search-result-grid-card-footer-left"
              className="flex min-w-0 items-center gap-2"
            >
              <div
                className={cn(
                  "flex shrink-0 items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
                  cloudInfo.bg,
                  cloudInfo.text,
                  cloudInfo.border,
                )}
              >
                {cloudInfo.name}
              </div>

              {showSourceBadge ? (
                <div
                  data-testid="search-result-source-badge"
                  title={sourceInfo.kindLabel}
                  className={cn(
                    "flex min-w-0 shrink items-center truncate rounded-full border px-2.5 py-1 text-xs font-medium",
                    sourceType === "plugin"
                      ? "border-violet-200/60 bg-violet-50 text-violet-700 dark:border-violet-300/20 dark:bg-violet-400/[0.10] dark:text-violet-200"
                      : sourceType === "tg"
                        ? "border-cyan-200/70 bg-cyan-50 text-cyan-700 dark:border-cyan-300/20 dark:bg-cyan-400/[0.10] dark:text-cyan-200"
                        : "border-slate-200/70 bg-slate-50 text-slate-600 dark:border-white/[0.08] dark:bg-white/[0.05] dark:text-slate-300",
                  )}
                >
                  <span className="truncate">{sourceInfo.primaryLabel}</span>
                </div>
              ) : null}

              {hasPassword && (
                <div
                  className="flex shrink-0 items-center gap-1 px-2 py-1 bg-green-50 dark:bg-emerald-400/[0.08] text-green-600 dark:text-emerald-200 text-xs font-medium rounded-full border border-green-200/50 dark:border-emerald-300/16"
                  title="需要访问码"
                >
                  <KeyRound className="w-3 h-3" />
                  <span>有码</span>
                </div>
              )}
              {isResolvingResource ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onCancelResolveResource();
                  }}
                  className="flex shrink-0 items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 text-xs font-medium rounded-full border border-amber-200/70 transition hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:bg-amber-400/[0.08] dark:text-amber-200 dark:border-amber-300/18 dark:hover:bg-amber-400/[0.14]"
                >
                  <span>取消获取</span>
                </button>
              ) : null}
            </div>

            {showDetailEntry ? (
              <div
                data-testid="search-result-grid-card-detail-entry"
                className="flex shrink-0 items-center justify-end"
              >
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpenDetail(item);
                  }}
                  className="inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-xs font-medium text-slate-500 transition hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-slate-400 dark:hover:text-slate-100"
                >
                  详情
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </motion.div>
    );
  },
);

SearchResultGridCard.displayName = "SearchResultGridCard";
