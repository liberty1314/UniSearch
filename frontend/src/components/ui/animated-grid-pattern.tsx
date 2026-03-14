/**
 * Animated Grid Pattern - 来自 21st.dev 的动态 SVG 网格背景
 * 随机格子定时闪烁发光，营造科技感背景
 */
import React, { useEffect, useId, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AnimatedGridPatternProps {
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  strokeDasharray?: string | number;
  numSquares?: number;
  className?: string;
  maxOpacity?: number;
  duration?: number;
  repeatDelay?: number;
}

export function AnimatedGridPattern({
  width = 40,
  height = 40,
  x = -1,
  y = -1,
  strokeDasharray = 0,
  numSquares = 50,
  className,
  maxOpacity = 0.5,
  duration = 4,
  repeatDelay = 0.5,
}: AnimatedGridPatternProps) {
  const id = useId();
  const containerRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [squares, setSquares] = useState<Array<{ id: number; pos: [number, number] }>>([]);

  function getPos(): [number, number] {
    const cols = Math.floor((dimensions.width || window.innerWidth) / width);
    const rows = Math.floor((dimensions.height || window.innerHeight) / height);
    return [
      Math.floor(Math.random() * cols),
      Math.floor(Math.random() * rows),
    ];
  }

  function generateSquares(count: number) {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      pos: getPos(),
    }));
  }

  // 初始化尺寸
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const parent = containerRef.current.parentElement;
        if (parent) {
          setDimensions({
            width: parent.offsetWidth,
            height: parent.offsetHeight,
          });
        }
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // 生成随机格子
  useEffect(() => {
    if (dimensions.width && dimensions.height) {
      setSquares(generateSquares(numSquares));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dimensions, numSquares]);

  const updateSquarePosition = (id: number) => {
    setSquares((prev) =>
      prev.map((sq) => (sq.id === id ? { id, pos: getPos() } : sq))
    );
  };

  return (
    <svg
      ref={containerRef}
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-0 h-full w-full fill-gray-400/30 stroke-gray-400/30',
        className
      )}
    >
      <defs>
        <pattern
          id={id}
          width={width}
          height={height}
          patternUnits="userSpaceOnUse"
          x={x}
          y={y}
        >
          <path
            d={`M.5 ${height}V.5H${width}`}
            fill="none"
            strokeDasharray={strokeDasharray}
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
      <svg x={x} y={y} className="overflow-visible">
        {squares.map(({ id: squareId, pos: [colIndex, rowIndex] }) => (
          <motion.rect
            key={`${colIndex}-${rowIndex}-${squareId}`}
            width={width - 1}
            height={height - 1}
            x={colIndex * width + 1}
            y={rowIndex * height + 1}
            fill="currentColor"
            strokeWidth="0"
            initial={{ opacity: 0 }}
            animate={{ opacity: maxOpacity }}
            transition={{
              duration,
              repeat: 1,
              delay: Math.random() * 2,
              repeatType: 'reverse',
              ease: 'easeInOut',
              repeatDelay,
            }}
            onAnimationComplete={() => updateSquarePosition(squareId)}
          />
        ))}
      </svg>
    </svg>
  );
}
