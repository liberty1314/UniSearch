import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CreateKeyDialog } from '@/components/CreateKeyDialog';
import { EditKeyDialog } from '@/components/admin/EditKeyDialog';
import { BatchExtendDialog } from '@/components/admin/BatchExtendDialog';
import { BatchCreateDialog } from '@/components/admin/BatchCreateDialog';
import { BatchDeleteKeysDialog } from '@/components/admin/BatchDeleteKeysDialog';
import { BatchExportDialog } from '@/components/admin/BatchExportDialog';
import { BatchDeleteDialog as BatchDeleteUsersDialog } from '@/components/admin/BatchDeleteDialog';
import { BatchUpdateRoleDialog } from '@/components/admin/BatchUpdateRoleDialog';
import { CreateUserDialog } from '@/components/admin/CreateUserDialog';
import { EditUserDialog } from '@/components/admin/EditUserDialog';
import { ResetPasswordDialog } from '@/components/admin/ResetPasswordDialog';
import { Sidebar } from '@/components/admin/Sidebar';
import { SystemInfoView } from '@/components/admin/SystemInfoView';
import { SystemSettingsView } from '@/components/admin/SystemSettingsView';
import { AnnouncementManagement } from '@/components/admin/AnnouncementManagement';
import AdminApiKeysView, { type AdminApiKeysViewModel } from '@/components/admin/AdminApiKeysView';
import AdminUsersView, { type AdminUsersViewModel } from '@/components/admin/AdminUsersView';
import { useAdminPageController } from '@/hooks/useAdminPageController';

