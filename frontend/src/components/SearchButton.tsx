import React from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LoadingSpinner } from './LoadingSpinner';
import { useButtonAnimation } from '@/hooks/useButtonAnimation';

interface SearchButtonProps {
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  children?: React.ReactNode;
  loadingText?: string;
}

export const SearchButton: React.FC<SearchButtonProps> = ({
  onClick,
  disabled = false,
  loading = false,
  size = 'md',
  className,
  children = '搜索',
  loadingText = '搜索中...',
}) => {
  const {
    isPressed,
    rippleEffect,
    handleMouseDown,
    handleMouseUp,
    handleMouseLeave,
    handleTouchStart,
    handleTouchEnd,
    handleClick,
    buttonRef,
  } = useButtonAnimation({
    disabled,
    loading,
    showRipple: true,
  });

  // 尺寸样式
  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-2 text-sm rounded-lg min-w-[80px]';
      case 'md':
        return 'px-6 py-3 text-base rounded-xl min-w-[100px]';
      case 'lg':
        return 'px-8 py-4 text-lg rounded-2xl min-w-[120px]';
      default:
        return 'px-6 py-3 text-base rounded-xl min-w-[100px]';
    }
  };

  // 获取按钮样式
  const getButtonStyles = () => {
    if (loading) {
      // 搜索中状态：橙色主题
      return 'bg-gradient-to-r from-search-orange to-search-orange/90 hover:from-search-orange/90 hover:to-search-orange text-white shadow-button-orange hover:shadow-button-orange-hover';
    }
    
    if (disabled) {
      return 'opacity-50 cursor-not-allowed from-gray-400 to-gray-400 hover:from-gray-400 hover:to-gray-400 shadow-none hover:shadow-none';
    }
    
    // 正常状态：蓝色主题
    return 'bg-gradient-to-r from-apple-blue to-apple-blue/90 hover:from-apple-blue/90 hover:to-apple-blue text-white shadow-button hover:shadow-button-hover';
  };

  // 获取按压状态样式
  const getPressStyles = () => {
    if (isPressed && !loading && !disabled) {
      if (loading) {
        return 'animate-button-press shadow-button-orange-active scale-95';
      }
      return 'animate-button-press shadow-button-active scale-95';
    }
    if (!isPressed && !loading && !disabled) {
      if (loading) {
        return 'animate-button-release shadow-button-orange';
      }
      return 'animate-button-release shadow-button';
    }
    return '';
  };

  // 获取加载图标尺寸
  const getLoadingSize = () => {
    switch (size) {
      case 'sm':
        return 'sm';
      case 'md':
        return 'md';
      case 'lg':
        return 'lg';
      default:
        return 'md';
    }
  };

  // 处理点击事件
  const handleButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    handleClick(e);
    onClick?.();
  };

  return (
    <button
      ref={buttonRef}
      onClick={handleButtonClick}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      disabled={disabled || loading}
      className={cn(
        'relative overflow-hidden font-medium transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:hover:scale-100 disabled:active:scale-100 flex items-center justify-center gap-2',
        getButtonStyles(),
        getSizeStyles(),
        getPressStyles(),
        loading && 'cursor-wait',
        className
      )}
    >
      {/* 涟漪效果 */}
      {rippleEffect && (
        <span
          key={rippleEffect.id}
          className="absolute w-2 h-2 bg-white/30 rounded-full animate-ripple pointer-events-none"
          style={{
            left: rippleEffect.x - 4,
            top: rippleEffect.y - 4,
          }}
        />
      )}

      {/* 背景渐变动画 */}
      <div className={cn(
        "absolute inset-0 transition-opacity duration-300 rounded-xl",
        loading 
          ? "bg-gradient-to-r from-search-orange/20 to-yellow-500/20 opacity-0 hover:opacity-100"
          : "bg-gradient-to-r from-apple-blue/20 to-purple-500/20 opacity-0 hover:opacity-100"
      )} />

      {/* 搜索图标 */}
      {!loading && (
        <Search className={cn(
          "transition-all duration-200",
          size === 'sm' ? 'w-4 h-4' : size === 'md' ? 'w-5 h-5' : 'w-6 h-6'
        )} />
      )}

      {/* 加载图标 */}
      {loading && (
        <LoadingSpinner
          size={getLoadingSize()}
          variant="spinner"
          color="white"
        />
      )}

      {/* 按钮文字 */}
      <span className="transition-all duration-200 animate-text-fade">
        {loading ? loadingText : children}
      </span>
    </button>
  );
};

export default SearchButton;
