import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import DisclaimerFooter from '@/components/DisclaimerFooter';

describe('DisclaimerFooter', () => {
  it('renders disclaimer link to disclaimer page', () => {
    render(
      <MemoryRouter>
        <DisclaimerFooter />
      </MemoryRouter>
    );

    const disclaimerLink = screen.getByRole('link', { name: '免责声明' });
    expect(disclaimerLink).toBeInTheDocument();
    expect(disclaimerLink).toHaveAttribute('href', '/disclaimer');
  });
});
