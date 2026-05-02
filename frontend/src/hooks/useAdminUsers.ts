import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { UserService } from "@/services/userService";
import { useAuthStore } from "@/stores/authStore";
import type { UserInfo } from "@/types/api";

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
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [activeDialog, setActiveDialog] = useState<AdminDialogType | null>(null);
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
      void loadUsers(1);
    }
  }, [isAdmin, loadUsers, userActiveSearchKeyword, userRoleFilter]);

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
  }, [handleAdminError, loadUsers, userToDelete]);

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
    return {
      total: totalUsers,
      active: users.filter((u) => u.is_enabled).length,
      disabled: users.filter((u) => !u.is_enabled).length,
      admins: users.filter((u) => u.role === "admin").length,
    };
  }, [totalUsers, users]);

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
      setSelectedUsers(new Set());
      closeDialog();
    },
    handlePageChange: (page: number) => setCurrentPage(page),
    getCurrentUserId,
    getUserStats,
  };
}
