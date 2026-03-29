import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import TrendingCategories from '@/components/home/TrendingCategories';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement> & {
      initial?: unknown;
      animate?: unknown;
      whileInView?: unknown;
      viewport?: unknown;
      transition?: unknown;
    }) => {
      const domProps = { ...props };
      delete domProps.initial;
      delete domProps.animate;
      delete domProps.whileInView;
      delete domProps.viewport;
      delete domProps.transition;
      return <div {...domProps}>{children}</div>;
    },
    button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
      initial?: unknown;
      animate?: unknown;
      whileInView?: unknown;
      viewport?: unknown;
      transition?: unknown;
    }) => {
      const domProps = { ...props };
      delete domProps.initial;
      delete domProps.animate;
      delete domProps.whileInView;
      delete domProps.viewport;
      delete domProps.transition;
      return <button {...domProps}>{children}</button>;
    },
  },
}));

describe('TrendingCategories', () => {
  it('renders unified non-interactive showcase cards with consistent hover styling', () => {
    const { container } = render(<TrendingCategories />);

    expect(screen.getByRole('heading', { level: 2, name: '探索热门分类' })).toBeInTheDocument();
    expect(screen.getByText('不知道搜什么？看看大家都在找些什么优质资源')).toBeInTheDocument();

    const cards = screen.getAllByTestId('trending-category-card');
    expect(cards).toHaveLength(4);

    cards.forEach((card) => {
      expect(card).toHaveAttribute('data-glass-panel', 'true');
      expect(card).toHaveClass('dark:bg-slate-950/80');
      expect(card).toHaveClass('dark:border-slate-700/55');
      expect(card).toHaveClass('md:min-h-[240px]');
      expect(card).not.toHaveAttribute('data-layout');
      expect(card).not.toHaveClass('xl:grid');
      expect(card.querySelector('[class*="group-hover:opacity-100"]')).not.toBeNull();
    });

    expect(screen.queryByRole('button', { name: '探索分类 影视娱乐' })).not.toBeInTheDocument();
    expect(screen.getAllByTestId('trending-category-badge')).toHaveLength(4);
    expect(screen.getAllByTestId('trending-category-chip').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('svg')).toHaveLength(4);
    expect(screen.queryByTestId('trending-category-featured-summary')).not.toBeInTheDocument();
    expect(screen.queryByTestId('trending-category-featured-detail')).not.toBeInTheDocument();
    expect(screen.queryByText('推荐关键词')).not.toBeInTheDocument();
    expect(screen.queryByText('适合找什么')).not.toBeInTheDocument();
    expect(screen.queryByTestId('trending-category-use-case')).not.toBeInTheDocument();
  });
});
