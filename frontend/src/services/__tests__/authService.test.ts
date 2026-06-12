import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '@/services/authService';

const { getMock, postMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  apiClient: {
    get: getMock,
    post: postMock,
  },
}));

vi.mock('@/utils/deviceFingerprint', () => ({
  getDeviceFingerprint: vi.fn().mockResolvedValue('device-fingerprint'),
}));

describe('AuthService', () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
  });

  it('registers against the unified auth endpoint and returns login payload', async () => {
    postMock.mockResolvedValue({
      access_token: 'token',
      expires_at: 123,
      username: 'neo',
    });

    const result = await AuthService.register('neo', 'secret123');

    expect(postMock).toHaveBeenCalledWith('/auth/register', {
      username: 'neo',
      password: 'secret123',
    });
    expect(result.access_token).toBe('token');
  });
});
