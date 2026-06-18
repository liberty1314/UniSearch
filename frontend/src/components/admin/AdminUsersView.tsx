import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Filter, Plus, RefreshCw, Search, Shield, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

import { TableFilterDropdown } from './TableFilterDropdown';
import { AppleUserTable } from './AppleUserTable';
import { ApplePagination } from './ApplePagination';
import { useAdminUsers } from '@/hooks/useAdminUsers';

import {
  AdminContentCard,
  AdminMetricCard,
  AdminMetricGrid,
} from './AdminWorkspacePageFrame';

// Dialog Components
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { BatchDeleteDialog as BatchDeleteUsersDialog } from "@/components/admin/BatchDeleteDialog";
import { BatchUpdateRoleDialog } from "@/components/admin/BatchUpdateRoleDialog";
import { CreateUserDialog } from "@/components/admin/CreateUserDialog";
import { EditUserDialog } from "@/components/admin/EditUserDialog";
import { ResetPasswordDialog } from "@/components/admin/ResetPasswordDialog";

import {
  ADMIN_PANEL_SURFACE_HOVER_CLASSES,
  ADMIN_HOVERABLE_BUTTON_CLASSES,
} from '@/components/admin/adminDesign';

import { type Variants } from 'framer-motion';

const countPillClassName =
  'inline-flex items-center gap-2 rounded-full border-[0.5px] border-slate-200/50 bg-white/40 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm backdrop-blur-md dark:border-cyan-300/[0.14] dark:bg-slate-950/[0.48] dark:text-slate-200';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

