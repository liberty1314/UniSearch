import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import DisclaimerFooter from '@/components/DisclaimerFooter';

describe('DisclaimerFooter', () => {
  it('renders disclaimer link to disclaimer page', () => {
    const { container } = render(
      <MemoryRouter>
        <DisclaimerFooter />
      </MemoryRouter>
    );

    const disclaimerLink = screen.getByRole('link', { name: '免责声明' });
    const divider = container.querySelector('.pointer-events-none') as HTMLElement;
    expect(disclaimerLink).toBeInTheDocument();
    expect(disclaimerLink).toHaveAttribute('href', '/disclaimer');
    expect(container.firstChild).toHaveClass('obsidian-glass-shell');
    expect(divider.className).toContain('via-blue-500/60');
    expect(disclaimerLink.className).toContain('hover:text-blue-600');
    expect(disclaimerLink.className).not.toContain('nebula');
  });
});
