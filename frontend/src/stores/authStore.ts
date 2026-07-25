import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * 认证状态接口
 *
 * 刷新令牌已迁移到 httpOnly cookie，前端不再持有 refresh token。
 * access token 仅存于内存；持久化的 rememberMe 标记用于提示"可能存在刷新 cookie"，
 * 驱动页面加载时的静默刷新与 401 重试逻辑。
 */
interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  username: string | null;
  rememberMe: boolean;
  setToken: (token: string, username: string, isAdmin?: boolean, rememberMe?: boolean) => void;
  logout: () => void;
  checkAuth: () => boolean;
}

/**
 * 认证状态管理
 *
 * 使用 persist 中间件仅持久化非敏感的登录态提示到 localStorage；
 * access token 与 refresh token 均不落 localStorage（后者在 httpOnly cookie 中）。
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      isAuthenticated: false,
      isAdmin: false,
      username: null,
      rememberMe: false,

      setToken: (token, username, isAdmin = false, rememberMe = false) => {
        set({
          token,
          username,
          isAuthenticated: true,
          isAdmin,
          rememberMe,
        });
      },

      logout: () => {
        set({
          token: null,
          isAuthenticated: false,
          isAdmin: false,
          username: null,
          rememberMe: false,
        });
      },

      checkAuth: () => {
        const state = get();
        return !!state.token || state.rememberMe;
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        rememberMe: state.rememberMe,
        username: state.rememberMe ? state.username : null,
        isAuthenticated: state.rememberMe ? state.isAuthenticated : false,
        isAdmin: state.rememberMe ? state.isAdmin : false,
      }),
    }
  )
);

export const useAuthToken = () => useAuthStore(state => state.token);
export const useIsAuthenticated = () => useAuthStore(state => state.isAuthenticated);
export const useIsAdmin = () => useAuthStore(state => state.isAdmin);
export const useAuthUsername = () => useAuthStore(state => state.username);
export const useRememberMe = () => useAuthStore(state => state.rememberMe);
