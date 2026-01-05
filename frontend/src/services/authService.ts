import { apiClient } from '@/lib/api';
import type {
    AdminLoginRequest,
    AdminLoginResponse,
    APIKeyInfo,
    CreateAPIKeyRequest,
} from '@/types/api';

/**
 * 认证服务类
 * 提供管理员登录、API Key 验证和管理功能
 */
export class AuthService {
    /**
     * 管理员登录
     * @param password 管理员密码
     * @returns 登录响应，包含 token 和过期时间
     */
    static async adminLogin(password: string): Promise<AdminLoginResponse> {
        const request: AdminLoginRequest = { password };
        const response = await apiClient.post<AdminLoginResponse>('/admin/login', request);

        if (!response.data) {
            throw new Error('登录失败：服务器未返回有效数据');
        }

        return response.data;
    }

    /**
     * 验证 API Key 是否有效
     * @param apiKey API Key 字符串
     * @returns 是否有效
     */
    static async validateApiKey(apiKey: string): Promise<boolean> {
        try {
            // 尝试调用需要认证的接口来验证 API Key
            await apiClient.getInstance().get('/health', {
                headers: { 'X-API-Key': apiKey },
            });
            return true;
        } catch (error) {
            // 如果请求失败，说明 API Key 无效
            return false;
        }
    }

    /**
     * 获取 API Keys 列表（管理员权限）
     * @returns API Keys 数组
     */
    static async listApiKeys(): Promise<APIKeyInfo[]> {
        const response = await apiClient.get<APIKeyInfo[]>('/admin/keys');

        if (!response.data) {
            throw new Error('获取 API Keys 失败：服务器未返回有效数据');
        }

        return response.data;
    }

    /**
     * 创建新的 API Key（管理员权限）
     * @param ttlHours 有效期（小时）
     * @param description 描述信息
     * @returns 新创建的 API Key 信息
     */
    static async createApiKey(ttlHours: number, description: string): Promise<APIKeyInfo> {
        const request: CreateAPIKeyRequest = {
            ttl_hours: ttlHours,
            description,
        };

        const response = await apiClient.post<APIKeyInfo>('/admin/keys', request);

        if (!response.data) {
            throw new Error('创建 API Key 失败：服务器未返回有效数据');
        }

        return response.data;
    }

    /**
     * 删除指定的 API Key（管理员权限）
     * @param key API Key 字符串
     */
    static async deleteApiKey(key: string): Promise<void> {
        await apiClient.delete(`/admin/keys/${key}`);
    }
}
