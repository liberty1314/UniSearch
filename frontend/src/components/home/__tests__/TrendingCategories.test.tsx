import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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
  it('renders lightweight category shortcuts with quick-search chips', () => {
    const { container } = render(
      <MemoryRouter>
        <TrendingCategories />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 2, name: '热门分类' })).toBeInTheDocument();
    expect(screen.getByText('不知道搜什么时，先从常见资源方向快速开始。')).toBeInTheDocument();

    const cards = screen.getAllByTestId('trending-category-card');
    expect(cards).toHaveLength(4);

    cards.forEach((card) => {
      expect(card).toHaveAttribute('data-glass-panel', 'true');
      expect(card).toHaveClass('glass-card-premium');
      expect(card).toHaveClass('p-5');
    });

    expect(screen.getByText('影视娱乐')).toBeInTheDocument();
    expect(screen.getByText('学习资料')).toBeInTheDocument();
    expect(screen.getAllByTestId('trending-category-badge')).toHaveLength(4);
    expect(screen.getAllByTestId('trending-category-chip').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: '快捷搜索 4K' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '快捷搜索 AI' })).toBeInTheDocument();
    expect(container.querySelectorAll('svg')).toHaveLength(4);
    expect(screen.queryByText('热门搜索')).not.toBeInTheDocument();
    expect(screen.queryByText('热门标签')).not.toBeInTheDocument();
  });
});
