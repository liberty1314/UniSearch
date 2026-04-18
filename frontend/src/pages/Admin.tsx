import React from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { BatchDeleteDialog as BatchDeleteUsersDialog } from "@/components/admin/BatchDeleteDialog";
import { BatchUpdateRoleDialog } from "@/components/admin/BatchUpdateRoleDialog";
import { CreateUserDialog } from "@/components/admin/CreateUserDialog";
import { EditUserDialog } from "@/components/admin/EditUserDialog";
import { ResetPasswordDialog } from "@/components/admin/ResetPasswordDialog";
import { Sidebar } from "@/components/admin/Sidebar";
import { SystemInfoView } from "@/components/admin/SystemInfoView";
import { SystemSettingsView } from "@/components/admin/SystemSettingsView";
import { AnnouncementManagement } from "@/components/admin/AnnouncementManagement";
import AdminUsersView, {
  type AdminUsersViewModel,
} from "@/components/admin/AdminUsersView";
import { useAdminPageController } from "@/hooks/useAdminPageController";

const Admin: React.FC = () => {
  const { currentView, setCurrentView, users } = useAdminPageController();

  const usersViewModel: AdminUsersViewModel = {
    users: users.users,
    userStats: users.getUserStats(),
    selectedUsers: users.selectedUsers,
    isLoadingUsers: users.isLoadingUsers,
    isDeletingUser: users.isDeletingUser,
    isBatchOperatingUsers: users.isBatchOperating,
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
    onToggleStatus: (userId, isEnabled) =>
      void users.handleToggleStatus(userId, isEnabled),
    onPageChange: users.handlePageChange,
  };

  return (
    <div className="obsidian-shell fixed inset-0 top-16 flex w-full bg-white">
      <div className="hidden lg:block flex-shrink-0 w-[288px]" />

      <Sidebar currentView={currentView} onViewChange={setCurrentView} />

      <div className="flex-1 h-full overflow-y-auto">
        <div className="container mx-auto px-4 py-6 space-y-6 lg:px-8 lg:py-8">
          {currentView === "user_management" && (
            <AdminUsersView viewModel={usersViewModel} />
          )}

          {currentView === "system_info" && <SystemInfoView />}
          {currentView === "system_settings" && <SystemSettingsView />}
          {currentView === "announcement_management" && (
            <AnnouncementManagement />
          )}
        </div>
      </div>

      <CreateUserDialog
        open={users.activeDialog === "create-user"}
        onOpenChange={(open) => !open && users.closeDialog()}
        onSuccess={users.handleUserOperationSuccess}
      />

      {users.userToEdit && (
        <EditUserDialog
          open={users.activeDialog === "edit-user"}
          onOpenChange={(open) => !open && users.closeDialog()}
          user={users.userToEdit}
          onSuccess={users.handleUserOperationSuccess}
        />
      )}

      {users.userToResetPassword && (
        <ResetPasswordDialog
          open={users.activeDialog === "reset-password"}
          onOpenChange={(open) => !open && users.closeDialog()}
          user={users.userToResetPassword}
          onSuccess={users.handleUserOperationSuccess}
        />
      )}

      <ConfirmDialog
        open={users.userToDelete !== null}
        onOpenChange={(open) => !open && users.setUserToDelete(null)}
        title="确认删除用户"
        description="您确定要删除这个用户吗？此操作无法撤销，该用户将无法继续访问系统。"
        confirmText={users.isDeletingUser ? "删除中..." : "确认删除"}
        variant="destructive"
        onConfirm={() => void users.handleDeleteUserConfirm()}
        isLoading={users.isDeletingUser}
      />

      <BatchDeleteUsersDialog
        open={users.activeDialog === "batch-delete"}
        onOpenChange={(open) => !open && users.closeDialog()}
        users={users.users.filter((u) => users.selectedUsers.has(u.id))}
        onSuccess={users.handleUserOperationSuccess}
      />

      <BatchUpdateRoleDialog
        open={users.activeDialog === "batch-update-role"}
        onOpenChange={(open) => !open && users.closeDialog()}
        users={users.users.filter((u) => users.selectedUsers.has(u.id))}
        onSuccess={users.handleUserOperationSuccess}
      />
    </div>
  );
};

export default Admin;
