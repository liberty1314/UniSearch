import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Admin from '@/pages/Admin';

vi.mock('@/hooks/useAdminPageController', () => ({
  useAdminPageController: () => ({
    currentView: 'api-keys',
    setCurrentView: vi.fn(),
    apiKeys: {
      totalApiKeys: 0,
      pagedApiKeys: [],
      isLoadingKeys: false,
      isDeleting: false,
      isBatchOperating: false,
      apiKeyCurrentPage: 1,
      apiKeyPageSize: 10,
      apiKeyTotalPages: 1,
      selectedKeys: new Set(),
      apiKeySearchInput: '',
      statusFilter: '',
      availableStatusOptions: [],
      hasAnyFilter: false,
      isKeyExpired: vi.fn(() => false),
      handleApiKeySearchInputChange: vi.fn(),
      handleApiKeySearchSubmit: vi.fn(),
      setStatusFilter: vi.fn(),
      handleClearAllFilters: vi.fn(),
      loadApiKeys: vi.fn(),
      handleOpenBatchCreate: vi.fn(),
      setIsCreateDialogOpen: vi.fn(),
      handleBatchExtend: vi.fn(),
      handleBatchDelete: vi.fn(),
      handleBatchExport: vi.fn(),
      handleClearSelection: vi.fn(),
      handleSelectKey: vi.fn(),
      handleSelectAll: vi.fn(),
      handleCopyKey: vi.fn(),
      handleEditClick: vi.fn(),
      handleDeleteClick: vi.fn(),
      handleToggleApiKeyStatus: vi.fn(),
      handleApiKeyPageChange: vi.fn(),
      handleApiKeyPageSizeChange: vi.fn(),
      isCreateDialogOpen: false,
      handleCreateSuccess: vi.fn(),
      keyToEdit: null,
      isEditDialogOpen: false,
      setIsEditDialogOpen: vi.fn(),
      handleEditSuccess: vi.fn(),
      isBatchExtendDialogOpen: false,
      setIsBatchExtendDialogOpen: vi.fn(),
      handleBatchExtendSuccess: vi.fn(),
      isBatchCreateDialogOpen: false,
      setIsBatchCreateDialogOpen: vi.fn(),
      handleBatchCreateSuccess: vi.fn(),
      isBatchDeleteDialogOpen: false,
      setIsBatchDeleteDialogOpen: vi.fn(),
      handleBatchDeleteSuccess: vi.fn(),
      isBatchExportDialogOpen: false,
      setIsBatchExportDialogOpen: vi.fn(),
      deleteDialogOpen: true,
      setDeleteDialogOpen: vi.fn(),
      handleDeleteConfirm: vi.fn(),
    },
    users: {
      users: [{ id: 1, username: 'alice', role: 'user' }],
      getUserStats: vi.fn(() => []),
      selectedUsers: new Set(),
      isLoadingUsers: false,
      isDeletingUser: false,
      isBatchOperatingUsers: false,
      userSearchInput: '',
      userRoleFilter: '',
      roleFilterOptions: [],
      hasUserFilters: false,
      currentPage: 1,
      totalPages: 1,
      totalUsers: 0,
      pageSize: 10,
      getCurrentUserId: vi.fn(() => ''),
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
      isCreateUserDialogOpen: false,
      setIsCreateUserDialogOpen: vi.fn(),
      handleUserOperationSuccess: vi.fn(),
      userToEdit: null,
      isEditUserDialogOpen: false,
      setIsEditUserDialogOpen: vi.fn(),
      userToResetPassword: null,
      isResetPasswordDialogOpen: false,
      setIsResetPasswordDialogOpen: vi.fn(),
      userToDelete: { id: 1, username: 'alice', role: 'user' },
      deleteUserDialogOpen: false,
      setDeleteUserDialogOpen: vi.fn(),
      handleDeleteUserConfirm: vi.fn(),
      isBatchDeleteUsersDialogOpen: false,
      setIsBatchDeleteUsersDialogOpen: vi.fn(),
      handleBatchDeleteUsersSuccess: vi.fn(),
      isBatchUpdateRoleDialogOpen: false,
      setIsBatchUpdateRoleDialogOpen: vi.fn(),
      handleBatchUpdateRoleSuccess: vi.fn(),
    },
  }),
}));

vi.mock('@/components/admin/Sidebar', () => ({
  Sidebar: () => <div>Sidebar</div>,
}));

vi.mock('@/components/admin/SystemInfoView', () => ({
  SystemInfoView: () => <div>SystemInfoView</div>,
}));

vi.mock('@/components/admin/SystemSettingsView', () => ({
  SystemSettingsView: () => <div>SystemSettingsView</div>,
}));

vi.mock('@/components/admin/AnnouncementManagement', () => ({
  AnnouncementManagement: () => <div>AnnouncementManagement</div>,
}));

vi.mock('@/components/admin/AdminApiKeysView', () => ({
  default: () => <div>AdminApiKeysView</div>,
}));

vi.mock('@/components/admin/AdminUsersView', () => ({
  default: () => <div>AdminUsersView</div>,
}));

vi.mock('@/components/CreateKeyDialog', () => ({
  CreateKeyDialog: () => null,
}));

vi.mock('@/components/admin/EditKeyDialog', () => ({
  EditKeyDialog: () => null,
}));

vi.mock('@/components/admin/BatchExtendDialog', () => ({
  BatchExtendDialog: () => null,
}));

vi.mock('@/components/admin/BatchCreateDialog', () => ({
  BatchCreateDialog: () => null,
}));

vi.mock('@/components/admin/BatchDeleteKeysDialog', () => ({
  BatchDeleteKeysDialog: () => null,
}));

vi.mock('@/components/admin/BatchExportDialog', () => ({
  BatchExportDialog: () => null,
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

vi.mock('@/components/ui/confirm-dialog', () => ({
  ConfirmDialog: ({ title }: { title: string }) => <div data-testid="confirm-dialog">{title}</div>,
}));

vi.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogAction: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  AlertDialogCancel: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('Admin', () => {
  it('uses a pure white light page background', () => {
    const { container } = render(<Admin />);

    expect(container.firstChild).toHaveClass('bg-white');
    expect(container.firstChild).not.toHaveClass('from-gray-50');
    expect(container.firstChild).not.toHaveClass('dark:to-nebula-950/20');
  });

  it('routes simple delete confirmations through the shared ConfirmDialog entry', () => {
    render(<Admin />);

    expect(screen.getAllByTestId('confirm-dialog')).toHaveLength(2);
    expect(screen.getByText('确认删除')).toBeInTheDocument();
    expect(screen.getByText('确认删除用户')).toBeInTheDocument();
  });
});
