import { useEffect } from 'react';

/**
 * 检测 ESC 键按下的自定义 Hook
 * 
 * @param handler - ESC 键按下时的回调函数
 * @param enabled - 是否启用检测（默认 true）
 * 
 * @example
 * ```tsx
 * useEscapeKey(() => {
 *   console.log('ESC pressed!');
 *   closeModal();
 * }, isModalOpen);
 * ```
 */
export const useEscapeKey = (
  handler: () => void,
  enabled: boolean = true
) => {
  useEffect(() => {
    if (!enabled) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handler();
      }
    };

    document.addEventListener('keydown', handleEscape);
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [handler, enabled]);
};