const AdminUsersView: React.FC = () => {
  const usersCtrl = useAdminUsers();

  const {
    users,
    isLoadingUsers,
    isDeletingUser,
    isBatchOperating,
    selectedUsers,
    userSearchInput,
    userRoleFilter,
    roleFilterOptions,
    hasUserFilters,
    currentPage,
    totalPages,
    totalUsers,
    pageSize,
    handlePageSizeChange,
    handleUserSearchInputChange,
    handleUserSearchSubmit,
    setUserRoleFilter,
    loadUsers,
    handleCreateUser,
    handleBatchUpdateRole,
    handleBatchDeleteUsers,
    handleClearUserSelection,
    handleSelectUser,
    handleEditUser,
    handleResetPassword,
    handleDeleteUser,
    handleToggleStatus,
    handlePageChange,
    getCurrentUserId,
    getUserStats,

    // Dialog Props
    activeDialog,
    closeDialog,
    handleUserOperationSuccess,
    userToEdit,
    userToResetPassword,
    userToDelete,
    setUserToDelete,
    handleDeleteUserConfirm
  } = usersCtrl;

  const userStats = getUserStats();
  const currentUserId = getCurrentUserId();

  return (
    <>
      <motion.div
        initial="hidden"
        animate="show"
        variants={containerVariants}
        className="space-y-6"
      >
        {/* Stats row using shared AdminMetricCard for consistency */}
        <motion.div variants={itemVariants}>
          <AdminMetricGrid>
            <AdminMetricCard label="总用户数量" value={userStats.total} hint="系统全部注册用户" />
            <AdminMetricCard label="本月新增" value={userStats.monthNew} hint="本月新注册用户" />
            <AdminMetricCard label="近 7 日活跃" value={userStats.sevenDayActive} hint="最近一周有使用记录" />
            <AdminMetricCard label="30 日沉默" value={userStats.inactive30Day} hint="超过 30 天未使用" />
          </AdminMetricGrid>
        </motion.div>

        {/* User table card using AdminContentCard */}
        <motion.div variants={itemVariants}>
          <AdminContentCard padding="md" className={cn(ADMIN_PANEL_SURFACE_HOVER_CLASSES)}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-5">
              <div className="flex flex-col gap-2 flex-shrink-0">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800 dark:text-white">
                  <Users className="w-5 h-5 text-blue-600 dark:text-cyan-300" />
                  用户管理
                </h2>
                <div className={countPillClassName}>
                  <span className={`inline-block h-2 w-2 rounded-full bg-cyan-500 ${isLoadingUsers ? 'animate-pulse' : ''}`} />
                  {isLoadingUsers ? '同步中' : `共 ${totalUsers} 条记录`}
                </div>
              </div>

              <AnimatePresence mode="wait">
                {selectedUsers.size > 0 ? (
                  <motion.div
                    key="batch-actions-users"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-wrap items-center gap-2 sm:gap-3"
                  >
                    <div className="flex items-center gap-2 rounded-[1.1rem] border-[0.5px] border-cyan-200/50 bg-cyan-50/60 px-3 py-1.5 shadow-sm dark:border-cyan-900/30 dark:bg-cyan-950/20">
                      <CheckCircle2 className="w-4 h-4 text-cyan-600 dark:text-cyan-300" />
                      <span className="hidden text-sm font-medium text-cyan-900 dark:text-cyan-100 sm:inline">
                        已选中 {selectedUsers.size} 个用户
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBatchUpdateRole}
                      disabled={isLoadingUsers || isBatchOperating || isDeletingUser}
                      className={cn(ADMIN_HOVERABLE_BUTTON_CLASSES, 'border-slate-200/50 text-slate-700 dark:border-cyan-300/[0.14] dark:text-slate-200')}
                    >
                      <Shield className="w-4 h-4 sm:mr-1" />
                      <span className="hidden sm:inline">批量修改角色</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBatchDeleteUsers}
                      disabled={isLoadingUsers || isBatchOperating || isDeletingUser}
                      className="border-[0.5px] border-red-200/60 text-red-600 hover:bg-red-50/80 dark:border-red-900/40 dark:text-red-300 dark:hover:bg-red-950/30"
                    >
                      <X className="w-4 h-4 sm:mr-1" />
                      <span className="hidden sm:inline">批量删除</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearUserSelection}
                      disabled={isLoadingUsers || isBatchOperating || isDeletingUser}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="normal-actions-users"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="flex w-full flex-wrap items-center justify-end gap-2 sm:gap-3"
                  >
                    <div data-testid="user-search-control" className="relative h-9 w-full sm:w-64 lg:w-80">
                      <Input
                        type="text"
                        placeholder="搜索用户名..."
                        value={userSearchInput}
                        startAdornment={<Search data-testid="user-search-icon" className="h-4 w-4 text-slate-400" />}
                        onChange={(e) => handleUserSearchInputChange(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleUserSearchSubmit();
                          }
                        }}
                        containerClassName="h-9 [&>div:last-child]:hidden"
                        className="h-9 w-full border-[0.5px] border-slate-200/70 bg-white/60 py-0 text-sm leading-9 shadow-sm backdrop-blur-md dark:border-cyan-300/[0.14] dark:bg-slate-950/[0.52]"
                      />
                    </div>

                    <TableFilterDropdown
                      options={roleFilterOptions}
                      selectedValues={userRoleFilter}
                      onSelectionChange={setUserRoleFilter}
                      multiSelect={false}
                      icon={<Filter className="w-3.5 h-3.5" />}
                    />

                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void loadUsers()}
                        disabled={isLoadingUsers || isBatchOperating}
                        className={cn(ADMIN_HOVERABLE_BUTTON_CLASSES, 'border-slate-200/50 text-slate-700 dark:border-cyan-300/[0.14] dark:text-slate-200')}
                      >
                        <RefreshCw className={`w-4 h-4 ${isLoadingUsers ? 'animate-spin' : ''}`} />
                      </Button>
                    </motion.div>

                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        onClick={handleCreateUser}
                        className="flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 px-4 text-white shadow-[0_12px_24px_rgba(14,165,233,0.18)] hover:from-blue-700 hover:via-blue-600 hover:to-cyan-600"
                        disabled={isLoadingUsers || isBatchOperating}
                      >
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">创建用户</span>
                      </Button>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Content area with loading/empty states */}
            {isLoadingUsers ? (
              <div className="text-center py-16">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="inline-block">
                  <RefreshCw className="w-10 h-10 text-blue-600 dark:text-cyan-400" />
                </motion.div>
                <p className="mt-4 text-slate-500 dark:text-slate-400 font-medium">同步数据中...</p>
              </div>
            ) : users.length === 0 ? (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 25 }} className="text-center py-20 flex flex-col items-center justify-center">
                <div className="mb-6 inline-flex rounded-[2rem] border border-slate-200/60 bg-white/60 p-6 shadow-sm backdrop-blur-xl dark:border-cyan-300/[0.14] dark:bg-slate-950/[0.48]">
                  <Users className="w-12 h-12 text-blue-400/80 dark:text-cyan-600/80" />
                </div>
                <h3 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">
                  {hasUserFilters ? '无匹配记录' : '系统尚无用户'}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm">
                  {hasUserFilters ? '尝试调整过滤器或搜索关键词来找到您需要的用户。' : '当前系统中除了您以外没有其他用户，您可以现在邀请或创建新用户。'}
                </p>
                {!hasUserFilters && (
                  <Button onClick={handleCreateUser} className="rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-5 text-white shadow-[0_12px_24px_rgba(14,165,233,0.18)] hover:from-blue-700 hover:to-cyan-600 transition-all font-medium text-base">
                    <Plus className="w-5 h-5 mr-2" />
                    创建第一个用户
                  </Button>
                )}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                <AppleUserTable
                  users={users}
                  selectedUsers={selectedUsers}
                  onSelectUser={handleSelectUser}
                  onEditClick={handleEditUser}
                  onResetPasswordClick={handleResetPassword}
                  onDeleteClick={handleDeleteUser}
                  onToggleStatus={handleToggleStatus}
                  currentUserId={currentUserId}
                  isDeleting={isDeletingUser}
                  isBatchOperating={isBatchOperating}
                  isLoading={isLoadingUsers}
                />

                {totalUsers > 0 && (
                  <ApplePagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalUsers}
                    pageSize={pageSize}
                    onPageChange={handlePageChange}
                    onPageSizeChange={handlePageSizeChange}
                    isLoading={isLoadingUsers}
                  />
                )}
              </motion.div>
            )}
          </AdminContentCard>
        </motion.div>
      </motion.div>

      {/* --- User Management Dialogs --- */}
      <CreateUserDialog
        open={activeDialog === "create-user"}
        onOpenChange={(open) => !open && closeDialog()}
        onSuccess={handleUserOperationSuccess}
      />

      {userToEdit && (
        <EditUserDialog
          open={activeDialog === "edit-user"}
          onOpenChange={(open) => !open && closeDialog()}
          user={userToEdit}
          onSuccess={handleUserOperationSuccess}
        />
      )}

      {userToResetPassword && (
        <ResetPasswordDialog
          open={activeDialog === "reset-password"}
          onOpenChange={(open) => !open && closeDialog()}
          user={userToResetPassword}
          onSuccess={handleUserOperationSuccess}
        />
      )}

      <ConfirmDialog
        open={userToDelete !== null}
        onOpenChange={(open) => !open && setUserToDelete(null)}
        title="确认删除用户"
        description="您确定要删除这个用户吗？此操作无法撤销，该用户将无法继续访问系统。"
        confirmText={isDeletingUser ? "删除中..." : "确认删除"}
        variant="destructive"
        onConfirm={() => void handleDeleteUserConfirm()}
        isLoading={isDeletingUser}
      />

      <BatchDeleteUsersDialog
        open={activeDialog === "batch-delete"}
        onOpenChange={(open) => !open && closeDialog()}
        users={users.filter((u) => selectedUsers.has(u.id))}
        onSuccess={handleUserOperationSuccess}
      />

      <BatchUpdateRoleDialog
        open={activeDialog === "batch-update-role"}
        onOpenChange={(open) => !open && closeDialog()}
        users={users.filter((u) => selectedUsers.has(u.id))}
        onSuccess={handleUserOperationSuccess}
      />
    </>
  );
};

export default AdminUsersView;
