import { apiClient } from '@/lib/api';
import type {
    AdminLoginRequest,
    AdminLoginResponse,
    APIKeyInfo,
    APIKeyInfoResponse,
    UpdateAPIKeyRequest,
    BatchExtendRequest,
    BatchOperationResult,
    BatchCreateResult,
    LoginWithRememberRequest,
    LoginWithRememberResponse,
    RefreshTokenRequest,
    RefreshTokenResponse,
    RevokeRefreshTokenRequest,
    RegisterRequest,
    RegisterResponse,
    LoginRequest,
    LoginResponse,
} from '@/types/api';
import { getDeviceFingerprint } from '@/utils/deviceFingerprint';

/**
 * 认证服务类
 * 提供用户注册、登录、管理员登录、API Key 验证和管理功能
 */
export class AuthService {
    /**
     * 用户注册
     * 
     * 后端返回格式：`{ code: 200, message: "注册成功", data: { user_id, username } }`
     * 响应拦截器会自动解包 `data` 字段，此方法直接返回 `RegisterResponse` 对象
     * 
     * @param username 用户名
     * @param password 密码
     * @returns 注册响应数据（已解包）
     */
    static async register(username: string, password: string): Promise<RegisterResponse> {
        const request: RegisterRequest = { username, password };
        // 响应拦截器已自动解包 data 字段，直接返回业务数据
        const response = await apiClient.post<RegisterResponse>('/auth/register', request);
        return response;
    }

    /**
     * 用户登录（支持"记住我"）
     * 
     * 后端返回格式：`{ code: 200, message: "登录成功", data: { access_token, expires_at, refresh_token?, username } }`
     * 响应拦截器会自动解包 `data` 字段，此方法直接返回 `LoginWithRememberResponse` 对象
     * 
     * @param username 用户名
     * @param password 密码
     * @param rememberMe 是否记住密码（true 时返回 refresh_token）
     * @returns 登录响应数据（已解包）
     */
    static async userLogin(
        username: string,
        password: string,
        rememberMe: boolean
    ): Promise<LoginWithRememberResponse> {
        const deviceFingerprint = await getDeviceFingerprint();
        const request: LoginWithRememberRequest = {
            username,
            password,
            remember_me: rememberMe,
            device_fingerprint: deviceFingerprint,
        };

        // 响应拦截器已自动解包 data 字段，直接返回业务数据
        const response = await apiClient.post<LoginWithRememberResponse>(
            '/auth/login',
            request
        );
        return response;
    }

    /**
     * 用户登录（原有方法，保持向后兼容）
     * @param username 用户名
     * @param password 密码
     * @returns 登录响应，包含 token 和过期时间
     */
    static async login(username: string, password: string): Promise<LoginResponse> {
        const request: LoginRequest = { username, password };
        const response = await apiClient.post<LoginResponse>('/auth/login', request);

        if (!response) {
            throw new Error('登录失败：服务器未返回有效数据');
        }

        return response;
    }
    /**
     * 管理员登录（支持"记住我"）
     * @param username 用户名
     * @param password 管理员密码
     * @param rememberMe 是否记住密码
     * @returns 登录响应，包含 token 和可选的 refresh_token
     */
    static async adminLoginWithRemember(
        username: string,
        password: string,
        rememberMe: boolean
    ): Promise<LoginWithRememberResponse> {
        const deviceFingerprint = await getDeviceFingerprint();
        const request: LoginWithRememberRequest = {
            username,
            password,
            remember_me: rememberMe,
            device_fingerprint: deviceFingerprint,
        };

        const response = await apiClient.post<LoginWithRememberResponse>(
            '/admin/login-remember',
            request
        );

        if (!response) {
            throw new Error('登录失败：服务器未返回有效数据');
        }

        return response;
    }

    /**
     * 管理员登录（原有方法，保持向后兼容）
     * @param username 用户名
     * @param password 管理员密码
     * @returns 登录响应，包含 token 和过期时间
     */
    static async adminLogin(username: string, password: string): Promise<AdminLoginResponse> {
        const request: AdminLoginRequest = { username, password };
        const response = await apiClient.post<AdminLoginResponse>('/admin/login', request);

        if (!response) {
            throw new Error('登录失败：服务器未返回有效数据');
        }

        return response;
    }

