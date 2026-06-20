import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { UserService } from "@/services/userService";
import { useAuthStore } from "@/stores/authStore";
import type { UserInfo } from "@/types/user";

export type AdminDialogType =
  | "create-user"
  | "edit-user"
  | "reset-password"
  | "batch-delete"
  | "batch-update-role";

const USER_ROLE_FILTER_OPTIONS = [
  { label: "管理员", value: "admin", color: "#8b5cf6" },
  { label: "普通用户", value: "user", color: "#3b82f6" },
];

const EMPTY_USER_STATS = {
  total: 0,
  monthNew: 0,
  sevenDayActive: 0,
  inactive30Day: 0,
};

function areUserStatsEqual(left: typeof EMPTY_USER_STATS, right: typeof EMPTY_USER_STATS) {
  return left.total === right.total &&
    left.monthNew === right.monthNew &&
    left.sevenDayActive === right.sevenDayActive &&
    left.inactive30Day === right.inactive30Day;
}

export function useAdminUsers() {
  const { isAdmin, logout } = useAuthStore();
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set());
  const [userSearchInput, setUserSearchInput] = useState("");
  const [userActiveSearchKeyword, setUserActiveSearchKeyword] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [activeDialog, setActiveDialog] = useState<AdminDialogType | null>(null);
  const [userStats, setUserStats] = useState(EMPTY_USER_STATS);
  const [userToEdit, setUserToEdit] = useState<UserInfo | null>(null);
  const [userToResetPassword, setUserToResetPassword] = useState<UserInfo | null>(null);
  const [userToDelete, setUserToDelete] = useState<number | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  const openDialog = useCallback((type: AdminDialogType) => setActiveDialog(type), []);
  const closeDialog = useCallback(() => setActiveDialog(null), []);

  const isBatchOperating = activeDialog === "batch-delete" || activeDialog === "batch-update-role";

  const handleAdminError = useCallback((message: string, error: unknown) => {
    console.error(message, error);
    if (error && typeof error === "object" && "response" in error) {
      const err = error as {
        response?: { status?: number; data?: { error?: string } };
        message?: string;
      };
      if (err.response?.status === 401) {
        toast.error("登录已过期，请重新登录");
        logout();
        return;
      }
      if (err.response?.status === 403) {
        toast.error(err.response?.data?.error || "权限不足");
        return;
      }
      toast.error(`${message}：${err.response?.data?.error || err.message || "未知错误"}`);
      return;
    }
    toast.error(`${message}：未知错误`);
  }, [logout]);

  const loadUserStats = useCallback(async () => {
    try {
      const stats = await UserService.getUserStats();
      const nextStats = {
        total: stats.total_users,
        monthNew: stats.month_new_users,
        sevenDayActive: stats.seven_day_active_users,
        inactive30Day: stats.inactive_30_day_users,
      };
      setUserStats((prev) => (areUserStatsEqual(prev, nextStats) ? prev : nextStats));
    } catch (error: unknown) {
      handleAdminError("加载用户统计失败", error);
    }
  }, [handleAdminError]);

  const loadUsers = useCallback(async (page?: number) => {
    setIsLoadingUsers(true);
    try {
      const targetPage = page || currentPage;
      let roleFilter: "admin" | "user" | undefined;
      if (userRoleFilter.length === 1) {
        roleFilter = userRoleFilter[0] as "admin" | "user";
      }

      const response = await UserService.listUsers(
        targetPage,
        pageSize,
        userActiveSearchKeyword.trim() || undefined,
        roleFilter,
      );

      setUsers(response.users);
      setTotalUsers(response.total);
      setTotalPages(response.total_pages);
      setCurrentPage(response.page);
    } catch (error: unknown) {
      handleAdminError("加载用户列表失败", error);
    } finally {
      setIsLoadingUsers(false);
    }
  }, [currentPage, handleAdminError, pageSize, userActiveSearchKeyword, userRoleFilter]);

  useEffect(() => {
    if (isAdmin) {
      void loadUsers(currentPage);
    }
  }, [currentPage, isAdmin, loadUsers, userActiveSearchKeyword, userRoleFilter]);

  useEffect(() => {
    if (isAdmin) {
      void loadUserStats();
    }
  }, [isAdmin, loadUserStats]);

  const handleSelectUser = useCallback((userId: number, checked: boolean) => {
    setSelectedUsers((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(userId);
      } else {
        next.delete(userId);
      }
      return next;
    });
  }, []);

  const handleDeleteUserConfirm = useCallback(async () => {
    if (!userToDelete) return;

    setIsDeletingUser(true);
    try {
      await UserService.deleteUser(userToDelete);
      toast.success("用户已删除");
      void loadUsers();
      void loadUserStats();
      setSelectedUsers((prev) => {
        const next = new Set(prev);
        next.delete(userToDelete);
        return next;
      });
      setUserToDelete(null);
    } catch (error: unknown) {
      handleAdminError("删除失败", error);
    } finally {
      setIsDeletingUser(false);
    }
  }, [handleAdminError, loadUsers, loadUserStats, userToDelete]);

  const handleToggleStatus = useCallback(async (userId: number, isEnabled: boolean) => {
    try {
      await UserService.setUserStatus(userId, isEnabled);
      toast.success(`用户已${isEnabled ? "启用" : "禁用"}`);
      void loadUsers();
    } catch (error: unknown) {
      handleAdminError("操作失败", error);
    }
  }, [handleAdminError, loadUsers]);

  const handleBatchDeleteUsers = useCallback(() => {
    if (selectedUsers.size === 0) {
      toast.error("请先选择要删除的用户");
      return;
    }
    openDialog("batch-delete");
  }, [selectedUsers.size, openDialog]);

  const handleBatchUpdateRole = useCallback(() => {
    if (selectedUsers.size === 0) {
      toast.error("请先选择要修改的用户");
      return;
    }
    openDialog("batch-update-role");
  }, [selectedUsers.size, openDialog]);

  const getCurrentUserId = useCallback((): number => {
    const currentUsername = useAuthStore.getState().username;
    const currentUser = users.find((u) => u.username === currentUsername);
    return currentUser?.id || 0;
  }, [users]);

  const getUserStats = useCallback(() => {
    return userStats;
  }, [userStats]);

  return {
    users,
    isLoadingUsers,
    selectedUsers,
    userSearchInput,
    userActiveSearchKeyword,
    userRoleFilter,
    currentPage,
    totalUsers,
    pageSize,
    totalPages,
    activeDialog,
    openDialog,
    closeDialog,
    userToEdit,
    userToResetPassword,
    userToDelete,
    setUserToDelete,
    isDeletingUser,
    isBatchOperating,
    roleFilterOptions: USER_ROLE_FILTER_OPTIONS,
    hasUserFilters: !!userActiveSearchKeyword || userRoleFilter.length > 0,
    loadUsers,
    setUserRoleFilter,
    handleUserSearchInputChange: (value: string) => {
      setUserSearchInput(value);
      if (value === "") {
        setUserActiveSearchKeyword("");
      }
    },
    handleUserSearchSubmit: () => {
      setUserActiveSearchKeyword(userSearchInput);
    },
    handleCreateUser: () => openDialog("create-user"),
    handleEditUser: (user: UserInfo) => {
      setUserToEdit(user);
      openDialog("edit-user");
    },
    handleResetPassword: (user: UserInfo) => {
      setUserToResetPassword(user);
      openDialog("reset-password");
    },
    handleDeleteUser: (userId: number) => setUserToDelete(userId),
    handleDeleteUserConfirm,
    handleToggleStatus,
    handleSelectUser,
    handleBatchDeleteUsers,
    handleBatchUpdateRole,
    handleClearUserSelection: () => setSelectedUsers(new Set()),
    handleUserOperationSuccess: () => {
      void loadUsers();
      void loadUserStats();
      setSelectedUsers(new Set());
      closeDialog();
    },
    handlePageChange: (page: number) => setCurrentPage(page),
    handlePageSizeChange: (size: number) => {
      setPageSize(size);
      setCurrentPage(1);
    },
    getCurrentUserId,
    getUserStats,
  };
}
