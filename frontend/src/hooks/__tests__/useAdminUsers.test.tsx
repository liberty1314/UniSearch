import { renderHook, act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAdminUsers } from '../useAdminUsers';

const listUsersMock = vi.fn();

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({
    isAdmin: true,
    logout: vi.fn(),
    username: 'admin',
  }),
}));

vi.mock('@/services/userService', () => ({
  UserService: {
    listUsers: (...args: unknown[]) => listUsersMock(...args),
    deleteUser: vi.fn(),
    setUserStatus: vi.fn(),
    batchDeleteUsers: vi.fn(),
    batchUpdateRole: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('useAdminUsers', () => {
  beforeEach(() => {
    listUsersMock.mockReset();
    listUsersMock.mockImplementation(async (_page?: number, pageSize?: number) => ({
      users: Array.from({ length: pageSize || 10 }, (_, index) => ({
        id: index + 1,
        username: `user-${index + 1}`,
        role: 'user',
        is_enabled: true,
        last_login_at: null,
        created_at: '2026-05-17T00:00:00Z',
        updated_at: '2026-05-17T00:00:00Z',
      })),
      total: 12,
      page: _page || 1,
      page_size: pageSize || 10,
      total_pages: Math.ceil(12 / (pageSize || 10)),
    }));
  });

  it('会按页码和页大小重新加载用户列表', async () => {
    const { result } = renderHook(() => useAdminUsers());

    await waitFor(() => {
      expect(listUsersMock).toHaveBeenCalledWith(1, 10, undefined, undefined);
    });

    act(() => {
      result.current.handlePageChange(2);
    });

    await waitFor(() => {
      expect(listUsersMock).toHaveBeenLastCalledWith(2, 10, undefined, undefined);
    });

    act(() => {
      result.current.handlePageSizeChange(50);
    });

    await waitFor(() => {
      expect(listUsersMock).toHaveBeenLastCalledWith(1, 50, undefined, undefined);
    });
  });
});
