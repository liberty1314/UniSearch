import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import TrendingCategories from '@/components/home/TrendingCategories';

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
        whileInView,
        viewport,
        ...restProps
      }: React.HTMLAttributes<HTMLElement> & {
        initial?: unknown;
        animate?: unknown;
        transition?: unknown;
        whileHover?: unknown;
        whileInView?: unknown;
        viewport?: unknown;
      }) => {
        void animate;
        void transition;
        void whileHover;
        void whileInView;
        void viewport;

        return React.createElement(tagName, {
          ...restProps,
          'data-motion-initial': serializeMotionProp(initial),
          'data-motion-transition': serializeMotionProp(transition),
          'data-motion-while-hover': serializeMotionProp(whileHover),
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

const renderTrendingCategories = () => render(
  <MemoryRouter>
    <TrendingCategories />
  </MemoryRouter>
);

describe('TrendingCategories', () => {
  it('renders lightweight category shortcuts with quick-search chips', () => {
    const { container } = renderTrendingCategories();

    expect(screen.getByRole('heading', { level: 2, name: '热门分类' })).toBeInTheDocument();
    expect(screen.getByText('不知道搜什么时，先从常见资源方向或热门榜单快速开始。')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '进入热门榜单页' })).toHaveAttribute('href', '/trending');
    expect(screen.getByText('先看热度，再搜资源')).toBeInTheDocument();
    expect(screen.getByText('进入榜单页')).toBeInTheDocument();

    const cards = screen.getAllByTestId('trending-category-card');
    expect(cards).toHaveLength(4);

    cards.forEach((card) => {
      expect(card).toHaveAttribute('data-glass-panel', 'true');
      expect(card).toHaveClass('surface-card');
      expect(card).toHaveClass('p-5');
    });

    expect(screen.getByText('影视娱乐')).toBeInTheDocument();
    expect(screen.getByText('学习资料')).toBeInTheDocument();
    expect(screen.getAllByTestId('trending-category-badge')).toHaveLength(4);
    expect(screen.getAllByTestId('trending-category-chip').length).toBeGreaterThan(0);
    expect(screen.getByText('4K')).toBeInTheDocument();
    expect(screen.getByText('AI')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '快捷搜索 4K' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '快捷搜索 AI' })).not.toBeInTheDocument();
    expect(container.querySelectorAll('svg').length).toBeGreaterThanOrEqual(6);
    expect(screen.queryByText('热门搜索')).not.toBeInTheDocument();
    expect(screen.queryByText('热门标签')).not.toBeInTheDocument();
  });

  it('将热门榜单入口的入场与无延迟悬浮过渡隔离在不同动画层', () => {
    renderTrendingCategories();

    const entranceLayer = screen.getByTestId('home-hot-ranking-entry-entrance-layer');
    const hoverLayer = screen.getByTestId('home-hot-ranking-entry-hover-layer');
    const whileHover = hoverLayer.getAttribute('data-motion-while-hover');
    const transition = hoverLayer.getAttribute('data-motion-transition');

    expect(entranceLayer).not.toHaveAttribute('data-motion-while-hover');
    expect(whileHover).not.toBeNull();
    expect(JSON.parse(whileHover!)).toMatchObject({
      y: -8,
      rotateX: 1.5,
      scale: 1.015,
    });
    expect(transition).not.toBeNull();
    expect(JSON.parse(transition!)).toEqual({ duration: 0.2, ease: 'easeOut' });
  });

  it('将热门分类卡片的入场与无延迟悬浮过渡隔离在不同动画层', () => {
    renderTrendingCategories();

    const entranceLayers = screen.getAllByTestId('trending-category-card-entrance-layer');
    const hoverLayers = screen.getAllByTestId('trending-category-card-hover-layer');

    expect(entranceLayers).toHaveLength(4);
    entranceLayers.forEach((entranceLayer) => {
      expect(entranceLayer).not.toHaveAttribute('data-motion-while-hover');
    });

    expect(hoverLayers).toHaveLength(4);
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
});
