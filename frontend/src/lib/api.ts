import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import type { ApiResponse } from '@/types/api';
import { useAuthStore } from '@/stores/authStore';

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

        // 优先使用 JWT Token
        if (authStore.token) {
          config.headers.Authorization = `Bearer ${authStore.token}`;
        }
        // 降级使用 API Key
        else if (authStore.apiKey) {
          config.headers['X-API-Key'] = authStore.apiKey;
        }

        // 添加请求日志（仅在开发环境）
        if (import.meta.env.DEV) {
          console.log('🚀 API Request:', config.method?.toUpperCase(), config.url, config.data);
        }
        return config;
      },
      (error: AxiosError) => {
        console.error('❌ Request Error:', error);
        return Promise.reject(error);
      }
    );

    // 响应拦截器 - 处理 401 错误
    this.instance.interceptors.response.use(
      (response: AxiosResponse<ApiResponse>) => {
        // 添加响应日志（仅在开发环境）
        if (import.meta.env.DEV) {
          console.log('✅ API Response:', response.config.url, response.data);
        }
        return response;
      },
      (error: AxiosError<ApiResponse>) => {
        // 处理 401 未授权错误
        if (error.response?.status === 401) {
          // 清除认证状态
          const authStore = useAuthStore.getState();
          authStore.logout();

          // 跳转到登录页（避免在登录页重复跳转）
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
        }

        // 统一错误处理
        const errorMessage = this.handleError(error);
        console.error('❌ API Error:', errorMessage);

        // 返回标准化的错误响应
        return Promise.reject({
          code: error.response?.status || -1,
          message: errorMessage,
          data: error.response?.data,
        });
      }
    );
  }

  /**
   * 统一错误处理
   */
  private handleError(error: AxiosError<ApiResponse>): string {
    if (error.response) {
      // 服务器响应错误
      const { status, data } = error.response;

      switch (status) {
        case 400:
          return data?.message || '请求参数错误';
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
          return data?.message || `请求失败 (${status})`;
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
   */
  async get<T = any>(url: string, params?: any): Promise<ApiResponse<T>> {
    const response = await this.instance.get<T>(url, { params });

    // 如果响应已经是目标类型，则包装成 ApiResponse 格式
    if (response.data && typeof response.data === 'object') {
      // 检查是否已经是 ApiResponse 格式
      if ('code' in response.data || 'message' in response.data) {
        return response.data as ApiResponse<T>;
      }

      // 否则包装成 ApiResponse 格式
      return {
        code: 200,
        message: 'success',
        data: response.data as T,
      } as ApiResponse<T>;
    }

    return response.data as ApiResponse<T>;
  }

  /**
   * POST 请求
   */
  async post<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    const response = await this.instance.post<T>(url, data);

    // 如果响应已经是目标类型（例如管理员登录直接返回 {token, expires_at}）
    // 则包装成 ApiResponse 格式
    if (response.data && typeof response.data === 'object') {
      // 检查是否已经是 ApiResponse 格式
      if ('code' in response.data || 'message' in response.data) {
        return response.data as ApiResponse<T>;
      }

      // 否则包装成 ApiResponse 格式
      return {
        code: 200,
        message: 'success',
        data: response.data as T,
      } as ApiResponse<T>;
    }

    return response.data as ApiResponse<T>;
  }

  /**
   * PUT 请求
   */
  async put<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    const response = await this.instance.put<ApiResponse<T>>(url, data);
    return response.data;
  }

  /**
   * DELETE 请求
   */
  async delete<T = any>(url: string): Promise<ApiResponse<T>> {
    const response = await this.instance.delete<T>(url);

    // 如果响应已经是目标类型，则包装成 ApiResponse 格式
    if (response.data && typeof response.data === 'object') {
      // 检查是否已经是 ApiResponse 格式
      if ('code' in response.data || 'message' in response.data) {
        return response.data as ApiResponse<T>;
      }

      // 否则包装成 ApiResponse 格式
      return {
        code: 200,
        message: 'success',
        data: response.data as T,
      } as ApiResponse<T>;
    }

    return response.data as ApiResponse<T>;
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