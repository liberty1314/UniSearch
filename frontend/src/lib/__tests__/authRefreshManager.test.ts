import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/stores/authStore';
import { refreshAuthTokenSingleFlight } from '@/lib/authRefreshManager';

const { postMock, createMock } = vi.hoisted(() => {
  const post = vi.fn();
  return {
    postMock: post,
    createMock: vi.fn(() => ({ post })),
  };
});

vi.mock('axios', () => ({
  default: {
    create: createMock,
  },
}));

vi.mock('@/utils/deviceFingerprint', () => ({
  getDeviceFingerprint: vi.fn(async () => 'device-a'),
}));

describe('refreshAuthTokenSingleFlight', () => {
  beforeEach(() => {
    postMock.mockReset();
    createMock.mockClear();
    localStorage.clear();
    useAuthStore.setState({
      token: null,
      refreshToken: 'old-refresh-token',
      isAuthenticated: true,
      isAdmin: true,
      username: 'neo',
    });
  });

  it('刷新成功后写回新的 access token 和 refresh token', async () => {
    postMock.mockResolvedValue({
      data: {
        access_token: 'new-access-token',
        expires_at: 1_782_534_400,
        refresh_token: 'new-refresh-token',
      },
    });

    const payload = await refreshAuthTokenSingleFlight();

    expect(postMock).toHaveBeenCalledWith('/auth/refresh', {
      refresh_token: 'old-refresh-token',
      device_fingerprint: 'device-a',
    });
    expect(payload.refresh_token).toBe('new-refresh-token');
    expect(useAuthStore.getState().token).toBe('new-access-token');
    expect(useAuthStore.getState().refreshToken).toBe('new-refresh-token');
    expect(useAuthStore.getState().isAdmin).toBe(true);
  });
});
