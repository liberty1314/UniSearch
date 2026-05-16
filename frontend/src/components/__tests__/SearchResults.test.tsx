import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import SearchResults from '@/components/SearchResults';

let searchStoreState = {
  searchResults: {
    total: 1,
    resources: [
      {
        id: 'resource-1',
        title: '你的名字 4K',
        description: '新海诚动画电影资源',
        source: { type: 'plugin', id: 'pansearch', name: 'PanSearch' },
        media_type: 'movie',
        target_type: 'share',
        links: [
          {
            type: 'quark',
            url: 'https://example.com/resource',
            password: '',
            title: '你的名字 4K',
            datetime: '2026-03-15T00:00:00Z',
          },
        ],
        capabilities: { searchable: true, downloadable: true },
        actions: [
          {
            key: 'link.quark.open',
            label: '打开夸克',
            type: 'open_link',
            payload: { url: 'https://example.com/resource', link_type: 'quark' },
          },
        ],
        detail: { content: '详情内容', url: 'https://example.com/detail' },
        tags: ['动画'],
        images: [],
        meta: { score: 9 },
        published_at: '2026-03-15T00:00:00Z',
      },
    ],
    facets: {
      cloud_types: { quark: 1 },
      source_types: { plugin: 1 },
      media_types: { movie: 1 },
      target_types: { share: 1 },
      capabilities: { downloadable: 1 },
      action_types: { open_link: 1 },
    },
  },
  isLoading: false,
  isRefreshing: false,
  error: '',
  hasMore: false,
  loadMore: vi.fn(),
  searchParams: { keyword: '你的名字' },
  performSearch: vi.fn(),
  displayedCount: 48,
};

vi.mock('@/stores/searchStore', () => ({
  useSearchStore: () => searchStoreState,
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
  beforeEach(() => {
    searchStoreState = {
      searchResults: {
        total: 1,
        resources: [
          {
            id: 'resource-1',
            title: '你的名字 4K',
            description: '新海诚动画电影资源',
            source: { type: 'plugin', id: 'pansearch', name: 'PanSearch' },
            media_type: 'movie',
            target_type: 'share',
            links: [
              {
                type: 'quark',
                url: 'https://example.com/resource',
                password: '',
                title: '你的名字 4K',
                datetime: '2026-03-15T00:00:00Z',
              },
            ],
            capabilities: { searchable: true, downloadable: true },
            actions: [
              {
                key: 'link.quark.open',
                label: '打开夸克',
                type: 'open_link',
                payload: { url: 'https://example.com/resource', link_type: 'quark' },
              },
            ],
            detail: { content: '详情内容', url: 'https://example.com/detail' },
            tags: ['动画'],
            images: [],
            meta: { score: 9 },
            published_at: '2026-03-15T00:00:00Z',
          },
        ],
        facets: {
          cloud_types: { quark: 1 },
          source_types: { plugin: 1 },
          media_types: { movie: 1 },
          target_types: { share: 1 },
          capabilities: { downloadable: 1 },
          action_types: { open_link: 1 },
        },
      },
      isLoading: false,
      isRefreshing: false,
      error: '',
      hasMore: false,
      loadMore: vi.fn(),
      searchParams: { keyword: '你的名字' },
      performSearch: vi.fn(),
      displayedCount: 48,
    };

    class MockIntersectionObserver {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    }

    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  });

  it('adds a light results panel around semi-solid glass cards', () => {
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

  it('renders resource source metadata and opens resource details', () => {
    render(<SearchResults />);

    expect(screen.getByText('PanSearch')).toBeInTheDocument();
    expect(screen.getByText('movie')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('search-result-grid-card-wrapper'));

    expect(screen.getByText('资源详情')).toBeInTheDocument();
    expect(screen.getByText('详情内容')).toBeInTheDocument();
    expect(screen.getByText('https://example.com/resource')).toBeInTheDocument();
  });

  it('shows a refresh hint without clearing previous results during in-place refresh', () => {
    searchStoreState = {
      ...searchStoreState,
      isRefreshing: true,
    };

    render(<SearchResults />);

    expect(screen.getByText('刷新中')).toBeInTheDocument();
    expect(screen.getByTestId('search-result-grid-card')).toBeInTheDocument();
  });

  it('switches from mobile list to desktop grid when the viewport crosses the breakpoint', () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 520,
    });

    render(<SearchResults />);

    const stage = screen.getByTestId('search-results-stage');
    expect(stage.className).toContain('flex flex-col');

    window.innerWidth = 1280;
    fireEvent(window, new Event('resize'));

    expect(stage.className).toContain('grid grid-cols-1');
  });
});
