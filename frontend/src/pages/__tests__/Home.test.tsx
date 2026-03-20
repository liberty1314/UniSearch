import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Home from '@/pages/Home';

let searchAccessStatus: 'anonymous' | 'session_only' | 'search_ready' | 'api_key_only' = 'session_only';
let searchKeyword = '';
let searchResults: Array<{ id: number }> = [];

vi.mock('@/components/SearchBox', () => ({
  __esModule: true,
  default: () => <div>search-box</div>,
}));

vi.mock('@/components/CloudTypeFilter', () => ({
  __esModule: true,
  default: () => <div>cloud-filter</div>,
}));

vi.mock('@/components/SearchResults', () => ({
  __esModule: true,
  default: () => <div>search-results</div>,
}));

vi.mock('@/components/magicui/sparkles-text', () => ({
  SparklesText: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/GradientText', () => ({
  __esModule: true,
  default: ({
    children,
    className,
    colors,
  }: {
    children: React.ReactNode;
    className?: string;
    colors?: string[];
  }) => (
    <div data-testid="gradient-text" data-colors={colors?.join(',')} className={className}>
      {children}
    </div>
  ),
}));

vi.mock('@/components/SkeletonLoader', () => ({
  FeatureCardsSkeleton: () => <div>feature-skeleton</div>,
}));

vi.mock('@/components/ui/animated-grid-pattern', () => ({
  AnimatedGridPattern: ({ className }: { className?: string }) => (
    <div data-testid="animated-grid" className={className} />
  ),
}));

vi.mock('@/components/ui/glowing-effect', () => ({
  GlowCard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/ui/number-ticker', () => ({
  NumberTicker: ({ value }: { value: number }) => <>{value}</>,
}));

vi.mock('@/stores/searchStore', () => ({
  useSearchStore: () => ({
    searchParams: { keyword: searchKeyword },
    searchResults: searchResults.length > 0 ? { results: searchResults } : null,
  }),
}));

vi.mock('@/stores/searchAccessStore', () => ({
  useSearchAccessStatus: () => ({
    status: searchAccessStatus,
    initialized: true,
  }),
}));

describe('Home', () => {
  beforeEach(() => {
    searchAccessStatus = 'session_only';
    searchKeyword = '';
    searchResults = [];
  });

  it('shows a lightweight API key hint for session-only users', () => {
    searchAccessStatus = 'session_only';

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    expect(screen.getByText('当前账号已登录，绑定 API Key 后即可开始搜索')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '去绑定' })).toHaveAttribute('href', '/settings/apikey');
    expect(screen.queryByText('SEARCH ACCESS')).not.toBeInTheDocument();
  });

  it('hides the API key hint for users who are already search-ready', () => {
    searchAccessStatus = 'search_ready';

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    expect(screen.queryByText('当前账号已登录，绑定 API Key 后即可开始搜索')).not.toBeInTheDocument();
  });

  it('renders elevated feature cards with dedicated depth layers', () => {
    searchAccessStatus = 'search_ready';

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    expect(screen.getAllByTestId('feature-card-depth')).toHaveLength(3);
    expect(screen.getAllByTestId('feature-card-surface')).toHaveLength(3);
  });

  it('tones feature card surfaces for dark backgrounds with matte slate panels', () => {
    searchAccessStatus = 'search_ready';

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    screen.getAllByTestId('feature-card-surface').forEach((card) => {
      expect(card).toHaveClass('dark:bg-slate-950/80');
      expect(card).toHaveClass('dark:border-slate-700/55');
    });
  });

  it('uses the shared grid-backed page shell in the default state', () => {
    searchAccessStatus = 'search_ready';

    const { container } = render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    expect(container.firstChild).toHaveClass('bg-white');
    expect(container.firstChild).not.toHaveClass('bg-gray-50');
    expect(container.firstChild).toHaveClass('dark:from-gray-900');
    expect(screen.getByTestId('animated-grid')).toBeInTheDocument();
    expect(screen.getByTestId('public-page-glow')).toBeInTheDocument();
  });

  it('keeps homepage hero and section typography on the blue/cyan theme axis', () => {
    searchAccessStatus = 'search_ready';

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    const heroTitle = screen.getByTestId('gradient-text');
    const heroSubtitle = screen.getByRole('heading', { level: 2, name: '智能网盘资源搜索引擎' });
    const statsValue = screen.getByText('支持平台').previousElementSibling as HTMLElement;
    const sectionTitle = screen.getByRole('heading', { level: 2, name: '为什么选择 UniSearch？' });
    const animatedGrid = screen.getByTestId('animated-grid');

    expect(heroTitle).toHaveAttribute('data-colors', '#3b82f6,#0ea5e9,#06b6d4');
    expect(heroSubtitle.className).toContain('via-cyan-600');
    expect(heroSubtitle.className).not.toContain('indigo');
    expect(statsValue).toHaveClass('from-blue-600');
    expect(statsValue).toHaveClass('to-cyan-500');
    expect(sectionTitle.className).toContain('text-blue-950');
    expect(animatedGrid.className).toContain('text-blue-600');
    expect(animatedGrid.className).not.toContain('nebula');
  });

  it('keeps the shared grid-backed shell in the searched state', () => {
    searchAccessStatus = 'search_ready';
    searchKeyword = '电影';
    searchResults = [{ id: 1 }];

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    expect(screen.getByText('search-results')).toBeInTheDocument();
    expect(screen.getByTestId('animated-grid')).toBeInTheDocument();
    expect(screen.getByTestId('public-page-glow')).toBeInTheDocument();
    expect(screen.queryByText('为什么选择 UniSearch？')).not.toBeInTheDocument();
  });
});
