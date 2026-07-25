import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
}));

let authState = {
  isAuthenticated: false,
  isAdmin: false,
  token: null as string | null,
  rememberMe: false as boolean,
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
      rememberMe: false,
      username: null,
    };
    getMock.mockReset();

    const { useSearchAccessStore } = await import('@/stores/searchAccessStore');
    useSearchAccessStore.getState().reset();
  });

  it('classifies token sessions as authenticated', async () => {
    authState = {
      isAuthenticated: true,
      isAdmin: false,
      token: 'jwt-token',
      rememberMe: false,
      username: 'lihua',
    };

    const { useSearchAccessStore } = await import('@/stores/searchAccessStore');
    const status = await useSearchAccessStore.getState().refresh({ force: true });

    expect(status).toBe('authenticated');
    expect(useSearchAccessStore.getState().status).toBe('authenticated');
  });

  it('does not reuse another user session cache entry', async () => {
    authState = {
      isAuthenticated: true,
      isAdmin: false,
      token: 'jwt-token-a',
      rememberMe: false,
      username: 'lihua',
    };

    const { useSearchAccessStore } = await import('@/stores/searchAccessStore');
    const firstStatus = await useSearchAccessStore.getState().refresh({ force: false });
    expect(firstStatus).toBe('authenticated');

    authState = {
      isAuthenticated: true,
      isAdmin: false,
      token: 'jwt-token-b',
      rememberMe: false,
      username: 'other-user',
    };

    const secondStatus = await useSearchAccessStore.getState().refresh({ force: false });

    expect(secondStatus).toBe('authenticated');
    expect(getMock).not.toHaveBeenCalled();
  });

  it('treats refresh-token sessions as authenticated during access token restore', async () => {
    authState = {
      isAuthenticated: true,
      isAdmin: false,
      token: null,
      rememberMe: true,
      username: 'lihua',
    };

    const { useSearchAccessStore } = await import('@/stores/searchAccessStore');
    const status = await useSearchAccessStore.getState().refresh({ force: true });

    expect(status).toBe('authenticated');
    expect(useSearchAccessStore.getState().status).toBe('authenticated');
  });
});
