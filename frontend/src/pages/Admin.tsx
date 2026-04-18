import React from "react";
import { motion } from "framer-motion";
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
import {
  ADMIN_CONTENT_WRAPPER_CLASSES,
  ADMIN_PAGE_BACKDROP_CLASSES,
  ADMIN_PAGE_SHELL_CLASSES,
} from "@/components/admin/adminDesign";
import { cn } from "@/lib/utils";

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
    <div className={cn(ADMIN_PAGE_SHELL_CLASSES, "fixed inset-0 top-16 overflow-hidden")}>
      <div className={ADMIN_PAGE_BACKDROP_CLASSES} />

      <div className="relative flex h-full w-full">
        <Sidebar currentView={currentView} onViewChange={setCurrentView} />

        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto lg:pl-[300px]">
          <div className={ADMIN_CONTENT_WRAPPER_CLASSES}>
            <div className="min-w-0 flex-1 space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12, duration: 0.5, ease: "easeOut" }}
                className="space-y-6"
              >
                {currentView === "user_management" && (
                  <AdminUsersView viewModel={usersViewModel} />
                )}

                {currentView === "system_info" && <SystemInfoView />}
                {currentView === "system_settings" && <SystemSettingsView />}
                {currentView === "announcement_management" && (
                  <AnnouncementManagement />
                )}
              </motion.div>
            </div>
          </div>
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
