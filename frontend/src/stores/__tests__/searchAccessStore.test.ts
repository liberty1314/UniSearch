import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
}));

let authState = {
  isAuthenticated: false,
  isAdmin: false,
  token: null as string | null,
  apiKey: null as string | null,
  username: null as string | null,
};

const useAuthStoreMock = Object.assign(
  (selector?: (state: typeof authState) => unknown) => (selector ? selector(authState) : authState),
  {
    getState: () => authState,
  }
);

vi.mock('@/lib/api', () => ({
  apiClient: {
    get: getMock,
  },
}));

vi.mock('@/stores/authStore', () => ({
  useAuthStore: useAuthStoreMock,
}));

describe('searchAccessStore', () => {
  beforeEach(async () => {
    authState = {
      isAuthenticated: false,
      isAdmin: false,
      token: null,
      apiKey: null,
      username: null,
    };
    getMock.mockReset();

    const { useSearchAccessStore } = await import('@/stores/searchAccessStore');
    useSearchAccessStore.getState().reset();
  });

  it('classifies token-only users without a bound key as session_only', async () => {
    authState = {
      isAuthenticated: true,
      isAdmin: false,
      token: 'jwt-token',
      apiKey: null,
      username: 'lihua',
    };
    getMock.mockRejectedValue({
      code: 404,
      response: {
        status: 404,
      },
    });

    const { useSearchAccessStore } = await import('@/stores/searchAccessStore');
    const status = await useSearchAccessStore.getState().refresh({ force: true });

    expect(status).toBe('session_only');
    expect(useSearchAccessStore.getState().status).toBe('session_only');
  });

  it('classifies token-only users with a bound key as search_ready', async () => {
    authState = {
      isAuthenticated: true,
      isAdmin: false,
      token: 'jwt-token',
      apiKey: null,
      username: 'lihua',
    };
    getMock.mockResolvedValue({ api_key: 'sk-bound-key' });

    const { useSearchAccessStore } = await import('@/stores/searchAccessStore');
    const status = await useSearchAccessStore.getState().refresh({ force: true });

    expect(status).toBe('search_ready');
    expect(useSearchAccessStore.getState().status).toBe('search_ready');
  });

  it('classifies API key login sessions as api_key_only without fetching binding info', async () => {
    authState = {
      isAuthenticated: true,
      isAdmin: false,
      token: 'jwt-token',
      apiKey: 'sk-direct-login',
      username: 'lihua',
    };

    const { useSearchAccessStore } = await import('@/stores/searchAccessStore');
    const status = await useSearchAccessStore.getState().refresh({ force: true });

    expect(status).toBe('api_key_only');
    expect(getMock).not.toHaveBeenCalled();
  });

  it('does not reuse another user session cache entry', async () => {
    authState = {
      isAuthenticated: true,
      isAdmin: false,
      token: 'jwt-token-a',
      apiKey: null,
      username: 'lihua',
    };
    getMock.mockResolvedValueOnce({ api_key: 'sk-bound-key' });

    const { useSearchAccessStore } = await import('@/stores/searchAccessStore');
    const firstStatus = await useSearchAccessStore.getState().refresh({ force: false });
    expect(firstStatus).toBe('search_ready');

    authState = {
      isAuthenticated: true,
      isAdmin: false,
      token: 'jwt-token-b',
      apiKey: null,
      username: 'other-user',
    };
    getMock.mockRejectedValueOnce({
      code: 404,
      response: {
        status: 404,
      },
    });

    const secondStatus = await useSearchAccessStore.getState().refresh({ force: false });

    expect(secondStatus).toBe('session_only');
    expect(getMock).toHaveBeenCalledTimes(2);
  });
});
