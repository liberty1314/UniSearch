import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import ScrollToTop from '@/routes/ScrollToTop';

describe('ScrollToTop', () => {
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
});
