import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '@/stores/authStore';

describe('authStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.getState().logout();
  });

  it('remember me 会话持久化登录态提示，但不将 access token 写入本地存储', () => {
    useAuthStore.getState().setToken('access-token', 'neo', false, true);

    const persisted = localStorage.getItem('auth-storage');
    expect(persisted).toBeTruthy();
    expect(persisted).not.toContain('access-token');
    expect(persisted).toContain('"rememberMe":true');
    expect(persisted).toContain('"isAuthenticated":true');
  });

  it('无 remember me 时不会把认证态持久化到刷新后的会话中', () => {
    useAuthStore.getState().setToken('access-token', 'neo', false, false);

    const persisted = localStorage.getItem('auth-storage');
    expect(persisted).toBeTruthy();
    expect(persisted).not.toContain('access-token');
    expect(persisted).not.toContain('"isAuthenticated":true');
  });
});
