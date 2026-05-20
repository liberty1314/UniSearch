import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import PageTransition from '@/components/PageTransition';

const animatePresenceMock = vi.fn(({ children }: { children: React.ReactNode }) => (
  <div data-testid="animate-presence">{children}</div>
));

vi.mock('framer-motion', () => ({
  AnimatePresence: (props: { children: React.ReactNode }) => animatePresenceMock(props),
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
}));

describe('PageTransition', () => {
  it('bypasses AnimatePresence for admin routes', () => {
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <PageTransition>
          <div>Admin content</div>
        </PageTransition>
      </MemoryRouter>
    );

    expect(screen.getByText('Admin content')).toBeInTheDocument();
    expect(screen.queryByTestId('animate-presence')).not.toBeInTheDocument();
  });

  it('keeps AnimatePresence enabled for non-admin routes', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <PageTransition>
          <div>Login content</div>
        </PageTransition>
      </MemoryRouter>
    );

    expect(screen.getByText('Login content')).toBeInTheDocument();
    expect(screen.getByTestId('animate-presence')).toBeInTheDocument();
  });

  it('bypasses AnimatePresence for home and search route transitions', () => {
    render(
      <MemoryRouter initialEntries={['/search']}>
        <PageTransition>
          <div>Search content</div>
        </PageTransition>
      </MemoryRouter>
    );

    expect(screen.getByText('Search content')).toBeInTheDocument();
    expect(screen.queryByTestId('animate-presence')).not.toBeInTheDocument();
  });
});
