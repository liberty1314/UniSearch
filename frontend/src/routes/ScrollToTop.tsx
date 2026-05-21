import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop: React.FC = () => {
  const { pathname, state } = useLocation();

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

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

    window.scrollTo(0, 0);
  }, [pathname, state]);

  return null;
};

export default ScrollToTop;
