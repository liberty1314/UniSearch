import axios from 'axios';
import { apiClient } from '@/lib/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const PUBLIC_SETTINGS_CACHE_TTL_MS = 30000;

let publicSettingsCache: {
    value: SystemSettingsResponse;
    expiresAt: number;
} | null = null;

/**
 * 系统设置响应接口
 */
export interface SystemSettingsResponse {
    enable_user_auth: boolean;      // 总开关：是否启用用户认证功能
    enable_user_login: boolean;     // 是否启用用户登录功能
    enable_user_signup: boolean;    // 是否启用用户注册功能
    auth_username_min_length?: number; // 用户名最小长度
    auth_username_max_length?: number; // 用户名最大长度
    auth_password_min_length?: number; // 密码最小长度
    auth_password_max_length?: number; // 密码最大长度
    enable_resource_detail_page: boolean; // 是否启用资源详情页展示
    enable_resource_source_badges: boolean; // 是否展示搜索结果来源标签
    public_site_url: string;        // 公开站点 URL（为空时由前端环境变量兜底）
    default_copy_format_template: string; // API Key 复制默认模板
    progressive_search_enabled: boolean; // 是否启用渐进式搜索
}

export interface TMDBAdminSettingsResponse {
    configured: boolean;
    updated_at?: string;
    source: "secret_manager" | "env_fallback" | "unconfigured";
    token_preview?: string;
    read_access_token?: string;
}

export interface CacheSettingOption {
    value: string;
    label: string;
}

export interface CacheSettingOptionCatalog {
    search_cache_ttl_seconds: CacheSettingOption[];
    cache_write_queue_size: CacheSettingOption[];
    cache_write_workers: CacheSettingOption[];
    hot_ranking_preload_time: CacheSettingOption[];
    hot_ranking_preload_limit: CacheSettingOption[];
    hot_ranking_cache_ttl_seconds: CacheSettingOption[];
    hot_ranking_preload_concurrency: CacheSettingOption[];
    hot_ranking_preload_timeout_seconds: CacheSettingOption[];
}

export interface CacheSettingsResponse {
    cache_enabled: boolean;
    search_cache_ttl_seconds: number;
    cache_write_queue_size: number;
    cache_write_workers: number;
    hot_ranking_cache_enabled: boolean;
    hot_ranking_preload_enabled: boolean;
    hot_ranking_preload_time: string;
    hot_ranking_preload_limit: number;
    hot_ranking_cache_ttl_seconds: number;
    hot_ranking_preload_concurrency: number;
    hot_ranking_preload_timeout_seconds: number;
    config_source: 'database';
    cache_setting_options?: CacheSettingOptionCatalog;
    redis_connected: boolean;
    last_preload_result?: {
        total: number;
        success: number;
        failed: number;
    };
    last_preload_at?: string;
    last_preload_status?: string;
}

export interface RuntimeSettingsResponse {
    default_concurrency: number;
    http_max_conns: number;
    async_plugin_enabled: boolean;
    async_response_timeout: number;
    async_max_background_workers: number;
    async_max_background_tasks: number;
    proxy_enabled: boolean;
    proxy_url: string;
    progressive_search_enabled: boolean;
    config_source: 'database';
    restart_required_fields: string[];
}

export type RuntimeSettingsUpdatePayload = Partial<Omit<RuntimeSettingsResponse, 'config_source' | 'restart_required_fields'>>;

export interface CachePreloadResponse {
    message: string;
    result: {
        total: number;
        success: number;
        failed: number;
    };
}

/**
 * 系统设置服务
 */
export class SystemSettingsService {
    /**
     * 获取系统设置（公开接口）
     */
    static async getSettings(): Promise<SystemSettingsResponse> {
        const response = await axios.get<SystemSettingsResponse>(`${API_BASE_URL}/system-settings`);
        return response.data;
    }