    /**
     * 使用 API Key 登录（支持"记住我"）
     * @param apiKey API Key 字符串
     * @param rememberMe 是否记住密码
     * @returns 登录响应，包含 token 和可选的 refresh_token
     */
    static async loginWithApiKeyAndRemember(
        apiKey: string,
        rememberMe: boolean
    ): Promise<LoginWithRememberResponse> {
        const deviceFingerprint = await getDeviceFingerprint();
        const request: LoginWithRememberRequest = {
            username: 'user',
            password: apiKey,
            remember_me: rememberMe,
            device_fingerprint: deviceFingerprint,
        };

        // 统一使用 /api/auth/login 接口
        const response = await apiClient.post<LoginWithRememberResponse>(
            '/auth/login',
            request
        );

        if (!response) {
            throw new Error('登录失败：服务器未返回有效数据');
        }

        return response;
    }

    /**
     * 使用 API Key 登录（获取 JWT Token）（原有方法，保持向后兼容）
     * @param apiKey API Key 字符串
     * @returns 登录响应，包含 token 和过期时间
     */
    static async loginWithApiKey(apiKey: string): Promise<AdminLoginResponse> {
        const request: AdminLoginRequest = {
            username: 'user',
            password: apiKey,
        };
        const response = await apiClient.post<AdminLoginResponse>('/auth/login', request);

        if (!response) {
            throw new Error('登录失败：服务器未返回有效数据');
        }

        return response;
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
     * 获取用户 API Key 详情
     * @returns API Key 详细信息
     */
    /**
         * 获取用户 API Key 详情
         * @returns API Key 详细信息
         */
    static async getUserApiKeyInfo(): Promise<APIKeyInfoResponse> {
        const response = await apiClient.get<APIKeyInfoResponse>('/user/apikey');

        if (!response) {
            throw new Error('获取 API Key 信息失败：服务器未返回有效数据');
        }

        return response;
    }

    /**
     * 解绑用户 API Key
     * 发送 DELETE 请求到 /user/apikey 以解除当前用户的 API Key 绑定
     * @returns Promise<void> 解绑成功时返回
     * @throws Error 当解绑失败时抛出错误
     */
    static async unbindApiKey(): Promise<void> {
        await apiClient.delete('/user/apikey');
    }


    /**
     * 获取 API Keys 列表（管理员权限）
     * @returns API Keys 数组
     */
    static async listApiKeys(): Promise<APIKeyInfo[]> {
        const response = await apiClient.get<{ keys: APIKeyInfo[] }>('/admin/keys');

        if (!response) {
            throw new Error('获取 API Keys 失败：服务器未返回有效数据');
        }

        // 后端返回的是 {keys: [...]}，需要提取 keys 字段
        return (response as any).keys || [];
    }

    /**
     * 获取 API Keys 分页列表（管理员权限）— 真实服务端分页
     * @param page 页码（从 1 开始）
     * @param size 每页条数
     * @param keyword 搜索关键词（可选）
     * @param status 状态筛选（enabled/disabled/pending/expired，可选）
     * @returns 分页数据 { keys, total, page, size }
     */
    static async listApiKeysPaginated(
        page: number,
        size: number,
        keyword?: string,
        status?: string
    ): Promise<{ keys: APIKeyInfo[]; total: number; page: number; size: number }> {
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('size', String(size));
        if (keyword) params.set('keyword', keyword);
        if (status) params.set('status', status);

        const response = await apiClient.get<{ keys: APIKeyInfo[]; total: number; page: number; size: number }>(
            `/admin/apikey/list?${params.toString()}`
        );

        if (!response) {
            throw new Error('获取 API Keys 失败：服务器未返回有效数据');
        }

        return response as any;
    }

    /**
     * 创建新的 API Key（管理员权限）
     * @param ttlHours 有效期（小时）
     * @param description 描述信息
     * @param dailySearchLimit 每日搜索次数限制（0表示不限制）
     * @returns 新创建的 API Key 信息
     */
    static async createApiKey(ttlHours: number, description: string, dailySearchLimit: number = 0): Promise<APIKeyInfo> {
        const request = {
            ttl_hours: ttlHours,
            description,
            daily_search_limit: dailySearchLimit,
        };

        const response = await apiClient.post<{ key: APIKeyInfo }>('/admin/keys', request);

        if (!response) {
            throw new Error('创建 API Key 失败：服务器未返回有效数据');
        }

        // 后端返回的是 {key: {...}}，需要提取 key 字段
        return (response as any).key;
    }

    /**
     * 删除指定的 API Key（管理员权限）
     * @param key API Key 字符串
     */
    static async deleteApiKey(key: string): Promise<void> {
        await apiClient.delete(`/admin/keys/${key}`);
    }

    /**
     * 更新 API Key 有效期和每日搜索限制（管理员权限）
     * @param key API Key 字符串
     * @param expiresAt 新的过期时间（ISO 8601 格式，可选）
     * @param extendHours 延长小时数（可选）
     * @param dailySearchLimit 每日搜索次数限制（可选）
     * @returns 更新后的 API Key 信息
     */
    static async updateApiKey(
        key: string,
        expiresAt?: string,
        extendHours?: number,
        dailySearchLimit?: number
    ): Promise<APIKeyInfo> {
        const request: UpdateAPIKeyRequest = {};

        if (expiresAt) {
            request.expires_at = expiresAt;
        }

        if (extendHours !== undefined) {
            request.extend_hours = extendHours;
        }

        if (dailySearchLimit !== undefined) {
            request.daily_search_limit = dailySearchLimit;
        }

        const response = await apiClient.patch<{ key: APIKeyInfo }>(`/admin/keys/${key}`, request);

        if (!response) {
            throw new Error('更新 API Key 失败：服务器未返回有效数据');
        }

        // 后端返回的是 {key: {...}}，需要提取 key 字段
        return (response as any).key;
    }

    /**
     * 更新 API Key 状态（启用/禁用）（管理员权限）
     * @param id API Key ID
     * @param isEnabled 是否启用
     */
    static async updateApiKeyStatus(id: number, isEnabled: boolean): Promise<void> {
        await apiClient.put(`/admin/apikey/${id}/status`, { is_enabled: isEnabled });
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

        if (!response) {
            throw new Error('批量延长失败：服务器未返回有效数据');
        }

        return response;
    }

    /**
     * 批量创建 API Key（管理员权限）
     * @param count 创建数量
     * @param ttlHours 有效期（小时）
     * @param descriptionPrefix 描述前缀（可选）
     * @param dailySearchLimit 每日搜索次数限制（0表示不限制）
     * @returns 批量创建结果
     */
    static async batchCreateApiKeys(
        count: number,
        ttlHours: number,
        descriptionPrefix?: string,
        dailySearchLimit: number = 0
    ): Promise<BatchCreateResult> {
        const request = {
            count,
            ttl_hours: ttlHours,
            description_prefix: descriptionPrefix,
            daily_search_limit: dailySearchLimit,
        };

        const response = await apiClient.post<BatchCreateResult>(
            '/admin/keys/batch-create',
            request
        );

        if (!response) {
            throw new Error('批量创建失败：服务器未返回有效数据');
        }

        return response;
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

        if (!response) {
            throw new Error('批量删除失败：服务器未返回有效数据');
        }

        return response;
    }

    /**
     * 使用刷新令牌获取新的访问令牌
     * @param refreshToken 刷新令牌
     * @returns 新的访问令牌和刷新令牌
     */
    static async refreshAccessToken(refreshToken: string): Promise<RefreshTokenResponse> {
        const deviceFingerprint = await getDeviceFingerprint();
        const request: RefreshTokenRequest = {
            refresh_token: refreshToken,
            device_fingerprint: deviceFingerprint,
        };

        const response = await apiClient.post<RefreshTokenResponse>('/auth/refresh', request);

        if (!response) {
            throw new Error('刷新令牌失败：服务器未返回有效数据');
        }

        return response;
    }

    /**
     * 撤销刷新令牌（用户登出）
     * @param refreshToken 刷新令牌
     */
    static async revokeRefreshToken(refreshToken: string): Promise<void> {
        const request: RevokeRefreshTokenRequest = {
            refresh_token: refreshToken,
        };

        await apiClient.post('/auth/revoke', request);
    }
}
