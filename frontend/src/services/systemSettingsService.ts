import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * 系统设置响应接口
 */
export interface SystemSettingsResponse {
    enable_user_auth: boolean;      // 总开关：是否启用用户认证功能
    enable_user_login: boolean;     // 是否启用用户登录功能
    enable_user_signup: boolean;    // 是否启用用户注册功能
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
        return response.data;
    }
}
