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
      isAuthenticated: true,
      isAdmin: true,
      username: 'neo',
      rememberMe: true,
    });
  });

  it('刷新成功后仅写回新的 access token（刷新令牌由 cookie 轮转）', async () => {
    postMock.mockResolvedValue({
      data: {
        access_token: 'new-access-token',
        expires_at: 1_782_534_400,
        refresh_token: 'new-refresh-token',
      },
    });

    const payload = await refreshAuthTokenSingleFlight();

    // 请求体只带设备指纹，刷新令牌通过 httpOnly cookie 自动携带。
    expect(postMock).toHaveBeenCalledWith('/auth/refresh', {
      device_fingerprint: 'device-a',
    });
    expect(payload.access_token).toBe('new-access-token');
    expect(useAuthStore.getState().token).toBe('new-access-token');
    expect(useAuthStore.getState().isAdmin).toBe(true);
    expect(useAuthStore.getState().rememberMe).toBe(true);
  });
});
