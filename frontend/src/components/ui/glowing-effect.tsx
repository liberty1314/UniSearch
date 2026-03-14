/**
 * Glowing Effect - 来自 21st.dev 的鼠标跟踪发光边框组件
 * 鼠标在卡片上移动时，边框会产生跟随发光效果
 */
import React, { useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface GlowingEffectProps {
  children: React.ReactNode;
  className?: string;
  /** 发光颜色，默认使用 nebula 紫色系 */
  glowColor?: string;
  /** 发光强度 0-1，默认 0.6 */
  intensity?: number;
  /** 是否禁用效果 */
  disabled?: boolean;
}

export const GlowingEffect: React.FC<GlowingEffectProps> = ({
  children,
  className,
  glowColor,
  intensity = 0.6,
  disabled = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const borderRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!containerRef.current || !borderRef.current || disabled) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // 计算鼠标相对中心的角度（用于渐变方向）
      const angle = Math.atan2(y - centerY, x - centerX) * (180 / Math.PI);

      // 渐变从鼠标方向发光
      const color = glowColor || `rgba(139, 92, 246, ${intensity})`;
      const colorFade = glowColor
        ? glowColor.replace(/[\d.]+\)$/, '0)')
        : 'rgba(139, 92, 246, 0)';

      borderRef.current.style.setProperty(
        'background',
        `conic-gradient(from ${angle}deg at ${x}px ${y}px, ${color}, ${colorFade} 80%, ${color})`
      );
    },
    [disabled, glowColor, intensity]
  );

  const handleMouseLeave = useCallback(() => {
    if (borderRef.current) {
      borderRef.current.style.setProperty('background', 'transparent');
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || disabled) return;

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [handleMouseMove, handleMouseLeave, disabled]);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* 发光边框层 */}
      <div
        ref={borderRef}
        aria-hidden="true"
        className="pointer-events-none absolute -inset-px rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          borderRadius: 'inherit',
          padding: '1px',
          WebkitMask:
            'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
          background: 'transparent',
        }}
      />
      {/* 外层辉光 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-[2px] rounded-[inherit] opacity-0 blur-sm transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background: `radial-gradient(ellipse at var(--mouse-x, 50%) var(--mouse-y, 50%), ${glowColor || `rgba(139, 92, 246, ${intensity * 0.3})`}, transparent 60%)`,
        }}
      />
      {children}
    </div>
  );
};

/**
 * 简化版：用 CSS 变量 + 伪元素实现的发光卡片容器
 * 更适合批量卡片使用，性能更好
 */
export const GlowCard: React.FC<{
  children: React.ReactNode;
  className?: string;
  glowColorClass?: string;
}> = ({ children, className, glowColorClass = 'from-nebula-500/50 via-cosmic-400/30 to-nebula-600/50' }) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    cardRef.current.style.setProperty('--glow-x', `${x}%`);
    cardRef.current.style.setProperty('--glow-y', `${y}%`);
  }, []);

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      className={cn('glow-card-wrapper', className)}
      style={{ '--glow-x': '50%', '--glow-y': '50%' } as React.CSSProperties}
    >
      {/* 跟踪式发光层 */}
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute -inset-px rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100',
          'bg-[radial-gradient(ellipse_at_var(--glow-x)_var(--glow-y),var(--tw-gradient-stops))]',
          glowColorClass
        )}
        style={{
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
          padding: '1.5px',
        }}
      />
      {children}
    </div>
  );
};
