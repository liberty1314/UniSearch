import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { AuthService } from '@/services/authService';

/**
 * 自动刷新访问令牌的 Hook
 * 在 Token 即将过期前自动使用 Refresh Token 获取新的 Access Token
 */
export function useAutoRefreshToken() {
    const { token, refreshToken, setToken, logout, username, isAdmin } = useAuthStore();
    const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // 如果没有刷新令牌，不启用自动刷新
        if (!refreshToken || !token) {
            return;
        }

        // 解析 JWT Token 获取过期时间
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
            } catch (e) {
                return null;
            }
        };

        const payload = parseJWT(token);
        if (!payload || !payload.exp) {
            return;
        }

        // 计算刷新时间：在过期前 5 分钟刷新
        const expiresAt = payload.exp * 1000; // 转换为毫秒
        const now = Date.now();
        const refreshTime = expiresAt - 5 * 60 * 1000; // 提前 5 分钟
        const delay = refreshTime - now;

        // 如果已经过期或即将过期，立即刷新
        if (delay <= 0) {
            handleRefresh();
            return;
        }

        // 设置定时器
        refreshTimerRef.current = setTimeout(() => {
            handleRefresh();
        }, delay);

        // 清理定时器
        return () => {
            if (refreshTimerRef.current) {
                clearTimeout(refreshTimerRef.current);
            }
        };
    }, [token, refreshToken]);

    // 刷新令牌处理函数
    const handleRefresh = async () => {
        if (!refreshToken) {
            return;
        }

        try {
            const response = await AuthService.refreshAccessToken(refreshToken);

            // 更新 Token 和 Refresh Token
            setToken(
                response.access_token,
                username || 'user',
                isAdmin,
                null,
                response.refresh_token
            );

            // Token 刷新成功，无需额外日志
        } catch (error) {
            console.error('❌ 自动刷新令牌失败:', error);
            // 刷新失败，清除认证状态
            logout();
        }
    };
}
