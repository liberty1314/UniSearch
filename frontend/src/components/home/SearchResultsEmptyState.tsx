import React from "react";
import { motion } from "framer-motion";
import { IoAlertCircleOutline, IoSearchOutline } from "react-icons/io5";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export type EmptyStateVariant = "error" | "no-results" | "no-keyword";

interface SearchResultsEmptyStateProps {
  variant: EmptyStateVariant;
  /** 仅 variant="error" 时使用 */
  error?: string | null;
  /** 仅 variant="no-results" 时使用，显示搜索关键词 */
  keyword?: string;
  className?: string;
  /** 仅 variant="error" 时使用，重试回调 */
  onRetry?: () => void;
  /** 仅 variant="no-results" 时使用，点击推荐词回调 */
  onSuggestSearch?: (keyword: string) => void;
}

// ─── 推荐搜索词 ───────────────────────────────────────────────────────────────

const SUGGEST_KEYWORDS = ["考研", "原神", "短剧", "电子书", "黑神话悟空"] as const;

// ─── Sub-components ───────────────────────────────────────────────────────────

/** 错误状态 */
const ErrorState: React.FC<{
  error: string;
  onRetry?: () => void;
}> = ({ error, onRetry }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="text-center py-16"
  >
    <div className="relative mx-auto max-w-xl">
      <div className="relative overflow-hidden rounded-[2.5rem] bg-white/60 dark:bg-slate-950/40 backdrop-blur-3xl border border-white/60 dark:border-white/[0.06] shadow-[0_24px_60px_rgba(15,23,42,0.06)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.4)] px-8 py-10 transition-all duration-300">
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-pink-500/10 rounded-full blur-xl" />
          <div className="relative text-red-500 bg-red-50/50 dark:bg-red-500/10 dark:border dark:border-red-500/10 rounded-full p-6 w-24 h-24 mx-auto flex items-center justify-center shadow-inner backdrop-blur-md">
            <IoAlertCircleOutline className="w-12 h-12" />
          </div>
        </div>

        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 tracking-tight">
          搜索请求失败
        </h3>
        <p className="text-gray-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed mb-8">
          {error}
        </p>

        {onRetry && (
          <button
            onClick={onRetry}
            className="px-6 py-3 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-slate-900 font-semibold rounded-xl shadow-lg transition-all duration-300 transform active:scale-95"
          >
            重新尝试
          </button>
        )}
      </div>
    </div>
  </motion.div>
);

/** 无结果状态 */
const NoResultsState: React.FC<{
  keyword: string;
  className?: string;
  onSuggestSearch?: (keyword: string) => void;
}> = ({ keyword, className, onSuggestSearch }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className={cn("text-center py-20", className)}
  >
    <div className="relative mx-auto max-w-2xl">
      <div className="relative overflow-hidden rounded-[2.5rem] bg-white/60 dark:bg-slate-950/40 backdrop-blur-3xl border border-white/60 dark:border-white/[0.06] shadow-[0_24px_60px_rgba(15,23,42,0.06)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.4)] px-8 py-12 transition-all duration-300">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-cyan-500/5 rounded-full blur-xl dark:from-blue-500/10 dark:to-cyan-500/10" />
          <div className="relative text-slate-400 bg-white/50 dark:bg-white/[0.02] dark:border dark:border-white/[0.06] rounded-full p-8 w-28 h-28 mx-auto flex items-center justify-center shadow-inner backdrop-blur-md">
            <IoSearchOutline className="w-14 h-14" />
          </div>
        </div>

        <h3 className="text-[22px] font-bold text-gray-900 dark:text-slate-100 mb-4 tracking-tight">
          未找到相关资源
        </h3>
        <p className="text-gray-500 dark:text-slate-400 max-w-lg mx-auto leading-relaxed mb-8">
          很抱歉，没有找到与您搜索关键词"
          <span className="text-slate-800 dark:text-slate-200 font-semibold px-1">
            {keyword}
          </span>
          "相关的资源。
        </p>

        {onSuggestSearch && (
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <div className="text-[13px] font-medium text-slate-500 dark:text-slate-400">
              试着搜搜看：
            </div>
            <div className="flex flex-wrap gap-2.5 justify-center">
              {SUGGEST_KEYWORDS.map((kw) => (
                <button
                  key={kw}
                  onClick={() => onSuggestSearch(kw)}
                  className="px-4 py-1.5 bg-white/50 dark:bg-white/[0.04] backdrop-blur-md border border-slate-200/60 dark:border-white/[0.06] text-slate-600 dark:text-slate-300 rounded-[10px] text-[13px] font-medium shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 hover:text-slate-900 dark:hover:text-white"
                >
                  {kw}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  </motion.div>
);

/** 无关键词状态（初始占位） */
const NoKeywordState: React.FC<{ className?: string }> = ({ className }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.98 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.4 }}
    className={cn("text-center py-20", className)}
  >
    <div className="relative inline-flex items-center justify-center mb-6 group">
      <div className="absolute inset-0 bg-blue-500/10 dark:bg-blue-400/10 rounded-3xl blur-2xl transition-all duration-700 group-hover:bg-blue-500/20 group-hover:scale-110" />
      <div className="relative w-20 h-20 rounded-[1.75rem] bg-white/60 dark:bg-white/[0.03] border border-white/60 dark:border-white/[0.08] shadow-[0_8px_32px_rgba(15,23,42,0.04)] dark:shadow-inner backdrop-blur-xl flex items-center justify-center">
        <IoSearchOutline className="w-10 h-10 text-slate-400 dark:text-slate-500 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors duration-500" />
      </div>
    </div>
    <div className="text-[20px] font-bold text-slate-800 dark:text-slate-200 mb-3 tracking-tight">
      等待搜索探索指令
    </div>
    <div className="text-slate-500 dark:text-slate-400/80 text-[15px]">
      在上方输入关键词，全网海量高品质网盘资源即可呈现
    </div>
  </motion.div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

/**
 * 搜索结果空状态统一容器，根据 variant 渲染不同的提示 UI：
 * - "error"      → 错误提示 + 重试按钮
 * - "no-results" → 无结果提示 + 关键词推荐
 * - "no-keyword" → 初始占位（等待搜索）
 */
export const SearchResultsEmptyState: React.FC<SearchResultsEmptyStateProps> = ({
  variant,
  error,
  keyword,
  className,
  onRetry,
  onSuggestSearch,
}) => {
  if (variant === "error") {
    return <ErrorState error={error ?? "搜索出现错误，请稍后再试"} onRetry={onRetry} />;
  }

  if (variant === "no-results") {
    return (
      <NoResultsState
        keyword={keyword ?? ""}
        className={className}
        onSuggestSearch={onSuggestSearch}
      />
    );
  }

  return <NoKeywordState className={className} />;
};
