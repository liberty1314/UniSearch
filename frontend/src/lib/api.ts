import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import type { ApiResponse } from '@/types/api';

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
    // 请求拦截器
    this.instance.interceptors.request.use(
      (config) => {
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

    // 响应拦截器
    this.instance.interceptors.response.use(
      (response: AxiosResponse<ApiResponse>) => {
        // 添加响应日志（仅在开发环境）
        if (import.meta.env.DEV) {
          console.log('✅ API Response:', response.config.url, response.data);
        }
        return response;
      },
      (error: AxiosError<ApiResponse>) => {
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
    const response = await this.instance.get<ApiResponse<T>>(url, { params });
    return response.data;
  }

  /**
   * POST 请求
   */
  async post<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    const response = await this.instance.post<ApiResponse<T>>(url, data);
    return response.data;
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
    const response = await this.instance.delete<ApiResponse<T>>(url);
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