import { apiClient } from '../lib/api';
import type {
  ListUsersRequest,
  ListUsersResponse,
  AdminUserStats,
  UserInfo,
  CreateUserRequest,
  CreateUserResponse,
  UpdateUserRequest,
  ResetPasswordRequest,
  SetUserStatusRequest,
  BatchDeleteUsersRequest,
  BatchUpdateRoleRequest,
  BatchUserOperationResult,
  SuccessResponse,
} from '../types/api';

/**
 * 用户管理服务
 */
export class UserService {
  /**
   * 获取用户列表
   */
  static async listUsers(
    page: number = 1,
    pageSize: number = 20,
    keyword?: string,
    role?: 'admin' | 'user'
  ): Promise<ListUsersResponse> {
    const params: ListUsersRequest = {
      page,
      page_size: pageSize,
    };

    if (keyword) {
      params.keyword = keyword;
    }

    if (role) {
      params.role = role;
    }

    const response = await apiClient.get<ListUsersResponse>('/admin/users', { params });
    return response;
  }

  /**
   * 获取用户管理统计摘要
   */
  static async getUserStats(): Promise<AdminUserStats> {
    const response = await apiClient.get<AdminUserStats>('/admin/users/stats');
    return response;
  }

  /**
   * 获取单个用户
   */
  static async getUser(userId: number): Promise<UserInfo> {
    const response = await apiClient.get<UserInfo>(`/admin/users/${userId}`);
    return response;
  }

  /**
   * 创建用户
   */
  static async createUser(
    username: string,
    password: string,
    role: 'admin' | 'user',
    restoreIfDeleted: boolean = false
  ): Promise<CreateUserResponse> {
    const data: CreateUserRequest = {
      username,
      password,
      role,
      restore_if_deleted: restoreIfDeleted,
    };

    const response = await apiClient.post<CreateUserResponse>('/admin/users', data);
    return response;
  }

  /**
   * 更新用户
   */
  static async updateUser(
    userId: number,
    username: string,
    role: 'admin' | 'user'
  ): Promise<UserInfo> {
    const data: UpdateUserRequest = {
      username,
      role,
    };

    const response = await apiClient.put<UserInfo>(`/admin/users/${userId}`, data);
    return response;
  }

  /**
   * 重置密码
   */
  static async resetPassword(userId: number, newPassword: string): Promise<void> {
    const data: ResetPasswordRequest = {
      password: newPassword,
    };

    await apiClient.post<SuccessResponse>(`/admin/users/${userId}/reset-password`, data);
  }

  /**
   * 删除用户
   */
  static async deleteUser(userId: number): Promise<void> {
    await apiClient.delete<SuccessResponse>(`/admin/users/${userId}`);
  }

  /**
   * 设置用户状态
   */
  static async setUserStatus(userId: number, isEnabled: boolean): Promise<void> {
    const data: SetUserStatusRequest = {
      is_enabled: isEnabled,
    };

    await apiClient.post<SuccessResponse>(`/admin/users/${userId}/status`, data);
  }

  /**
   * 批量删除用户
   */
  static async batchDeleteUsers(userIds: number[]): Promise<BatchUserOperationResult> {
    const data: BatchDeleteUsersRequest = {
      user_ids: userIds,
    };

    const response = await apiClient.post<BatchUserOperationResult>(
      '/admin/users/batch-delete',
      data
    );
    return response;
  }

  /**
   * 批量修改角色
   */
  static async batchUpdateRole(
    userIds: number[],
    role: 'admin' | 'user'
  ): Promise<BatchUserOperationResult> {
    const data: BatchUpdateRoleRequest = {
      user_ids: userIds,
      role,
    };

    const response = await apiClient.post<BatchUserOperationResult>(
      '/admin/users/batch-update-role',
      data
    );
    return response;
  }
}
