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
  onFocusChange?: (focused: boolean) => void;
  onInputCommitted?: (value: string) => void;
  appearance?: "default" | "canvas";
}

export const SearchBox: React.FC<SearchBoxProps> = ({
  className,
  placeholder = "搜索网盘资源...",
  autoFocus = false,
  accessHint,
  onSearch,
  onFocusChange,
  onInputCommitted,
  appearance = "default",
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
          data-appearance={appearance}
          className={cn(
            "relative z-10 overflow-hidden border-[0.5px] transition-all duration-300",
            appearance === "canvas"
              ? "rounded-[22px] border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.07)] group-focus-within:border-[#246BFD] group-focus-within:ring-4 group-focus-within:ring-[#246BFD]/10 dark:border-[#253142] dark:bg-[#111722] dark:group-focus-within:border-[#6F8BFF]"
              : "rounded-[2rem] border-slate-200/70 bg-white/75 shadow-sm backdrop-blur-xl group-focus-within:border-blue-300/70 group-focus-within:bg-white/[0.85] group-focus-within:shadow-md dark:border-white/[0.08] dark:bg-slate-950/[0.55] dark:shadow-[0_10px_24px_rgba(0,0,0,0.24)] dark:group-focus-within:border-white/[0.15] dark:group-focus-within:bg-slate-800/[0.55]",
          )}
        >
          <SearchInput
            inputRef={controller.inputRef}
            value={controller.inputValue}
            placeholder={placeholder}
            onChange={controller.setInputValue}
            onInputCommitted={onInputCommitted}
            onSubmit={handleSearch}
            onFocus={() => {
              controller.handleInputFocus();
              onFocusChange?.(true);
            }}
            onBlur={() => {
              controller.handleInputBlur();
              onFocusChange?.(false);
            }}
            onEscape={() => {
              controller.setShowHistory(false);
            }}
            onClear={controller.clearInput}
            onHistoryNavigate={controller.moveHistorySelection}
            onHistorySubmit={controller.submitActiveHistory}
            onHistoryRemove={controller.removeActiveHistory}
          />

          <SearchBoxActions
            buttonRef={controller.buttonRef}
            onSearch={handleSearch}
            disabled={!controller.inputValue.trim() || controller.isLoading}
            appearance={appearance}
          />
        </div>

        {controller.showHistory &&
        controller.visibleSearchHistory.length > 0 ? (
          <SearchHistoryPanel
            history={controller.visibleSearchHistory}
            activeIndex={controller.activeHistoryIndex}
            onActiveIndexChange={controller.setActiveHistoryIndex}
            onSelect={(keyword) => {
              void controller.selectHistory(keyword);
            }}
            onRemove={controller.removeHistoryItem}
            onClear={controller.clearHistory}
          />
        ) : null}
      </div>

      {accessHint ? (
        <p className="mt-2 px-2 text-center text-[11px] leading-4 text-slate-500 dark:text-slate-400 sm:mt-3 sm:text-xs sm:leading-5">
          {accessHint}
        </p>
      ) : null}

      {controller.isHomePage ? (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 px-1 sm:mt-4 sm:gap-2.5">
          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-400 sm:text-xs">
            试试这些
          </span>
          {controller.isHomeQuickKeywordsLoading ? (
            <div
              className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5"
              data-testid="home-hot-keywords-skeleton"
              aria-label="推荐关键词加载中"
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
                  className="inline-flex items-center rounded-full border border-slate-200/70 bg-white/70 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-200 hover:bg-white hover:text-cyan-700 dark:border-cyan-300/[0.18] dark:bg-slate-950/[0.55] dark:text-slate-100 dark:shadow-[0_12px_30px_rgba(2,6,23,0.32)] dark:hover:border-cyan-300/[0.40] dark:hover:bg-cyan-400/10 dark:hover:text-cyan-100 sm:px-3.5 sm:py-1.5 sm:text-sm"
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
