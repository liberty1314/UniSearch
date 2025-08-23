import React from 'react';
import { Loader2, Search, Wifi, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
  type?: 'search' | 'page' | 'inline' | 'network' | 'error';
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const LoadingState: React.FC<LoadingStateProps> = ({
  type = 'page',
  message,
  size = 'md',
  className,
}) => {
  const sizeClasses = {
    sm: {
      container: 'py-4',
      icon: 'w-4 h-4',
      text: 'text-sm',
    },
    md: {
      container: 'py-8',
      icon: 'w-6 h-6',
      text: 'text-base',
    },
    lg: {
      container: 'py-12',
      icon: 'w-8 h-8',
      text: 'text-lg',
    },
  };

  const currentSize = sizeClasses[size];

  const renderIcon = () => {
    switch (type) {
      case 'search':
        return (
          <div className="relative">
            <Search className={cn(currentSize.icon, 'text-apple-blue')} />
            <div className="absolute -top-1 -right-1">
              <Loader2 className="w-3 h-3 text-apple-blue animate-spin" />
            </div>
          </div>
        );
      case 'network':
        return (
          <div className="relative">
            <Wifi className={cn(currentSize.icon, 'text-blue-500')} />
            <div className="absolute -top-1 -right-1">
              <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />
            </div>
          </div>
        );
      case 'error':
        return <AlertCircle className={cn(currentSize.icon, 'text-red-500')} />;
      case 'inline':
        return <Loader2 className={cn(currentSize.icon, 'text-apple-blue animate-spin')} />;
      default:
        return <Loader2 className={cn(currentSize.icon, 'text-apple-blue animate-spin')} />;
    }
  };

  const getDefaultMessage = () => {
    switch (type) {
      case 'search':
        return '正在搜索...';
      case 'network':
        return '连接中...';
      case 'error':
        return '加载失败';
      case 'inline':
        return '加载中...';
      default:
        return '加载中...';
    }
  };

  const displayMessage = message || getDefaultMessage();

  if (type === 'inline') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        {renderIcon()}
        <span className={cn('text-gray-600 dark:text-gray-400', currentSize.text)}>
          {displayMessage}
        </span>
      </div>
    );
  }

  return (
    <div className={cn(
      'flex flex-col items-center justify-center text-center',
      currentSize.container,
      className
    )}>
      <div className="mb-4">
        {renderIcon()}
      </div>
      
      <div className={cn(
        'text-gray-600 dark:text-gray-400 font-medium',
        currentSize.text
      )}>
        {displayMessage}
      </div>
      
      {type === 'search' && (
        <div className="mt-2 text-sm text-gray-500 dark:text-gray-500">
          正在从多个网盘搜索资源...
        </div>
      )}
      
      {type === 'network' && (
        <div className="mt-2 text-sm text-gray-500 dark:text-gray-500">
          正在连接到服务器...
        </div>
      )}
      
      {type === 'error' && (
        <div className="mt-2 text-sm text-gray-500 dark:text-gray-500">
          请检查网络连接或稍后重试
        </div>
      )}
    </div>
  );
};

// 基础骨架屏组件
interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'rectangular' | 'circular';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = 'rectangular',
  width,
  height,
  animation = 'pulse',
}) => {
  const baseClasses = 'bg-gray-200 dark:bg-gray-700';
  
  const variantClasses = {
    text: 'rounded',
    rectangular: 'rounded-md',
    circular: 'rounded-full',
  };
  
  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-pulse',
    none: '',
  };
  
  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;
  
  return (
    <div
      className={cn(
        baseClasses,
        variantClasses[variant],
        animationClasses[animation],
        className
      )}
      style={style}
    />
  );
};

export default LoadingState;