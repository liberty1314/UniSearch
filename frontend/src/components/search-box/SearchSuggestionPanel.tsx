import React from "react";
import { Search } from "lucide-react";
import HighlightedText from "@/components/search-results/HighlightedText";

interface SearchSuggestionPanelProps {
  suggestions: string[];
  /** 当前输入内容，用于候选词内的命中片段高亮 */
  keyword: string;
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onSelect: (keyword: string) => void;
}

/**
 * 搜索联想面板：输入非空时按「历史 + 热词」前缀/包含匹配展示候选，
 * 视觉与键盘导航行为和搜索历史面板保持一致，两者互斥渲染。
 */
const SearchSuggestionPanel: React.FC<SearchSuggestionPanelProps> = ({
  suggestions,
  keyword,
  activeIndex,
  onActiveIndexChange,
  onSelect,
}) => (
  <div
    data-testid="search-suggestion-surface"
    className="absolute left-0 right-0 top-full z-50 mt-3 animate-in overflow-hidden rounded-[2rem] border-[0.5px] border-white/60 bg-white/70 shadow-[0_24px_64px_rgba(0,0,0,0.08)] backdrop-blur-[24px] fade-in slide-in-from-top-3 duration-300 dark:border-white/[0.08] dark:bg-slate-950/50 dark:shadow-[0_24px_64px_rgba(0,0,0,0.4)]"
  >
    <div
      data-testid="search-suggestion-header"
      className="flex items-center gap-2 border-b border-slate-200/50 bg-white/40 px-6 py-4 text-[13.5px] font-medium text-slate-500 dark:border-white/[0.04] dark:bg-white/[0.02] dark:text-slate-400"
    >
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-900/[0.04] text-slate-500 dark:bg-white/[0.06] dark:text-slate-300">
        <Search className="h-4 w-4" />
      </span>
      <span>搜索联想</span>
      <span className="ml-1 text-[12px] text-slate-400/80 dark:text-slate-500">
        {suggestions.length} 条候选
      </span>
    </div>
    <div
      data-testid="search-suggestion-list"
      role="listbox"
      aria-label="搜索联想"
      className="max-h-[300px] overflow-y-auto p-3 dark:bg-transparent"
    >
      {suggestions.map((suggestion, index) => (
        <div
          key={suggestion}
          id={`search-suggestion-option-${index}`}
          role="option"
          aria-selected={index === activeIndex}
        >
          <button
            type="button"
            onMouseEnter={() => onActiveIndexChange(index)}
            onClick={() => onSelect(suggestion)}
            className={`flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-left text-[14px] font-medium transition-all duration-200 ${
              index === activeIndex
                ? "bg-cyan-50/80 text-cyan-800 ring-2 ring-cyan-300/45 dark:bg-cyan-400/12 dark:text-cyan-100 dark:ring-cyan-300/20"
                : "text-slate-700 hover:bg-white/60 dark:text-slate-300 dark:hover:bg-white/10"
            }`}
            aria-label={`使用联想词搜索 ${suggestion}`}
          >
            <Search className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
            <span className="max-w-full truncate leading-none">
              <HighlightedText text={suggestion} keyword={keyword} />
            </span>
          </button>
        </div>
      ))}
    </div>
  </div>
);

export default SearchSuggestionPanel;
