import React, { useState, useRef, useEffect } from "react";
import { MAX_SEARCH_HISTORY } from "@/stores/searchStore";
import { IoCloseOutline, IoTimeOutline } from "react-icons/io5";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useSearchStore, useSearchHistory } from "@/stores/searchStore";
import { useAuthStore } from "@/stores/authStore";
import { useSearchAccessStatus } from "@/stores/searchAccessStore";
import { cn } from "@/lib/utils";
import { toStyleVars } from "@/lib/styleVars";
import { getErrorCode, getErrorMessage } from "@/lib/error";
import {
  Button as StatefulButton,
  StatefulButtonHandle,
} from "@/components/ui/stateful-button";

interface SearchBoxProps {
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
  onSearch?: (keyword: string) => void;
}

const MAX_VISIBLE_HISTORY_ITEMS = MAX_SEARCH_HISTORY;

export const SearchBox: React.FC<SearchBoxProps> = ({
  className,
  placeholder = "搜索网盘资源...",
  autoFocus = false,
  onSearch,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<StatefulButtonHandle>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isHoveringHistory, setIsHoveringHistory] = useState(false);

  const {
    searchParams,
    setSearchParams,
    performSearch,
    clearHistory,
    removeFromHistory,
    isLoading,
  } = useSearchStore();
  const { token, isAuthenticated, isAdmin, logout } = useAuthStore();
  const { status: searchAccessStatus } = useSearchAccessStatus();
  const navigate = useNavigate();
  const searchHistory = useSearchHistory();
  const visibleSearchHistory = searchHistory.slice(
    0,
    MAX_VISIBLE_HISTORY_ITEMS,
  );

  const [inputValue, setInputValue] = useState(searchParams.keyword || "");

  // 同步搜索参数变化
  useEffect(() => {
    setInputValue(searchParams.keyword || "");
  }, [searchParams.keyword]);

  // 自动聚焦
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleSearchError = async (error: unknown) => {
    const errorCode = getErrorCode(error);
    const errorMessage = getErrorMessage(error, "搜索失败");

    if (errorCode === 401) {
      if (!isAdmin && token) {
        logout();
        toast.error("登录状态已失效，请重新登录");
        navigate("/login");
        return;
      }
      toast.warning("搜索前请先登录", { duration: 3000 });
      navigate("/login");
      return;
    }

    toast.error(errorMessage);
  };

  const executeSearch = async (keyword: string) => {
    setSearchParams({ keyword });

    try {
      await buttonRef.current?.run(() => performSearch({ keyword }));
      onSearch?.(keyword);
      setShowHistory(false);
    } catch (error) {
      await handleSearchError(error);
    }
  };

  // 处理搜索
  const handleSearch = async () => {
    const keyword = inputValue.trim();
    if (!keyword) return;

    if (!isAuthenticated || searchAccessStatus === "anonymous") {
      toast.warning("搜索前请先登录", { duration: 3000 });
      navigate("/login", {
        state: {
          pendingSearch: {
            keyword,
          },
        },
      });
      return;
    }

    await executeSearch(keyword);
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    } else if (e.key === "Escape") {
      setShowHistory(false);
      inputRef.current?.blur();
    }
  };

  // 处理输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  // 处理焦点
  const handleFocus = () => {
    setIsFocused(true);
    if (visibleSearchHistory.length > 0) {
      setShowHistory(true);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    // 延迟隐藏历史记录，以便点击历史项目
    setTimeout(() => {
      if (!isHoveringHistory) {
        setShowHistory(false);
      }
    }, 200);
  };

  // 清空输入
  const handleClear = () => {
    setInputValue("");
    setSearchParams({ keyword: "" });
    inputRef.current?.focus();
    // 如果按钮处于“搜索中”动画状态，立即复位
    buttonRef.current?.reset?.();
  };

  // 选择历史记录
  const handleSelectHistory = async (keyword: string) => {
    setInputValue(keyword);
    await executeSearch(keyword);
  };

  // 清空历史记录
  const handleClearHistory = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearHistory();
    setShowHistory(false);
  };

  // 删除单条历史记录
  const handleDeleteHistoryItem = (e: React.MouseEvent, keyword: string) => {
    e.stopPropagation();
    removeFromHistory(keyword);
  };

  return (
    <div className={cn("relative w-full max-w-2xl mx-auto group", className)}>
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-x-6 inset-y-0 rounded-[2rem] bg-slate-900/5 opacity-0 blur-[60px] transition-all duration-500 dark:bg-white/5",
          isFocused && "opacity-100",
        )}
      />
      <div
        data-testid="search-box-surface"
        className={cn(
          "relative z-10 overflow-hidden rounded-[2rem] bg-white/40 dark:bg-slate-900/40 backdrop-blur-[24px] border-[0.5px] border-slate-200/50 dark:border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)] transition-all duration-500 group-focus-within:-translate-y-1 group-focus-within:border-slate-300/60 dark:group-focus-within:border-white/[0.15] group-focus-within:shadow-[0_20px_60px_rgba(0,0,0,0.08)] dark:group-focus-within:shadow-[0_20px_60px_rgba(0,0,0,0.3)] group-focus-within:bg-white/50 dark:group-focus-within:bg-slate-800/40",
        )}
      >
        <svg
          className="absolute left-6 top-1/2 z-20 h-6 w-6 -translate-y-1/2 text-slate-400 transition-colors duration-300 group-focus-within:text-blue-500 dark:text-slate-500 dark:group-focus-within:text-blue-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className="relative z-10 w-full bg-transparent py-4 pl-14 pr-28 text-base text-gray-900 placeholder-slate-400 focus:outline-none sm:py-5 sm:pr-32 sm:text-lg dark:text-slate-100 dark:placeholder:text-slate-500/80"
        />

        {/* 清空按钮 */}
        {inputValue && (
          <button
            onClick={handleClear}
            className="absolute right-[100px] top-1/2 z-20 -translate-y-1/2 rounded-full p-2 text-slate-400 transition-all duration-300 hover:scale-110 hover:bg-slate-100 hover:text-slate-600 active:scale-95 sm:right-[120px] dark:text-slate-500 dark:hover:bg-white/[0.08] dark:hover:text-slate-200"
            aria-label="清空输入"
          >
            <IoCloseOutline className="w-5 h-5" />
          </button>
        )}

        {/* 搜索按钮 */}
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 z-20 block">
          <StatefulButton
            ref={buttonRef}
            onClick={handleSearch}
            disabled={!inputValue.trim() || isLoading}
            className="h-[44px] min-w-[96px] rounded-[1.5rem] bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 dark:from-blue-600 dark:to-cyan-600 dark:hover:from-blue-500 dark:hover:to-cyan-500 text-white font-semibold shadow-[0_8px_16px_rgba(14,165,233,0.24)] dark:shadow-[0_8px_16px_rgba(8,145,178,0.2)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(14,165,233,0.36)] dark:hover:shadow-[0_12px_24px_rgba(8,145,178,0.36)] border border-transparent outline-none focus:outline-none ring-0 active:scale-95"
          >
            搜索
          </StatefulButton>
        </div>
      </div>

      {/* 搜索历史下拉菜单 */}
      {showHistory && visibleSearchHistory.length > 0 && (
        <div
          data-testid="search-history-surface"
          className="absolute left-0 right-0 top-full z-50 mt-3 animate-in overflow-hidden fade-in slide-in-from-top-3 duration-300 rounded-[2rem] bg-white/40 dark:bg-slate-900/40 backdrop-blur-[24px] border-[0.5px] border-slate-200/50 dark:border-white/10 shadow-[0_24px_64px_rgba(0,0,0,0.08)] dark:shadow-[0_24px_64px_rgba(0,0,0,0.4)]"
          onMouseEnter={() => setIsHoveringHistory(true)}
          onMouseLeave={() => {
            setIsHoveringHistory(false);
            if (!isFocused) setShowHistory(false);
          }}
        >
          <div
            data-testid="search-history-header"
            className="flex items-center justify-between border-b border-slate-200/50 bg-white/40 px-6 py-4 dark:border-white/[0.04] dark:bg-white/[0.02]"
          >
            <div className="flex items-center gap-2 text-[13.5px] font-medium text-slate-500 dark:text-slate-400">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-900/[0.04] dark:bg-white/[0.06] text-slate-500 dark:text-slate-300">
                <IoTimeOutline className="h-4 w-4" />
              </span>
              <span>最近搜索</span>
              <span className="text-slate-400/80 dark:text-slate-500 text-[12px] ml-1">
                最近 {visibleSearchHistory.length} 条
              </span>
            </div>
            <button
              onClick={handleClearHistory}
              className="rounded-full px-3 py-1.5 text-[12.5px] font-medium text-slate-400 transition-colors duration-200 hover:bg-red-50 hover:text-red-500 dark:text-slate-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
            >
              清空记录
            </button>
          </div>
          <div
            data-testid="search-history-list"
            className="max-h-[300px] overflow-y-auto px-6 py-5 dark:bg-transparent"
          >
            <div className="flex flex-wrap gap-2.5">
              {visibleSearchHistory.map((keyword, index) => (
                <div
                  key={keyword}
                  className="group/history relative max-w-full"
                  style={toStyleVars({
                    "--history-chip-delay": `${index * 24}ms`,
                  })}
                >
                  <button
                    type="button"
                    onClick={() => handleSelectHistory(keyword)}
                    className="history-chip-delay inline-flex max-w-full items-center rounded-full border-[0.5px] border-slate-200/50 bg-white/40 px-4 py-2 text-left text-[14px] font-medium text-slate-700 shadow-sm backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/60 hover:shadow-[0_8px_16px_rgba(0,0,0,0.06)] dark:border-white/10 dark:bg-slate-800/40 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                    aria-label={`使用历史记录搜索 ${keyword}`}
                  >
                    <span className="truncate max-w-[12rem] leading-none">
                      {keyword}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleDeleteHistoryItem(e, keyword)}
                    className="absolute -right-1.5 -top-1.5 inline-flex h-[22px] w-[22px] items-center justify-center rounded-full border border-slate-200/80 bg-white shadow-sm text-slate-400 opacity-0 transition-all duration-200 group-hover/history:opacity-100 hover:scale-110 hover:border-red-100 hover:bg-red-50 hover:text-red-500 dark:border-white/[0.12] dark:bg-slate-800 dark:text-slate-400 dark:shadow-[0_4px_12px_rgba(0,0,0,0.5)] dark:hover:border-red-500/30 dark:hover:bg-red-500/20 dark:hover:text-red-300"
                    aria-label={`删除历史记录 ${keyword}`}
                  >
                    <IoCloseOutline className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchBox;
