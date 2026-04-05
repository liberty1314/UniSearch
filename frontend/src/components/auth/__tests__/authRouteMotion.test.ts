import { describe, expect, it } from 'vitest';
import { isAuthRoute, resolveAuthDirection } from '@/components/auth/authRouteMotion';

describe('authRouteMotion', () => {
  it('resolves login/register directions from fixed mapping', () => {
    expect(resolveAuthDirection('/login', '/register')).toBe(1);
    expect(resolveAuthDirection('/register', '/login')).toBe(-1);
  });

  it('resolves login/admin directions from fixed mapping', () => {
    expect(resolveAuthDirection('/login', '/admin/login')).toBe(1);
    expect(resolveAuthDirection('/admin/login', '/login')).toBe(-1);
  });

  it('falls back to neutral when route combination is unsupported', () => {
    expect(resolveAuthDirection('/register', '/admin/login')).toBe(0);
    expect(resolveAuthDirection('/admin/login', '/register')).toBe(0);
    expect(resolveAuthDirection(undefined, '/register')).toBe(0);
  });

  it('returns neutral for non-auth targets and detects auth routes correctly', () => {
    expect(resolveAuthDirection('/login', '/')).toBe(0);
    expect(isAuthRoute('/login')).toBe(true);
    expect(isAuthRoute('/admin/login')).toBe(true);
    expect(isAuthRoute('/settings/apikey')).toBe(false);
  });
});
