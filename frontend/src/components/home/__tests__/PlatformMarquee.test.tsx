import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PlatformMarquee from '@/components/home/PlatformMarquee';
import { platformThemes } from '@/components/home/platformThemes';

describe('PlatformMarquee', () => {
  it('renders platform coverage as a calmer trust section with shared palette chips', () => {
    render(<PlatformMarquee />);

    expect(screen.getByRole('heading', { level: 2, name: '支持识别与聚合这些链接类型' })).toBeInTheDocument();
    expect(screen.getByText('以下平台能力会统一折叠进搜索结果与详情页判断路径中。')).toBeInTheDocument();

    const list = screen.getByTestId('platform-coverage-list');
    expect(list).toHaveClass('flex');

    platformThemes.forEach((theme) => {
      const chip = screen.getAllByText(theme.name)[0].closest('div');

      expect(chip).not.toBeNull();
      expect(chip).toHaveClass('rounded-full');
      expect(chip).toHaveClass('text-white');

      theme.color.split(' ').forEach((className) => {
        expect(chip).toHaveClass(className);
      });
    });
  });
});
