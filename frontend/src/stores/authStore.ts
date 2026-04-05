import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * 认证状态接口
 */
interface AuthState {
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  username: string | null;
  setToken: (token: string, username: string, isAdmin?: boolean, refreshToken?: string | null) => void;
  setRefreshToken: (refreshToken: string | null) => void;
  logout: () => void;
  checkAuth: () => boolean;
}

/**
 * 认证状态管理
 * 
 * 使用 persist 中间件将认证信息保存到 localStorage
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isAdmin: false,
      username: null,

      setToken: (token, username, isAdmin = false, refreshToken = null) => {
        set({
          token,
          username,
          isAuthenticated: true,
          isAdmin,
          refreshToken,
        });
      },

      setRefreshToken: (refreshToken) => {
        set({ refreshToken });
      },

      logout: () => {
        set({
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          isAdmin: false,
          username: null,
        });
      },

      checkAuth: () => {
        const state = get();
        return !!state.token;
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        username: state.username,
        isAuthenticated: state.isAuthenticated,
        isAdmin: state.isAdmin,
      }),
    }
  )
);

export const useAuthToken = () => useAuthStore(state => state.token);
export const useRefreshToken = () => useAuthStore(state => state.refreshToken);
export const useIsAuthenticated = () => useAuthStore(state => state.isAuthenticated);
export const useIsAdmin = () => useAuthStore(state => state.isAdmin);
export const useAuthUsername = () => useAuthStore(state => state.username);
