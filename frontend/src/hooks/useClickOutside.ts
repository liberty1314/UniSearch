import { useEffect, RefObject } from 'react';

/**
 * 检测点击外部区域的自定义 Hook
 * 
 * @param refs - 需要排除的元素引用数组
 * @param handler - 点击外部时的回调函数
 * @param enabled - 是否启用检测（默认 true）
 * 
 * @example
 * ```tsx
 * const panelRef = useRef<HTMLDivElement>(null);
 * const buttonRef = useRef<HTMLButtonElement>(null);
 * 
 * useClickOutside([panelRef, buttonRef], () => {
 *   console.log('Clicked outside!');
 * }, isOpen);
 * ```
 */
export const useClickOutside = (
  refs: RefObject<HTMLElement>[],
  handler: () => void,
  enabled: boolean = true
) => {
  useEffect(() => {
    if (!enabled) return;

    const handleClickOutside = (event: MouseEvent) => {
      // 检查点击是否在所有指定元素之外
      const isOutside = refs.every(
        ref => ref.current && !ref.current.contains(event.target as Node)
      );
      
      if (isOutside) {
        handler();
      }
    };

    // 使用 mousedown 而不是 click，以便在 click 事件之前触发
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [refs, handler, enabled]);
};
