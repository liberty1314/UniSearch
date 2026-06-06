import React from "react";
import { IoCloseOutline, IoTimeOutline } from "react-icons/io5";
import { toStyleVars } from "@/lib/styleVars";

interface SearchHistoryPanelProps {
  history: string[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onSelect: (keyword: string) => void;
  onRemove: (keyword: string) => void;
  onClear: () => void;
}

const SearchHistoryPanel: React.FC<SearchHistoryPanelProps> = ({
  history,
  activeIndex,
  onActiveIndexChange,
  onSelect,
  onRemove,
  onClear,
}) => (
  <div
    data-testid="search-history-surface"
    className="absolute left-0 right-0 top-full z-50 mt-3 animate-in overflow-hidden rounded-[2rem] border-[0.5px] border-white/60 bg-white/70 shadow-[0_24px_64px_rgba(0,0,0,0.08)] backdrop-blur-[24px] fade-in slide-in-from-top-3 duration-300 dark:border-white/[0.08] dark:bg-slate-950/50 dark:shadow-[0_24px_64px_rgba(0,0,0,0.4)]"
  >
    <div
      data-testid="search-history-header"
      className="flex items-center justify-between border-b border-slate-200/50 bg-white/40 px-6 py-4 dark:border-white/[0.04] dark:bg-white/[0.02]"
    >
      <div className="flex items-center gap-2 text-[13.5px] font-medium text-slate-500 dark:text-slate-400">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-900/[0.04] text-slate-500 dark:bg-white/[0.06] dark:text-slate-300">
          <IoTimeOutline className="h-4 w-4" />
        </span>
        <span>最近搜索</span>
        <span className="ml-1 text-[12px] text-slate-400/80 dark:text-slate-500">
          最近 {history.length} 条
        </span>
      </div>
      <button
        type="button"
        onClick={onClear}
        className="rounded-full px-3 py-1.5 text-[12.5px] font-medium text-slate-400 transition-colors duration-200 hover:bg-red-50 hover:text-red-500 dark:text-slate-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
      >
        清空记录
      </button>
    </div>
    <div
      data-testid="search-history-list"
      role="listbox"
      aria-label="最近搜索"
      className="max-h-[300px] overflow-y-auto px-6 py-5 dark:bg-transparent"
    >
      <div className="flex flex-wrap gap-2.5">
        {history.map((keyword, index) => (
          <div
            key={keyword}
            id={`search-history-option-${index}`}
            role="option"
            aria-selected={index === activeIndex}
            className="group/history relative max-w-full"
            style={toStyleVars({
              "--history-chip-delay": `${index * 24}ms`,
            })}
          >
            <button
              type="button"
              onMouseEnter={() => onActiveIndexChange(index)}
              onClick={() => onSelect(keyword)}
              className={`history-chip-delay inline-flex max-w-full items-center rounded-full border-[0.5px] px-4 py-2 text-left text-[14px] font-medium shadow-sm backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/60 hover:shadow-[0_8px_16px_rgba(0,0,0,0.06)] dark:hover:bg-white/10 dark:hover:text-white ${
                index === activeIndex
                  ? "border-cyan-300/70 bg-cyan-50/80 text-cyan-800 ring-2 ring-cyan-300/45 dark:border-cyan-300/30 dark:bg-cyan-400/12 dark:text-cyan-100 dark:ring-cyan-300/20"
                  : "border-slate-200/50 bg-white/40 text-slate-700 dark:border-white/[0.06] dark:bg-white/[0.03] dark:text-slate-300"
              }`}
              aria-label={`使用历史记录搜索 ${keyword}`}
            >
              <span className="max-w-[12rem] truncate leading-none">
                {keyword}
              </span>
            </button>

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onRemove(keyword);
              }}
              className="absolute -right-1.5 -top-1.5 inline-flex h-[22px] w-[22px] items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-400 opacity-0 shadow-sm transition-all duration-200 group-hover/history:opacity-100 hover:scale-110 hover:border-red-100 hover:bg-red-50 hover:text-red-500 dark:border-white/[0.12] dark:bg-slate-800 dark:text-slate-400 dark:shadow-[0_4px_12px_rgba(0,0,0,0.5)] dark:hover:border-red-500/30 dark:hover:bg-red-500/20 dark:hover:text-red-300"
              aria-label={`删除历史记录 ${keyword}`}
            >
              <IoCloseOutline className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default SearchHistoryPanel;
