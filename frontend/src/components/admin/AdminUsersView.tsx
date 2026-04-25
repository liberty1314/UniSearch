import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Filter, Plus, RefreshCw, Search, Shield, UserCheck, UserX, Users, X } from 'lucide-react';
import type { UserInfo } from '@/types/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { StatsCard } from './StatsCard';
import { TableFilterDropdown } from './TableFilterDropdown';
import { AppleUserTable } from './AppleUserTable';
import { ApplePagination } from './ApplePagination';
import {
  ADMIN_PANEL_SURFACE_CLASSES,
  ADMIN_PANEL_SURFACE_HOVER_CLASSES,
  ADMIN_HOVERABLE_BUTTON_CLASSES,
} from '@/components/admin/adminDesign';

const countPillClassName =
  'inline-flex items-center gap-2 rounded-full border-[0.5px] border-slate-200/50 bg-white/40 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-slate-800/40 dark:text-slate-300';

interface UserStats {
  total: number;
  active: number;
  disabled: number;
  admins: number;
}

export interface AdminUsersViewModel {
  users: UserInfo[];
  userStats: UserStats;
  selectedUsers: Set<number>;
  isLoadingUsers: boolean;
  isDeletingUser: boolean;
  isBatchOperatingUsers: boolean;
  userSearchInput: string;
  userRoleFilter: string[];
  roleFilterOptions: Array<{ label: string; value: string; color: string }>;
  hasUserFilters: boolean;
  currentPage: number;
  totalPages: number;
  totalUsers: number;
  pageSize: number;
  currentUserId: number;
  onUserSearchInputChange: (value: string) => void;
  onUserSearchSubmit: () => void;
  onUserRoleFilterChange: (values: string[]) => void;
  onRefresh: () => void;
  onCreateUser: () => void;
  onBatchUpdateRole: () => void;
  onBatchDeleteUsers: () => void;
  onClearUserSelection: () => void;
  onSelectUser: (userId: number, checked: boolean) => void;
  onEditUser: (user: UserInfo) => void;
  onResetPassword: (user: UserInfo) => void;
  onDeleteUser: (userId: number) => void;
  onToggleStatus: (userId: number, isEnabled: boolean) => void;
  onPageChange: (page: number) => void;
}

interface AdminUsersViewProps {
  viewModel: AdminUsersViewModel;
}

