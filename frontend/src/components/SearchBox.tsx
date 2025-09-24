import React, { useState, useRef, useEffect } from 'react';
import { IoCloseOutline, IoTimeOutline } from 'react-icons/io5';
import { useSearchStore, useSearchHistory } from '@/stores/searchStore';
import { cn } from '@/lib/utils';
import { Button as StatefulButton, StatefulButtonHandle } from '@/components/ui/stateful-button';
import { twMerge } from "tailwind-merge";

interface SearchBoxProps {
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
  onSearch?: (keyword: string) => void;
}

export const SearchBox: React.FC<SearchBoxProps> = ({
  className,
  placeholder = '搜索网盘资源...',
  autoFocus = false,
  onSearch,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<StatefulButtonHandle>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isHoveringHistory, setIsHoveringHistory] = useState(false);
  
  const { searchParams, setSearchParams, performSearch, clearHistory, removeFromHistory, isLoading } = useSearchStore();
  const searchHistory = useSearchHistory();
  
  const [inputValue, setInputValue] = useState(searchParams.keyword || '');

  // 同步搜索参数变化
  useEffect(() => {
    setInputValue(searchParams.keyword || '');
  }, [searchParams.keyword]);

  // 自动聚焦
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // 处理搜索
  const handleSearch = async () => {
    const keyword = inputValue.trim();
    if (!keyword) return;

    setSearchParams({ keyword });
    // 触发按钮动画并执行搜索
    await buttonRef.current?.run(() => performSearch({ keyword }));
    onSearch?.(keyword);
    setShowHistory(false);
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    } else if (e.key === 'Escape') {
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
    if (searchHistory.length > 0) {
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
    setInputValue('');
    setSearchParams({ keyword: '' });
    inputRef.current?.focus();
    // 如果按钮处于“搜索中”动画状态，立即复位
    buttonRef.current?.reset?.();
  };

  // 选择历史记录
  const handleSelectHistory = async (keyword: string) => {
    setInputValue(keyword);
    setSearchParams({ keyword });
    await buttonRef.current?.run(() => performSearch({ keyword }));
    onSearch?.(keyword);
    // 选择历史后保持下拉框打开，便于继续点击其他记录
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
    <div className={cn('relative w-full max-w-2xl mx-auto group', className)}>
      {/* 搜索框容器 */}
      <div className="relative glass-card-3d rounded-2xl group-focus-within:border-apple-blue/60 group-focus-within:focus-glow-apple hover-lift">
        <svg className="absolute left-5 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-apple-blue w-6 h-6 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
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
          className="w-full pl-14 pr-24 py-5 text-lg bg-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none transition-all duration-300"
        />
        
        {/* 清空按钮：移动到搜索按钮左侧 */}
        {inputValue && (
          <button
            onClick={handleClear}
            className="absolute right-[116px] top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all duration-300 hover:scale-110 active:scale-95"
            aria-label="清空输入"
          >
            <IoCloseOutline className="w-5 h-5" />
          </button>
        )}
        
        {/* 搜索按钮：StatefulButton */}
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
          <StatefulButton
            ref={buttonRef}
            onClick={handleSearch}
            disabled={!inputValue.trim() || isLoading}
            className="min-w-[100px] hover-lift"
          >
            搜索
          </StatefulButton>
        </div>
      </div>

      {/* 搜索历史下拉菜单 */}
      {showHistory && searchHistory.length > 0 && (
        <div
          className="absolute top-full left-0 right-0 mt-3 bg-white/95 dark:bg-gray-800/95 backdrop-blur-lg border border-gray-200/50 dark:border-gray-700/50 rounded-2xl shadow-2xl z-50 max-h-56 overflow-hidden animate-fade-in"
          onMouseEnter={() => setIsHoveringHistory(true)}
          onMouseLeave={() => {
            setIsHoveringHistory(false);
            if (!isFocused) setShowHistory(false);
          }}
        >
          <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-gray-50/50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-700/50">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center">
                <IoTimeOutline className="w-4 h-4 mr-2 text-gray-500" />
                搜索历史
              </span>
              <button
                onClick={handleClearHistory}
                className="text-xs text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-300 font-medium"
              >
                清空
              </button>
            </div>
          </div>
          {/* 历史记录 chips：支持自动换行，多行纵向滚动 */}
          <div className="px-4 py-3 overflow-y-auto overflow-x-hidden max-h-48">
            <div className="flex items-center gap-3 flex-wrap">
              {searchHistory.map((keyword, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSelectHistory(keyword)}
                  /* 使用命名分组 group/chip，避免被外层 group 影响 */
                  className="relative group/chip inline-flex items-center rounded-2xl px-4 py-2 bg-white/80 dark:bg-gray-700/70 border border-gray-200/60 dark:border-gray-700/60 text-sm text-gray-800 dark:text-gray-200 shadow-sm hover:shadow-md transition-all whitespace-nowrap hover:bg-gradient-to-r hover:from-apple-blue/10 hover:to-purple-500/10"
                  style={{ animationDelay: `${index * 40}ms` }}
                >
                  {/* 悬停出现的左上角删除按钮 */}
                  <span className="pointer-events-none absolute -top-1.5 -left-1.5 opacity-0 group-hover/chip:opacity-100 transition-opacity">
                    <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow">
                      <IoCloseOutline className="w-2 h-2 text-gray-500" />
                    </span>
                  </span>
                  <span className="font-medium truncate max-w-[10rem]">{keyword}</span>
                  {/* 真正用于删除的可点区域，覆盖小圆钮 */}
                  <span
                    aria-hidden="true"
                    onClick={(e) => handleDeleteHistoryItem(e as any, keyword)}
                    className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 rounded-full cursor-pointer opacity-0 group-hover/chip:opacity-100 pointer-events-none group-hover/chip:pointer-events-auto"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchBox;