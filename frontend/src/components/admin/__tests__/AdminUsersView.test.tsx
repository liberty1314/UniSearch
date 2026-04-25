import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AdminUsersView, { type AdminUsersViewModel } from '@/components/admin/AdminUsersView';

const buildViewModel = (): AdminUsersViewModel => ({
  users: [],
  userStats: {
    total: 0,
    active: 0,
    disabled: 0,
    admins: 0,
  },
  selectedUsers: new Set<number>(),
  isLoadingUsers: false,
  isDeletingUser: false,
  isBatchOperatingUsers: false,
  userSearchInput: '',
  userRoleFilter: [],
  roleFilterOptions: [],
  hasUserFilters: false,
  currentPage: 1,
  totalPages: 1,
  totalUsers: 0,
  pageSize: 20,
  currentUserId: 1,
  onUserSearchInputChange: vi.fn(),
  onUserSearchSubmit: vi.fn(),
  onUserRoleFilterChange: vi.fn(),
  onRefresh: vi.fn(),
  onCreateUser: vi.fn(),
  onBatchUpdateRole: vi.fn(),
  onBatchDeleteUsers: vi.fn(),
  onClearUserSelection: vi.fn(),
  onSelectUser: vi.fn(),
  onEditUser: vi.fn(),
  onResetPassword: vi.fn(),
  onDeleteUser: vi.fn(),
  onToggleStatus: vi.fn(),
  onPageChange: vi.fn(),
});

describe('AdminUsersView', () => {
  it('让用户搜索图标和输入框保持在同一个紧凑工具条控件内', () => {
    render(<AdminUsersView viewModel={buildViewModel()} />);

    const searchControl = screen.getByTestId('user-search-control');
    const searchInput = screen.getByPlaceholderText('搜索用户名...');
    const searchIcon = screen.getByTestId('user-search-icon');
    const inputContainer = searchInput.parentElement?.parentElement;

    expect(searchControl).toHaveClass('relative', 'h-9', 'w-full', 'sm:w-64', 'lg:w-80');
    expect(inputContainer).toHaveClass('h-9', '[&>div:last-child]:hidden');
    expect(searchInput).toHaveClass('h-9', 'w-full', 'py-0', 'leading-9');
    expect(searchIcon.parentElement).toHaveClass('inset-y-0', 'left-0', 'flex');
    expect(searchIcon).toHaveClass('h-4', 'w-4');
  });
});
