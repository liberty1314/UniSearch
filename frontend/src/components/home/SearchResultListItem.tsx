import React from "react";
import { motion } from "framer-motion";
import { IoKeyOutline, IoTimeOutline } from "react-icons/io5";
import { cn } from "@/lib/utils";
import {
  getCloudTypeInfo,
  formatResultTime,
  type ResultItem,
} from "@/utils/cloudTypeUtils";

interface SearchResultListItemProps {
  item: ResultItem;
  index: number;
  onLinkClick: (
    url: string,
    password: string,
    cloudTypeName: string,
    hasPassword: boolean,
  ) => void;
}

export const SearchResultListItem = React.memo<SearchResultListItemProps>(
  ({ item, index, onLinkClick }) => {
    const { link, cloudType, datetime } = item;
    const cloudInfo = getCloudTypeInfo(cloudType);
    const hasPassword = Boolean(link.password?.trim());

    const handleAction = () => {
      onLinkClick(link.url, link.password || "", cloudType, hasPassword);
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

    return (
      <motion.div
        role="button"
        tabIndex={0}
        aria-label={`${cloudInfo.name}资源：${link.note || "未命名资源"}${hasPassword ? "（需要访问码）" : ""}`}
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{
          delay: Math.min(index % 48, 20) * 0.03,
          duration: 0.35,
          ease: [0.22, 1, 0.36, 1],
        }}
        whileHover={{ x: 4 }}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className="group relative p-4 flex items-center gap-5 bg-white/60 dark:bg-slate-950/40 backdrop-blur-xl rounded-[20px] border border-white/60 dark:border-white/[0.06] hover:border-slate-200/70 dark:hover:border-white/10 shadow-[0_8px_24px_rgba(15,23,42,0.03)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.3)] hover:shadow-[0_16px_32px_rgba(15,23,42,0.06)] dark:hover:shadow-[0_16px_32px_rgba(0,0,0,0.5)] cursor-pointer overflow-hidden transition-colors transition-shadow duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
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
              {link.note || "未命名资源"}
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
              <span className="flex items-center gap-1">
                <IoTimeOutline className="w-3.5 h-3.5" />
                {formatResultTime(datetime)}
              </span>
              {link.size && <span>• {String(link.size)}</span>}
            </div>
          </div>

          {/* 右侧：访问码标记 */}
          {hasPassword && (
            <div className="flex-shrink-0 px-2.5 py-1 bg-green-50 dark:bg-emerald-400/[0.08] text-green-600 dark:text-emerald-200 text-xs font-medium rounded-full border border-green-200/50 dark:border-emerald-300/16 flex items-center gap-1">
              <IoKeyOutline className="w-3.5 h-3.5" />
              <span>访问码</span>
            </div>
          )}
        </div>
      </motion.div>
    );
  },
);

SearchResultListItem.displayName = "SearchResultListItem";
