import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PlatformMarquee from '@/components/home/PlatformMarquee';
import { platformThemes } from '@/components/home/platformThemes';

vi.mock('@/components/ui/marquee', () => ({
  Marquee: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('PlatformMarquee', () => {
  it('renders platform chips with the shared cloud-type palette', () => {
    render(<PlatformMarquee />);

    expect(screen.getByRole('heading', { level: 2, name: '支持识别 / 聚合以下链接类型' })).toBeInTheDocument();

    platformThemes.forEach((theme) => {
      const chip = screen.getAllByText(theme.name)[0].closest('div');

      expect(chip).not.toBeNull();
      expect(chip).toHaveClass('bg-gradient-to-r');
      expect(chip).toHaveClass('text-white');

      theme.color.split(' ').forEach((className) => {
        expect(chip).toHaveClass(className);
      });

      theme.shadow.split(' ').forEach((className) => {
        expect(chip).toHaveClass(className);
      });
    });
  });
});
