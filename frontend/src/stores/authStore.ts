import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * 认证状态接口
 */
interface AuthState {
    // 状态
    token: string | null;
    apiKey: string | null;
    refreshToken: string | null; // 新增：刷新令牌
    isAuthenticated: boolean;
    isAdmin: boolean;
    username: string | null;

    // 操作方法
    setToken: (token: string, username: string, isAdmin?: boolean, apiKey?: string | null, refreshToken?: string | null) => void;
    setApiKey: (apiKey: string) => void;
    setRefreshToken: (refreshToken: string) => void; // 新增：设置刷新令牌
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
            refreshToken: null,
            isAuthenticated: false,
            isAdmin: false,
            username: null,

            /**
             * 设置 JWT Token
             * @param token - JWT Token
             * @param username - 用户名
             * @param isAdmin - 是否为管理员（可选，默认为 true）
             * @param apiKey - 关联的 API Key（可选，用于普通用户）
             * @param refreshToken - 刷新令牌（可选，用于"记住我"功能）
             */
            setToken: (token, username, isAdmin = true, apiKey = null, refreshToken = null) => {
                set({
                    token,
                    username,
                    isAuthenticated: true,
                    isAdmin,
                    apiKey, // 保存关联的 API Key
                    refreshToken, // 保存刷新令牌
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
                    username: 'user',
                    refreshToken: null, // 清除刷新令牌
                });
            },

            /**
             * 设置刷新令牌
             * @param refreshToken - 刷新令牌
             */
            setRefreshToken: (refreshToken) => {
                set({ refreshToken });
            },

            /**
             * 登出
             * 清除所有认证状态
             */
            logout: () => {
                set({
                    token: null,
                    apiKey: null,
                    refreshToken: null,
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
                refreshToken: state.refreshToken, // 持久化刷新令牌
                username: state.username,
                isAuthenticated: state.isAuthenticated,
                isAdmin: state.isAdmin,
            }),
        }
    )
);

// 导出便捷的选择器
export const useAuthToken = () => useAuthStore(state => state.token);
export const useAuthApiKey = () => useAuthStore(state => state.apiKey);
export const useRefreshToken = () => useAuthStore(state => state.refreshToken); // 新增
export const useIsAuthenticated = () => useAuthStore(state => state.isAuthenticated);
export const useIsAdmin = () => useAuthStore(state => state.isAdmin);
export const useAuthUsername = () => useAuthStore(state => state.username);
