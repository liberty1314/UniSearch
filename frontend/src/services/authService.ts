import { apiClient } from '@/lib/api';
import type {
    AdminLoginRequest,
    AdminLoginResponse,
    APIKeyInfo,
    CreateAPIKeyRequest,
    UpdateAPIKeyRequest,
    BatchExtendRequest,
    BatchOperationResult,
    BatchCreateRequest,
    BatchCreateResult,
} from '@/types/api';

/**
 * 认证服务类
 * 提供管理员登录、API Key 验证和管理功能
 */
export class AuthService {
    /**
     * 管理员登录
     * @param username 用户名
     * @param password 管理员密码
     * @returns 登录响应，包含 token 和过期时间
     */
    static async adminLogin(username: string, password: string): Promise<AdminLoginResponse> {
        const request: AdminLoginRequest = { username, password };
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
        const response = await apiClient.get<{ keys: APIKeyInfo[] }>('/admin/keys');

        if (!response.data) {
            throw new Error('获取 API Keys 失败：服务器未返回有效数据');
        }

        // 后端返回的是 {keys: [...]}，需要提取 keys 字段
        return (response.data as any).keys || [];
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

        const response = await apiClient.post<{ key: APIKeyInfo }>('/admin/keys', request);

        if (!response.data) {
            throw new Error('创建 API Key 失败：服务器未返回有效数据');
        }

        // 后端返回的是 {key: {...}}，需要提取 key 字段
        return (response.data as any).key;
    }

    /**
     * 删除指定的 API Key（管理员权限）
     * @param key API Key 字符串
     */
    static async deleteApiKey(key: string): Promise<void> {
        await apiClient.delete(`/admin/keys/${key}`);
    }

    /**
     * 更新 API Key 有效期（管理员权限）
     * @param key API Key 字符串
     * @param expiresAt 新的过期时间（ISO 8601 格式，可选）
     * @param extendHours 延长小时数（可选）
     * @returns 更新后的 API Key 信息
     */
    static async updateApiKey(
        key: string,
        expiresAt?: string,
        extendHours?: number
    ): Promise<APIKeyInfo> {
        const request: UpdateAPIKeyRequest = {};

        if (expiresAt) {
            request.expires_at = expiresAt;
        }

        if (extendHours !== undefined) {
            request.extend_hours = extendHours;
        }

        const response = await apiClient.patch<{ key: APIKeyInfo }>(`/admin/keys/${key}`, request);

        if (!response.data) {
            throw new Error('更新 API Key 失败：服务器未返回有效数据');
        }

        // 后端返回的是 {key: {...}}，需要提取 key 字段
        return (response.data as any).key;
    }

    /**
     * 批量延长 API Key 有效期（管理员权限）
     * @param keys API Key 字符串数组
     * @param extendHours 延长小时数
     * @returns 批量操作结果
     */
    static async batchExtendApiKeys(
        keys: string[],
        extendHours: number
    ): Promise<BatchOperationResult> {
        const request: BatchExtendRequest = {
            keys,
            extend_hours: extendHours,
        };

        const response = await apiClient.post<BatchOperationResult>(
            '/admin/keys/batch-extend',
            request
        );

        if (!response.data) {
            throw new Error('批量延长失败：服务器未返回有效数据');
        }

        return response.data;
    }

    /**
     * 批量创建 API Key（管理员权限）
     * @param count 创建数量
     * @param ttlHours 有效期（小时）
     * @param descriptionPrefix 描述前缀（可选）
     * @returns 批量创建结果
     */
    static async batchCreateApiKeys(
        count: number,
        ttlHours: number,
        descriptionPrefix?: string
    ): Promise<BatchCreateResult> {
        const request: BatchCreateRequest = {
            count,
            ttl_hours: ttlHours,
            description_prefix: descriptionPrefix,
        };

        const response = await apiClient.post<BatchCreateResult>(
            '/admin/keys/batch-create',
            request
        );

        if (!response.data) {
            throw new Error('批量创建失败：服务器未返回有效数据');
        }

        return response.data;
    }

    /**
     * 批量删除 API Key（管理员权限）
     * @param keys API Key 字符串数组
     * @returns 批量操作结果
     */
    static async batchDeleteApiKeys(keys: string[]): Promise<BatchOperationResult> {
        const request = { keys };

        const response = await apiClient.post<BatchOperationResult>(
            '/admin/keys/batch-delete',
            request
        );

        if (!response.data) {
            throw new Error('批量删除失败：服务器未返回有效数据');
        }

        return response.data;
    }
}
