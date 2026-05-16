import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import Home from '@/pages/Home';
import type { SearchAccessStatus } from '@/stores/searchAccessStore';

let searchAccessStatus: SearchAccessStatus = 'authenticated';
let searchKeyword = '';
let searchResults: Array<{ id: string }> = [];

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

vi.mock('@/components/home/TrendingCategories', () => ({
  __esModule: true,
  default: () => (
    <section>
      <h2>探索热门分类</h2>
      <div>trending-categories</div>
    </section>
  ),
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
    searchResults: searchResults.length > 0 ? {
      total: searchResults.length,
      resources: searchResults.map((item) => ({
        id: item.id,
        title: item.id,
        source: { type: 'plugin', name: '测试来源' },
        links: [],
        capabilities: {},
        actions: [],
        detail: {},
      })),
      facets: {
        cloud_types: {},
        source_types: {},
        media_types: {},
        target_types: {},
        capabilities: {},
        action_types: {},
      },
    } : null,
    performSearch: vi.fn(),
  }),
}));

vi.mock('@/stores/searchAccessStore', () => ({
  useSearchAccessStatus: () => ({
    status: searchAccessStatus,
    initialized: true,
  }),
}));

describe('Home', () => {
  const renderHome = () =>
    render(
      <HelmetProvider>
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      </HelmetProvider>
    );

  beforeEach(() => {
    searchAccessStatus = 'authenticated';
    searchKeyword = '';
    searchResults = [];
  });

  it('renders the public homepage shell for guests without showing legacy API key prompts', () => {
    searchAccessStatus = 'anonymous';

    renderHome();

    expect(screen.getByText('UniSearch')).toBeInTheDocument();
    expect(screen.queryByText('当前账号已登录，绑定 API Key 后即可无限制搜索')).not.toBeInTheDocument();
  });

  it('places the capability strip after the trending categories section', () => {
    searchAccessStatus = 'authenticated';

    renderHome();

    const trendingHeading = screen.getByRole('heading', { level: 2, name: '探索热门分类' });
    const capabilityHeading = screen.getByRole('heading', { level: 2, name: '支持识别 / 聚合以下链接类型' });

    expect(trendingHeading.compareDocumentPosition(capabilityHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(trendingHeading).toBeInTheDocument();
    expect(capabilityHeading).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2, name: '全网海量资源・一站聚合搜索' })).not.toBeInTheDocument();
    expect(screen.getAllByText('阿里云盘').length).toBeGreaterThan(0);
    expect(screen.getAllByText('百度网盘').length).toBeGreaterThan(0);
  });

  it('renders elevated feature cards with dedicated depth layers', () => {
    searchAccessStatus = 'authenticated';

    renderHome();

    expect(screen.getByText('多平台搜索')).toBeInTheDocument();
    expect(screen.getByText('智能匹配')).toBeInTheDocument();
    expect(screen.getByText('实时更新')).toBeInTheDocument();
  });

  it('tones feature card surfaces for dark backgrounds with matte slate panels', () => {
    searchAccessStatus = 'authenticated';

    renderHome();

    const featureCard = screen.getByText('多平台搜索').closest('div.group');
    const featureSurface = featureCard?.querySelector('div.glass-card-premium');

    expect(featureSurface).not.toBeNull();
    expect(featureSurface).toHaveClass('glass-card-premium');
    expect(featureSurface).toHaveClass('p-8');
  });

  it('uses the shared grid-backed page shell in the default state', () => {
    searchAccessStatus = 'authenticated';

    const { container } = renderHome();

    expect(container.firstChild).toHaveClass('bg-white');
    expect(container.firstChild).toHaveClass('obsidian-shell');
    expect(screen.getByTestId('animated-grid')).toBeInTheDocument();
    expect(screen.getByTestId('public-page-glow')).toBeInTheDocument();
  });

  it('keeps homepage hero and section typography on the blue/cyan theme axis', () => {
    searchAccessStatus = 'authenticated';

    renderHome();

    const heroTitle = screen.getByTestId('gradient-text');
    const heroSubtitle = screen.getByRole('heading', { level: 2, name: '智能网盘资源搜索引擎' });
    const sectionTitle = screen.getByRole('heading', { level: 2, name: '为什么选择 UniSearch？' });
    const animatedGrid = screen.getByTestId('animated-grid');

    expect(heroTitle).toHaveAttribute('data-colors', '#3b82f6,#0ea5e9,#06b6d4');
    expect(heroSubtitle.className).toContain('via-cyan-600');
    expect(heroSubtitle.className).not.toContain('indigo');
    expect(sectionTitle.className).toContain('text-blue-950');
    expect(animatedGrid.className).toContain('text-blue-600');
    expect(animatedGrid.className).not.toContain('nebula');
  });

  it('uses neutral copy for homepage feature descriptions instead of enumerating platform brands', () => {
    searchAccessStatus = 'authenticated';

    renderHome();

    expect(
      screen.getByText('支持多种主流网盘链接类型识别与聚合搜索，一站式完成检索')
    ).toBeInTheDocument();
    expect(
      screen.queryByText('支持百度网盘、阿里云盘、夸克网盘等多个主流网盘平台，一站式搜索体验')
    ).not.toBeInTheDocument();
  });

  it('keeps the shared grid-backed shell in the searched state', () => {
    searchAccessStatus = 'authenticated';
    searchKeyword = '电影';
    searchResults = [{ id: '1' }];

    renderHome();

    expect(screen.getByText('search-results')).toBeInTheDocument();
    expect(screen.getByTestId('animated-grid')).toBeInTheDocument();
    expect(screen.getByTestId('public-page-glow')).toBeInTheDocument();
    expect(screen.queryByText('为什么选择 UniSearch？')).not.toBeInTheDocument();
  });
});
