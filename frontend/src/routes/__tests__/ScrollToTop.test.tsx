import React, { useEffect } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import ScrollToTop from '@/routes/ScrollToTop';

describe('ScrollToTop', () => {
  it('uses the shared scrollTo test mock from setup', () => {
    expect(vi.isMockFunction(window.scrollTo)).toBe(true);
  });

  it('restores the saved scroll position when route state requests it', () => {
    const scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);

    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/search',
            state: {
              restoreScroll: true,
              scrollY: 640,
            },
          },
        ]}
      >
        <Routes>
          <Route
            path="/search"
            element={
              <>
                <ScrollToTop />
                <div>search</div>
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(scrollToSpy).toHaveBeenCalledWith(0, 640);
  });

  it('keeps the current scroll position for same-page filter url updates', () => {
    const scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);

    const TriggerFilterNavigation = () => {
      const navigate = useNavigate();

      useEffect(() => {
        navigate('/search?q=test&types=quark', {
          replace: true,
          state: {
            skipSearchSync: true,
            preserveScroll: true,
          },
        });
      }, [navigate]);

      return <div>search</div>;
    };

    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/search',
            search: '?q=test',
          },
        ]}
      >
        <Routes>
          <Route
            path="/search"
            element={
              <>
                <ScrollToTop />
                <TriggerFilterNavigation />
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(scrollToSpy).toHaveBeenCalledTimes(1);
    expect(scrollToSpy).toHaveBeenCalledWith(0, 0);
  });
});
