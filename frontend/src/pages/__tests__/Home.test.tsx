import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import Home from '@/pages/Home';
import type { SearchAccessStatus } from '@/stores/searchAccessStore';

const navigateMock = vi.fn();

vi.mock('framer-motion', () => {
  const serializeMotionProp = (value: unknown) => {
    if (typeof value === 'undefined') {
      return undefined;
    }
    return JSON.stringify(value);
  };

  const motion = new Proxy({}, {
    get: (_, tagName: string) => {
      const MotionComponent = ({
        children,
          initial,
          animate,
          transition,
          whileHover,
          variants,
          whileInView,
          viewport,
          ...restProps
      }: React.HTMLAttributes<HTMLElement> & {
        initial?: unknown;
        animate?: unknown;
        transition?: unknown;
        whileHover?: unknown;
        variants?: unknown;
        whileInView?: unknown;
        viewport?: unknown;
      }) => {
        void animate;
        void transition;
        void whileHover;
        void variants;
        void whileInView;
        void viewport;

        return React.createElement(tagName, {
          ...restProps,
          'data-motion-initial': serializeMotionProp(initial),
          'data-motion-transition': serializeMotionProp(transition),
          'data-motion-while-hover': serializeMotionProp(whileHover),
          'data-motion-variants': serializeMotionProp(variants),
        }, children);
      };

      return MotionComponent;
    },
  });

  return {
    motion,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useReducedMotion: () => false,
  };
});

let searchAccessStatus: SearchAccessStatus = 'authenticated';
let searchKeyword = '';
let searchResults: Array<{ id: string }> = [];

