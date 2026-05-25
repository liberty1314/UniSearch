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
    enable_resource_detail_page: boolean; // 是否启用资源详情页展示
    public_site_url: string;        // 公开站点 URL（为空时由前端环境变量兜底）
    default_copy_format_template: string; // API Key 复制默认模板
}

export interface TMDBAdminSettingsResponse {
    configured: boolean;
    updated_at?: string;
    source: "secret_manager" | "env_fallback" | "unconfigured";
    read_access_token?: string;
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

    static async getTMDBSettings(_token: string): Promise<TMDBAdminSettingsResponse> {
        return apiClient.get<TMDBAdminSettingsResponse>('/admin/system-settings/tmdb');
    }

    static async updateTMDBSettings(
        _token: string,
        payload: { tmdb_read_access_token: string }
    ): Promise<TMDBAdminSettingsResponse> {
        return apiClient.put<TMDBAdminSettingsResponse>('/admin/system-settings/tmdb', payload);
    }
}
