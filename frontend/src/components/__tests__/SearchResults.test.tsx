import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SearchResults from '@/components/SearchResults';

vi.mock('@/stores/searchStore', () => ({
  useSearchStore: () => ({
    searchResults: {
      merged_by_type: {
        quark: [
          {
            url: 'https://example.com/resource',
            password: '',
            note: '你的名字 4K',
            datetime: '2026-03-15T00:00:00Z',
          },
        ],
      },
    },
    isLoading: false,
    error: '',
    hasMore: false,
    loadMore: vi.fn(),
    searchParams: { keyword: '你的名字' },
    performSearch: vi.fn(),
    displayedCount: 48,
  }),
}));

vi.mock('@/hooks/useDebouncedValue', () => ({
  useDebouncedValue: <T,>(value: T) => value,
}));

vi.mock('@/components/PasswordModal', () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock('@/components/LoadingState', () => ({
  __esModule: true,
  default: () => <div>loading-state</div>,
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      variants: _variants,
      initial: _initial,
      animate: _animate,
      whileHover: _whileHover,
      whileInView: _whileInView,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & {
      variants?: unknown;
      initial?: unknown;
      animate?: unknown;
      whileHover?: unknown;
      whileInView?: unknown;
    }) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('SearchResults', () => {
  it('uses stronger card separation against the shared grid background', () => {
    class MockIntersectionObserver {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    }

    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);

    render(<SearchResults />);

    const gridCard = screen.getByTestId('search-result-grid-card');
    const toolbar = screen.getByTestId('search-results-toolbar');

    expect(gridCard).toHaveClass('bg-white/88');
    expect(gridCard).toHaveClass('border-slate-200/85');
    expect(gridCard).toHaveClass('shadow-[0_24px_54px_rgba(15,23,42,0.08)]');
    expect(gridCard).not.toHaveClass('bg-white/70');
    expect(gridCard).not.toHaveClass('border-white/50');

    expect(toolbar).toHaveClass('bg-white/78');
    expect(toolbar).toHaveClass('border-slate-200/80');
  });
});
