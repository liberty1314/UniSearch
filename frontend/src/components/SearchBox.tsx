import React, { useState, useRef, useEffect } from 'react';
import { IoCloseOutline, IoTimeOutline } from 'react-icons/io5';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useSearchStore, useSearchHistory } from '@/stores/searchStore';
import { useAuthStore } from '@/stores/authStore';
import { useSearchAccessStatus } from '@/stores/searchAccessStore';
import { SystemSettingsService } from '@/services/systemSettingsService';
import { cn } from '@/lib/utils';
import { toStyleVars } from '@/lib/styleVars';
import { getErrorCode, getErrorMessage } from '@/lib/error';
import { Button as StatefulButton, StatefulButtonHandle } from '@/components/ui/stateful-button';
import { GlassSurface } from '@/components/ui/glass-surface';

interface SearchBoxProps {
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
  onSearch?: (keyword: string) => void;
}

const MAX_VISIBLE_HISTORY_ITEMS = 6;

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
  const { token, apiKey, isAdmin, logout } = useAuthStore();
  const { status: searchAccessStatus } = useSearchAccessStatus();
  const navigate = useNavigate();
  const searchHistory = useSearchHistory();
  const visibleSearchHistory = searchHistory.slice(0, MAX_VISIBLE_HISTORY_ITEMS);

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

  const handleSearchError = async (error: unknown) => {
    const errorCode = getErrorCode(error);
    const errorMessage = getErrorMessage(error, '搜索失败');

    if (!isAdmin && errorCode === 403 && searchAccessStatus === 'session_only') {
      toast.warning('请先绑定 API Key 后再进行搜索', { duration: 3000 });
      navigate('/settings/apikey');
      return;
    }

    if (errorCode === 401) {
      if (!isAdmin && token && !apiKey) {
        logout();
        toast.error('登录状态已失效，请重新登录');
        navigate('/login');
        return;
      }

      const entryPath = await SystemSettingsService.resolveDefaultAuthEntryPath();
      const needsApiKeyLogin =
        searchAccessStatus === 'anonymous' ||
        searchAccessStatus === 'api_key_only' ||
        errorMessage.includes('API Key');

      toast.warning(
        needsApiKeyLogin
          ? (entryPath === '/apikey' ? '请先使用 API Key 登录后再进行搜索' : '请先登录后再进行搜索')
          : errorMessage,
        { duration: 3000 }
      );
      navigate(needsApiKeyLogin ? entryPath : '/login');
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

    await executeSearch(keyword);
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
    setInputValue('');
    setSearchParams({ keyword: '' });
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
    <div className={cn('relative w-full max-w-2xl mx-auto group', className)}>
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-x-8 inset-y-1 rounded-[2rem] bg-gradient-to-r from-blue-200/30 via-cyan-200/28 to-sky-200/26 opacity-0 blur-3xl transition-opacity duration-300 dark:from-cyan-400/18 dark:via-sky-400/14 dark:to-blue-500/10',
          isFocused && 'opacity-100'
        )}
      />
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-x-6 inset-y-0 rounded-[2rem] opacity-0 blur-[72px] transition-all duration-300 dark:bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_62%)]',
          isFocused && 'dark:opacity-100'
        )}
      />
      <GlassSurface
        variant="search"
        interactive
        data-testid="search-box-surface"
        className={cn(
          'group-focus-within:-translate-y-0.5 group-focus-within:border-sky-200/95 group-focus-within:ring-white/85 group-focus-within:shadow-[0_28px_66px_rgba(14,165,233,0.14)] dark:before:absolute dark:before:inset-[1px] dark:before:rounded-[1.6rem] dark:before:bg-[linear-gradient(180deg,rgba(8,15,28,0.62),rgba(8,15,28,0.18)_38%,transparent)] dark:before:opacity-100 dark:before:content-[""] dark:group-focus-within:border-cyan-300/32 dark:group-focus-within:ring-cyan-200/[0.14] dark:group-focus-within:shadow-[0_36px_72px_rgba(8,145,178,0.28)]'
        )}
      >
        <svg className="absolute left-5 top-1/2 z-20 h-6 w-6 -translate-y-1/2 text-slate-400 transition-colors duration-300 group-focus-within:text-cyan-600 dark:text-slate-400 dark:group-focus-within:text-cyan-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          className="relative z-10 w-full bg-transparent py-4 pl-14 pr-28 text-base text-gray-900 placeholder-gray-500 focus:outline-none sm:py-5 sm:pr-32 sm:text-lg dark:text-slate-100 dark:placeholder:text-slate-500"
        />

        {/* 清空按钮 */}
        {inputValue && (
          <button
            onClick={handleClear}
            className="absolute right-[100px] top-1/2 z-20 -translate-y-1/2 rounded-full p-2 text-slate-400 transition-all duration-300 hover:scale-110 hover:bg-slate-100/85 hover:text-slate-600 active:scale-95 sm:right-[120px] dark:border dark:border-transparent dark:bg-white/[0.02] dark:text-slate-500 dark:hover:border-cyan-300/18 dark:hover:bg-cyan-400/[0.08] dark:hover:text-slate-200"
            aria-label="清空输入"
          >
            <IoCloseOutline className="w-5 h-5" />
          </button>
        )}

        {/* 搜索按钮 */}
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 z-20">
          <StatefulButton
            ref={buttonRef}
            onClick={handleSearch}
            disabled={!inputValue.trim() || isLoading}
            className="h-[42px] min-w-[90px] rounded-xl shadow-[0_12px_24px_rgba(37,99,235,0.28)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_30px_rgba(37,99,235,0.32)]"
          >
            搜索
          </StatefulButton>
        </div>
      </GlassSurface>

      {/* 搜索历史下拉菜单 */}
      {showHistory && visibleSearchHistory.length > 0 && (
        <GlassSurface
          variant="popover"
          data-testid="search-history-surface"
          className="absolute left-0 right-0 top-full z-50 mt-2.5 animate-in overflow-hidden fade-in slide-in-from-top-2 duration-200 dark:bg-[#07101d]/92 dark:border-cyan-400/14"
          onMouseEnter={() => setIsHoveringHistory(true)}
          onMouseLeave={() => {
            setIsHoveringHistory(false);
            if (!isFocused) setShowHistory(false);
          }}
        >
          <div className="flex items-center justify-between border-b border-slate-200/70 bg-white/45 px-4 py-2.5 dark:border-cyan-400/10 dark:bg-[linear-gradient(180deg,rgba(148,163,184,0.06),rgba(15,23,42,0.02))]">
            <div className="flex items-center gap-2 text-[12px] font-medium text-slate-500 dark:text-slate-300">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-900/[0.04] text-slate-500 dark:border dark:border-cyan-300/12 dark:bg-cyan-300/[0.08] dark:text-cyan-100">
                <IoTimeOutline className="h-3.5 w-3.5" />
              </span>
              <span>最近搜索</span>
              <span className="text-slate-400/80 dark:text-slate-500">最近 {visibleSearchHistory.length} 条</span>
            </div>
            <button
              onClick={handleClearHistory}
              className="rounded-full px-2.5 py-1 text-[12px] font-medium text-slate-400 transition-colors duration-200 hover:bg-red-50 hover:text-red-500 dark:border dark:border-transparent dark:text-slate-500 dark:hover:border-red-400/18 dark:hover:bg-red-500/10 dark:hover:text-red-200"
            >
              清空记录
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto px-4 py-3 dark:bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.08),transparent_45%)]">
            <div className="flex flex-wrap gap-2.5">
              {visibleSearchHistory.map((keyword, index) => (
                <div
                  key={keyword}
                  className="group/history relative max-w-full"
                  style={toStyleVars({ '--history-chip-delay': `${index * 24}ms` })}
                >
                  <button
                    type="button"
                    onClick={() => handleSelectHistory(keyword)}
                    className="history-chip-delay inline-flex max-w-full items-center rounded-full border border-slate-200/80 bg-white/82 px-3.5 py-2 text-left text-sm text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-200 hover:bg-cyan-50/70 hover:text-cyan-700 hover:shadow-[0_8px_20px_rgba(14,165,233,0.10)] focus:outline-none focus-visible:border-cyan-300 focus-visible:ring-2 focus-visible:ring-cyan-200 dark:border-cyan-300/10 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.78),rgba(15,23,42,0.64))] dark:text-slate-200 dark:shadow-[0_12px_24px_rgba(2,6,23,0.28),inset_0_1px_0_rgba(148,163,184,0.08)] dark:hover:border-cyan-300/24 dark:hover:bg-cyan-400/[0.08] dark:hover:text-cyan-50 dark:hover:shadow-[0_18px_32px_rgba(8,145,178,0.18)] dark:focus-visible:border-cyan-300/28 dark:focus-visible:ring-cyan-500/20"
                    aria-label={`使用历史记录搜索 ${keyword}`}
                  >
                    <span className="truncate max-w-[11rem] font-medium leading-none">{keyword}</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleDeleteHistoryItem(e, keyword)}
                    className="absolute -right-1.5 -top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200/80 bg-white/96 text-slate-400 opacity-0 shadow-sm transition-all duration-200 group-hover/history:opacity-100 group-focus-within/history:opacity-100 hover:border-red-100 hover:bg-red-50 hover:text-red-500 focus:outline-none focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-red-100 dark:border-cyan-300/12 dark:bg-[#040914]/96 dark:text-slate-500 dark:shadow-[0_10px_24px_rgba(2,6,23,0.32)] dark:hover:border-red-400/22 dark:hover:bg-red-500/10 dark:hover:text-red-200 dark:focus-visible:ring-red-500/20"
                    aria-label={`删除历史记录 ${keyword}`}
                  >
                    <IoCloseOutline className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </GlassSurface>
      )}
    </div>
  );
};

export default SearchBox;
