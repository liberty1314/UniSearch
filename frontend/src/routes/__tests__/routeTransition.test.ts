import { describe, expect, it } from 'vitest';
import {
  getRouteFamily,
  resolveRouteTransition,
} from '@/routes/routeTransition';

describe('routeTransition', () => {
  it('classifies the primary public routes correctly', () => {
    expect(getRouteFamily('/')).toBe('home');
    expect(getRouteFamily('/search')).toBe('search');
    expect(getRouteFamily('/resource/resource-1')).toBe('resource-detail');
    expect(getRouteFamily('/login')).toBe('auth');
    expect(getRouteFamily('/account')).toBe('account');
    expect(getRouteFamily('/admin')).toBe('admin');
  });

  it('resolves home to search as a forward primary transition', () => {
    expect(
      resolveRouteTransition({
        from: '/',
        to: '/search',
      }),
    ).toMatchObject({
      family: 'search-flow',
      direction: 1,
      animation: 'shared-axis',
      shouldBypass: false,
      scrollMode: 'top',
    });
  });

  it('resolves search to detail as a forward primary transition', () => {
    expect(
      resolveRouteTransition({
        from: '/search',
        to: '/resource/resource-1',
      }),
    ).toMatchObject({
      family: 'search-flow',
      direction: 1,
      animation: 'shared-axis',
    });
  });

  it('resolves detail back to search as a backward primary transition with scroll restoration', () => {
    expect(
      resolveRouteTransition({
        from: '/resource/resource-1',
        to: '/search',
        state: {
          routeTransition: 'backward',
          restoreScroll: true,
          scrollY: 640,
        },
      }),
    ).toMatchObject({
      family: 'search-flow',
      direction: -1,
      animation: 'shared-axis',
      scrollMode: 'restore',
    });
  });

  it('reuses auth transition direction mapping for auth routes', () => {
    expect(
      resolveRouteTransition({
        from: '/login',
        to: '/register',
        state: {
          authTransition: 'forward',
          from: '/login',
        },
      }),
    ).toMatchObject({
      family: 'auth',
      direction: 1,
      animation: 'fade',
      shouldBypass: false,
    });
  });

  it('bypasses heavy route transitions for admin pages', () => {
    expect(
      resolveRouteTransition({
        from: '/search',
        to: '/admin',
      }),
    ).toMatchObject({
      family: 'admin',
      shouldBypass: true,
      animation: 'none',
    });
  });
});
