import { useState, useCallback, useRef, useEffect } from 'react';

interface UseButtonAnimationOptions {
  disabled?: boolean;
  loading?: boolean;
  showRipple?: boolean;
  rippleDuration?: number;
  pressScale?: number;
  hoverScale?: number;
  enableHaptics?: boolean;
  hapticDurationMs?: number;
}

interface UseButtonAnimationReturn {
  isPressed: boolean;
  rippleEffect: { x: number; y: number; id: number } | null;
  handleMouseDown: () => void;
  handleMouseUp: () => void;
  handleMouseLeave: () => void;
  handleTouchStart: () => void;
  handleTouchEnd: () => void;
  handleClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  buttonRef: React.RefObject<HTMLButtonElement>;
}

export const useButtonAnimation = ({
  disabled = false,
  loading = false,
  showRipple = true,
  rippleDuration = 600,
  pressScale = 0.95,
  hoverScale = 1.05,
  enableHaptics = true,
  hapticDurationMs = 10,
}: UseButtonAnimationOptions = {}): UseButtonAnimationReturn => {
  const [isPressed, setIsPressed] = useState(false);
  const [rippleEffect, setRippleEffect] = useState<{ x: number; y: number; id: number } | null>(null);
  const [rippleId, setRippleId] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const hapticTimeoutRef = useRef<NodeJS.Timeout>();

  const triggerHaptic = useCallback(() => {
    if (!enableHaptics) return;
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        // @ts-ignore - optional vibrate API
        navigator.vibrate?.(hapticDurationMs);
      }
    } catch {}
  }, [enableHaptics, hapticDurationMs]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (hapticTimeoutRef.current) {
        clearTimeout(hapticTimeoutRef.current);
      }
    };
  }, []);

  // 按钮按压效果
  const handleMouseDown = useCallback(() => {
    if (!disabled && !loading) {
      setIsPressed(true);
      triggerHaptic();
    }
  }, [disabled, loading, triggerHaptic]);

  const handleMouseUp = useCallback(() => {
    setIsPressed(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsPressed(false);
  }, []);

  // 触摸事件支持
  const handleTouchStart = useCallback(() => {
    if (!disabled && !loading) {
      setIsPressed(true);
      triggerHaptic();
    }
  }, [disabled, loading, triggerHaptic]);

  const handleTouchEnd = useCallback(() => {
    setIsPressed(false);
  }, []);

  // 涟漪效果
  const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading || !showRipple) return;

    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const id = rippleId + 1;
      
      setRippleId(id);
      setRippleEffect({ x, y, id });
      
      // 清除涟漪效果
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        setRippleEffect(prev => prev?.id === id ? null : prev);
      }, rippleDuration);
    }
  }, [disabled, loading, showRipple, rippleId, rippleDuration]);

  return {
    isPressed,
    rippleEffect,
    handleMouseDown,
    handleMouseUp,
    handleMouseLeave,
    handleTouchStart,
    handleTouchEnd,
    handleClick,
    buttonRef,
  };
};

export default useButtonAnimation;