const AdminUsersView: React.FC<AdminUsersViewProps> = ({ viewModel }) => {
  const {
    users,
    userStats,
    selectedUsers,
    isLoadingUsers,
    isDeletingUser,
    isBatchOperatingUsers,
    userSearchInput,
    userRoleFilter,
    roleFilterOptions,
    hasUserFilters,
    currentPage,
    totalPages,
    totalUsers,
    pageSize,
    currentUserId,
    onUserSearchInputChange,
    onUserSearchSubmit,
    onUserRoleFilterChange,
    onRefresh,
    onCreateUser,
    onBatchUpdateRole,
    onBatchDeleteUsers,
    onClearUserSelection,
    onSelectUser,
    onEditUser,
    onResetPassword,
    onDeleteUser,
    onToggleStatus,
    onPageChange,
  } = viewModel;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="总用户数" value={userStats.total} icon={Users} color="nebula" index={0} />
        <StatsCard title="活跃用户" value={userStats.active} icon={UserCheck} color="emerald" index={1} />
        <StatsCard title="禁用用户" value={userStats.disabled} icon={UserX} color="amber" index={2} />
        <StatsCard title="管理员数量" value={userStats.admins} icon={Shield} color="purple" index={3} />
      </div>

      <Card className={cn(ADMIN_PANEL_SURFACE_CLASSES, ADMIN_PANEL_SURFACE_HOVER_CLASSES, 'overflow-hidden')}>
        <CardHeader className="border-b border-slate-200/50 bg-white/20 backdrop-blur-md dark:border-white/5 dark:bg-slate-900/30 min-h-[88px]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex flex-col gap-2 flex-shrink-0">
              <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-white">
                <Users className="w-5 h-5 text-blue-600 dark:text-cyan-300" />
                用户管理
              </CardTitle>
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
                    onClick={onBatchUpdateRole}
                    disabled={isLoadingUsers || isBatchOperatingUsers || isDeletingUser}
                    className={cn(ADMIN_HOVERABLE_BUTTON_CLASSES, 'border-slate-200/50 text-slate-700 dark:border-white/10 dark:text-slate-200')}
                  >
                    <Shield className="w-4 h-4 sm:mr-1" />
                    <span className="hidden sm:inline">批量修改角色</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onBatchDeleteUsers}
                    disabled={isLoadingUsers || isBatchOperatingUsers || isDeletingUser}
                    className="border-[0.5px] border-red-200/60 text-red-600 hover:bg-red-50/80 dark:border-red-900/40 dark:text-red-300 dark:hover:bg-red-950/30"
                  >
                    <X className="w-4 h-4 sm:mr-1" />
                    <span className="hidden sm:inline">批量删除</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClearUserSelection}
                    disabled={isLoadingUsers || isBatchOperatingUsers || isDeletingUser}
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
                      onChange={(e) => onUserSearchInputChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          onUserSearchSubmit();
                        }
                      }}
                      containerClassName="h-9 [&>div:last-child]:hidden"
                      className="h-9 w-full border-[0.5px] border-slate-200/70 bg-white/60 py-0 text-sm leading-9 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-slate-900/40"
                    />
                  </div>

                  <TableFilterDropdown
                    options={roleFilterOptions}
                    selectedValues={userRoleFilter}
                    onSelectionChange={onUserRoleFilterChange}
                    multiSelect={false}
                    icon={<Filter className="w-3.5 h-3.5" />}
                  />

                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onRefresh}
                      disabled={isLoadingUsers || isBatchOperatingUsers}
                      className={cn(ADMIN_HOVERABLE_BUTTON_CLASSES, 'border-slate-200/50 text-slate-700 dark:border-white/10 dark:text-slate-200')}
                    >
                      <RefreshCw className={`w-4 h-4 ${isLoadingUsers ? 'animate-spin' : ''}`} />
                    </Button>
                  </motion.div>

                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      onClick={onCreateUser}
                      className="flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 px-4 text-white shadow-[0_12px_24px_rgba(14,165,233,0.18)] hover:from-blue-700 hover:via-blue-600 hover:to-cyan-600"
                      disabled={isLoadingUsers || isBatchOperatingUsers}
                    >
                      <Plus className="w-4 h-4" />
                      <span className="hidden sm:inline">创建用户</span>
                    </Button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </CardHeader>
        <CardContent className="p-5 sm:p-6">
          {isLoadingUsers ? (
            <div className="text-center py-12">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="inline-block">
                <RefreshCw className="w-8 h-8 text-blue-600 dark:text-cyan-300" />
              </motion.div>
              <p className="mt-4 text-slate-500 dark:text-slate-400">加载中...</p>
            </div>
          ) : users.length === 0 ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12">
              <div className="inline-flex rounded-[1.35rem] border-[0.5px] border-slate-200/50 bg-white/40 p-4 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-slate-800/40 mb-4">
                <Users className="w-8 h-8 text-slate-400 dark:text-slate-500" />
              </div>
              <p className="text-slate-500 dark:text-slate-400 mb-4">
                {hasUserFilters ? '没有找到匹配的用户' : '暂无用户'}
              </p>
              {!hasUserFilters && (
                <Button onClick={onCreateUser} className="rounded-full bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 px-4 text-white shadow-[0_12px_24px_rgba(14,165,233,0.18)] hover:from-blue-700 hover:via-blue-600 hover:to-cyan-600">
                  <Plus className="w-4 h-4 mr-2" />
                  创建第一个用户
                </Button>
              )}
            </motion.div>
          ) : (
            <div className="space-y-4">
              <AppleUserTable
                users={users}
                selectedUsers={selectedUsers}
                onSelectUser={onSelectUser}
                onEditClick={onEditUser}
                onResetPasswordClick={onResetPassword}
                onDeleteClick={onDeleteUser}
                onToggleStatus={onToggleStatus}
                currentUserId={currentUserId}
                isDeleting={isDeletingUser}
                isBatchOperating={isBatchOperatingUsers}
                isLoading={isLoadingUsers}
              />

              {totalPages > 1 && (
                <ApplePagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalUsers}
                  pageSize={pageSize}
                  onPageChange={onPageChange}
                  isLoading={isLoadingUsers}
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default AdminUsersView;
