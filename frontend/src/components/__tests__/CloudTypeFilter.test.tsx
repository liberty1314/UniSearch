import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CloudTypeFilter from '@/components/CloudTypeFilter';
import { CloudType } from '@/types/api';

vi.mock('@/components/magicui/cool-mode', () => ({
  CoolMode: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement> & { layout?: boolean }) => {
      const { layout: _layout, ...domProps } = props;
      return <div {...domProps}>{children}</div>;
    },
    button: ({
      children,
      whileHover: _whileHover,
      whileTap: _whileTap,
      layout: _layout,
      ...props
    }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
      whileHover?: unknown;
      whileTap?: unknown;
      layout?: boolean;
    }) => <button {...props}>{children}</button>,
  },
  LayoutGroup: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/stores/searchStore', () => ({
  useSearchStore: () => ({
    searchParams: {
      cloudTypes: [
        CloudType.BAIDU,
        CloudType.ALIYUN,
        CloudType.QUARK,
        CloudType.TIANYI,
        CloudType.UC,
        CloudType.MOBILE,
        CloudType.ONE_ONE_FIVE,
        CloudType.XUNLEI,
        CloudType.ONE_TWO_THREE,
        CloudType.MAGNET,
        CloudType.LANZOU,
      ],
    },
    setSearchParams: vi.fn(),
  }),
}));

describe('CloudTypeFilter', () => {
  it('renders the filter panel without the outer halo layer', () => {
    const { container } = render(<CloudTypeFilter />);

    expect(screen.getByRole('heading', { name: '来源筛选' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /全选状态|选择全部/ })).toBeInTheDocument();

    const hasOuterHaloLayer = Array.from(container.querySelectorAll('div')).some((node) =>
      typeof node.className === 'string' && node.className.includes('via-purple-500/10')
    );

    expect(hasOuterHaloLayer).toBe(false);
  });
});
