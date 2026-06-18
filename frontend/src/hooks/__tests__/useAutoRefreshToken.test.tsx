import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutoRefreshToken } from '@/hooks/useAutoRefreshToken';
import { refreshAuthTokenSingleFlight } from '@/lib/authRefreshManager';
import { useAuthStore } from '@/stores/authStore';

vi.mock('@/lib/authRefreshManager', () => ({
  refreshAuthTokenSingleFlight: vi.fn(),
}));

const refreshAuthTokenSingleFlightMock = vi.mocked(refreshAuthTokenSingleFlight);
const originalLocation = window.location;

function installLocationMock(pathname: string) {
  const replaceMock = vi.fn();

  Object.defineProperty(window, 'location', {
    configurable: true,
    value: {
      ...originalLocation,
      pathname,
      replace: replaceMock,
    },
  });

  return replaceMock;
}

describe('useAutoRefreshToken', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    refreshAuthTokenSingleFlightMock.mockReset();
    localStorage.clear();
    useAuthStore.setState({
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isAdmin: false,
      username: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });

  it('刷新令牌失败时会清理登录态并跳转登录页', async () => {
    const replaceMock = installLocationMock('/account');
    refreshAuthTokenSingleFlightMock.mockRejectedValue(new Error('刷新令牌失效'));
    useAuthStore.setState({
      token: null,
      refreshToken: 'expired-refresh-token',
      isAuthenticated: true,
      isAdmin: false,
      username: '联调用户',
    });

    renderHook(() => useAutoRefreshToken());

    await waitFor(() => {
      expect(refreshAuthTokenSingleFlightMock).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(useAuthStore.getState().refreshToken).toBeNull();
    });
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(replaceMock).toHaveBeenCalledWith('/login');
  });

  it('已经位于登录页时刷新失败不会重复触发跳转', async () => {
    const replaceMock = installLocationMock('/login');
    refreshAuthTokenSingleFlightMock.mockRejectedValue(new Error('刷新令牌失效'));
    useAuthStore.setState({
      token: null,
      refreshToken: 'expired-refresh-token',
      isAuthenticated: true,
      isAdmin: false,
      username: '联调用户',
    });

    renderHook(() => useAutoRefreshToken());

    await waitFor(() => {
      expect(refreshAuthTokenSingleFlightMock).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(useAuthStore.getState().refreshToken).toBeNull();
    });
    expect(replaceMock).not.toHaveBeenCalled();
  });
});
