import axios from 'axios';
import type { AxiosInstance, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { ApiResponse } from '@/types/api';
import { useAuthStore } from '@/stores/authStore';
import { refreshAuthTokenSingleFlight } from '@/lib/authRefreshManager';

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
  skipAuthRefresh?: boolean;
};

const AUTH_ENDPOINTS_EXCLUDED_FROM_REFRESH = [
  '/auth/login',
  '/auth/login-legacy',
  '/auth/login-remember',
  '/auth/register',
  '/auth/refresh',
  '/auth/revoke',
  '/admin/login',
  '/admin/login-remember',
];

/**
 * API 客户端类
 */
class ApiClient {
  private instance: AxiosInstance;

  constructor() {
    this.instance = axios.create({
      baseURL: '/api',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  /**
   * 设置请求和响应拦截器
   */
  private setupInterceptors(): void {
    // 请求拦截器 - 注入认证信息
    this.instance.interceptors.request.use(
      (config) => {
        // 从 authStore 获取认证信息
        const authStore = useAuthStore.getState();

        // 添加 JWT Token（如果存在）
        if (authStore.token) {
          config.headers.Authorization = `Bearer ${authStore.token}`;
        }

        // 添加 API Key（如果存在）
        if (authStore.apiKey) {
          config.headers['X-API-Key'] = authStore.apiKey;
        }

        return config;
      },
      (error: AxiosError) => {
        return Promise.reject(error);
      }
    );

    // 响应拦截器 - 自动解包响应数据并处理错误
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => {
        // 检查是否为标准 API 响应格式 { code, message, data }
        if (
          response.data &&
          typeof response.data === 'object' &&
          'code' in response.data &&
          'message' in response.data
        ) {
          const apiResponse = response.data as ApiResponse;

          // 检查是否有弃用警告
          if (response.headers['x-deprecated-api'] === 'true') {
            const deprecationMessage = response.headers['x-deprecation-message'] || '此接口已弃用，请尽快迁移';
            console.warn(
              `[API Deprecated] ${response.config.method?.toUpperCase()} ${response.config.url} - ${deprecationMessage}`
            );
          }

          // 自动解包 data 字段，并保留 code 和 message 到 _meta 对象
          return {
            ...response,
            data: apiResponse.data,
            _meta: {
              code: apiResponse.code,
              message: apiResponse.message,
            },
          };
        }

        // 非标准格式，直接返回原始响应
        return response;
      },
      async (error: AxiosError<ApiResponse>) => {
        const originalRequest = error.config as RetryableRequestConfig | undefined;

        // 处理 401 未授权错误：先尝试刷新并重试一次，失败再登出
        if (error.response?.status === 401 && originalRequest) {
          const requestURL = this.normalizeRequestURL(originalRequest.url);
          const isExcludedAuthEndpoint = this.isExcludedAuthEndpoint(requestURL);
          const skipAuthRefresh = originalRequest.skipAuthRefresh === true;

          if (!isExcludedAuthEndpoint && !skipAuthRefresh && !originalRequest._retry) {
            const authStore = useAuthStore.getState();
            if (authStore.refreshToken) {
              originalRequest._retry = true;
              try {
                await refreshAuthTokenSingleFlight();

                const latestToken = useAuthStore.getState().token;
                if (latestToken) {
                  if (!originalRequest.headers) {
                    originalRequest.headers = {} as any;
                  }
                  (originalRequest.headers as any).Authorization = `Bearer ${latestToken}`;
                }

                return this.instance(originalRequest);
              } catch (refreshError) {
                // 刷新失败，走后续登出逻辑
              }
            }
          }

          // 登录相关接口 401 不触发全局登出
          if (!isExcludedAuthEndpoint) {
            const authStore = useAuthStore.getState();
            authStore.logout();

            // 跳转到登录页（避免在登录页和认证相关页面重复跳转）
            const currentPath = window.location.pathname;
            if (!currentPath.includes('/login') && !currentPath.includes('/auth')) {
              window.location.href = '/login';
            }
          }
        }

        // 从错误响应中提取 message 字段
        let errorMessage = this.handleError(error);
        if (error.response?.data && typeof error.response.data === 'object') {
          const apiError = error.response.data as ApiResponse;
          if (apiError.message) {
            errorMessage = apiError.message;
          }
        }

        // 返回标准化的错误响应
        return Promise.reject({
          code: error.response?.status || -1,
          message: errorMessage,
          data: error.response?.data,
        });
      }
    );
  }

  private normalizeRequestURL(url?: string): string {
    if (!url) {
      return '';
    }
    return url.startsWith('/api') ? url.slice(4) : url;
  }

  private isExcludedAuthEndpoint(url: string): boolean {
    return AUTH_ENDPOINTS_EXCLUDED_FROM_REFRESH.some((endpoint) =>
      url.startsWith(endpoint)
    );
  }

  /**
   * 统一错误处理
   */
  private handleError(error: AxiosError<ApiResponse>): string {
    if (error.response) {
      // 服务器响应错误
      const { status, data } = error.response;

      // 优先使用后端返回的错误消息
      if (data?.message) {
        return data.message;
      }

      // 如果后端没有返回消息，使用通用错误消息
      switch (status) {
        case 400:
          return '请求参数错误';
        case 401:
          return '未授权访问';
        case 403:
          return '禁止访问';
        case 404:
          return '请求的资源不存在';
        case 500:
          return '服务器内部错误';
        case 502:
          return '网关错误';
        case 503:
          return '服务暂不可用';
        default:
          return `请求失败 (${status})`;
      }
    } else if (error.request) {
      // 网络错误
      return '网络连接失败，请检查网络设置';
    } else {
      // 其他错误
      return error.message || '未知错误';
    }
  }

  /**
   * GET 请求
   * 注意：响应拦截器已自动解包 data 字段，此方法直接返回业务数据
   */
  async get<T = any>(url: string, config?: any): Promise<T> {
    const response = await this.instance.get<T>(url, config);
    return response.data;
  }

  /**
   * POST 请求
   * 注意：响应拦截器已自动解包 data 字段，此方法直接返回业务数据
   */
  async post<T = any>(url: string, data?: any): Promise<T> {
    const response = await this.instance.post<T>(url, data);
    return response.data;
  }

  /**
   * PUT 请求
   * 注意：响应拦截器已自动解包 data 字段，此方法直接返回业务数据
   */
  async put<T = any>(url: string, data?: any): Promise<T> {
    const response = await this.instance.put<T>(url, data);
    return response.data;
  }

  /**
   * PATCH 请求
   * 注意：响应拦截器已自动解包 data 字段，此方法直接返回业务数据
   */
  async patch<T = any>(url: string, data?: any): Promise<T> {
    const response = await this.instance.patch<T>(url, data);
    return response.data;
  }

  /**
   * DELETE 请求
   * 注意：响应拦截器已自动解包 data 字段，此方法直接返回业务数据
   */
  async delete<T = any>(url: string): Promise<T> {
    const response = await this.instance.delete<T>(url);
    return response.data;
  }

  /**
   * 获取原始 axios 实例（用于特殊需求）
   */
  getInstance(): AxiosInstance {
    return this.instance;
  }
}

// 导出单例实例
export const apiClient = new ApiClient();

// 导出便捷方法
export const { get, post, put, delete: del } = apiClient;
