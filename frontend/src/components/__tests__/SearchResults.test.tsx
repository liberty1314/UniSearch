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
      layout: _layout,
      layoutId: _layoutId,
      whileHover: _whileHover,
      whileInView: _whileInView,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & {
      variants?: unknown;
      initial?: unknown;
      animate?: unknown;
      layout?: unknown;
      layoutId?: unknown;
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
    expect(gridCard).toHaveClass('backdrop-blur-2xl');
    expect(gridCard).toHaveClass('backdrop-saturate-150');
    expect(gridCard).toHaveClass('shadow-[0_24px_54px_rgba(15,23,42,0.08)]');
    expect(gridCard).toHaveClass('dark:bg-[#08111f]/92');
    expect(gridCard).toHaveClass('dark:border-cyan-400/12');
    expect(gridCard).not.toHaveClass('bg-white/70');
    expect(gridCard).not.toHaveClass('border-white/50');

    expect(toolbar).toHaveClass('bg-white/48');
    expect(toolbar).toHaveClass('border-slate-200/80');
    expect(toolbar).toHaveClass('backdrop-blur-2xl');
    expect(toolbar).toHaveClass('dark:bg-[#060d18]/84');
    expect(toolbar).toHaveClass('dark:border-cyan-400/12');
    expect(toolbar).toHaveAttribute('data-glass-surface', 'true');
    expect(toolbar).toHaveAttribute('data-glass-variant', 'toolbar');
    expect(toolbar).toHaveAttribute('data-glass-frosted', 'true');

    const toolbarContent = screen.getByTestId('search-results-toolbar-content');
    expect(toolbarContent).toHaveClass('flex');
    expect(toolbarContent).toHaveClass('items-center');
    expect(toolbarContent).toHaveClass('justify-between');
  });
});
