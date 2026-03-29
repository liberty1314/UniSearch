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
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement> & {
      variants?: unknown;
      initial?: unknown;
      animate?: unknown;
      layout?: unknown;
      layoutId?: unknown;
      whileHover?: unknown;
      whileInView?: unknown;
    }) => {
      const domProps = { ...props };
      delete domProps.variants;
      delete domProps.initial;
      delete domProps.animate;
      delete domProps.layout;
      delete domProps.layoutId;
      delete domProps.whileHover;
      delete domProps.whileInView;
      return <div {...domProps}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('SearchResults', () => {
  it('adds a light results panel around semi-solid glass cards', () => {
    class MockIntersectionObserver {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    }

    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);

    render(<SearchResults />);

    const stage = screen.getByTestId('search-results-stage');
    const gridCard = screen.getByTestId('search-result-grid-card');
    const toolbar = screen.getByTestId('search-results-toolbar');

    expect(stage).toHaveClass('relative');
    expect(stage.querySelector('.bg-cyan-200\\/20')).toBeNull();

    expect(gridCard).toHaveClass('bg-white/60');
    expect(gridCard).toHaveClass('border-white/60');
    expect(gridCard).toHaveClass('backdrop-blur-xl');
    expect(gridCard).toHaveClass('dark:bg-slate-950/40');
    expect(gridCard).toHaveClass('dark:border-white/[0.06]');
    expect(gridCard).not.toHaveClass('bg-white/70');
    expect(gridCard).not.toHaveClass('border-white/50');

    expect(toolbar).toHaveClass('bg-white/60');
    expect(toolbar).toHaveClass('border-white/60');
    expect(toolbar).toHaveClass('backdrop-blur-xl');
    expect(toolbar).toHaveClass('dark:bg-slate-950/40');
    expect(toolbar).toHaveClass('dark:border-white/[0.06]');
    expect(toolbar).toHaveClass('flex');
    expect(toolbar).toHaveClass('items-center');
    expect(toolbar).toHaveClass('justify-between');
  });
});