const Admin: React.FC = () => {
  const { currentView, setCurrentView, apiKeys, users } = useAdminPageController();

  const apiKeysViewModel: AdminApiKeysViewModel = {
    totalApiKeys: apiKeys.totalApiKeys,
    pagedApiKeys: apiKeys.pagedApiKeys,
    isLoadingKeys: apiKeys.isLoadingKeys,
    isDeleting: apiKeys.isDeleting,
    isBatchOperating: apiKeys.isBatchOperating,
    apiKeyCurrentPage: apiKeys.apiKeyCurrentPage,
    apiKeyPageSize: apiKeys.apiKeyPageSize,
    apiKeyTotalPages: apiKeys.apiKeyTotalPages,
    selectedKeys: apiKeys.selectedKeys,
    apiKeySearchInput: apiKeys.apiKeySearchInput,
    statusFilter: apiKeys.statusFilter,
    availableStatusOptions: apiKeys.availableStatusOptions,
    hasAnyFilter: apiKeys.hasAnyFilter,
    isKeyExpired: apiKeys.isKeyExpired,
    onApiKeySearchInputChange: apiKeys.handleApiKeySearchInputChange,
    onApiKeySearchSubmit: apiKeys.handleApiKeySearchSubmit,
    onStatusFilterChange: (values) => apiKeys.setStatusFilter(values[values.length - 1] ?? ''),
    onClearAllFilters: apiKeys.handleClearAllFilters,
    onRefresh: () => void apiKeys.loadApiKeys(),
    onOpenBatchCreate: apiKeys.handleOpenBatchCreate,
    onOpenCreateKey: () => apiKeys.setIsCreateDialogOpen(true),
    onBatchExtend: apiKeys.handleBatchExtend,
    onBatchDelete: apiKeys.handleBatchDelete,
    onBatchExport: apiKeys.handleBatchExport,
    onClearSelection: apiKeys.handleClearSelection,
    onSelectKey: apiKeys.handleSelectKey,
    onSelectAll: apiKeys.handleSelectAll,
    onCopyKey: (key) => void apiKeys.handleCopyKey(key),
    onEditClick: apiKeys.handleEditClick,
    onDeleteClick: apiKeys.handleDeleteClick,
    onToggleStatus: (key, isEnabled) => void apiKeys.handleToggleApiKeyStatus(key, isEnabled),
    onPageChange: apiKeys.handleApiKeyPageChange,
    onPageSizeChange: apiKeys.handleApiKeyPageSizeChange,
  };

  const usersViewModel: AdminUsersViewModel = {
    users: users.users,
    userStats: users.getUserStats(),
    selectedUsers: users.selectedUsers,
    isLoadingUsers: users.isLoadingUsers,
    isDeletingUser: users.isDeletingUser,
    isBatchOperatingUsers: users.isBatchOperatingUsers,
    userSearchInput: users.userSearchInput,
    userRoleFilter: users.userRoleFilter,
    roleFilterOptions: [...users.roleFilterOptions],
    hasUserFilters: users.hasUserFilters,
    currentPage: users.currentPage,
    totalPages: users.totalPages,
    totalUsers: users.totalUsers,
    pageSize: users.pageSize,
    currentUserId: users.getCurrentUserId(),
    onUserSearchInputChange: users.handleUserSearchInputChange,
    onUserSearchSubmit: users.handleUserSearchSubmit,
    onUserRoleFilterChange: users.setUserRoleFilter,
    onRefresh: () => void users.loadUsers(),
    onCreateUser: users.handleCreateUser,
    onBatchUpdateRole: users.handleBatchUpdateRole,
    onBatchDeleteUsers: users.handleBatchDeleteUsers,
    onClearUserSelection: users.handleClearUserSelection,
    onSelectUser: users.handleSelectUser,
    onEditUser: users.handleEditUser,
    onResetPassword: users.handleResetPassword,
    onDeleteUser: users.handleDeleteUser,
    onToggleStatus: (userId, isEnabled) => void users.handleToggleStatus(userId, isEnabled),
    onPageChange: users.handlePageChange,
  };

  return (
    <div className="fixed inset-0 top-16 flex w-full bg-white dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-950 dark:to-cyan-950/20">
      <div className="hidden lg:block flex-shrink-0 w-[288px]" />

      <Sidebar currentView={currentView} onViewChange={setCurrentView} />

      <div className="flex-1 h-full overflow-y-auto">
        <div className="container mx-auto px-4 py-6 space-y-6 lg:px-8 lg:py-8">
          {currentView === 'api-keys' && (
            <AdminApiKeysView viewModel={apiKeysViewModel} />
          )}

          {currentView === 'user-management' && (
            <AdminUsersView viewModel={usersViewModel} />
          )}

          {currentView === 'system-info' && <SystemInfoView />}
          {currentView === 'system-settings' && <SystemSettingsView />}
          {currentView === 'announcement-management' && <AnnouncementManagement />}
        </div>
      </div>

      <CreateKeyDialog
        open={apiKeys.isCreateDialogOpen}
        onOpenChange={apiKeys.setIsCreateDialogOpen}
        onSuccess={apiKeys.handleCreateSuccess}
      />

      {apiKeys.keyToEdit && (
        <EditKeyDialog
          open={apiKeys.isEditDialogOpen}
          onOpenChange={apiKeys.setIsEditDialogOpen}
          apiKey={apiKeys.keyToEdit}
          onSuccess={apiKeys.handleEditSuccess}
        />
      )}

      <BatchExtendDialog
        open={apiKeys.isBatchExtendDialogOpen}
        onOpenChange={(open) => {
          apiKeys.setIsBatchExtendDialogOpen(open);
          if (!open) {
            apiKeys.setIsBatchOperating(false);
          }
        }}
        selectedKeys={Array.from(apiKeys.selectedKeys)}
        onSuccess={apiKeys.handleBatchExtendSuccess}
      />

      <BatchCreateDialog
        open={apiKeys.isBatchCreateDialogOpen}
        onOpenChange={(open) => {
          apiKeys.setIsBatchCreateDialogOpen(open);
          if (!open) {
            apiKeys.setIsBatchOperating(false);
          }
        }}
        onSuccess={apiKeys.handleBatchCreateSuccess}
      />

      <BatchDeleteKeysDialog
        open={apiKeys.isBatchDeleteDialogOpen}
        onOpenChange={(open) => {
          apiKeys.setIsBatchDeleteDialogOpen(open);
          if (!open) {
            apiKeys.setIsBatchOperating(false);
          }
        }}
        selectedKeys={Array.from(apiKeys.selectedKeys)}
        onSuccess={apiKeys.handleBatchDeleteSuccess}
      />

      <BatchExportDialog
        open={apiKeys.isBatchExportDialogOpen}
        onOpenChange={apiKeys.setIsBatchExportDialogOpen}
        selectedKeys={apiKeys.pagedApiKeys.filter((key) => apiKeys.selectedKeys.has(key.key))}
      />

      <AlertDialog open={apiKeys.deleteDialogOpen} onOpenChange={apiKeys.setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              您确定要删除这个 API Key 吗？此操作无法撤销，使用该 Key 的用户将无法继续访问系统。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={apiKeys.isDeleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void apiKeys.handleDeleteConfirm()}
              disabled={apiKeys.isDeleting}
              className="bg-red-500 hover:bg-red-600"
            >
              {apiKeys.isDeleting ? '删除中...' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CreateUserDialog
        open={users.isCreateUserDialogOpen}
        onOpenChange={users.setIsCreateUserDialogOpen}
        onSuccess={users.handleUserOperationSuccess}
      />

      {users.userToEdit && (
        <EditUserDialog
          open={users.isEditUserDialogOpen}
          onOpenChange={users.setIsEditUserDialogOpen}
          user={users.userToEdit}
          onSuccess={users.handleUserOperationSuccess}
        />
      )}

      {users.userToResetPassword && (
        <ResetPasswordDialog
          open={users.isResetPasswordDialogOpen}
          onOpenChange={users.setIsResetPasswordDialogOpen}
          user={users.userToResetPassword}
          onSuccess={users.handleUserOperationSuccess}
        />
      )}

      <AlertDialog open={users.userToDelete !== null} onOpenChange={(open) => !open && users.setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除用户</AlertDialogTitle>
            <AlertDialogDescription>
              您确定要删除这个用户吗？此操作无法撤销，该用户将无法继续访问系统。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={users.isDeletingUser}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void users.handleDeleteUserConfirm()}
              disabled={users.isDeletingUser}
              className="bg-red-500 hover:bg-red-600"
            >
              {users.isDeletingUser ? '删除中...' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BatchDeleteUsersDialog
        open={users.isBatchDeleteUsersDialogOpen}
        onOpenChange={(open) => {
          users.setIsBatchDeleteUsersDialogOpen(open);
          if (!open) {
            users.setIsBatchOperatingUsers(false);
          }
        }}
        users={users.users.filter((u) => users.selectedUsers.has(u.id))}
        onSuccess={users.handleUserOperationSuccess}
      />

      <BatchUpdateRoleDialog
        open={users.isBatchUpdateRoleDialogOpen}
        onOpenChange={(open) => {
          users.setIsBatchUpdateRoleDialogOpen(open);
          if (!open) {
            users.setIsBatchOperatingUsers(false);
          }
        }}
        users={users.users.filter((u) => users.selectedUsers.has(u.id))}
        onSuccess={users.handleUserOperationSuccess}
      />
    </div>
  );
};

export default Admin;
