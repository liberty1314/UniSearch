import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminUsersView from '@/components/admin/AdminUsersView';

const { useAdminUsersMock } = vi.hoisted(() => ({
  useAdminUsersMock: vi.fn(),
}));

vi.mock('@/hooks/useAdminUsers', () => ({
  useAdminUsers: () => useAdminUsersMock(),
}));

vi.mock('@/components/admin/AppleUserTable', () => ({
  AppleUserTable: () => <div>用户表格</div>,
}));

vi.mock('@/components/admin/ApplePagination', () => ({
  ApplePagination: () => <div>分页</div>,
}));

vi.mock('@/components/admin/TableFilterDropdown', () => ({
  TableFilterDropdown: () => <div>筛选</div>,
}));

vi.mock('@/components/ui/confirm-dialog', () => ({
  ConfirmDialog: () => null,
}));

vi.mock('@/components/admin/BatchDeleteDialog', () => ({
  BatchDeleteDialog: () => null,
}));

vi.mock('@/components/admin/BatchUpdateRoleDialog', () => ({
  BatchUpdateRoleDialog: () => null,
}));

vi.mock('@/components/admin/CreateUserDialog', () => ({
  CreateUserDialog: () => null,
}));

vi.mock('@/components/admin/EditUserDialog', () => ({
  EditUserDialog: () => null,
}));

vi.mock('@/components/admin/ResetPasswordDialog', () => ({
  ResetPasswordDialog: () => null,
}));

describe('AdminUsersView', () => {
  beforeEach(() => {
    useAdminUsersMock.mockReturnValue({
      users: [],
      isLoadingUsers: false,
      isDeletingUser: false,
      isBatchOperating: false,
      selectedUsers: new Set(),
      userSearchInput: '',
      userRoleFilter: [],
      roleFilterOptions: [],
      hasUserFilters: false,
      currentPage: 1,
      totalPages: 1,
      totalUsers: 12,
      pageSize: 10,
      handlePageSizeChange: vi.fn(),
      handleUserSearchInputChange: vi.fn(),
      handleUserSearchSubmit: vi.fn(),
      setUserRoleFilter: vi.fn(),
      loadUsers: vi.fn(),
      handleCreateUser: vi.fn(),
      handleBatchUpdateRole: vi.fn(),
      handleBatchDeleteUsers: vi.fn(),
      handleClearUserSelection: vi.fn(),
      handleSelectUser: vi.fn(),
      handleEditUser: vi.fn(),
      handleResetPassword: vi.fn(),
      handleDeleteUser: vi.fn(),
      handleToggleStatus: vi.fn(),
      handlePageChange: vi.fn(),
      getCurrentUserId: () => 0,
      getUserStats: () => ({
        total: 12,
        monthNew: 4,
        sevenDayActive: 7,
        inactive30Day: 2,
      }),
      activeDialog: null,
      closeDialog: vi.fn(),
      handleUserOperationSuccess: vi.fn(),
      userToEdit: null,
      userToResetPassword: null,
      userToDelete: null,
      setUserToDelete: vi.fn(),
      handleDeleteUserConfirm: vi.fn(),
    });
  });

  it('展示用户行为统计卡片并移除启用状态和角色数量卡片', () => {
    render(<AdminUsersView />);

    expect(screen.getByText('总用户数量')).toBeInTheDocument();
    expect(screen.getByText('本月新增')).toBeInTheDocument();
    expect(screen.getByText('近 7 日活跃')).toBeInTheDocument();
    expect(screen.getByText('30 日沉默')).toBeInTheDocument();
    expect(screen.queryByText('今日活跃')).not.toBeInTheDocument();
    expect(screen.queryByText('活跃用户')).not.toBeInTheDocument();
    expect(screen.queryByText('禁用用户')).not.toBeInTheDocument();
    expect(screen.queryByText('管理员数量')).not.toBeInTheDocument();
  });
});