    static async getSettingsCached(force = false): Promise<SystemSettingsResponse> {
        const now = Date.now();
        if (!force && publicSettingsCache && publicSettingsCache.expiresAt > now) {
            return publicSettingsCache.value;
        }

        const settings = await this.getSettings();
        publicSettingsCache = {
            value: settings,
            expiresAt: now + PUBLIC_SETTINGS_CACHE_TTL_MS,
        };
        return settings;
    }

    static async resolveDefaultAuthEntryPath(force = false): Promise<string> {
        await this.getSettingsCached(force);
        return '/login';
    }

    /**
     * 获取系统设置（管理员接口）
     */
    static async getSettingsAdmin(token: string): Promise<SystemSettingsResponse> {
        const response = await axios.get<SystemSettingsResponse>(`${API_BASE_URL}/admin/system-settings`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        return response.data;
    }

    /**
     * 更新系统设置（管理员接口）
     * @param token 管理员 Token
     * @param settings 要更新的设置项（至少提供一个）
     */
    static async updateSettings(
        token: string,
        settings: {
            enable_user_auth?: boolean;
            enable_user_login?: boolean;
            enable_user_signup?: boolean;
            enable_resource_detail_page?: boolean;
            enable_resource_source_badges?: boolean;
            public_site_url?: string;
            default_copy_format_template?: string;
        }
    ): Promise<SystemSettingsResponse> {
        const response = await axios.put<SystemSettingsResponse>(
            `${API_BASE_URL}/admin/system-settings`,
            settings,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            }
        );
        publicSettingsCache = {
            value: response.data,
            expiresAt: Date.now() + PUBLIC_SETTINGS_CACHE_TTL_MS,
        };
        return response.data;
    }

    static async getTMDBSettings(unusedToken: string): Promise<TMDBAdminSettingsResponse> {
        void unusedToken;
        return apiClient.get<TMDBAdminSettingsResponse>('/admin/system-settings/tmdb');
    }

    static async updateTMDBSettings(
        unusedToken: string,
        payload: { tmdb_read_access_token: string }
    ): Promise<TMDBAdminSettingsResponse> {
        void unusedToken;
        return apiClient.put<TMDBAdminSettingsResponse>('/admin/system-settings/tmdb', payload);
    }

    static async getCacheSettings(unusedToken: string): Promise<CacheSettingsResponse> {
        void unusedToken;
        return apiClient.get<CacheSettingsResponse>('/admin/system-settings/cache');
    }

    static async updateCacheSettings(
        unusedToken: string,
        payload: Partial<Omit<CacheSettingsResponse, 'config_source' | 'cache_setting_options' | 'redis_connected' | 'last_preload_result' | 'last_preload_at' | 'last_preload_status'>>
    ): Promise<CacheSettingsResponse> {
        void unusedToken;
        return apiClient.put<CacheSettingsResponse>('/admin/system-settings/cache', payload);
    }

    static async getRuntimeSettings(unusedToken: string): Promise<RuntimeSettingsResponse> {
        void unusedToken;
        return apiClient.get<RuntimeSettingsResponse>('/admin/system-settings/runtime');
    }

    static async updateRuntimeSettings(
        unusedToken: string,
        payload: RuntimeSettingsUpdatePayload
    ): Promise<RuntimeSettingsResponse> {
        void unusedToken;
        return apiClient.put<RuntimeSettingsResponse>('/admin/system-settings/runtime', payload);
    }

    static async triggerHotRankingPreload(unusedToken: string): Promise<CachePreloadResponse> {
        void unusedToken;
        return apiClient.post<CachePreloadResponse>('/admin/system-settings/cache/hot-ranking/preload', undefined, { timeout: 0 });
    }

    static async clearHotRankingCache(unusedToken: string): Promise<{ message: string }> {
        void unusedToken;
        return apiClient.delete<{ message: string }>('/admin/system-settings/cache/hot-ranking');
    }
}
