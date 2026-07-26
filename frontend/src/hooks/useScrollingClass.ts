import { useEffect } from 'react';

/**
 * 滚动期间给 <html> 添加 `is-scrolling` 类，滚动停止 150ms 后移除。
 *
 * 配合全局 CSS，可在滚动过程中临时降级重合成样式（如 backdrop-blur），
 * 减少长列表滚动时的 GPU 合成开销、改善掉帧；滚动停止后恢复完整视觉。
 * 尊重 prefers-reduced-motion：偏好减弱动效的用户不启用（其本身已少动画，无需降级抖动）。
 */
export function useScrollingClass(idleDelayMs = 150): void {
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const root = document.documentElement;
    let timer: number | undefined;
    let active = false;

    const clear = () => {
      if (timer !== undefined) {
        window.clearTimeout(timer);
        timer = undefined;
      }
    };

    const handleScroll = () => {
      if (!active) {
        active = true;
        root.classList.add('is-scrolling');
      }
      clear();
      timer = window.setTimeout(() => {
        active = false;
        root.classList.remove('is-scrolling');
      }, idleDelayMs);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clear();
      root.classList.remove('is-scrolling');
    };
  }, [idleDelayMs]);
}
