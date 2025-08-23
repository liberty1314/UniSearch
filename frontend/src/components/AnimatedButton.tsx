import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { LoadingSpinner } from './LoadingSpinner';
import { useButtonAnimation } from '@/hooks/useButtonAnimation';

interface AnimatedButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  icon?: ReactNode;
  loadingText?: string;
  showRipple?: boolean;
  loadingVariant?: 'spinner' | 'dots' | 'pulse' | 'bounce' | 'ripple';
}

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  children,
  onClick,
  disabled = false,
  loading = false,
  variant = 'primary',
  size = 'md',
  className,
  icon,
  loadingText,
  showRipple = true,
  loadingVariant = 'spinner',
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
    showRipple,
  });

  // 变体样式
  const getVariantStyles = () => {
    // 如果正在加载，使用橙色主题
    if (loading) {
      return 'bg-gradient-to-r from-search-orange to-search-orange/90 hover:from-search-orange/90 hover:to-search-orange text-white shadow-button-orange hover:shadow-button-orange-hover';
    }

    switch (variant) {
      case 'primary':
        return 'bg-gradient-to-r from-apple-blue to-apple-blue/90 hover:from-apple-blue/90 hover:to-apple-blue text-white shadow-button hover:shadow-button-hover';
      case 'secondary':
        return 'bg-gray-100 hover:bg-gray-200 text-gray-900 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-100 shadow-sm hover:shadow-md';
      case 'ghost':
        return 'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600';
      default:
        return 'bg-gradient-to-r from-apple-blue to-apple-blue/90 hover:from-apple-blue/90 hover:to-apple-blue text-white shadow-button hover:shadow-button-hover';
    }
  };

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

  // 禁用状态样式
  const getDisabledStyles = () => {
    if (disabled) {
      return 'opacity-50 cursor-not-allowed from-gray-400 to-gray-400 hover:from-gray-400 hover:to-gray-400 shadow-none hover:shadow-none';
    }
    return '';
  };

  // 加载状态样式
  const getLoadingStyles = () => {
    if (loading) {
      return 'cursor-wait';
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

  // 获取加载图标颜色
  const getLoadingColor = () => {
    // 加载状态下使用白色图标
    if (loading) {
      return 'white';
    }
    
    switch (variant) {
      case 'primary':
        return 'white';
      case 'secondary':
      case 'ghost':
        return 'primary';
      default:
        return 'white';
    }
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
        getVariantStyles(),
        getSizeStyles(),
        getDisabledStyles(),
        getLoadingStyles(),
        getPressStyles(),
        className
      )}
    >
      {/* 涟漪效果 */}
      {rippleEffect && showRipple && (
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

      {/* 图标 */}
      {icon && !loading && (
        <span className="transition-all duration-200 animate-icon-rotate">
          {icon}
        </span>
      )}

      {/* 加载图标 */}
      {loading && (
        <LoadingSpinner
          size={getLoadingSize()}
          variant={loadingVariant}
          color={getLoadingColor()}
        />
      )}

      {/* 按钮文字 */}
      <span className={cn(
        "transition-all duration-200 animate-text-fade",
        loading && loadingText ? 'animate-text-fade' : ''
      )}>
        {loading && loadingText ? loadingText : children}
      </span>
    </button>
  );
};

export default AnimatedButton;
