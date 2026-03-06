import { useEffect } from 'react';

export function usePagedListScrollReset(
  containerRef: React.RefObject<HTMLElement | null>,
  page: number
) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (typeof container.scrollTo === 'function') {
      container.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    container.scrollTop = 0;
  }, [containerRef, page]);
}
