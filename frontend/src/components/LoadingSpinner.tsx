import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'spinner' | 'dots' | 'pulse' | 'bounce' | 'ripple';
  color?: 'primary' | 'white' | 'gray';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  variant = 'spinner',
  color = 'primary',
  className,
}) => {
  // 尺寸样式
  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'w-4 h-4';
      case 'md':
        return 'w-6 h-6';
      case 'lg':
        return 'w-8 h-8';
      case 'xl':
        return 'w-12 h-12';
      default:
        return 'w-6 h-6';
    }
  };

  // 颜色样式
  const getColorStyles = () => {
    switch (color) {
      case 'primary':
        return 'border-apple-blue';
      case 'white':
        return 'border-white';
      case 'gray':
        return 'border-gray-400';
      default:
        return 'border-apple-blue';
    }
  };

  // 渲染不同的加载动画
  const renderSpinner = () => {
    switch (variant) {
      case 'spinner':
        return (
          <div
            className={cn(
              'animate-spin rounded-full border-2 border-gray-300',
              getColorStyles(),
              getSizeStyles(),
              className
            )}
            style={{ borderTopColor: 'currentColor' }}
          />
        );

      case 'dots':
        return (
          <div className={cn('flex space-x-1', className)}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={cn(
                  'rounded-full animate-pulse',
                  getColorStyles().replace('border-', 'bg-'),
                  size === 'sm' ? 'w-1.5 h-1.5' : size === 'md' ? 'w-2 h-2' : size === 'lg' ? 'w-2.5 h-2.5' : 'w-3 h-3'
                )}
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        );

      case 'pulse':
        return (
          <div
            className={cn(
              'rounded-full animate-loading-pulse',
              getColorStyles().replace('border-', 'bg-'),
              getSizeStyles(),
              className
            )}
          />
        );

      case 'bounce':
        return (
          <div className={cn('flex space-x-1', className)}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={cn(
                  'rounded-full animate-bounce',
                  getColorStyles().replace('border-', 'bg-'),
                  size === 'sm' ? 'w-1.5 h-1.5' : size === 'md' ? 'w-2 h-2' : size === 'lg' ? 'w-2.5 h-2.5' : 'w-3 h-3'
                )}
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
        );

      case 'ripple':
        return (
          <div className={cn('relative', getSizeStyles(), className)}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={cn(
                  'absolute inset-0 rounded-full border-2 animate-ripple',
                  getColorStyles()
                )}
                style={{
                  animationDelay: `${i * 0.2}s`,
                  animationDuration: '1.4s',
                }}
              />
            ))}
          </div>
        );

      default:
        return (
          <div
            className={cn(
              'animate-spin rounded-full border-2 border-gray-300',
              getColorStyles(),
              getSizeStyles(),
              className
            )}
            style={{ borderTopColor: 'currentColor' }}
          />
        );
    }
  };

  return renderSpinner();
};

export default LoadingSpinner;
