import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * 认证状态接口
 */
interface AuthState {
    // 状态
    token: string | null;
    apiKey: string | null;
    isAuthenticated: boolean;
    isAdmin: boolean;
    username: string | null;

    // 操作方法
    setToken: (token: string, username: string) => void;
    setApiKey: (apiKey: string) => void;
    logout: () => void;
    checkAuth: () => boolean;
}

/**
 * 认证状态管理
 * 
 * 使用 persist 中间件将认证信息保存到 localStorage
 * 支持 JWT Token 和 API Key 两种认证方式
 */
export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            // 初始状态
            token: null,
            apiKey: null,
            isAuthenticated: false,
            isAdmin: false,
            username: null,

            /**
             * 设置 JWT Token（管理员登录）
             * @param token - JWT Token
             * @param username - 用户名
             */
            setToken: (token, username) => {
                set({
                    token,
                    username,
                    isAuthenticated: true,
                    isAdmin: true,
                    apiKey: null, // 清除 API Key
                });
            },

            /**
             * 设置 API Key（普通用户登录）
             * @param apiKey - API Key
             */
            setApiKey: (apiKey) => {
                set({
                    apiKey,
                    isAuthenticated: true,
                    isAdmin: false,
                    token: null, // 清除 Token
                    username: null,
                });
            },

            /**
             * 登出
             * 清除所有认证状态
             */
            logout: () => {
                set({
                    token: null,
                    apiKey: null,
                    isAuthenticated: false,
                    isAdmin: false,
                    username: null,
                });
            },

            /**
             * 检查认证状态
             * @returns 是否已认证
             */
            checkAuth: () => {
                const state = get();
                return !!(state.token || state.apiKey);
            },
        }),
        {
            name: 'auth-storage', // localStorage 中的 key
            partialize: (state) => ({
                // 只持久化这些字段
                token: state.token,
                apiKey: state.apiKey,
                username: state.username,
            }),
        }
    )
);

// 导出便捷的选择器
export const useAuthToken = () => useAuthStore(state => state.token);
export const useAuthApiKey = () => useAuthStore(state => state.apiKey);
export const useIsAuthenticated = () => useAuthStore(state => state.isAuthenticated);
export const useIsAdmin = () => useAuthStore(state => state.isAdmin);
export const useAuthUsername = () => useAuthStore(state => state.username);
