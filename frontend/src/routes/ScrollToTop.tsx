import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop: React.FC = () => {
  const { pathname, search, state } = useLocation();
  const lastRouteKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    const currentRouteKey = `${pathname}${search}`;
    const previousRouteKey = lastRouteKeyRef.current;
    lastRouteKeyRef.current = currentRouteKey;

    if (
      state &&
      typeof state === 'object' &&
      'restoreScroll' in state &&
      state.restoreScroll &&
      'scrollY' in state &&
      typeof state.scrollY === 'number'
    ) {
      window.scrollTo(0, state.scrollY);
      return;
    }

    if (
      state &&
      typeof state === 'object' &&
      'preserveScroll' in state &&
      state.preserveScroll
    ) {
      return;
    }

    if (previousRouteKey === currentRouteKey) {
      return;
    }

    window.scrollTo(0, 0);
  }, [pathname, search, state]);

  return null;
};

export default ScrollToTop;
