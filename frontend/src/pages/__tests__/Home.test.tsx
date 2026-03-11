import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Home from '@/pages/Home';

let searchAccessStatus: 'anonymous' | 'session_only' | 'search_ready' | 'api_key_only' = 'session_only';

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
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/SkeletonLoader', () => ({
  FeatureCardsSkeleton: () => <div>feature-skeleton</div>,
}));

vi.mock('@/stores/searchStore', () => ({
  useSearchStore: () => ({
    searchParams: { keyword: '' },
    searchResults: null,
  }),
}));

vi.mock('@/stores/searchAccessStore', () => ({
  useSearchAccessStatus: () => ({
    status: searchAccessStatus,
    initialized: true,
  }),
}));

describe('Home', () => {
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

  it('uses a pure white light page background', () => {
    searchAccessStatus = 'search_ready';

    const { container } = render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    expect(container.firstChild).toHaveClass('bg-white');
    expect(container.firstChild).not.toHaveClass('bg-gray-50');
  });
});
