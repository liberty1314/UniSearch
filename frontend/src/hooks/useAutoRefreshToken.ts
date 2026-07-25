import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { refreshAuthTokenSingleFlight } from '@/lib/authRefreshManager';

/**
 * 解析 JWT Token 获取过期时间
 */
const parseJWT = (token: string) => {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch {
        return null;
    }
};

/**
 * 检查 Token 是否已过期或即将过期
 * @param token JWT Token
 * @param bufferMinutes 提前多少分钟判定为即将过期（默认5分钟）
 * @returns 是否需要刷新
 */
const isTokenExpiredOrExpiring = (token: string, bufferMinutes: number = 5): boolean => {
    const payload = parseJWT(token);
    if (!payload || !payload.exp) {
        return true;
    }

    const expiresAt = payload.exp * 1000; // 转换为毫秒
    const now = Date.now();
    const bufferTime = bufferMinutes * 60 * 1000;

    return now >= (expiresAt - bufferTime);
};

/**
 * 自动刷新访问令牌的 Hook
 * 
 * 功能：
 * 1. 页面加载时检测 Token 状态，如果已过期但 Refresh Token 有效，自动刷新
 * 2. 在 Token 即将过期前自动使用 Refresh Token 获取新的 Access Token
 * 3. 支持长时间未访问后的自动恢复登录状态（30天内）
 */
export function useAutoRefreshToken() {
    const { token, rememberMe, logout } = useAuthStore();
    const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
    const isRefreshingRef = useRef(false); // 防止重复刷新

    // 刷新令牌处理函数
    const handleRefresh = useCallback(async () => {
        if (!rememberMe || isRefreshingRef.current) {
            return;
        }

        isRefreshingRef.current = true;

        try {
            await refreshAuthTokenSingleFlight();

            console.log('✅ Token 自动刷新成功');
        } catch (error) {
            console.error('❌ 自动刷新令牌失败:', error);
            // 刷新失败时刷新令牌已不可用，主动离开受保护页面，避免停留在空白过渡态。
            logout();
            const currentPath = window.location.pathname;
            if (!currentPath.includes('/login') && !currentPath.startsWith('/auth')) {
                window.location.replace('/login');
            }
        } finally {
            isRefreshingRef.current = false;
        }
    }, [rememberMe, logout]);

    useEffect(() => {
        // 没有"记住我"标记（即无刷新 cookie）时不启用自动刷新
        if (!rememberMe) {
            return;
        }

        // 如果没有 Token 但存在刷新 cookie，尝试静默刷新
        if (!token) {
            handleRefresh();
            return;
        }

        // 检查 Token 是否已过期或即将过期
        if (isTokenExpiredOrExpiring(token)) {
            handleRefresh();
            return;
        }

        // Token 有效，设置定时刷新
        const payload = parseJWT(token);
        if (!payload || !payload.exp) {
            return;
        }

        // 计算刷新时间：在过期前 5 分钟刷新
        const expiresAt = payload.exp * 1000;
        const now = Date.now();
        const refreshTime = expiresAt - 5 * 60 * 1000;
        const delay = refreshTime - now;

        // 设置定时器
        if (delay > 0) {
            refreshTimerRef.current = setTimeout(() => {
                handleRefresh();
            }, delay);
        }

        // 清理定时器
        return () => {
            if (refreshTimerRef.current) {
                clearTimeout(refreshTimerRef.current);
            }
        };
    }, [token, rememberMe, handleRefresh]);
}
