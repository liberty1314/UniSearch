import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import SiteFooter from '@/components/SiteFooter';

describe('SiteFooter', () => {
  it('renders the standard UniSearch footer for non-home public pages', () => {
    const { container } = render(
      <MemoryRouter>
        <SiteFooter />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: '首页' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: '个人中心' })).toHaveAttribute('href', '/account');
    expect(screen.getByRole('link', { name: '免责声明' })).toHaveAttribute('href', '/disclaimer');
    expect(screen.getByRole('link', { name: '联系我们' })).toBeInTheDocument();
    expect(screen.getByText(/Search smarter\. Access cleanly\./)).toBeInTheDocument();
    expect(screen.queryByText('UNISEARCH')).not.toBeInTheDocument();
    expect(container.querySelector('div.obsidian-glass-shell')).toBeTruthy();

    const dividerLayers = Array.from(
      container.querySelectorAll('.absolute.inset-0')
    ) as HTMLElement[];

    expect(dividerLayers[0].className).toContain('via-blue-400/50');
    expect(dividerLayers[1].className).toContain('via-cyan-400/30');
  });
});
