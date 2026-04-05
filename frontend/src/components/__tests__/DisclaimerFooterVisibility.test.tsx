import { render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import DisclaimerFooter from '@/components/DisclaimerFooter';
import { shouldShowDisclaimer } from '@/lib/disclaimer';

const DisclaimerRouteGate = () => {
  const { pathname } = useLocation();
  return shouldShowDisclaimer(pathname) ? <DisclaimerFooter /> : null;
};

const renderAtPath = (path: string) => {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <DisclaimerRouteGate />
    </MemoryRouter>
  );
};

describe('DisclaimerFooter route visibility', () => {
  it.each([
    '/',
    '/login',
    '/register',
    '/account',
    '/disclaimer',
  ])('shows disclaimer on user route: %s', (path) => {
    renderAtPath(path);
    expect(screen.getByRole('link', { name: '免责声明' })).toBeInTheDocument();
  });

  it.each([
    '/admin',
    '/admin/login',
  ])('hides disclaimer on admin route: %s', (path) => {
    renderAtPath(path);
    expect(screen.queryByRole('link', { name: '免责声明' })).not.toBeInTheDocument();
  });
});
