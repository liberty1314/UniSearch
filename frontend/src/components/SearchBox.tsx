import React from "react";
import { cn } from "@/lib/utils";
import SkeletonLoader from "@/components/SkeletonLoader";
import SearchBoxActions from "@/components/search-box/SearchBoxActions";
import SearchHistoryPanel from "@/components/search-box/SearchHistoryPanel";
import SearchInput from "@/components/search-box/SearchInput";
import {
  HOME_QUICK_KEYWORD_LIMIT,
  useSearchBoxController,
} from "@/hooks/useSearchBoxController";

interface SearchBoxProps {
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
  accessHint?: string;
  onSearch?: (keyword: string) => void;
}

export const SearchBox: React.FC<SearchBoxProps> = ({
  className,
  placeholder = "搜索网盘资源...",
  autoFocus = false,
  accessHint,
  onSearch,
}) => {
  const controller = useSearchBoxController({ autoFocus, onSearch });

  const handleSearch = () => {
    void controller.submitKeyword(controller.inputValue);
  };

  return (
    <div
      ref={controller.wrapperRef}
      className={cn("mx-auto w-full max-w-2xl", className)}
    >
      <div className="relative group">
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-x-6 inset-y-0 rounded-[2rem] bg-slate-900/5 opacity-0 blur-[60px] transition-all duration-500 dark:bg-white/5",
            controller.isFocused && "opacity-100",
          )}
        />
        <div
          data-testid="search-box-surface"
          className="relative z-10 overflow-hidden rounded-[2rem] border-[0.5px] border-white/60 bg-white/60 shadow-[0_8px_30px_rgba(0,0,0,0.04)] backdrop-blur-[24px] transition-all duration-500 group-focus-within:-translate-y-1 group-focus-within:border-blue-300/60 group-focus-within:bg-white/70 group-focus-within:shadow-[0_20px_60px_rgba(0,0,0,0.08)] dark:border-white/[0.08] dark:bg-slate-950/40 dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)] dark:group-focus-within:border-white/[0.15] dark:group-focus-within:bg-slate-800/40 dark:group-focus-within:shadow-[0_20px_60px_rgba(0,0,0,0.3)]"
        >
          <SearchInput
            inputRef={controller.inputRef}
            value={controller.inputValue}
            placeholder={placeholder}
            onChange={controller.setInputValue}
            onSubmit={handleSearch}
            onFocus={() => {
              controller.setIsFocused(true);
              if (controller.visibleSearchHistory.length > 0) {
                controller.setShowHistory(true);
              }
            }}
            onBlur={() => {
              controller.setIsFocused(false);
            }}
            onEscape={() => {
              controller.setShowHistory(false);
            }}
            onClear={controller.clearInput}
          />

          <SearchBoxActions
            buttonRef={controller.buttonRef}
            onSearch={handleSearch}
            disabled={!controller.inputValue.trim() || controller.isLoading}
          />
        </div>

        {controller.showHistory &&
        controller.visibleSearchHistory.length > 0 ? (
          <SearchHistoryPanel
            history={controller.visibleSearchHistory}
            onSelect={(keyword) => {
              void controller.selectHistory(keyword);
            }}
            onRemove={controller.removeHistoryItem}
            onClear={controller.clearHistory}
          />
        ) : null}
      </div>

      {accessHint ? (
        <p className="mt-3 px-2 text-center text-xs leading-5 text-slate-500 dark:text-slate-400">
          {accessHint}
        </p>
      ) : null}

      {controller.isHomePage ? (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3 px-2">
          <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
            热门榜单
          </span>
          {controller.isHomeQuickKeywordsLoading ? (
            <div
              className="flex flex-wrap items-center justify-center gap-2.5"
              data-testid="home-hot-keywords-skeleton"
              aria-label="热门榜单加载中"
            >
              {Array.from({ length: HOME_QUICK_KEYWORD_LIMIT }, (_, index) => (
                <SkeletonLoader
                  key={`home-hot-keyword-skeleton-${index}`}
                  variant="text"
                  className={cn(
                    "h-8 rounded-full",
                    index === 0 && "w-20",
                    index === 1 && "w-24",
                    index === 2 && "w-28",
                    index === 3 && "w-22",
                  )}
                />
              ))}
            </div>
          ) : null}
          {!controller.isHomeQuickKeywordsLoading
            ? controller.homeQuickKeywords.map((keyword) => (
                <button
                  key={keyword}
                  type="button"
                  onClick={() => {
                    controller.setInputValue(keyword);
                    void controller.submitKeyword(keyword);
                  }}
                  className="inline-flex items-center rounded-full border border-slate-200/70 bg-white/70 px-3.5 py-1.5 text-sm font-medium text-slate-600 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-200 hover:text-cyan-700 dark:border-white/10 dark:bg-slate-900/45 dark:text-slate-300 dark:hover:border-cyan-400/40 dark:hover:text-cyan-200"
                  aria-label={`快速搜索 ${keyword}`}
                >
                  {keyword}
                </button>
              ))
            : null}
        </div>
      ) : null}
    </div>
  );
};

export default SearchBox;
