import React, { useState, useRef, useEffect } from 'react';
import { IoCloseOutline } from 'react-icons/io5';
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
  const { token, apiKey, isAdmin, logout } = useAuthStore();
  const { status: searchAccessStatus } = useSearchAccessStatus();
  const navigate = useNavigate();
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

  const executeSearch = async (keyword: string, keepHistoryOpen: boolean = false) => {
    setSearchParams({ keyword });

    try {
      await buttonRef.current?.run(() => performSearch({ keyword }));
      onSearch?.(keyword);
      if (!keepHistoryOpen) {
        setShowHistory(false);
      }
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
    await executeSearch(keyword, true);
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
      <div className="relative glass-card-3d rounded-2xl group-focus-within:ring-2 group-focus-within:ring-nebula-500/30 transition-all duration-300 hover-lift">
        <svg className="absolute left-5 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-nebula-500 w-6 h-6 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          className="w-full pl-14 pr-28 sm:pr-32 py-4 sm:py-5 text-base sm:text-lg bg-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none relative z-10"
        />

        {/* 清空按钮 */}
        {inputValue && (
          <button
            onClick={handleClear}
            className="absolute right-[100px] sm:right-[120px] top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-all duration-300 hover:scale-110 active:scale-95 z-20"
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
            className="min-w-[90px] h-[42px] hover-lift shadow-nebula hover:shadow-nebula-hover rounded-xl"
          >
            搜索
          </StatefulButton>
        </div>
      </div>

      {/* 搜索历史下拉菜单 */}
      {showHistory && searchHistory.length > 0 && (
        <div
          className="absolute top-full left-0 right-0 mt-3 bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl ring-1 ring-black/5 dark:ring-white/10 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] z-50 max-h-72 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300"
          onMouseEnter={() => setIsHoveringHistory(true)}
          onMouseLeave={() => {
            setIsHoveringHistory(false);
            if (!isFocused) setShowHistory(false);
          }}
        >
          <div className="px-5 py-3 border-b border-black/5 dark:border-white/5 flex items-center justify-between bg-black/[0.02] dark:bg-white/[0.02]">
            <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 tracking-wider uppercase">
              最近搜索
            </span>
            <button
              onClick={handleClearHistory}
              className="text-xs text-gray-400 hover:text-red-500 dark:hover:text-red-400 opacity-60 hover:opacity-100 transition-all duration-300 font-medium"
            >
              清空记录
            </button>
          </div>
          {/* 历史记录 chips */}
          <div className="px-5 py-4 overflow-y-auto overflow-x-hidden max-h-56">
            <div className="flex items-center gap-3 flex-wrap">
              {searchHistory.map((keyword, index) => (
                <div
                  key={index}
                  onClick={() => handleSelectHistory(keyword)}
                  className="group/chip relative inline-flex items-center px-4 py-2 rounded-full cursor-pointer transition-all duration-300 ease-out 
                             bg-white/50 hover:bg-nebula-50/80 dark:bg-slate-800/50 dark:hover:bg-nebula-500/20 
                             border border-black/5 dark:border-white/5 hover:border-nebula-200/80 dark:hover:border-nebula-500/40
                             shadow-sm hover:shadow-md hover:shadow-nebula-500/10 dark:shadow-black/20 history-chip-delay
                             backdrop-blur-md hover:scale-105 active:scale-95"
                  style={toStyleVars({ '--history-chip-delay': `${index * 30}ms` })}
                >
                  <span className="text-sm font-medium text-gray-700 dark:text-slate-300 group-hover/chip:text-nebula-600 dark:group-hover/chip:text-nebula-300 transition-colors truncate max-w-[12rem]">
                    {keyword}
                  </span>

                  {/* 右上角删除按钮 */}
                  <button
                    onClick={(e) => handleDeleteHistoryItem(e, keyword)}
                    className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-white/90 dark:bg-slate-800/80 border border-black/5 dark:border-white/10 shadow-sm text-gray-400 opacity-0 scale-75 group-hover/chip:opacity-100 group-hover/chip:scale-100 hover:text-red-500 hover:border-red-200 dark:hover:border-red-800 transition-all duration-200 backdrop-blur-md"
                    aria-label="删除该条记录"
                  >
                    <IoCloseOutline className="w-3.5 h-3.5" />
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
