import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import SiteFooter from '@/components/SiteFooter';

describe('SiteFooter', () => {
  it('uses blue/cyan divider accents instead of legacy nebula hues', () => {
    const { container } = render(
      <MemoryRouter>
        <SiteFooter />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: '联系我们' })).toBeInTheDocument();

    const dividerLayers = Array.from(
      container.querySelectorAll('.absolute.inset-0')
    ) as HTMLElement[];

    expect(dividerLayers[0].className).toContain('via-blue-400/50');
    expect(dividerLayers[0].className).toContain('dark:via-blue-500/40');
    expect(dividerLayers[1].className).toContain('via-cyan-400/30');
    expect(dividerLayers[0].className).not.toContain('nebula');
  });
});
