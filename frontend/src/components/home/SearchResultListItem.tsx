import React from "react";
import { motion } from "framer-motion";
import { ChevronRight, Clock3, KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getCloudTypeInfo,
  formatResultTime,
  type ResultItem,
} from "@/utils/cloudTypeUtils";
import {
  resolveDirectScanTransferUrl,
  resolveResourceDisplaySize,
  resolveResourceDisplayTitle,
  resolveResourceSourcePresentation,
} from "@/utils/resourceDisplay";

interface SearchResultListItemProps {
  item: ResultItem;
  index: number;
  canOpenResource: boolean;
  showDetailEntry?: boolean;
  showSourceBadge: boolean;
  onOpenResource: (item: ResultItem) => void;
  onOpenDetail: (item: ResultItem) => void;
}

export const SearchResultListItem = React.memo<SearchResultListItemProps>(
  ({
    item,
    index,
    canOpenResource,
    showDetailEntry = true,
    showSourceBadge,
    onOpenResource,
    onOpenDetail,
  }) => {
    const { resource, primaryLink, cloudType, datetime } = item;
    const cloudInfo = getCloudTypeInfo(cloudType);
    const sourceInfo = resolveResourceSourcePresentation(resource);
    const sourceType = resource.source.type?.trim().toLowerCase();
    const hasPassword = Boolean(primaryLink?.password?.trim());
    const directScanTransferUrl = resolveDirectScanTransferUrl({
      accessMode: primaryLink?.access_mode || (primaryLink?.scan_transfer ? "scan_transfer" : "direct_open"),
      scanTransfer: primaryLink?.scan_transfer,
    });
    const scanTransferMode =
      (primaryLink?.access_mode === "scan_transfer" || Boolean(primaryLink?.scan_transfer)) &&
      !directScanTransferUrl;
    const sizeLabel = resolveResourceDisplaySize(item);
    const displayTitle = resolveResourceDisplayTitle(resource);

    const handleClick = (e: React.MouseEvent) => {
      if (!canOpenResource) {
        return;
      }
      e.stopPropagation();
      onOpenResource(item);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (!canOpenResource) {
        return;
      }
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        e.stopPropagation();
        onOpenResource(item);
      }
    };

    return (
      <motion.div
        role={canOpenResource ? "button" : undefined}
        tabIndex={canOpenResource ? 0 : undefined}
        aria-label={`${cloudInfo.name}资源：${displayTitle || "未命名资源"}${hasPassword ? "（需要访问码）" : ""}`}
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{
          delay: Math.min(index % 48, 20) * 0.03,
          duration: 0.35,
          ease: [0.22, 1, 0.36, 1],
        }}
        whileHover={canOpenResource ? { x: 4 } : undefined}
        onClick={canOpenResource ? handleClick : undefined}
        onKeyDown={canOpenResource ? handleKeyDown : undefined}
        className={cn(
          "group relative p-4 flex items-center gap-5 bg-white/60 dark:bg-slate-950/40 backdrop-blur-xl rounded-[20px] border border-white/60 dark:border-white/[0.06] hover:border-slate-200/70 dark:hover:border-white/10 shadow-[0_8px_24px_rgba(15,23,42,0.03)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.3)] hover:shadow-[0_16px_32px_rgba(15,23,42,0.06)] dark:hover:shadow-[0_16px_32px_rgba(0,0,0,0.5)] overflow-hidden transition-colors transition-shadow duration-300",
          canOpenResource
            ? "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            : "cursor-default",
        )}
      >
        {/* 左侧彩色竖条（hover 显示） */}
        <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-blue-400 to-cyan-300 opacity-0 group-hover:opacity-100 transition-opacity duration-300 dark:from-blue-500/50 dark:to-cyan-400/50" />

        <div className="flex w-full items-center gap-5 relative z-10">
          {/* 左侧网盘类型头像 */}
          <div
            className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner flex-shrink-0",
              cloudInfo.bg,
              cloudInfo.text,
            )}
          >
            <span className="font-bold">{cloudInfo.name.charAt(0)}</span>
          </div>

          {/* 中间：标题 + 元数据 */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg line-clamp-1 mb-1 group-hover:text-apple-blue transition-colors">
              {displayTitle || "未命名资源"}
            </h3>
            <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-slate-400 flex-wrap">
              <span
                className={cn(
                  "px-2 py-0.5 rounded-md text-xs font-medium bg-opacity-50",
                  cloudInfo.bg,
                  cloudInfo.text,
                )}
              >
                {cloudInfo.name}
              </span>
              {showSourceBadge ? (
                <span
                  data-testid="search-result-source-badge"
                  title={sourceInfo.kindLabel}
                  className={cn(
                    "max-w-[10rem] truncate rounded-md border px-2 py-0.5 text-xs font-medium",
                    sourceType === "plugin"
                      ? "border-violet-200/60 bg-violet-50 text-violet-700 dark:border-violet-300/20 dark:bg-violet-400/[0.10] dark:text-violet-200"
                      : sourceType === "tg"
                        ? "border-cyan-200/70 bg-cyan-50 text-cyan-700 dark:border-cyan-300/20 dark:bg-cyan-400/[0.10] dark:text-cyan-200"
                        : "border-slate-200/70 bg-slate-50 text-slate-600 dark:border-white/[0.08] dark:bg-white/[0.05] dark:text-slate-300",
                  )}
                >
                  {sourceInfo.primaryLabel}
                </span>
              ) : null}
              <span className="flex items-center gap-1">
                <Clock3 className="w-3.5 h-3.5" />
                {formatResultTime(datetime)}
              </span>
              {sizeLabel ? (
                <span className="rounded-md border border-slate-200/60 px-2 py-0.5 text-xs text-slate-600 dark:border-white/[0.08] dark:text-slate-300">
                  {sizeLabel}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {hasPassword && (
              <div className="flex-shrink-0 px-2.5 py-1 bg-green-50 dark:bg-emerald-400/[0.08] text-green-600 dark:text-emerald-200 text-xs font-medium rounded-full border border-green-200/50 dark:border-emerald-300/16 flex items-center gap-1">
                <KeyRound className="w-3.5 h-3.5" />
                <span>有码</span>
              </div>
            )}
            {scanTransferMode && (
              <div className="flex-shrink-0 px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-medium rounded-full border border-amber-200/70 dark:bg-amber-400/[0.08] dark:text-amber-200 dark:border-amber-300/18">
                <span>需扫码</span>
              </div>
            )}
            {showDetailEntry ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenDetail(item);
                }}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              >
                详情
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        </div>
      </motion.div>
    );
  },
);

SearchResultListItem.displayName = "SearchResultListItem";