vi.mock('@/components/SearchBox', () => ({
  __esModule: true,
  default: ({
    accessHint,
    placeholder = '搜索网盘资源...',
  }: {
    accessHint?: string;
    placeholder?: string;
  }) => (
    <div>
      <input placeholder={placeholder} />
      search-box
      {accessHint ? <p>{accessHint}</p> : null}
    </div>
  ),
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
      <h2>热门分类</h2>
      <a href="/trending">进入热门榜单页</a>
      <div>trending-categories</div>
    </section>
  ),
}));

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

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
  const renderHome = (routeState?: unknown) =>
    render(
      <HelmetProvider>
        <MemoryRouter initialEntries={[{ pathname: '/', state: routeState }]}>
          <Home />
        </MemoryRouter>
      </HelmetProvider>
    );

  beforeEach(() => {
    searchAccessStatus = 'authenticated';
    searchKeyword = '';
    searchResults = [];
    navigateMock.mockReset();
    sessionStorage.clear();
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

    const trendingHeading = screen.getByRole('heading', { level: 2, name: '热门分类' });
    const capabilityHeading = screen.getByRole('heading', { level: 2, name: '支持识别与聚合这些链接类型' });

    expect(trendingHeading.compareDocumentPosition(capabilityHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(trendingHeading).toBeInTheDocument();
    expect(capabilityHeading).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2, name: '全网海量资源・一站聚合搜索' })).not.toBeInTheDocument();
    expect(screen.getAllByText('阿里云盘').length).toBeGreaterThan(0);
    expect(screen.getAllByText('百度网盘').length).toBeGreaterThan(0);
  });

  it('keeps a direct homepage entry to the hot rankings page', () => {
    renderHome();

    expect(screen.getByRole('link', { name: '进入热门榜单页' })).toHaveAttribute('href', '/trending');
  });

  it('首屏搜索工作台同时展示搜索框、准入提示和热门榜单入口', () => {
    searchAccessStatus = 'anonymous';

    renderHome();

    expect(screen.getByTestId('home-search-workbench')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('搜索网盘资源...')).toBeInTheDocument();
    expect(screen.getAllByPlaceholderText('搜索网盘资源...')).toHaveLength(1);
    expect(screen.getByText('搜索结果需要登录后查看，热门榜单可直接浏览。')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^热门榜单$/ })).toHaveAttribute('href', '/trending');
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
    const featureSurface = featureCard?.querySelector('div.surface-card');

    expect(featureSurface).not.toBeNull();
    expect(featureSurface).toHaveClass('surface-card');
    expect(featureSurface).toHaveClass('p-7');
  });

  it('uses the shared grid-backed page shell in the default state', () => {
    searchAccessStatus = 'authenticated';

    const { container } = renderHome();

    expect(container.firstChild).toHaveClass('bg-white');
    expect(container.firstChild).toHaveClass('obsidian-shell');
    expect(screen.getByTestId('animated-grid')).toBeInTheDocument();
    expect(screen.getByTestId('public-page-glow')).toBeInTheDocument();
  });

  it('restores the blue-cyan gradient hero brand text', () => {
    searchAccessStatus = 'authenticated';

    renderHome();

    const heroHeading = screen.getByRole('heading', { level: 1, name: 'UniSearch' });
    const heroTitle = screen.getByTestId('gradient-text');
    const heroSubtitle = screen.getByRole('heading', { level: 2, name: '一个入口，聚合搜索主流网盘资源' });
    const sectionTitle = screen.getByRole('heading', { level: 2, name: '帮你更快找到资源' });
    const animatedGrid = screen.getByTestId('animated-grid');

    expect(heroHeading).toBeInTheDocument();
    expect(heroTitle).toHaveAttribute('data-colors', '#3b82f6,#0ea5e9,#06b6d4');
    expect(heroTitle.className).toContain('text-4xl');
    expect(heroTitle.className).toContain('font-extrabold');
    expect(heroSubtitle.className).toContain('text-slate-900');
    expect(heroSubtitle.className).not.toContain('text-transparent');
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

  it('keeps the homepage shell focused on landing content even when search state exists', () => {
    searchAccessStatus = 'authenticated';
    searchKeyword = '电影';
    searchResults = [{ id: '1' }];

    renderHome();

    expect(screen.queryByText('search-results')).not.toBeInTheDocument();
    expect(screen.getByTestId('animated-grid')).toBeInTheDocument();
    expect(screen.getByTestId('public-page-glow')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: '帮你更快找到资源' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: '如何更快找到想要的资源' })).toBeInTheDocument();
  });

  it('匿名访问时展示首页搜索准入提示', () => {
    searchAccessStatus = 'anonymous';

    renderHome();

    expect(screen.getByTestId('home-hero')).toBeInTheDocument();
    expect(screen.getByTestId('home-search-stage')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: '一个入口，聚合搜索主流网盘资源' })).toBeInTheDocument();
    expect(screen.getByText('快速定位影视、课程、软件与资料资源，减少平台切换成本')).toBeInTheDocument();
    expect(screen.getByText('搜索结果需要登录后查看，热门榜单可直接浏览。')).toBeInTheDocument();
    expect(screen.getByTestId('home-trust-strip')).toBeInTheDocument();
    expect(screen.getByText('支持 5+ 平台')).toBeInTheDocument();
    expect(screen.getByText('聚合识别主流链接类型')).toBeInTheDocument();
    expect(screen.getByText('持续更新资源索引')).toBeInTheDocument();
  });

  it('首页首屏辅助信息保持轻量层级并为移动端预留横向空间', () => {
    searchAccessStatus = 'anonymous';

    renderHome();

    const trustStrip = screen.getByTestId('home-trust-strip');
    const searchStage = screen.getByTestId('home-search-stage');

    expect(trustStrip).toHaveClass('overflow-x-auto');
    expect(trustStrip).toHaveClass('sm:overflow-visible');
    expect(searchStage).toHaveClass('space-y-3');
    expect(searchStage).toHaveClass('sm:space-y-4');
  });

  it('在夜间主题背景下为信任条胶囊提供更清晰的对比层级', () => {
    searchAccessStatus = 'anonymous';

    renderHome();

    const trustStrip = screen.getByTestId('home-trust-strip');
    const trustChip = screen.getByText('支持 5+ 平台').closest('div');
    const trustDot = trustChip?.querySelector('span.h-2.w-2');

    expect(trustStrip).toHaveClass('dark:text-slate-300');
    expect(trustChip).not.toBeNull();
    expect(trustChip).toHaveClass('dark:border-cyan-300/[0.16]');
    expect(trustChip).toHaveClass('dark:bg-slate-950/[0.58]');
    expect(trustChip).toHaveClass('dark:text-slate-100');
    expect(trustDot).not.toBeNull();
    expect(trustDot).toHaveClass('dark:shadow-[0_0_0_5px_rgba(34,211,238,0.16)]');
  });

  it('登录后不展示首页搜索准入提示', () => {
    searchAccessStatus = 'authenticated';

    renderHome();

    expect(screen.queryByText('搜索结果需要登录后查看，热门榜单可直接浏览。')).not.toBeInTheDocument();
  });

  it('keeps the hero area focused on the search box without quick-start keyword chips', () => {
    renderHome();

    expect(screen.queryByText('立即开始')).not.toBeInTheDocument();
    expect(screen.queryByText('试试这些高频搜索词')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '沙丘 2' })).not.toBeInTheDocument();
  });

  it('separates core capabilities from usage guidance in homepage flow', () => {
    renderHome();

    const coreHeading = screen.getByRole('heading', { level: 2, name: '帮你更快找到资源' });
    const usageHeading = screen.getByRole('heading', { level: 2, name: '如何更快找到想要的资源' });
    const capabilityHeading = screen.getByRole('heading', { level: 2, name: '支持识别与聚合这些链接类型' });

    expect(coreHeading.compareDocumentPosition(usageHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(usageHeading.compareDocumentPosition(capabilityHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(screen.getByText('多平台搜索')).toBeInTheDocument();
    expect(screen.getByText('智能匹配')).toBeInTheDocument();
    expect(screen.getByText('实时更新')).toBeInTheDocument();
    expect(screen.getByText('输入明确关键词')).toBeInTheDocument();
    expect(screen.getByText('优先使用分类入口')).toBeInTheDocument();
    expect(screen.getByText('进入详情页判断资源')).toBeInTheDocument();
  });

  it('keeps feature cards as animated motion containers', () => {
    renderHome();

    const featureCards = screen.getAllByTestId('home-feature-card');

    expect(featureCards).toHaveLength(3);
    featureCards.forEach((card) => {
      expect(card).toHaveAttribute('data-motion-initial');
      expect(card.getAttribute('data-motion-initial')).toBe(JSON.stringify({ opacity: 0, y: 34, rotateX: 6 }));
      expect(card).toHaveClass('[transform-style:preserve-3d]');
    });
  });

  it('将功能卡片的悬浮手势绑定到稳定外层并隔离视觉变换', () => {
    renderHome();

    const featureCards = screen.getAllByTestId('home-feature-card');
    const hoverLayers = screen.getAllByTestId('home-feature-card-hover-layer');

    featureCards.forEach((card) => {
      expect(card).toHaveAttribute(
        'data-motion-while-hover',
        JSON.stringify('home-feature-card-hover'),
      );
    });

    expect(hoverLayers).toHaveLength(3);
    hoverLayers.forEach((hoverLayer) => {
      const variants = hoverLayer.getAttribute('data-motion-variants');
      const transition = hoverLayer.getAttribute('data-motion-transition');

      expect(hoverLayer).not.toHaveAttribute('data-motion-while-hover');
      expect(variants).not.toBeNull();
      expect(JSON.parse(variants!)).toMatchObject({
        'home-feature-card-hover': {
          y: -8,
          rotateX: 1.5,
          scale: 1.015,
        },
      });
      expect(transition).not.toBeNull();
      expect(JSON.parse(transition!)).toEqual({ duration: 0.2, ease: 'easeOut' });
    });
  });

  it('为使用建议卡片提供与功能卡片一致的即时悬浮过渡', () => {
    renderHome();

    const hoverLayers = screen.getAllByTestId('home-usage-card-hover-layer');

    expect(hoverLayers).toHaveLength(3);
    hoverLayers.forEach((hoverLayer) => {
      const whileHover = hoverLayer.getAttribute('data-motion-while-hover');
      const transition = hoverLayer.getAttribute('data-motion-transition');

      expect(whileHover).not.toBeNull();
      expect(JSON.parse(whileHover!)).toMatchObject({
        y: -8,
        rotateX: 1.5,
        scale: 1.015,
      });
      expect(transition).not.toBeNull();
      expect(JSON.parse(transition!)).toEqual({ duration: 0.2, ease: 'easeOut' });
    });
  });

  it('does not crop platform coverage chips on mobile', () => {
    renderHome();

    const platformList = screen.getByTestId('platform-coverage-list');

    expect(platformList).toHaveClass('overflow-visible');
    expect(platformList.className).not.toContain('overflow-hidden');
    expect(platformList.className).not.toContain('max-h-[5.75rem]');
  });

  it('plays the homepage entrance animation on the first visit of a browser session', () => {
    renderHome();

    expect(
      screen
        .getByRole('heading', { level: 2, name: '一个入口，聚合搜索主流网盘资源' })
        .getAttribute('data-motion-initial')
    ).toBe(JSON.stringify({ opacity: 0, y: 18 }));

    expect(
      screen
        .getByText('多平台搜索')
        .closest('[data-motion-initial]')
        ?.getAttribute('data-motion-initial')
    ).toBe(JSON.stringify({ opacity: 0, y: 34, rotateX: 6 }));
  });

  it('skips the homepage entrance animation after the session has already visited home once', () => {
    sessionStorage.setItem('unisearch_home_entrance_seen', '1');

    renderHome();

    expect(
      screen
        .getByRole('heading', { level: 2, name: '一个入口，聚合搜索主流网盘资源' })
        .getAttribute('data-motion-initial')
    ).toBe('false');

    expect(
      screen
        .getByText('多平台搜索')
        .closest('[data-motion-initial]')
        ?.getAttribute('data-motion-initial')
    ).toBe('false');
  });

  it('allows the homepage entrance animation to play again after a page refresh lifecycle', () => {
    const firstRender = renderHome();

    expect(sessionStorage.getItem('unisearch_home_entrance_seen')).toBe('1');

    window.dispatchEvent(new Event('beforeunload'));
    firstRender.unmount();

    const secondRender = renderHome();

    expect(
      secondRender
        .getByRole('heading', { level: 2, name: '一个入口，聚合搜索主流网盘资源' })
        .getAttribute('data-motion-initial')
    ).toBe(JSON.stringify({ opacity: 0, y: 18 }));
  });
});
