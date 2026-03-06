import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AuthService } from '@/services/authService';
import { UserService } from '@/services/userService';
import { useAuthStore } from '@/stores/authStore';
import type { APIKeyInfo, UserInfo } from '@/types/api';
import type { AdminView } from '@/components/admin/Sidebar';

const ALLOWED_ADMIN_VIEWS: AdminView[] = [
  'system-info',
  'api-keys',
  'user-management',
  'system-settings',
  'announcement-management',
];

const USER_ROLE_FILTER_OPTIONS = [
  { label: '管理员', value: 'admin', color: '#8b5cf6' },
  { label: '普通用户', value: 'user', color: '#3b82f6' },
] as const;

export function useAdminPageController() {
  const navigate = useNavigate();
  const { isAdmin, logout } = useAuthStore();

  const [searchParams] = useState(() => new URLSearchParams(window.location.search));
  const [currentView, setCurrentView] = useState<AdminView>(() => {
    const viewParam = searchParams.get('view') as AdminView | null;
    return viewParam && ALLOWED_ADMIN_VIEWS.includes(viewParam) ? viewParam : 'system-info';
  });

  const [pagedApiKeys, setPagedApiKeys] = useState<APIKeyInfo[]>([]);
  const [totalApiKeys, setTotalApiKeys] = useState(0);
  const [isLoadingKeys, setIsLoadingKeys] = useState(true);
  const [apiKeyCurrentPage, setApiKeyCurrentPage] = useState(1);
  const [apiKeyPageSize, setApiKeyPageSize] = useState(10);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [keyToEdit, setKeyToEdit] = useState<APIKeyInfo | null>(null);
  const [isBatchExtendDialogOpen, setIsBatchExtendDialogOpen] = useState(false);
  const [isBatchCreateDialogOpen, setIsBatchCreateDialogOpen] = useState(false);
  const [isBatchDeleteDialogOpen, setIsBatchDeleteDialogOpen] = useState(false);
  const [isBatchExportDialogOpen, setIsBatchExportDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [keyToDelete, setKeyToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBatchOperating, setIsBatchOperating] = useState(false);
  const [apiKeySearchInput, setApiKeySearchInput] = useState('');
  const [apiKeySearchKeyword, setApiKeySearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [users, setUsers] = useState<UserInfo[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set());
  const [userSearchInput, setUserSearchInput] = useState('');
  const [userActiveSearchKeyword, setUserActiveSearchKeyword] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [isCreateUserDialogOpen, setIsCreateUserDialogOpen] = useState(false);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [isBatchDeleteUsersDialogOpen, setIsBatchDeleteUsersDialogOpen] = useState(false);
  const [isBatchUpdateRoleDialogOpen, setIsBatchUpdateRoleDialogOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<UserInfo | null>(null);
  const [userToResetPassword, setUserToResetPassword] = useState<UserInfo | null>(null);
  const [userToDelete, setUserToDelete] = useState<number | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [isBatchOperatingUsers, setIsBatchOperatingUsers] = useState(false);

  const availableStatusOptions = [
    { label: '正常', value: 'enabled', color: '#10b981' },
    { label: '待激活', value: 'pending', color: '#3b82f6' },
    { label: '已禁用', value: 'disabled', color: '#6b7280' },
    { label: '已过期', value: 'expired', color: '#ef4444' },
  ];

  const apiKeyCurrentPageRef = useRef(apiKeyCurrentPage);
  const apiKeyPageSizeRef = useRef(apiKeyPageSize);
  const apiKeySearchKeywordRef = useRef(apiKeySearchKeyword);
  const statusFilterRef = useRef(statusFilter);

  apiKeyCurrentPageRef.current = apiKeyCurrentPage;
  apiKeyPageSizeRef.current = apiKeyPageSize;
  apiKeySearchKeywordRef.current = apiKeySearchKeyword;
  statusFilterRef.current = statusFilter;

  const apiKeyTotalPages = Math.ceil(totalApiKeys / apiKeyPageSize);

  const isKeyExpired = useCallback((expiresAt: string): boolean => {
    return new Date(expiresAt) < new Date();
  }, []);

  const hasAnyFilter = useCallback((): boolean => {
    return !!statusFilter || !!apiKeySearchKeyword.trim();
  }, [apiKeySearchKeyword, statusFilter]);

  const hasUserFilters = !!userActiveSearchKeyword || userRoleFilter.length > 0;

  useEffect(() => {
    if (!isAdmin) {
      toast.error('需要管理员权限');
      navigate('/login');
    }
  }, [isAdmin, navigate]);

  useEffect(() => {
    document.title = 'UniSearch - 管理后台';
    return () => {
      document.title = 'UniSearch';
    };
  }, []);

  const handleAdminError = useCallback((message: string, error: unknown) => {
    console.error(message, error);

    if (error && typeof error === 'object' && 'response' in error) {
      const err = error as { response?: { status?: number; data?: { error?: string } }; message?: string };
      if (err.response?.status === 401) {
        toast.error('登录已过期，请重新登录');
        logout();
        navigate('/login');
        return;
      }
      if (err.response?.status === 403) {
        toast.error(err.response?.data?.error || '权限不足');
        return;
      }
      toast.error(`${message}：${err.response?.data?.error || err.message || '未知错误'}`);
      return;
    }

    toast.error(`${message}：未知错误`);
  }, [logout, navigate]);

  const loadApiKeys = useCallback(async (
    page?: number,
    size?: number,
    keyword?: string,
    status?: string,
  ) => {
    setIsLoadingKeys(true);
    try {
      const result = await AuthService.listApiKeysPaginated(
        page ?? apiKeyCurrentPageRef.current,
        size ?? apiKeyPageSizeRef.current,
        keyword !== undefined ? keyword : apiKeySearchKeywordRef.current,
        status !== undefined ? status : statusFilterRef.current,
      );
      setPagedApiKeys(result.keys);
      setTotalApiKeys(result.total);
    } catch (error: unknown) {
      handleAdminError('加载 API Keys 失败', error);
    } finally {
      setIsLoadingKeys(false);
    }
  }, [handleAdminError]);

  const loadUsers = useCallback(async (page?: number) => {
    setIsLoadingUsers(true);
    try {
      const targetPage = page || currentPage;
      let roleFilter: 'admin' | 'user' | undefined;
      if (userRoleFilter.length === 1) {
        roleFilter = userRoleFilter[0] as 'admin' | 'user';
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
      handleAdminError('加载用户列表失败', error);
    } finally {
      setIsLoadingUsers(false);
    }
  }, [currentPage, handleAdminError, pageSize, userActiveSearchKeyword, userRoleFilter]);

  useEffect(() => {
    if (isAdmin) {
      void loadApiKeys(1);
    }
  }, [isAdmin, loadApiKeys]);

  useEffect(() => {
    if (isAdmin && currentView === 'api-keys') {
      setApiKeyCurrentPage(1);
      void loadApiKeys(1, apiKeyPageSize, apiKeySearchKeyword, statusFilter);
    }
  }, [apiKeyPageSize, apiKeySearchKeyword, currentView, isAdmin, loadApiKeys, statusFilter]);

  useEffect(() => {
    if (isAdmin && currentView === 'api-keys') {
      void loadApiKeys(apiKeyCurrentPage, apiKeyPageSize, apiKeySearchKeyword, statusFilter);
    }
  }, [apiKeyCurrentPage, apiKeyPageSize, apiKeySearchKeyword, currentView, isAdmin, loadApiKeys, statusFilter]);

  useEffect(() => {
    if (isAdmin && currentView === 'user-management') {
      void loadUsers(1);
    }
  }, [currentView, isAdmin, loadUsers, userActiveSearchKeyword, userRoleFilter]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!keyToDelete) return;

    setIsDeleting(true);
    try {
      await AuthService.deleteApiKey(keyToDelete);
      toast.success('API Key 已删除');
      void loadApiKeys();
      setDeleteDialogOpen(false);
      setKeyToDelete(null);
    } catch (error: unknown) {
      handleAdminError('删除失败', error);
    } finally {
      setIsDeleting(false);
    }
  }, [handleAdminError, keyToDelete, loadApiKeys]);

  const handleToggleApiKeyStatus = useCallback(async (key: APIKeyInfo, isEnabled: boolean) => {
    try {
      await AuthService.updateApiKeyStatus(key.id, isEnabled);
      toast.success(`API Key 已${isEnabled ? '启用' : '禁用'}`);
      void loadApiKeys();
    } catch (error: unknown) {
      handleAdminError('更新状态失败', error);
    }
  }, [handleAdminError, loadApiKeys]);

  const handleCopyKey = useCallback(async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      toast.success('API Key 已复制到剪贴板');
    } catch (error) {
      console.error('复制失败:', error);
      toast.error('复制失败，请手动复制');
    }
  }, []);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      const selectableKeys = pagedApiKeys.filter((k) => !k.is_permanent).map((key) => key.key);
      setSelectedKeys(new Set(selectableKeys));
      return;
    }
    setSelectedKeys(new Set());
  }, [pagedApiKeys]);

  const handleSelectKey = useCallback((key: string, checked: boolean) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  }, []);

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
      toast.success('用户已删除');
      void loadUsers();
      setSelectedUsers((prev) => {
        const next = new Set(prev);
        next.delete(userToDelete);
        return next;
      });
      setUserToDelete(null);
    } catch (error: unknown) {
      handleAdminError('删除失败', error);
    } finally {
      setIsDeletingUser(false);
    }
  }, [handleAdminError, loadUsers, userToDelete]);

  const handleToggleStatus = useCallback(async (userId: number, isEnabled: boolean) => {
    try {
      await UserService.setUserStatus(userId, isEnabled);
      toast.success(`用户已${isEnabled ? '启用' : '禁用'}`);
      void loadUsers();
    } catch (error: unknown) {
      handleAdminError('操作失败', error);
    }
  }, [handleAdminError, loadUsers]);

  const handleBatchExport = useCallback(() => {
    if (selectedKeys.size === 0) {
      toast.error('请先选择要导出的 API Key');
      return;
    }
    setIsBatchExportDialogOpen(true);
  }, [selectedKeys.size]);

  const handleBatchDeleteUsers = useCallback(() => {
    if (selectedUsers.size === 0) {
      toast.error('请先选择要删除的用户');
      return;
    }
    setIsBatchOperatingUsers(true);
    setIsBatchDeleteUsersDialogOpen(true);
  }, [selectedUsers.size]);

  const handleBatchUpdateRole = useCallback(() => {
    if (selectedUsers.size === 0) {
      toast.error('请先选择要修改的用户');
      return;
    }
    setIsBatchOperatingUsers(true);
    setIsBatchUpdateRoleDialogOpen(true);
  }, [selectedUsers.size]);

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
      admins: users.filter((u) => u.role === 'admin').length,
    };
  }, [totalUsers, users]);

  return {
    currentView,
    setCurrentView,
    apiKeys: {
      pagedApiKeys,
      totalApiKeys,
      isLoadingKeys,
      apiKeyCurrentPage,
      apiKeyPageSize,
      selectedKeys,
      isCreateDialogOpen,
      setIsCreateDialogOpen,
      isEditDialogOpen,
      setIsEditDialogOpen,
      keyToEdit,
      isBatchExtendDialogOpen,
      setIsBatchExtendDialogOpen,
      isBatchCreateDialogOpen,
      setIsBatchCreateDialogOpen,
      isBatchDeleteDialogOpen,
      setIsBatchDeleteDialogOpen,
      isBatchExportDialogOpen,
      setIsBatchExportDialogOpen,
      deleteDialogOpen,
      setDeleteDialogOpen,
      keyToDelete,
      setKeyToDelete,
      isDeleting,
      isBatchOperating,
      setIsBatchOperating,
      apiKeySearchInput,
      statusFilter,
      availableStatusOptions,
      apiKeyTotalPages,
      hasAnyFilter,
      isKeyExpired,
      loadApiKeys,
      setStatusFilter,
      setKeyToEdit,
      setApiKeySearchKeyword,
      handleApiKeySearchInputChange: (value: string) => {
        setApiKeySearchInput(value);
        if (value === '') {
          setApiKeySearchKeyword('');
        }
      },
      handleApiKeySearchSubmit: () => {
        setApiKeySearchKeyword(apiKeySearchInput);
      },
      handleCreateSuccess: () => {
        void loadApiKeys();
      },
      handleDeleteClick: (key: string) => {
        setKeyToDelete(key);
        setDeleteDialogOpen(true);
      },
      handleDeleteConfirm,
      handleToggleApiKeyStatus,
      handleCopyKey,
      handleSelectAll,
      handleSelectKey,
      handleClearSelection: () => setSelectedKeys(new Set()),
      handleBatchExtend: () => {
        setIsBatchOperating(true);
        setIsBatchExtendDialogOpen(true);
      },
      handleBatchExtendSuccess: () => {
        void loadApiKeys();
        setSelectedKeys(new Set());
        setIsBatchOperating(false);
      },
      handleBatchCreateSuccess: () => {
        void loadApiKeys();
        setIsBatchOperating(false);
      },
      handleBatchDelete: () => {
        setIsBatchOperating(true);
        setIsBatchDeleteDialogOpen(true);
      },
      handleBatchDeleteSuccess: () => {
        void loadApiKeys();
        setSelectedKeys(new Set());
        setIsBatchOperating(false);
      },
      handleBatchExport,
      handleEditClick: (key: APIKeyInfo) => {
        setKeyToEdit(key);
        setIsEditDialogOpen(true);
      },
      handleEditSuccess: () => {
        void loadApiKeys();
      },
      handleClearAllFilters: () => {
        setStatusFilter('');
        setApiKeySearchInput('');
        setApiKeySearchKeyword('');
        setApiKeyCurrentPage(1);
      },
      handleApiKeyPageChange: (page: number) => setApiKeyCurrentPage(page),
      handleApiKeyPageSizeChange: (size: number) => {
        setApiKeyPageSize(size);
        setApiKeyCurrentPage(1);
      },
      handleOpenBatchCreate: () => {
        setIsBatchOperating(true);
        setIsBatchCreateDialogOpen(true);
      },
    },
    users: {
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
      isCreateUserDialogOpen,
      setIsCreateUserDialogOpen,
      isEditUserDialogOpen,
      setIsEditUserDialogOpen,
      isResetPasswordDialogOpen,
      setIsResetPasswordDialogOpen,
      isBatchDeleteUsersDialogOpen,
      setIsBatchDeleteUsersDialogOpen,
      isBatchUpdateRoleDialogOpen,
      setIsBatchUpdateRoleDialogOpen,
      userToEdit,
      userToResetPassword,
      userToDelete,
      setUserToDelete,
      isDeletingUser,
      isBatchOperatingUsers,
      setIsBatchOperatingUsers,
      roleFilterOptions: USER_ROLE_FILTER_OPTIONS,
      hasUserFilters,
      loadUsers,
      setUserRoleFilter,
      handleUserSearchInputChange: (value: string) => {
        setUserSearchInput(value);
        if (value === '') {
          setUserActiveSearchKeyword('');
        }
      },
      handleUserSearchSubmit: () => {
        setUserActiveSearchKeyword(userSearchInput);
      },
      handleCreateUser: () => setIsCreateUserDialogOpen(true),
      handleEditUser: (user: UserInfo) => {
        setUserToEdit(user);
        setIsEditUserDialogOpen(true);
      },
      handleResetPassword: (user: UserInfo) => {
        setUserToResetPassword(user);
        setIsResetPasswordDialogOpen(true);
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
      },
      handlePageChange: (page: number) => {
        setCurrentPage(page);
        void loadUsers(page);
      },
      getCurrentUserId,
      getUserStats,
    },
  };
}
