import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Filter, Plus, RefreshCw, Search, Shield, UserCheck, UserX, Users, X } from 'lucide-react';
import type { UserInfo } from '@/types/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatsCard } from './StatsCard';
import { TableFilterDropdown } from './TableFilterDropdown';
import { AppleUserTable } from './AppleUserTable';
import { ApplePagination } from './ApplePagination';
import {
  BLUE_CYAN_BORDER,
  BLUE_CYAN_BUTTON,
  BLUE_CYAN_ICON,
  BLUE_CYAN_SOFT_SURFACE,
  BLUE_CYAN_TEXT,
  BLUE_CYAN_TEXT_STRONG,
} from '@/lib/brandTheme';

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

      <Card className="border-gray-100 dark:border-white/10 shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
        <CardHeader className="border-b border-gray-100 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/50 min-h-[88px]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex-shrink-0">
              <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-white">
                <Users className={`w-5 h-5 ${BLUE_CYAN_ICON}`} />
                用户管理
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400 mt-1">
                {selectedUsers.size > 0 ? (
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className={`w-3.5 h-3.5 ${BLUE_CYAN_ICON}`} />
                    <span className={`${BLUE_CYAN_TEXT} font-medium`}>已选中 {selectedUsers.size} 个用户</span>
                  </span>
                ) : (
                  '管理系统用户，控制访问权限和账户状态'
                )}
              </CardDescription>
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
                  <div className={`flex items-center gap-2 px-3 py-1.5 ${BLUE_CYAN_SOFT_SURFACE} border ${BLUE_CYAN_BORDER} rounded-lg`}>
                    <CheckCircle2 className={`w-4 h-4 ${BLUE_CYAN_ICON}`} />
                    <span className={`text-sm font-medium ${BLUE_CYAN_TEXT_STRONG} hidden sm:inline`}>
                      已选中 {selectedUsers.size} 个用户
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onBatchUpdateRole}
                    disabled={isLoadingUsers || isBatchOperatingUsers || isDeletingUser}
                    className="border-slate-200 dark:border-slate-700"
                  >
                    <Shield className="w-4 h-4 sm:mr-1" />
                    <span className="hidden sm:inline">批量修改角色</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onBatchDeleteUsers}
                    disabled={isLoadingUsers || isBatchOperatingUsers || isDeletingUser}
                    className="border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
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
                  className="flex flex-wrap items-center gap-2 sm:gap-3"
                >
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10 pointer-events-none" />
                    <Input
                      type="text"
                      placeholder="搜索用户名..."
                      value={userSearchInput}
                      onChange={(e) => onUserSearchInputChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          onUserSearchSubmit();
                        }
                      }}
                      className="pl-9 w-full sm:w-48 h-9 text-sm border-slate-200 dark:border-slate-700"
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
                      className="border-slate-200 dark:border-slate-700"
                    >
                      <RefreshCw className={`w-4 h-4 ${isLoadingUsers ? 'animate-spin' : ''}`} />
                    </Button>
                  </motion.div>

                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      onClick={onCreateUser}
                      className={`flex items-center gap-2 ${BLUE_CYAN_BUTTON} shadow-lg shadow-cyan-500/25`}
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
        <CardContent className="p-6">
          {isLoadingUsers ? (
            <div className="text-center py-12">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="inline-block">
                <RefreshCw className={`w-8 h-8 ${BLUE_CYAN_ICON}`} />
              </motion.div>
              <p className="mt-4 text-slate-500 dark:text-slate-400">加载中...</p>
            </div>
          ) : users.length === 0 ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12">
              <div className="inline-flex p-4 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                <Users className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-500 dark:text-slate-400 mb-4">
                {hasUserFilters ? '没有找到匹配的用户' : '暂无用户'}
              </p>
              {!hasUserFilters && (
                <Button onClick={onCreateUser} className={BLUE_CYAN_BUTTON}>
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
